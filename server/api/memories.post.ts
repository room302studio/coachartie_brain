import { defineEventHandler, readBody } from 'h3'
import { getDatabase } from '@coachartie/shared'
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
    
    const db = await getDatabase()
    
    // Generate content hash
    const contentHash = crypto.createHash('md5').update(content).digest('hex')
    
    // Insert memory
    const result = await db.run(
      `INSERT INTO memories (
        value,
        user_id,
        memory_type,
        tags,
        context,
        importance,
        content_hash,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [content, user_id || 'anonymous', memory_type, tags, context, importance, contentHash]
    )
    
    // Fetch the inserted memory
    const memory = await db.get(
      'SELECT * FROM memories WHERE id = ?',
      [result.lastID]
    )
    
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