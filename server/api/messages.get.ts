import { defineEventHandler, getQuery } from 'h3'
import { getDb, messages, eq, desc } from '@coachartie/shared'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const limit = query.limit ? parseInt(query.limit as string) : 100
    const userId = query.user_id as string || null

    const db = getDb()

    let results
    if (userId) {
      results = await db.select({
        id: messages.id,
        value: messages.value,
        userId: messages.userId,
        createdAt: messages.createdAt,
        messageType: messages.messageType,
        channelId: messages.channelId,
        guildId: messages.guildId
      })
      .from(messages)
      .where(eq(messages.userId, userId))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
    } else {
      results = await db.select({
        id: messages.id,
        value: messages.value,
        userId: messages.userId,
        createdAt: messages.createdAt,
        messageType: messages.messageType,
        channelId: messages.channelId,
        guildId: messages.guildId
      })
      .from(messages)
      .orderBy(desc(messages.createdAt))
      .limit(limit)
    }

    return {
      success: true,
      data: results,
      count: results.length
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