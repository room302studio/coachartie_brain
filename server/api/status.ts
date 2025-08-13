import { defineEventHandler } from 'h3'
import { format } from 'date-fns'
import { getDatabase } from '@coachartie/shared'

// Define types for our data structures
interface MessageTypes {
  email: number
  chat: number
  other: number
}

interface QueueStatus {
  completed: number
  error: number
}

interface TimeSeriesPoint {
  timestamp: string
  count: number
}

interface MemoryDistribution {
  name: string
  count: number
}

interface TimeSeriesData {
  messagesCreatedData: TimeSeriesPoint[]
  memoriesCreatedData: TimeSeriesPoint[]
  queueCompletedData: TimeSeriesPoint[]
  queueErrorData: TimeSeriesPoint[]
}

interface MemoryDistributions {
  memoryTypesData: MemoryDistribution[]
  memoryAgeData: MemoryDistribution[]
}

interface StatusData extends TimeSeriesData, MemoryDistributions {
  messageCount: number
  memoryCount: number
  queueCount: number
  messageTypes: MessageTypes
  queueStatus: QueueStatus
  lastUpdated: string
  uptimeDays: number
}

/**
 * API endpoint that returns real usage stats from the database
 */
export default defineEventHandler(async (event) => {
  try {
    const db = await getDatabase()
    
    // Get real counts from database (handle missing tables)
    let memoryCountResult = { count: 0 }
    let messageCountResult = { count: 0 }
    let queueCountResult = { count: 0 }
    let todoCountResult = { count: 0 }
    let configCountResult = { count: 0 }
    
    try {
      memoryCountResult = await db.get('SELECT COUNT(*) as count FROM memories')
    } catch (e) { }
    
    try {
      messageCountResult = await db.get('SELECT COUNT(*) as count FROM messages')
    } catch (e) { }
    
    try {
      queueCountResult = await db.get('SELECT COUNT(*) as count FROM queue')
    } catch (e) { }
    
    try {
      todoCountResult = await db.get('SELECT COUNT(*) as count FROM todos')
    } catch (e) { }
    
    try {
      configCountResult = await db.get('SELECT COUNT(*) as count FROM config')
    } catch (e) { }
    
    // Get memory type distribution (using tags since memory_type doesn't exist)
    const memoryTypesResult = await db.all(`
      SELECT 
        CASE 
          WHEN tags IS NOT NULL AND tags != '' THEN 'tagged'
          ELSE 'general'
        END as name,
        COUNT(*) as count
      FROM memories
      GROUP BY name
      ORDER BY count DESC
    `)
    
    // Get memory age distribution
    const now = new Date()
    const memoryAgeData: MemoryDistribution[] = []
    
    // Today
    const todayCount = await db.get(`
      SELECT COUNT(*) as count FROM memories 
      WHERE datetime(created_at) >= datetime('now', '-1 day')
    `)
    if (todayCount?.count > 0) memoryAgeData.push({ name: 'Today', count: todayCount.count })
    
    // 1-7 days
    const weekCount = await db.get(`
      SELECT COUNT(*) as count FROM memories 
      WHERE datetime(created_at) >= datetime('now', '-7 days')
      AND datetime(created_at) < datetime('now', '-1 day')
    `)
    if (weekCount?.count > 0) memoryAgeData.push({ name: '1-7 days', count: weekCount.count })
    
    // 1-4 weeks
    const monthCount = await db.get(`
      SELECT COUNT(*) as count FROM memories 
      WHERE datetime(created_at) >= datetime('now', '-28 days')
      AND datetime(created_at) < datetime('now', '-7 days')
    `)
    if (monthCount?.count > 0) memoryAgeData.push({ name: '1-4 weeks', count: monthCount.count })
    
    // 3+ months
    const oldCount = await db.get(`
      SELECT COUNT(*) as count FROM memories 
      WHERE datetime(created_at) < datetime('now', '-28 days')
    `)
    if (oldCount?.count > 0) memoryAgeData.push({ name: '3+ months', count: oldCount.count })
    
    // Get time series data for last 24 hours
    const last24Hours = await db.all(`
      SELECT 
        strftime('%Y-%m-%d %H:00:00', created_at) as hour,
        COUNT(*) as count
      FROM memories
      WHERE datetime(created_at) >= datetime('now', '-24 hours')
      GROUP BY hour
      ORDER BY hour
    `)
    
    // Generate full 24-hour timeline
    const timePoints: string[] = []
    const memoriesHourlyMap = new Map()
    
    for (let i = 23; i >= 0; i--) {
      const date = new Date(now)
      date.setHours(now.getHours() - i, 0, 0, 0)
      const timestamp = date.toISOString()
      timePoints.push(timestamp)
    }
    
    // Map actual data to timeline
    last24Hours.forEach(row => {
      const date = new Date(row.hour + ' UTC')
      memoriesHourlyMap.set(date.toISOString(), row.count)
    })
    
    const memoriesCreatedData = timePoints.map(timestamp => ({
      timestamp,
      count: memoriesHourlyMap.get(timestamp) || 0
    }))
    
    // Get message type distribution (if messages table exists)
    let messageTypes: MessageTypes = { email: 0, chat: 0, other: 0 }
    try {
      const messageTypesResult = await db.all(`
        SELECT 
          COALESCE(message_type, 'other') as type,
          COUNT(*) as count
        FROM messages
        GROUP BY message_type
      `)
      
      messageTypesResult.forEach(row => {
        if (row.type === 'email') messageTypes.email = row.count
        else if (row.type === 'chat') messageTypes.chat = row.count
        else messageTypes.other += row.count
      })
    } catch (e) {
      // Messages table might not exist
    }
    
    // Get queue status (if queue table exists)
    let queueStatus: QueueStatus = { completed: 0, error: 0 }
    try {
      const completedCount = await db.get(`
        SELECT COUNT(*) as count FROM queue 
        WHERE status = 'completed'
      `)
      const errorCount = await db.get(`
        SELECT COUNT(*) as count FROM queue 
        WHERE status = 'error' OR error_message IS NOT NULL
      `)
      
      queueStatus.completed = completedCount?.count || 0
      queueStatus.error = errorCount?.count || 0
    } catch (e) {
      // Queue table might not exist
    }
    
    return {
      // Real counts from database
      messageCount: messageCountResult?.count || 0,
      memoryCount: memoryCountResult?.count || 0,
      queueCount: queueCountResult?.count || 0,
      todoCount: todoCountResult?.count || 0,
      configCount: configCountResult?.count || 0,
      
      // Distributions
      messageTypes,
      queueStatus,
      
      // Meta
      lastUpdated: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
      uptimeDays: 30, // Could calculate from earliest record
      
      // Time series
      messagesCreatedData: memoriesCreatedData, // Using memories for now
      memoriesCreatedData,
      queueCompletedData: timePoints.map(t => ({ timestamp: t, count: 0 })),
      queueErrorData: timePoints.map(t => ({ timestamp: t, count: 0 })),
      
      // Memory distributions
      memoryTypesData: memoryTypesResult || [],
      memoryAgeData
    } as StatusData
    
  } catch (error) {
    console.error('Error fetching real status data:', error)
    
    // Return minimal real data on error
    return {
      error: error.message,
      messageCount: 0,
      memoryCount: 0,
      queueCount: 0,
      messageTypes: { email: 0, chat: 0, other: 0 },
      queueStatus: { completed: 0, error: 0 },
      lastUpdated: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
      uptimeDays: 0,
      messagesCreatedData: [],
      memoriesCreatedData: [],
      queueCompletedData: [],
      queueErrorData: [],
      memoryTypesData: [],
      memoryAgeData: []
    }
  }
})