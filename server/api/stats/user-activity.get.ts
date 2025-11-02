import { defineEventHandler, getQuery } from 'h3'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

/**
 * Get activity statistics for a specific user
 *
 * Query params:
 * - user_id: user to analyze (required)
 * - timeRange: filter by time (e.g., 7d, 24h, 30d)
 *
 * Returns:
 * - message_count, memory_count, meeting_count
 * - first/last activity timestamps
 * - activity by day/hour
 *
 * Examples:
 * /api/stats/user-activity?user_id=user-123
 * /api/stats/user-activity?user_id=user-123&timeRange=7d
 */
export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const userId = query.user_id as string
    const timeRange = query.timeRange as string || null

    if (!userId) {
      return {
        success: false,
        error: 'user_id parameter is required',
        data: null
      }
    }

    const dbPath = process.env.DATABASE_PATH || '/app/data/coachartie.db'
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    })

    // Build time filter
    let timeFilter = ''
    if (timeRange) {
      const match = timeRange.match(/^(\d+)(h|d|w|m)$/)
      if (match) {
        const [, amount, unit] = match
        const unitMap: Record<string, string> = { h: 'hours', d: 'days', w: 'days', m: 'days' }
        const multiplier = unit === 'w' ? parseInt(amount) * 7 : unit === 'm' ? parseInt(amount) * 30 : parseInt(amount)
        timeFilter = `AND datetime(created_at) >= datetime('now', '-${multiplier} ${unitMap[unit]}')`
      }
    }

    // Get message stats
    const messageStats = await db.get(`
      SELECT
        COUNT(*) as message_count,
        MIN(created_at) as first_message,
        MAX(created_at) as last_message
      FROM messages
      WHERE user_id = ? ${timeFilter}
    `, [userId])

    // Get memory stats
    const memoryStats = await db.get(`
      SELECT
        COUNT(*) as memory_count,
        AVG(importance) as avg_importance,
        MIN(created_at) as first_memory,
        MAX(created_at) as last_memory
      FROM memories
      WHERE user_id = ? ${timeFilter}
    `, [userId])

    // Get meeting stats
    const meetingStats = await db.get(`
      SELECT
        COUNT(*) as meeting_count,
        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled_count,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count
      FROM meetings
      WHERE user_id = ? ${timeFilter}
    `, [userId])

    // Get activity by hour of day
    const activityByHour = await db.all(`
      SELECT
        CAST(strftime('%H', created_at) AS INTEGER) as hour,
        COUNT(*) as activity_count
      FROM messages
      WHERE user_id = ? ${timeFilter}
      GROUP BY hour
      ORDER BY hour
    `, [userId])

    // Get activity by day of week
    const activityByDay = await db.all(`
      SELECT
        CASE CAST(strftime('%w', created_at) AS INTEGER)
          WHEN 0 THEN 'Sunday'
          WHEN 1 THEN 'Monday'
          WHEN 2 THEN 'Tuesday'
          WHEN 3 THEN 'Wednesday'
          WHEN 4 THEN 'Thursday'
          WHEN 5 THEN 'Friday'
          WHEN 6 THEN 'Saturday'
        END as day_name,
        COUNT(*) as activity_count
      FROM messages
      WHERE user_id = ? ${timeFilter}
      GROUP BY strftime('%w', created_at)
      ORDER BY strftime('%w', created_at)
    `, [userId])

    // Get most active channels
    const topChannels = await db.all(`
      SELECT
        channel_id,
        COUNT(*) as message_count
      FROM messages
      WHERE user_id = ? AND channel_id IS NOT NULL ${timeFilter}
      GROUP BY channel_id
      ORDER BY message_count DESC
      LIMIT 5
    `, [userId])

    await db.close()

    return {
      success: true,
      user_id: userId,
      timeRange: timeRange || 'all-time',
      data: {
        overview: {
          message_count: messageStats?.message_count || 0,
          memory_count: memoryStats?.memory_count || 0,
          meeting_count: meetingStats?.meeting_count || 0,
          avg_memory_importance: memoryStats?.avg_importance || 0,
          first_activity: messageStats?.first_message || memoryStats?.first_memory || null,
          last_activity: messageStats?.last_message || memoryStats?.last_memory || null
        },
        meetings: {
          scheduled: meetingStats?.scheduled_count || 0,
          completed: meetingStats?.completed_count || 0
        },
        patterns: {
          by_hour: activityByHour,
          by_day: activityByDay,
          top_channels: topChannels
        }
      }
    }
  } catch (error: any) {
    console.error('Error fetching user activity:', error)
    return {
      success: false,
      error: error.message,
      data: null
    }
  }
})
