import { defineEventHandler, getQuery } from 'h3'
import { getDb, memories } from '@coachartie/shared'
import { eq, gte, sql } from 'drizzle-orm'

/**
 * Full-text search endpoint for memories using SQLite FTS5
 *
 * Query params:
 * - q: search query (required)
 * - user_id: filter by user
 * - limit: max results (default 50)
 * - min_importance: filter by importance level
 *
 * Examples:
 * /api/memories/search?q=bananas
 * /api/memories/search?q=meeting project&user_id=user-123&limit=10
 * /api/memories/search?q="exact phrase"&min_importance=7
 */
export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const searchQuery = query.q as string
    const userId = query.user_id as string || null
    const limit = query.limit ? parseInt(query.limit as string) : 50
    const minImportance = query.min_importance ? parseInt(query.min_importance as string) : 0

    if (!searchQuery) {
      return {
        success: false,
        error: 'Search query (q) is required',
        data: []
      }
    }

    const db = getDb()

    // Build query with filters using raw SQL for FTS5
    // FTS5 requires raw SQL for the MATCH operation
    const whereConditions = [`fts.content MATCH ?`]
    const params: any[] = [searchQuery]

    if (userId) {
      whereConditions.push(`m.user_id = ?`)
      params.push(userId)
    }

    if (minImportance > 0) {
      whereConditions.push(`m.importance >= ?`)
      params.push(minImportance)
    }

    params.push(limit)

    const results = await db.all(sql.raw(`
      SELECT
        m.id,
        m.content,
        m.user_id,
        m.tags,
        m.context,
        m.importance,
        m.timestamp,
        m.related_message_id,
        m.created_at,
        fts.rank
      FROM memories_fts fts
      JOIN memories m ON m.id = fts.rowid
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY fts.rank, m.importance DESC, m.created_at DESC
      LIMIT ?
    `), params)

    return {
      success: true,
      query: searchQuery,
      data: results,
      count: results.length
    }
  } catch (error: any) {
    console.error('Error searching memories:', error)
    return {
      success: false,
      error: error.message,
      data: []
    }
  }
})
