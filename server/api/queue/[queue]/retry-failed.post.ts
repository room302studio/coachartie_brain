import Redis from 'ioredis'
import { Queue } from 'bullmq'

export default defineEventHandler(async (event) => {
  try {
    const queueName = getRouterParam(event, 'queue')
    
    if (!queueName) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Queue name is required'
      })
    }

    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0')
    })

    const queue = new Queue(queueName, { connection: redis })
    
    // Get all failed jobs
    const failedJobs = await queue.getFailed()
    
    let retriedCount = 0
    
    // Retry each failed job
    for (const job of failedJobs) {
      try {
        await job.retry()
        retriedCount++
      } catch (retryError) {
        console.error(`Failed to retry job ${job.id}:`, retryError)
      }
    }

    await redis.disconnect()

    return {
      success: true,
      retriedCount,
      totalFailed: failedJobs.length
    }

  } catch (error) {
    console.error('Error retrying failed jobs:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to retry failed jobs'
    })
  }
})