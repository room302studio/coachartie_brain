import { defineEventHandler, getQuery } from 'h3'
import { getDb, messages, memories, meetings, meetingParticipants } from '@coachartie/shared'
import { sql } from 'drizzle-orm'

/**
 * Flexible analytics endpoint for aggregation queries
 *
 * Query params:
 * - table: messages | memories | meetings (required)
 * - groupBy: column to group by (e.g., user_id, channel_id)
 * - aggregates: comma-separated list (e.g., count,max:created_at,avg:importance)
 * - orderBy: column:direction (e.g., count:desc, user_id:asc)
 * - limit: max results (default 100)
 * - where: JSON object for filters (e.g., {"message_type":"discord"})
 * - timeRange: filter by created_at (e.g., 7d, 24h, 30d)
 *
 * Examples:
 * /api/analytics?table=messages&groupBy=user_id&aggregates=count&orderBy=count:desc&limit=10
 * /api/analytics?table=memories&groupBy=user_id&aggregates=count,avg:importance&timeRange=7d
 * /api/analytics?table=messages&groupBy=channel_id&aggregates=count&where={"message_type":"discord"}
 */

// Security: Whitelist allowed tables, columns, and functions
const ALLOWED_TABLES = ['messages', 'memories', 'meetings', 'meeting_participants']
const ALLOWED_COLUMNS: Record<string, string[]> = {
  messages: ['user_id', 'channel_id', 'guild_id', 'message_type', 'role', 'created_at'],
  memories: ['user_id', 'importance', 'created_at'],
  meetings: ['user_id', 'status', 'created_via', 'scheduled_time', 'created_at'],
  meeting_participants: ['participant_id', 'participant_type', 'status', 'meeting_id']
}
const ALLOWED_AGGREGATES = ['count', 'sum', 'avg', 'min', 'max']

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const table = query.table as string
    const groupBy = query.groupBy as string
    const aggregatesParam = query.aggregates as string || 'count'
    const orderByParam = query.orderBy as string || 'count:desc'
    const limit = query.limit ? parseInt(query.limit as string) : 100
    const whereParam = query.where as string || null
    const timeRange = query.timeRange as string || null

    // Validate table
    if (!table || !ALLOWED_TABLES.includes(table)) {
      return {
        success: false,
        error: `Invalid table. Allowed: ${ALLOWED_TABLES.join(', ')}`,
        data: []
      }
    }

    // Validate groupBy column
    if (!groupBy || !ALLOWED_COLUMNS[table]?.includes(groupBy)) {
      return {
        success: false,
        error: `Invalid groupBy column. Allowed for ${table}: ${ALLOWED_COLUMNS[table]?.join(', ')}`,
        data: []
      }
    }

    const db = getDb()

    // Parse aggregates (e.g., "count,max:created_at,avg:importance")
    const aggregates = aggregatesParam.split(',').map(agg => {
      const [func, col] = agg.trim().split(':')
      if (!ALLOWED_AGGREGATES.includes(func)) {
        throw new Error(`Invalid aggregate function: ${func}`)
      }
      // For functions that need a column
      if (col && !ALLOWED_COLUMNS[table]?.includes(col)) {
        throw new Error(`Invalid column for aggregate: ${col}`)
      }
      return { func, col, alias: col ? `${func}_${col}` : func }
    })

    // Build SELECT clause
    const selectClauses = [groupBy]
    aggregates.forEach(({ func, col, alias }) => {
      if (func === 'count' && !col) {
        selectClauses.push(`COUNT(*) as ${func}`)
      } else if (col) {
        selectClauses.push(`${func.toUpperCase()}(${col}) as ${alias}`)
      }
    })

    // Build WHERE clause
    const whereConditions: string[] = []
    const params: any[] = []

    // Add JSON where filters
    if (whereParam) {
      try {
        const whereObj = JSON.parse(whereParam)
        Object.entries(whereObj).forEach(([key, value]) => {
          if (ALLOWED_COLUMNS[table]?.includes(key)) {
            whereConditions.push(`${key} = ?`)
            params.push(value)
          }
        })
      } catch (e) {
        throw new Error('Invalid where JSON')
      }
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

    // Build ORDER BY clause
    const [orderCol, orderDir] = orderByParam.split(':')
    let orderBy = 'count DESC' // default
    if (orderCol) {
      const direction = orderDir?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'
      // Check if it's an aggregate alias or a column
      const isAggregate = aggregates.find(a => a.alias === orderCol || a.func === orderCol)
      if (isAggregate) {
        orderBy = `${orderCol} ${direction}`
      } else if (ALLOWED_COLUMNS[table]?.includes(orderCol)) {
        orderBy = `${orderCol} ${direction}`
      }
    }

    // Construct final query using raw SQL (since this is a dynamic query builder)
    let sqlQuery = `
      SELECT ${selectClauses.join(', ')}
      FROM ${table}
    `

    if (whereConditions.length > 0) {
      sqlQuery += ` WHERE ${whereConditions.join(' AND ')}`
    }

    sqlQuery += `
      GROUP BY ${groupBy}
      ORDER BY ${orderBy}
      LIMIT ?
    `
    params.push(limit)

    const results = await db.all(sql.raw(sqlQuery), params)

    return {
      success: true,
      query: {
        table,
        groupBy,
        aggregates: aggregatesParam,
        orderBy: orderByParam,
        limit,
        timeRange
      },
      data: results,
      count: results.length
    }
  } catch (error: any) {
    console.error('Error running analytics query:', error)
    return {
      success: false,
      error: error.message,
      data: []
    }
  }
})
