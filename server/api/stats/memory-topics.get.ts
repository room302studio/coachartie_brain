import { defineEventHandler, getQuery } from 'h3'
import { getDb, memories, gte, count, avg, max, desc, isNotNull, ne, sql } from '@coachartie/shared'

/**
 * Get trending topics in memories by analyzing tags and content
 *
 * Query params:
 * - limit: max results (default 20)
 * - timeRange: filter by time (e.g., 7d, 24h, 30d)
 * - min_importance: minimum importance level (default 0)
 *
 * Returns:
 * - Top tags by frequency
 * - Recent high-importance memories
 * - Memory count by importance level
 *
 * Examples:
 * /api/stats/memory-topics?limit=10
 * /api/stats/memory-topics?timeRange=7d&min_importance=5
 */
export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const limit = query.limit ? parseInt(query.limit as string) : 20
    const timeRange = query.timeRange as string || null
    const minImportance = query.min_importance ? parseInt(query.min_importance as string) : 0

    const db = getDb()

    // Build time filter
    let timeFilterCondition: any = null
    if (timeRange) {
      const match = timeRange.match(/^(\d+)(h|d|w|m)$/)
      if (match) {
        const [, amount, unit] = match
        const unitMap: Record<string, string> = { h: 'hours', d: 'days', w: 'days', m: 'days' }
        const multiplier = unit === 'w' ? parseInt(amount) * 7 : unit === 'm' ? parseInt(amount) * 30 : parseInt(amount)
        timeFilterCondition = sql`datetime(${memories.createdAt}) >= datetime('now', '-${sql.raw(multiplier.toString())} ${sql.raw(unitMap[unit])}')`
      }
    }

    // Get memory count by importance level
    let importanceQuery = db
      .select({
        importance: memories.importance,
        count: count()
      })
      .from(memories)
      .where(gte(memories.importance, minImportance))

    if (timeFilterCondition) {
      importanceQuery = importanceQuery.where(
        sql`${gte(memories.importance, minImportance)} AND ${timeFilterCondition}`
      ) as any
    }

    const importanceDistribution = await importanceQuery
      .groupBy(memories.importance)
      .orderBy(desc(memories.importance))

    // Get top users by memory count
    let topUsersQuery = db
      .select({
        userId: memories.userId,
        memoryCount: count(),
        avgImportance: avg(memories.importance),
        lastMemory: max(memories.createdAt)
      })
      .from(memories)
      .where(gte(memories.importance, minImportance))

    if (timeFilterCondition) {
      topUsersQuery = topUsersQuery.where(
        sql`${gte(memories.importance, minImportance)} AND ${timeFilterCondition}`
      ) as any
    }

    const topMemoryUsers = await topUsersQuery
      .groupBy(memories.userId)
      .orderBy(desc(count()))
      .limit(limit)

    // Get recent high-importance memories
    let importantMemoriesQuery = db
      .select({
        id: memories.id,
        content: memories.content,
        userId: memories.userId,
        importance: memories.importance,
        tags: memories.tags,
        createdAt: memories.createdAt
      })
      .from(memories)
      .where(gte(memories.importance, 7))

    if (timeFilterCondition) {
      importantMemoriesQuery = importantMemoriesQuery.where(
        sql`${gte(memories.importance, 7)} AND ${timeFilterCondition}`
      ) as any
    }

    const importantMemories = await importantMemoriesQuery
      .orderBy(desc(memories.importance), desc(memories.createdAt))
      .limit(limit)

    // Parse tags from all memories and count frequency
    let allMemoriesQuery = db
      .select({ tags: memories.tags })
      .from(memories)
      .where(sql`${isNotNull(memories.tags)} AND ${ne(memories.tags, '[]')}`)

    if (timeFilterCondition) {
      allMemoriesQuery = allMemoriesQuery.where(
        sql`${isNotNull(memories.tags)} AND ${ne(memories.tags, '[]')} AND ${timeFilterCondition}`
      ) as any
    }

    const allMemories = await allMemoriesQuery

    const tagFrequency: Record<string, number> = {}
    allMemories.forEach(row => {
      try {
        const tags = JSON.parse(row.tags || '[]')
        tags.forEach((tag: string) => {
          tagFrequency[tag] = (tagFrequency[tag] || 0) + 1
        })
      } catch (e) {
        // Skip invalid JSON
      }
    })

    const topTags = Object.entries(tagFrequency)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)

    // Get memory creation trend (simplified without raw SQL)
    const creationTrendRaw: { date: string; count: number; avg_importance: number }[] = []

    return {
      success: true,
      timeRange: timeRange || 'all-time',
      data: {
        top_tags: topTags,
        importance_distribution: importanceDistribution,
        top_users: topMemoryUsers,
        important_memories: importantMemories,
        creation_trend: creationTrendRaw
      }
    }
  } catch (error: any) {
    console.error('Error fetching memory topics:', error)
    return {
      success: false,
      error: error.message,
      data: null
    }
  }
})
