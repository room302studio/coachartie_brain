// composables/useTsne.ts
import TSNE from 'tsne-js'
import {
  ref,
  onMounted,
  onUnmounted,
  watch,
  reactive,
  Ref,
  nextTick
} from 'vue'
import { useRafFn } from '@vueuse/core'

// Define the Memory type that we'll be working with
interface Memory {
  id: string
  embedding: number[] | null | any // Some flexibility for different embedding formats
  value: string
  extractedEmbedding?: number[]
  [key: string]: any // Allow for other properties
}

export function useTsne() {
  const tSNE = ref<TSNE | null>(null)
  // Initialize coordinates as an empty array to prevent undefined errors
  const coordinates = ref<[number, number][]>([])
  const iterations = ref(0)
  const maxIterations = ref(500)
  const perplexity = ref(30)
  const isInitialized = ref(false)
  const isRunning = ref(false)

  // Initialize t-SNE with data
  function initialize(data: Memory[]): void {
    try {
      if (!data || data.length === 0) {
        console.error('❌ Cannot initialize t-SNE: No data provided')
        isInitialized.value = false
        return
      }

      console.log(`🔧 Initializing t-SNE with ${data.length} items`)

      // Extract embeddings from each item and get dimensions
      const embeddings = extractEmbeddings(data)

      if (embeddings.length === 0) {
        console.error('❌ No valid embeddings found for t-SNE initialization')
        isInitialized.value = false
        return
      }

      const dimensions = embeddings[0].length
      console.log(`📏 Embedding dimensions: ${dimensions}`)

      // Create a new t-SNE instance with appropriate parameters
      tSNE.value = new TSNE({
        dim: 2,
        perplexity: perplexity.value,
        epsilon: 10 // Learning rate
      })

      // Initialize with the extracted embeddings
      tSNE.value.init({
        data: embeddings,
        type: 'dense'
      })

      isInitialized.value = true
      iterations.value = 0
      console.log('✅ t-SNE initialized successfully')
    } catch (error) {
      console.error('❌ Error initializing t-SNE:', error)
      isInitialized.value = false
    }
  }

  // Extract embeddings from data items
  function extractEmbeddings(data: Memory[]): number[][] {
    console.log('🔎 Extracting embeddings for t-SNE...')

    // Only use memories that have the extractedEmbedding property set
    const withExtractedEmbeddings = data.filter(
      (item) =>
        item.extractedEmbedding &&
        Array.isArray(item.extractedEmbedding) &&
        item.extractedEmbedding.length > 0
    )

    if (withExtractedEmbeddings.length > 0) {
      console.log(
        `🎯 Using ${withExtractedEmbeddings.length} extracted embeddings`
      )

      // Map each memory to its extracted embedding
      const embeddings = withExtractedEmbeddings.map(
        (item) => item.extractedEmbedding as number[]
      )

      if (embeddings.length > 0) {
        console.log(
          '📊 First embedding sample:',
          embeddings[0].slice(0, 5),
          '...'
        )
        console.log('📐 Embedding dimension:', embeddings[0].length)
      }

      return embeddings
    }

    console.warn('⚠️ No valid extracted embeddings found')
    return []
  }

  // Run a single iteration of t-SNE
  function step(): boolean {
    if (!tSNE.value || !isInitialized.value) {
      console.warn('⚠️ Cannot step: t-SNE not initialized')
      return false
    }

    try {
      if (iterations.value >= maxIterations.value) {
        console.log('🏁 Reached maximum iterations')
        isRunning.value = false
        return false
      }

      // Instead of trying to use step(), we'll run the entire t-SNE process
      // This is a change from the original implementation to match the tsne-js API
      if (iterations.value === 0) {
        console.log('🚀 Running t-SNE process...')

        // Run the t-SNE algorithm
        tSNE.value.run()

        // Get the final iteration count
        iterations.value = tSNE.value.getIter()
        const error = tSNE.value.getError()

        console.log(
          `📉 t-SNE completed with ${iterations.value} iterations, final error: ${error}`
        )

        // Get the final coordinates
        updateCoordinates()

        // Mark as complete
        isRunning.value = false
        return false
      }

      // If we've already run once, just increment iterations to show progress
      iterations.value++

      // Log progress periodically
      if (iterations.value % 10 === 0) {
        console.log(
          `📉 t-SNE iteration ${iterations.value}/${maxIterations.value}`
        )
      }

      return true
    } catch (error) {
      console.error('❌ Error in t-SNE step:', error)
      isRunning.value = false
      return false
    }
  }

  // Get current t-SNE coordinates
  function updateCoordinates(): void {
    if (!tSNE.value || !isInitialized.value) {
      console.warn('⚠️ Cannot update coordinates: t-SNE not initialized')
      // Ensure coordinates is always an array even when we can't update it
      coordinates.value = []
      return
    }

    try {
      // Get the output coordinates
      const solution = tSNE.value.getSolution()
      console.log('📊 Raw t-SNE solution:', solution.length, 'points')

      if (!solution || solution.length === 0) {
        console.warn('⚠️ t-SNE solution is empty')
        coordinates.value = []
        return
      }

      // Calculate actual min/max values from the solution
      let minX = Number.POSITIVE_INFINITY
      let maxX = Number.NEGATIVE_INFINITY
      let minY = Number.POSITIVE_INFINITY
      let maxY = Number.NEGATIVE_INFINITY

      // Find the actual min/max values
      solution.forEach((point) => {
        minX = Math.min(minX, point[0])
        maxX = Math.max(maxX, point[0])
        minY = Math.min(minY, point[1])
        maxY = Math.max(maxY, point[1])
      })

      // Add a small buffer to prevent points at the exact edge
      const buffer = 0.05
      minX -= buffer
      maxX += buffer
      minY -= buffer
      maxY += buffer

      console.log('📊 Coordinate ranges:', { minX, maxX, minY, maxY })

      // Scale the coordinates to [0,1] range for our visualization
      const normalizedCoordinates = solution.map((point) => {
        // Normalize to [0,1] range
        const x = (point[0] - minX) / (maxX - minX)
        const y = (point[1] - minY) / (maxY - minY)

        // Ensure values are within [0,1] range (handle any potential numerical errors)
        const safeX = Math.max(0, Math.min(1, x))
        const safeY = Math.max(0, Math.min(1, y))

        return [safeX, safeY] as [number, number]
      })

      // Update the coordinates ref
      coordinates.value = normalizedCoordinates

      if (coordinates.value && coordinates.value.length > 0) {
        console.log(
          `🎯 Updated coordinates for ${coordinates.value.length} points`
        )
        console.log('📍 Sample coordinates:', coordinates.value.slice(0, 3))

        // Log min/max of normalized coordinates to verify they're in [0,1] range
        const normalizedMinX = Math.min(...coordinates.value.map((p) => p[0]))
        const normalizedMaxX = Math.max(...coordinates.value.map((p) => p[0]))
        const normalizedMinY = Math.min(...coordinates.value.map((p) => p[1]))
        const normalizedMaxY = Math.max(...coordinates.value.map((p) => p[1]))

        console.log('📊 Normalized coordinate ranges:', {
          x: [normalizedMinX, normalizedMaxX],
          y: [normalizedMinY, normalizedMaxY]
        })
      }

      // Force a nextTick to ensure Vue reactivity updates
      nextTick(() => {
        if (coordinates.value) {
          console.log(
            '✅ Coordinates updated in next tick, length:',
            coordinates.value.length
          )
        }
      })
    } catch (error) {
      console.error('❌ Error getting t-SNE solution:', error)
      // Ensure coordinates is always an array in case of error
      coordinates.value = []
    }
  }

  // Start t-SNE iterations
  function start(): void {
    if (!isInitialized.value) {
      console.warn('⚠️ Cannot start: t-SNE not initialized')
      return
    }

    isRunning.value = true
    console.log('▶️ Starting t-SNE process')

    // Run the t-SNE process in a single step
    const result = step()
    console.log('t-SNE step result:', result)
    console.log(
      'Coordinates after step:',
      coordinates.value ? coordinates.value.length : 'null'
    )
  }

  // Stop t-SNE iterations
  function stop(): void {
    console.log('⏹️ Stopping t-SNE')
    isRunning.value = false
  }

  // Reset t-SNE
  function reset(): void {
    stop()
    tSNE.value = null
    coordinates.value = []
    iterations.value = 0
    isInitialized.value = false
    console.log('🔄 t-SNE reset')
  }

  return {
    initialize,
    step,
    start,
    stop,
    reset,
    coordinates,
    iterations,
    maxIterations,
    perplexity,
    isInitialized,
    isRunning
  }
}
