import { defineEventHandler } from 'h3'
import { getDb, memories } from '@coachartie/shared'
import { count } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const dbPath = process.env.DATABASE_PATH || '/app/data/coachartie.db'
    const db = getDb()

    const [countResult] = await db.select({ count: count() }).from(memories)
    const sample = await db.select({
      id: memories.id,
      userId: memories.userId,
      createdAt: memories.createdAt
    }).from(memories).limit(3)

    return {
      success: true,
      dbPath,
      memoryCount: countResult?.count,
      sampleMemories: sample
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      stack: error.stack
    }
  }
})