import { defineEventHandler, getQuery } from 'h3'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

/**
 * Get top users by memory count
 *
 * Query params:
 * - limit: max results (default 10)
 * - timeRange: filter by time (e.g., 7d, 24h, 30d)
 *
 * Examples:
 * /api/stats/memory-users?limit=5
 * /api/stats/memory-users?timeRange=7d&limit=10
 */
export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const limit = query.limit ? parseInt(query.limit as string) : 10
    const timeRange = query.timeRange as string || null

    const dbPath = process.env.DATABASE_PATH || '/app/data/coachartie.db'
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    })

    // Check if memories table exists
    const tableExists = await db.get(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='memories'
    `)

    if (!tableExists) {
      await db.close()
      return {
        success: true,
        data: [],
        message: 'Memories table does not exist yet'
      }
    }

    const whereConditions: string[] = []
    const params: any[] = []

    // Add time range filter
    if (timeRange) {
      const match = timeRange.match(/^(\d+)(h|d|w|m)$/)
      if (match) {
        const [, amount, unit] = match
        const unitMap: Record<string, string> = { h: 'hours', d: 'days', w: 'days', m: 'days' }
        const multiplier = unit === 'w' ? parseInt(amount) * 7 : unit === 'm' ? parseInt(amount) * 30 : parseInt(amount)
        whereConditions.push(`datetime(created_at) >= datetime('now', '-${multiplier} ${unitMap[unit]}')`)
      }
    }

    let sql = `
      SELECT
        user_id,
        COUNT(*) as memory_count,
        MAX(created_at) as last_memory_at,
        MIN(created_at) as first_memory_at
      FROM memories
    `

    if (whereConditions.length > 0) {
      sql += ` WHERE ${whereConditions.join(' AND ')}`
    }

    sql += `
      GROUP BY user_id
      ORDER BY memory_count DESC
      LIMIT ?
    `
    params.push(limit)

    const results = await db.all(sql, params)
    await db.close()

    return {
      success: true,
      data: results,
      count: results.length,
      timeRange: timeRange || 'all-time'
    }
  } catch (error: any) {
    console.error('Error fetching memory users:', error)
    return {
      success: false,
      error: error.message,
      data: []
    }
  }
})
