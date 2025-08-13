import { defineEventHandler } from 'h3'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

export default defineEventHandler(async (event) => {
  try {
    const dbPath = process.env.DATABASE_PATH || '/Users/ejfox/code/coachartie2/packages/capabilities/data/coachartie.db'
    
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    })
    
    const count = await db.get('SELECT COUNT(*) as count FROM memories')
    const sample = await db.all('SELECT id, user_id, created_at FROM memories LIMIT 3')
    
    await db.close()
    
    return {
      success: true,
      dbPath,
      memoryCount: count?.count,
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