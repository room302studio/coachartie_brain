import { defineEventHandler, getQuery } from 'h3'
import { getDb, getRawDb, memories } from '@coachartie/shared'
import { like, and, gte, eq, desc } from 'drizzle-orm'

/**
 * Search endpoint for memories using LIKE fallback (FTS5 not always available)
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

    // Build conditions array
    const conditions: any[] = [
      like(memories.content, `%${searchQuery}%`)
    ]

    if (userId) {
      conditions.push(eq(memories.userId, userId))
    }

    if (minImportance > 0) {
      conditions.push(gte(memories.importance, minImportance))
    }

    // Use Drizzle ORM with LIKE for simple text search
    const results = await db
      .select()
      .from(memories)
      .where(and(...conditions))
      .orderBy(desc(memories.importance), desc(memories.createdAt))
      .limit(limit)

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
