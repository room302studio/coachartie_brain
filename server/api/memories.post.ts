import { defineEventHandler, readBody } from 'h3'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import crypto from 'crypto'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { content, user_id, memory_type = 'general', tags, context, importance = 5 } = body
    
    if (!content) {
      return {
        success: false,
        error: 'Content is required'
      }
    }
    
    const dbPath = process.env.DATABASE_PATH || '/Users/ejfox/code/coachartie2/packages/capabilities/data/coachartie.db'
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    })
    
    // Generate content hash
    const contentHash = crypto.createHash('md5').update(content).digest('hex')
    
    // Insert memory
    const timestamp = new Date().toISOString()
    const result = await db.run(
      `INSERT INTO memories (
        content,
        user_id,
        tags,
        context,
        importance,
        created_at,
        timestamp
      ) VALUES (?, ?, ?, ?, ?, datetime('now'), ?)`,
      [content, user_id || 'anonymous', tags || '[]', context || '', importance, timestamp]
    )
    
    // Fetch the inserted memory
    const memory = await db.get(
      'SELECT * FROM memories WHERE id = ?',
      [result.lastID]
    )
    
    await db.close()
    
    return {
      success: true,
      data: memory
    }
  } catch (error) {
    console.error('Error creating memory:', error)
    return {
      success: false,
      error: error.message
    }
  }
})