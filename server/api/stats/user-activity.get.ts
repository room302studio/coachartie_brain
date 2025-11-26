import { defineEventHandler, getQuery } from 'h3'
import { getDb, messages, memories, meetings } from '@coachartie/shared'
import { eq, count, min, max, avg, desc, isNotNull, sql } from 'drizzle-orm'

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

    const db = getDb()

    // Build time filter
    let timeFilterCondition: any = null
    if (timeRange) {
      const match = timeRange.match(/^(\d+)(h|d|w|m)$/)
      if (match) {
        const [, amount, unit] = match
        const unitMap: Record<string, string> = { h: 'hours', d: 'days', w: 'days', m: 'days' }
        const multiplier = unit === 'w' ? parseInt(amount) * 7 : unit === 'm' ? parseInt(amount) * 30 : parseInt(amount)
        timeFilterCondition = sql`datetime(created_at) >= datetime('now', '-${sql.raw(multiplier.toString())} ${sql.raw(unitMap[unit])}')`
      }
    }

    // Get message stats
    const messageStatsQuery = db
      .select({
        messageCount: count(),
        firstMessage: min(messages.createdAt),
        lastMessage: max(messages.createdAt)
      })
      .from(messages)
      .where(timeFilterCondition
        ? sql`${eq(messages.userId, userId)} AND ${timeFilterCondition}`
        : eq(messages.userId, userId)
      )

    const [messageStats] = await messageStatsQuery

    // Get memory stats
    const memoryStatsQuery = db
      .select({
        memoryCount: count(),
        avgImportance: avg(memories.importance),
        firstMemory: min(memories.createdAt),
        lastMemory: max(memories.createdAt)
      })
      .from(memories)
      .where(timeFilterCondition
        ? sql`${eq(memories.userId, userId)} AND ${timeFilterCondition}`
        : eq(memories.userId, userId)
      )

    const [memoryStats] = await memoryStatsQuery

    // Get meeting stats using raw SQL for CASE statements
    const meetingStatsRaw = timeFilterCondition
      ? await db.all(sql.raw(`
          SELECT
            COUNT(*) as meeting_count,
            SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled_count,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count
          FROM meetings
          WHERE user_id = ? AND datetime(created_at) >= datetime('now', '-${timeRange}')
        `), [userId])
      : await db.all(sql.raw(`
          SELECT
            COUNT(*) as meeting_count,
            SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled_count,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count
          FROM meetings
          WHERE user_id = ?
        `), [userId])

    const meetingStats = meetingStatsRaw[0] || { meeting_count: 0, scheduled_count: 0, completed_count: 0 }

    // Get activity by hour of day using raw SQL
    const activityByHour = timeFilterCondition
      ? await db.all(sql.raw(`
          SELECT
            CAST(strftime('%H', created_at) AS INTEGER) as hour,
            COUNT(*) as activity_count
          FROM messages
          WHERE user_id = ? AND datetime(created_at) >= datetime('now', '-${timeRange}')
          GROUP BY hour
          ORDER BY hour
        `), [userId])
      : await db.all(sql.raw(`
          SELECT
            CAST(strftime('%H', created_at) AS INTEGER) as hour,
            COUNT(*) as activity_count
          FROM messages
          WHERE user_id = ?
          GROUP BY hour
          ORDER BY hour
        `), [userId])

    // Get activity by day of week using raw SQL
    const activityByDay = timeFilterCondition
      ? await db.all(sql.raw(`
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
          WHERE user_id = ? AND datetime(created_at) >= datetime('now', '-${timeRange}')
          GROUP BY strftime('%w', created_at)
          ORDER BY strftime('%w', created_at)
        `), [userId])
      : await db.all(sql.raw(`
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
          WHERE user_id = ?
          GROUP BY strftime('%w', created_at)
          ORDER BY strftime('%w', created_at)
        `), [userId])

    // Get most active channels
    const topChannels = await db
      .select({
        channelId: messages.channelId,
        messageCount: count()
      })
      .from(messages)
      .where(
        timeFilterCondition
          ? sql`${eq(messages.userId, userId)} AND ${isNotNull(messages.channelId)} AND ${timeFilterCondition}`
          : sql`${eq(messages.userId, userId)} AND ${isNotNull(messages.channelId)}`
      )
      .groupBy(messages.channelId)
      .orderBy(desc(count()))
      .limit(5)

    return {
      success: true,
      user_id: userId,
      timeRange: timeRange || 'all-time',
      data: {
        overview: {
          message_count: messageStats?.messageCount || 0,
          memory_count: memoryStats?.memoryCount || 0,
          meeting_count: meetingStats?.meeting_count || 0,
          avg_memory_importance: memoryStats?.avgImportance || 0,
          first_activity: messageStats?.firstMessage || memoryStats?.firstMemory || null,
          last_activity: messageStats?.lastMessage || memoryStats?.lastMemory || null
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
