import { defineEventHandler, getQuery } from 'h3'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const limit = query.limit ? parseInt(query.limit as string) : 100
    const userId = query.user_id as string || null
    
    const dbPath = process.env.DATABASE_PATH || '/app/data/coachartie.db'
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    })
    
    let sql = `
      SELECT
        id,
        content,
        user_id,
        created_at,
        tags,
        context,
        importance,
        timestamp,
        related_message_id
      FROM memories
      ORDER BY created_at DESC
      LIMIT ?
    `

    const params = [limit]

    if (userId) {
      sql = `
        SELECT
          id,
          content,
          user_id,
          created_at,
          tags,
          context,
          importance,
          timestamp,
          related_message_id
        FROM memories
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `
      params.unshift(userId)
    }
    
    const memories = await db.all(sql, params)
    await db.close()
    
    return {
      success: true,
      data: memories,
      count: memories.length
    }
  } catch (error) {
    console.error('Error fetching memories:', error)
    return {
      success: false,
      error: error.message,
      data: []
    }
  }
})