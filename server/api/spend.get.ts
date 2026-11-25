import { defineEventHandler, getQuery } from 'h3'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

/**
 * Per-guild token spend for the /spend page.
 *
 * Money: model_usage_stats.estimated_cost is OpenRouter's billed usage.cost when the response
 * reports one (openrouter.ts billedCost), and Artie's price-table estimate only when it doesn't.
 * One OpenRouter credit = $1, so "credits" and "dollars" are the same number.
 *
 * Guild attribution (guild_id) began 2026-10-22. Rows with no guild are background work
 * (digests, reflection, scoring, DMs) and get their own row, because historically they are
 * almost all of the money.
 *
 * Guild list: Discord GET /users/@me/guilds with the bot token, so guilds Artie is in but
 * never spent in still show. Cached 10 min. Falls back to known names if Discord is unreachable.
 */

const KNOWN_GUILDS: Record<string, string> = {
  '932719842522443928': 'Room 302 Studio',
  '1420846272545296470': 'Subwaybuilder',
}
const GUILD_TTL_MS = 10 * 60 * 1000
const BALANCE_TTL_MS = 60 * 1000
const RANGES: Record<string, number | null> = { '1d': 1, '7d': 7, '30d': 30, all: null }

interface DiscordGuild { id: string; name: string }
let guildCache: { at: number; guilds: DiscordGuild[]; source: string } | null = null
let balanceCache: { at: number; value: BalanceInfo } | null = null

interface BalanceInfo {
  total_credits: number | null
  total_usage: number | null
  remaining: number | null
  error: string | null
}

async function fetchGuilds(): Promise<{ guilds: DiscordGuild[]; source: string }> {
  if (guildCache && Date.now() - guildCache.at < GUILD_TTL_MS) {
    return guildCache
  }
  const token = process.env.DISCORD_TOKEN
  let result: { guilds: DiscordGuild[]; source: string }
  try {
    if (!token) {
      throw new Error('no DISCORD_TOKEN')
    }
    const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: { Authorization: `Bot ${token}` },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) {
      throw new Error(`discord ${res.status}`)
    }
    const body = (await res.json()) as DiscordGuild[]
    result = { guilds: body.map((g) => ({ id: g.id, name: g.name })), source: 'discord' }
  } catch (err) {
    console.warn('[spend] guild list fallback:', (err as Error).message)
    const guilds = Object.entries(KNOWN_GUILDS).map(([id, name]) => ({ id, name }))
    result = { guilds, source: 'fallback' }
  }
  guildCache = { at: Date.now(), ...result }
  return result
}

async function fetchBalance(): Promise<BalanceInfo> {
  if (balanceCache && Date.now() - balanceCache.at < BALANCE_TTL_MS) {
    return balanceCache.value
  }
  const key = process.env.OPENROUTER_API_KEY
  let value: BalanceInfo
  try {
    if (!key) {
      throw new Error('no OPENROUTER_API_KEY')
    }
    const res = await fetch('https://openrouter.ai/api/v1/credits', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) {
      throw new Error(`openrouter ${res.status}`)
    }
    const body = (await res.json()) as { data?: { total_credits?: number; total_usage?: number } }
    const total = body.data?.total_credits ?? null
    const used = body.data?.total_usage ?? null
    let remaining: number | null = null
    if (total !== null && used !== null) {
      remaining = total - used
    }
    value = { total_credits: total, total_usage: used, remaining, error: null }
  } catch (err) {
    value = { total_credits: null, total_usage: null, remaining: null, error: (err as Error).message }
  }
  balanceCache = { at: Date.now(), value }
  return value
}

/** SQLite stores CURRENT_TIMESTAMP as UTC 'YYYY-MM-DD HH:MM:SS'. */
function toSqliteUtc(d: Date): string {
  return d.toISOString().slice(0, 19).replace('T', ' ')
}

function sinceFor(range: string): string | null {
  const days = RANGES[range]
  if (days === null || days === undefined) {
    return null
  }
  return toSqliteUtc(new Date(Date.now() - days * 24 * 60 * 60 * 1000))
}

interface Row {
  guild_id: string | null
  attempts: number
  ok: number
  failed: number
  credit_failures: number
  prompt_tokens: number
  cached_tokens: number
  cache_write_tokens: number
  completion_tokens: number
  cost: number
  last_call: string | null
  last_ok: string | null
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  let range = String(query.range || '30d')
  if (!Object.hasOwn(RANGES, range)) {
    range = '30d'
  }
  const since = sinceFor(range)

  const db = await open({
    filename: process.env.DATABASE_PATH || '/app/data/coachartie.db',
    driver: sqlite3.Database,
    mode: sqlite3.OPEN_READONLY,
  })

  try {
    let where = ''
    const params: string[] = []
    if (since) {
      where = 'WHERE timestamp >= ?'
      params.push(since)
    }

    const rows = (await db.all(
      `SELECT guild_id,
              COUNT(*) AS attempts,
              SUM(success = 1) AS ok,
              SUM(success = 0) AS failed,
              SUM(error_type = 'http_402') AS credit_failures,
              COALESCE(SUM(prompt_tokens), 0) AS prompt_tokens,
              COALESCE(SUM(cached_tokens), 0) AS cached_tokens,
              COALESCE(SUM(cache_write_tokens), 0) AS cache_write_tokens,
              COALESCE(SUM(completion_tokens), 0) AS completion_tokens,
              COALESCE(SUM(estimated_cost), 0) AS cost,
              MAX(timestamp) AS last_call,
              MAX(CASE WHEN success = 1 THEN timestamp END) AS last_ok
         FROM model_usage_stats ${where}
        GROUP BY guild_id`,
      params
    )) as Row[]

    // The current run of consecutive out-of-credit (402) calls: every row after the last row
    // that was NOT a 402, ordered by id (timestamps tie at one-second precision). Empty when
    // the newest call is anything other than a 402.
    const lastOk = (await db.get(
      `SELECT MAX(timestamp) AS t FROM model_usage_stats WHERE success = 1`
    )) as { t: string | null }
    const streak = (await db.get(
      `SELECT COUNT(*) AS n, MIN(timestamp) AS since FROM model_usage_stats
        WHERE id > COALESCE((SELECT MAX(id) FROM model_usage_stats
                              WHERE error_type IS NOT 'http_402'), 0)`
    )) as { n: number; since: string | null }

    const { guilds, source } = await fetchGuilds()
    const names = new Map<string, string>(Object.entries(KNOWN_GUILDS))
    for (const g of guilds) {
      names.set(g.id, g.name)
    }
    const memberIds = new Set(guilds.map((g) => g.id))

    const byId = new Map<string, Row>()
    for (const r of rows) {
      byId.set(r.guild_id ?? '', r)
    }

    const empty = (id: string | null): Row => ({
      guild_id: id, attempts: 0, ok: 0, failed: 0, credit_failures: 0, prompt_tokens: 0,
      cached_tokens: 0, cache_write_tokens: 0, completion_tokens: 0, cost: 0,
      last_call: null, last_ok: null,
    })

    const out: Array<Row & { name: string; kind: string }> = []
    // Every guild Artie is in, spend or not.
    for (const g of guilds) {
      const r = byId.get(g.id) ?? empty(g.id)
      out.push({ ...r, name: g.name, kind: 'guild' })
      byId.delete(g.id)
    }
    // Spend attributed to guilds he has since left (or that Discord didn't list).
    for (const [id, r] of byId) {
      if (id === '') {
        continue
      }
      let kind = 'left'
      if (memberIds.has(id)) {
        kind = 'guild'
      }
      out.push({ ...r, name: names.get(id) ?? id, kind })
    }
    const untagged = byId.get('') ?? empty(null)
    out.push({ ...untagged, name: 'Background / DMs (no guild)', kind: 'untagged' })

    out.sort((a, b) => b.cost - a.cost || b.attempts - a.attempts)

    const totals = out.reduce(
      (t, r) => {
        t.attempts += r.attempts
        t.ok += r.ok
        t.failed += r.failed
        t.prompt_tokens += r.prompt_tokens
        t.cached_tokens += r.cached_tokens
        t.cache_write_tokens += r.cache_write_tokens
        t.completion_tokens += r.completion_tokens
        t.cost += r.cost
        return t
      },
      { attempts: 0, ok: 0, failed: 0, prompt_tokens: 0, cached_tokens: 0, cache_write_tokens: 0, completion_tokens: 0, cost: 0 }
    )

    return {
      range,
      since,
      guild_source: source,
      guild_tagging_began: '2026-10-22',
      balance: await fetchBalance(),
      credit_streak: { count: streak?.n ?? 0, since: streak?.since ?? null, last_ok: lastOk?.t ?? null },
      rows: out,
      totals,
      generated_at: new Date().toISOString(),
    }
  } finally {
    await db.close()
  }
})
