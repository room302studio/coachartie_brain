/**
 * Memories API Endpoint
 *
 * Uses the shared Drizzle schema - SINGLE SOURCE OF TRUTH
 */

import { defineEventHandler, getQuery } from 'h3'
import { getDb, memories, desc, eq } from '@coachartie/shared'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const limit = query.limit ? parseInt(query.limit as string) : 100
    const userId = query.user_id as string || null

    const db = getDb()

    let results
    if (userId) {
      results = await db
        .select()
        .from(memories)
        .where(eq(memories.userId, userId))
        .orderBy(desc(memories.createdAt))
        .limit(limit)
    } else {
      results = await db
        .select()
        .from(memories)
        .orderBy(desc(memories.createdAt))
        .limit(limit)
    }

    return {
      success: true,
      data: results,
      count: results.length
    }
  } catch (error: any) {
    console.error('Error fetching memories:', error)
    return {
      success: false,
      error: error.message,
      data: []
    }
  }
})
