import { defineEventHandler, readBody } from 'h3'
import { getDb, memories, eq } from '@coachartie/shared'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { content, user_id, memory_type = 'general', tags, context, importance = 5, related_message_id } = body

    if (!content) {
      return {
        success: false,
        error: 'Content is required'
      }
    }

    const db = getDb()

    // Insert memory
    const timestamp = new Date().toISOString()
    const result = await db.insert(memories).values({
      content,
      userId: user_id || 'anonymous',
      tags: tags || '[]',
      context: context || '',
      importance,
      timestamp,
      relatedMessageId: related_message_id || null
    }).returning()

    return {
      success: true,
      data: result[0]
    }
  } catch (error) {
    console.error('Error creating memory:', error)
    return {
      success: false,
      error: error.message
    }
  }
})