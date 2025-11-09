import { defineEventHandler } from 'h3'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

export default defineEventHandler(async (event) => {
  try {
    const dbPath = process.env.DATABASE_PATH || '/app/data/coachartie.db'
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    })

    const prompts = await db.all(`
      SELECT
        id,
        name as prompt_name,
        content as prompt_text,
        description as notes,
        category as type,
        is_active as active,
        metadata,
        created_at,
        updated_at
      FROM prompts
      ORDER BY updated_at DESC
    `)

    // Fetch history for all prompts and parse metadata
    const promptsWithData = await Promise.all(prompts.map(async (prompt) => {
      let metadata = {}
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
      const history = await db.all(`
        SELECT
          version,
          content,
          change_reason,
          created_at as timestamp
        FROM prompt_history
        WHERE prompt_id = ?
        ORDER BY version DESC
      `, [prompt.id])

      // Format history to match expected structure
      const formattedHistory = history.map(h => ({
        timestamp: h.timestamp,
        version: {
          prompt_text: h.content,
          notes: h.change_reason,
          version: h.version
        }
      }))

      return {
        ...prompt,
        archived,
        history: formattedHistory
      }
    }))

    await db.close()

    return {
      success: true,
      data: promptsWithData,
      count: promptsWithData.length
    }
  } catch (error) {
    console.error('Error fetching prompts:', error)
    return {
      success: false,
      error: error.message,
      data: []
    }
  }
})
