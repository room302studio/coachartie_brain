import { Queue } from 'bullmq'
import { createRedisConnection } from '@coachartie/shared'

export default defineEventHandler(async (event) => {
  try {
    const queueName = getRouterParam(event, 'queue')

    if (!queueName) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Queue name is required'
      })
    }

    const redis = createRedisConnection()

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

    // Don't disconnect - we're using a shared connection

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