import { defineEventHandler } from 'h3'

// set up .env
import dotenv from 'dotenv'
dotenv.config()

// Import Context Alchemy and Prompt Manager for intelligent message building
async function getServices() {
  // Dynamic import to avoid module issues
  const { contextAlchemy } = await import('../../../capabilities/src/services/context-alchemy.js');
  const { promptManager } = await import('../../../capabilities/src/services/prompt-manager.js');
  return { contextAlchemy, promptManager };
}

async function getChatCompletion(
  userMessage = 'Hello!',
  userId = 'brain-user',
  existingMessages = []
) {
  try {
    // Get services and base system prompt from database
    const { contextAlchemy, promptManager } = await getServices();
    const baseSystemPrompt = await promptManager.getCapabilityInstructions(userMessage);
    
    // Use Context Alchemy to build intelligent message chain
    const { messages } = await contextAlchemy.buildMessageChain(
      userMessage,
      userId,
      baseSystemPrompt,
      existingMessages
    );

    // Route through OpenRouter service instead of direct API calls
    const { openRouterService } = await import('../../../capabilities/src/services/openrouter.js');
    const completion = await openRouterService.generateFromMessageChain(messages, userId)
    return completion
  } catch (error) {
    console.error('Error getting chat completion:', error)
    return null
  }
}

export default defineEventHandler(async (event) => {
  try {
    const requestBody = await useBody(event)
    if (!requestBody.data) {
      return createError({
        statusCode: 400,
        statusMessage:
          'There is no data in the request body. Please provide an array of message objects.'
      })
    }

    const chatCompletion = await getChatCompletion(requestBody.data)

    return {
      statusCode: 200,
      statusMessage: 'OK',
      data: chatCompletion
    }
  } catch (error) {
    return createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      error: error.message
    })
  }
})
