/**
 * Prompts API Endpoint
 *
 * Uses the shared Drizzle schema - SINGLE SOURCE OF TRUTH
 */

import { defineEventHandler } from 'h3'
import { getDb, prompts, promptHistory, desc, eq } from '@coachartie/shared'

export default defineEventHandler(async () => {
  try {
    const db = getDb()

    const allPrompts = await db
      .select()
      .from(prompts)
      .orderBy(desc(prompts.updatedAt))

    // Fetch history for all prompts and parse metadata
    const promptsWithData = await Promise.all(allPrompts.map(async (prompt) => {
      let metadata: any = {}
      let archived = false

      try {
        if (prompt.metadata) {
          metadata = JSON.parse(prompt.metadata)
          archived = metadata.archived || false
        }
      } catch (e) {
        console.error('Error parsing metadata:', e)
      }

      // Fetch history for this prompt
      const history = await db
        .select()
        .from(promptHistory)
        .where(eq(promptHistory.promptId, prompt.id))
        .orderBy(desc(promptHistory.version))

      // Format history to match expected structure
      const formattedHistory = history.map(h => ({
        timestamp: h.createdAt,
        version: {
          prompt_text: h.content,
          notes: h.changeReason,
          version: h.version
        }
      }))

      return {
        id: prompt.id,
        prompt_name: prompt.name,
        prompt_text: prompt.content,
        notes: prompt.description,
        type: prompt.category,
        active: prompt.isActive,
        metadata: prompt.metadata,
        created_at: prompt.createdAt,
        updated_at: prompt.updatedAt,
        archived,
        history: formattedHistory
      }
    }))

    return {
      success: true,
      data: promptsWithData,
      count: promptsWithData.length
    }
  } catch (error: any) {
    console.error('Error fetching prompts:', error)
    return {
      success: false,
      error: error.message,
      data: []
    }
  }
})
