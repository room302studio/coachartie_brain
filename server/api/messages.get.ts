import { defineEventHandler, getQuery } from 'h3'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const limit = query.limit ? parseInt(query.limit as string) : 100
    const userId = query.user_id as string || null
    
    const dbPath = process.env.DATABASE_PATH || '/Users/ejfox/code/coachartie2/packages/capabilities/data/coachartie.db'
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    })
    
    // Check if messages table exists
    const tableExists = await db.get(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='messages'
    `)
    
    if (!tableExists) {
      await db.close()
      return {
        success: true,
        data: [],
        message: 'Messages table does not exist yet'
      }
    }
    
    let sql = `
      SELECT 
        id,
        value,
        user_id,
        created_at,
        message_type,
        channel_id,
        guild_id
      FROM messages
      ORDER BY created_at DESC
      LIMIT ?
    `
    
    const params = [limit]
    
    if (userId) {
      sql = `
        SELECT 
          id,
          value,
          user_id,
          created_at,
          message_type,
          channel_id,
          guild_id
        FROM messages
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `
      params.unshift(userId)
    }
    
    const messages = await db.all(sql, params)
    await db.close()
    
    return {
      success: true,
      data: messages,
      count: messages.length
    }
  } catch (error) {
    console.error('Error fetching messages:', error)
    return {
      success: false,
      error: error.message,
      data: []
    }
  }
})