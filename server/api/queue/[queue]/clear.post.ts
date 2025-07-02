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
    
    // Clear all jobs in different states
    await queue.clean(0, 1000, 'completed')
    await queue.clean(0, 1000, 'failed')
    await queue.clean(0, 1000, 'active')
    await queue.clean(0, 1000, 'waiting')

    await redis.disconnect()

    return {
      success: true,
      message: `Queue ${queueName} cleared successfully`
    }

  } catch (error) {
    console.error('Error clearing queue:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to clear queue'
    })
  }
})