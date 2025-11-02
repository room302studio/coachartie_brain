import { defineEventHandler, getQuery } from 'h3'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

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

    const dbPath = process.env.DATABASE_PATH || '/app/data/coachartie.db'
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    })

    // Build time filter
    let timeFilter = ''
    if (timeRange) {
      const match = timeRange.match(/^(\d+)(h|d|w|m)$/)
      if (match) {
        const [, amount, unit] = match
        const unitMap: Record<string, string> = { h: 'hours', d: 'days', w: 'days', m: 'days' }
        const multiplier = unit === 'w' ? parseInt(amount) * 7 : unit === 'm' ? parseInt(amount) * 30 : parseInt(amount)
        timeFilter = `AND datetime(created_at) >= datetime('now', '-${multiplier} ${unitMap[unit]}')`
      }
    }

    // Get memory count by importance level
    const importanceDistribution = await db.all(`
      SELECT
        importance,
        COUNT(*) as count
      FROM memories
      WHERE importance >= ? ${timeFilter}
      GROUP BY importance
      ORDER BY importance DESC
    `, [minImportance])

    // Get top users by memory count
    const topMemoryUsers = await db.all(`
      SELECT
        user_id,
        COUNT(*) as memory_count,
        AVG(importance) as avg_importance,
        MAX(created_at) as last_memory
      FROM memories
      WHERE importance >= ? ${timeFilter}
      GROUP BY user_id
      ORDER BY memory_count DESC
      LIMIT ?
    `, [minImportance, limit])

    // Get recent high-importance memories
    const importantMemories = await db.all(`
      SELECT
        id,
        content,
        user_id,
        importance,
        tags,
        created_at
      FROM memories
      WHERE importance >= 7 ${timeFilter}
      ORDER BY importance DESC, created_at DESC
      LIMIT ?
    `, [limit])

    // Parse tags from all memories and count frequency
    const allMemories = await db.all(`
      SELECT tags
      FROM memories
      WHERE tags IS NOT NULL AND tags != '[]' ${timeFilter}
    `)

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

    // Get memory creation trend (daily counts)
    const creationTrend = await db.all(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count,
        AVG(importance) as avg_importance
      FROM memories
      WHERE importance >= ? ${timeFilter}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `, [minImportance])

    await db.close()

    return {
      success: true,
      timeRange: timeRange || 'all-time',
      data: {
        top_tags: topTags,
        importance_distribution: importanceDistribution,
        top_users: topMemoryUsers,
        important_memories: importantMemories,
        creation_trend: creationTrend
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
