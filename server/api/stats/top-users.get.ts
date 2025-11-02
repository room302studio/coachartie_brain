import { defineEventHandler, getQuery } from 'h3'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

/**
 * Get top users by message count
 *
 * Query params:
 * - limit: max results (default 10)
 * - timeRange: filter by time (e.g., 7d, 24h, 30d)
 * - includeArtie: include Artie's messages (default false)
 *
 * Examples:
 * /api/stats/top-users?limit=5
 * /api/stats/top-users?timeRange=7d&limit=10
 */
export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const limit = query.limit ? parseInt(query.limit as string) : 10
    const timeRange = query.timeRange as string || null
    const includeArtie = query.includeArtie === 'true'

    const dbPath = process.env.DATABASE_PATH || '/app/data/coachartie.db'
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

    const whereConditions: string[] = []
    const params: any[] = []

    // Exclude Artie unless requested
    if (!includeArtie) {
      whereConditions.push(`user_id != 'artie'`)
    }

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
        COUNT(*) as message_count,
        MAX(created_at) as last_message_at,
        MIN(created_at) as first_message_at
      FROM messages
    `

    if (whereConditions.length > 0) {
      sql += ` WHERE ${whereConditions.join(' AND ')}`
    }

    sql += `
      GROUP BY user_id
      ORDER BY message_count DESC
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
    console.error('Error fetching top users:', error)
    return {
      success: false,
      error: error.message,
      data: []
    }
  }
})
