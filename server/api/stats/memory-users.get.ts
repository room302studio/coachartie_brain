import { defineEventHandler, getQuery } from 'h3'
import { getDb, memories } from '@coachartie/shared'
import { count, max, min, desc, sql } from 'drizzle-orm'

/**
 * Get top users by memory count
 *
 * Query params:
 * - limit: max results (default 10)
 * - timeRange: filter by time (e.g., 7d, 24h, 30d)
 *
 * Examples:
 * /api/stats/memory-users?limit=5
 * /api/stats/memory-users?timeRange=7d&limit=10
 */
export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const limit = query.limit ? parseInt(query.limit as string) : 10
    const timeRange = query.timeRange as string || null

    const db = getDb()

    let queryBuilder = db
      .select({
        userId: memories.userId,
        memoryCount: count(),
        lastMemoryAt: max(memories.createdAt),
        firstMemoryAt: min(memories.createdAt)
      })
      .from(memories)

    // Add time range filter
    if (timeRange) {
      const match = timeRange.match(/^(\d+)(h|d|w|m)$/)
      if (match) {
        const [, amount, unit] = match
        const unitMap: Record<string, string> = { h: 'hours', d: 'days', w: 'days', m: 'days' }
        const multiplier = unit === 'w' ? parseInt(amount) * 7 : unit === 'm' ? parseInt(amount) * 30 : parseInt(amount)
        queryBuilder = queryBuilder.where(
          sql`datetime(${memories.createdAt}) >= datetime('now', '-${sql.raw(multiplier.toString())} ${sql.raw(unitMap[unit])}')`
        ) as any
      }
    }

    const results = await queryBuilder
      .groupBy(memories.userId)
      .orderBy(desc(count()))
      .limit(limit)

    return {
      success: true,
      data: results,
      count: results.length,
      timeRange: timeRange || 'all-time'
    }
  } catch (error: any) {
    console.error('Error fetching memory users:', error)
    return {
      success: false,
      error: error.message,
      data: []
    }
  }
})
