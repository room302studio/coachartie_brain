import { defineEventHandler, getQuery } from 'h3'
import { getDb, messages } from '@coachartie/shared'
import { ne, gte, count, max, min, desc, sql } from 'drizzle-orm'

/**
 * Get top users by message count
 *
 * Query params:
 * - limit: max results (default 10)
 * - timeRange: filter by time (e.g., 7d, 24h, 30d)
 * - includeArtie: include Artie's messages (default false)
 *
 * Examples:
 * /api/stats/top-users?limit=5
 * /api/stats/top-users?timeRange=7d&limit=10
 */
export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const limit = query.limit ? parseInt(query.limit as string) : 10
    const timeRange = query.timeRange as string || null
    const includeArtie = query.includeArtie === 'true'

    const db = getDb()

    const whereConditions = []

    // Exclude Artie unless requested
    if (!includeArtie) {
      whereConditions.push(ne(messages.userId, 'artie'))
    }

    // Add time range filter
    if (timeRange) {
      const match = timeRange.match(/^(\d+)(h|d|w|m)$/)
      if (match) {
        const [, amount, unit] = match
        const unitMap: Record<string, string> = { h: 'hours', d: 'days', w: 'days', m: 'days' }
        const multiplier = unit === 'w' ? parseInt(amount) * 7 : unit === 'm' ? parseInt(amount) * 30 : parseInt(amount)
        whereConditions.push(
          sql`datetime(${messages.createdAt}) >= datetime('now', '-${sql.raw(multiplier.toString())} ${sql.raw(unitMap[unit])}')`
        )
      }
    }

    let queryBuilder = db
      .select({
        userId: messages.userId,
        messageCount: count(),
        lastMessageAt: max(messages.createdAt),
        firstMessageAt: min(messages.createdAt)
      })
      .from(messages)

    if (whereConditions.length > 0) {
      queryBuilder = queryBuilder.where(
        whereConditions.length === 1 ? whereConditions[0] : sql`${whereConditions.join(' AND ')}`
      ) as any
    }

    const results = await queryBuilder
      .groupBy(messages.userId)
      .orderBy(desc(count()))
      .limit(limit)

    return {
      success: true,
      data: results,
      count: results.length,
      timeRange: timeRange || 'all-time'
    }
  } catch (error: any) {
    console.error('Error fetching top users:', error)
    return {
      success: false,
      error: error.message,
      data: []
    }
  }
})
