import { defineEventHandler } from 'h3'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

/**
 * Artie's database prompts, read-only, for the /prompts page (2026-11-21).
 *
 * The `prompts` table overrides the fallback copies in Artie's code (assemble.ts), so this is
 * what he actually runs on. Every row comes back with its full `prompt_history`, so the page
 * can show what changed between versions. The 2026-11-20 banlist riddles came from a database
 * prompt nobody could see without sqlite; this page is that view.
 *
 * CAST: some rows are stored as BLOBs and the driver hands those back as Buffers.
 * No write path on purpose: Artie caches prompts for 30s and a trigger bumps versions, so edits
 * stay a deliberate act (sqlite, with a backup), not a textarea.
 */

interface PromptRow {
  id: number
  name: string
  version: number
  category: string | null
  description: string | null
  is_active: number
  content: string
  created_at: string
  updated_at: string
}

interface HistoryRow {
  id: number
  prompt_id: number
  version: number
  content: string
  changed_by: string | null
  change_reason: string | null
  created_at: string
}

export default defineEventHandler(async () => {
  const db = await open({
    filename: process.env.DATABASE_PATH || '/app/data/coachartie.db',
    driver: sqlite3.Database,
    mode: sqlite3.OPEN_READONLY,
  })
  try {
    const prompts = (await db.all(
      `SELECT id, name, version, category, description, is_active,
              CAST(content AS TEXT) AS content, created_at, updated_at
         FROM prompts
        ORDER BY updated_at DESC, name`
    )) as PromptRow[]
    const history = (await db.all(
      `SELECT id, prompt_id, version, CAST(content AS TEXT) AS content, changed_by, change_reason,
              created_at
         FROM prompt_history
        ORDER BY prompt_id, version DESC, id DESC`
    )) as HistoryRow[]

    const byPrompt = new Map<number, HistoryRow[]>()
    for (const h of history) {
      const list = byPrompt.get(h.prompt_id) ?? []
      list.push(h)
      byPrompt.set(h.prompt_id, list)
    }

    return {
      prompts: prompts.map((p) => ({
        ...p,
        is_active: p.is_active === 1,
        history: byPrompt.get(p.id) ?? [],
      })),
      generated_at: new Date().toISOString(),
    }
  } finally {
    await db.close()
  }
})
