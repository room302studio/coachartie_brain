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
    
    // Clear all jobs in different states
    await queue.clean(0, 1000, 'completed')
    await queue.clean(0, 1000, 'failed')
    await queue.clean(0, 1000, 'active')
    await queue.clean(0, 1000, 'waiting')

    // Don't disconnect - we're using a shared connection

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