import { Queue } from 'bullmq'
import { createRedisConnection } from '@coachartie/shared'

const QUEUES = {
  INCOMING_MESSAGES: 'incoming-messages',
  OUTGOING_DISCORD: 'outgoing-discord',
  OUTGOING_SMS: 'outgoing-sms',
  OUTGOING_EMAIL: 'outgoing-email'
}

export default defineEventHandler(async (event) => {
  try {
    const redis = createRedisConnection()

    const queueStats = []
    const recentJobs = []

    // Get stats for each queue
    for (const [name, queueName] of Object.entries(QUEUES)) {
      try {
        const queue = new Queue(queueName, { connection: redis })
        
        // Get queue counts
        const waiting = await queue.getWaiting()
        const active = await queue.getActive()
        const completed = await queue.getCompleted()
        const failed = await queue.getFailed()
        
        // Calculate processing metrics
        const recentCompleted = completed.slice(0, 100)
        const processingTimes = recentCompleted
          .filter(job => job.processedOn && job.timestamp)
          .map(job => job.processedOn! - job.timestamp)
        
        const avgProcessingTime = processingTimes.length > 0
          ? Math.round(processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length)
          : 0

        // Calculate processing rate (jobs per minute in last 5 minutes)
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000)
        const recentJobs = recentCompleted.filter(job => 
          job.processedOn && job.processedOn > fiveMinutesAgo
        )
        const processingRate = Math.round(recentJobs.length / 5)

        queueStats.push({
          name: queueName,
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          avgProcessingTime,
          processingRate
        })

        // Add recent jobs to the list
        const allJobs = [
          ...waiting.map(job => ({ ...job, status: 'waiting', queue: queueName })),
          ...active.map(job => ({ ...job, status: 'active', queue: queueName })),
          ...completed.slice(0, 10).map(job => ({ ...job, status: 'completed', queue: queueName })),
          ...failed.slice(0, 10).map(job => ({ ...job, status: 'failed', queue: queueName }))
        ]
        
        recentJobs.push(...allJobs)
      } catch (queueError) {
        console.error(`Error getting stats for queue ${queueName}:`, queueError)
        queueStats.push({
          name: queueName,
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          avgProcessingTime: 0,
          processingRate: 0,
          error: queueError.message
        })
      }
    }

    // Sort recent jobs by timestamp
    recentJobs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))

    // Get Redis memory usage
    const redisInfo = await redis.info('memory')
    const memoryMatch = redisInfo.match(/used_memory_human:(.+)/)
    const memoryUsage = memoryMatch ? memoryMatch[1].trim() : 'N/A'

    // Don't disconnect - we're using a shared connection

    return {
      queues: queueStats,
      recentJobs: recentJobs.slice(0, 50).map(job => ({
        id: job.id,
        queue: job.queue,
        status: job.status,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        failedReason: job.failedReason,
        data: job.data ? {
          userId: job.data.userId,
          source: job.data.source,
          messageLength: job.data.message?.length || 0
        } : null
      })),
      redis: {
        memoryUsage,
        connected: true
      }
    }

  } catch (error) {
    console.error('Error fetching queue status:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch queue status'
    })
  }
})