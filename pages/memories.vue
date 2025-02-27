<template>
  <div>
    <div class="mb-2 border-b border-gray-800 pb-1 flex justify-between items-center">
      <span class="text-base">MEMORIES</span>
      <input v-model="searchQuery" placeholder="SEARCH" class="text-xs border border-gray-800 p-1 w-36" />
    </div>

    <div class="p-2">
      <div class="flex flex-col gap-2 relative">
        <!-- Memory Feed (Primary) -->
        <div class="flex-grow border border-gray-800">
          <div class="p-1">
            <div class="mb-1 border-b border-gray-800 pb-1 flex justify-between">
              <span class="text-xs">MEMORY_FEED</span>
              <span class="text-xs">[{{ visibleMemories.length }}]</span>
            </div>

            <div class="space-y-1 overflow-y-auto" style="height: 35vh;">
              <div v-for="memory in visibleMemories" :key="memory.id" :id="`memory-${memory.id}`"
                class="border border-gray-800 mb-1 cursor-pointer memory-item"
                :class="{ 'border-gray-500': selectedMemoryId === memory.id }" @click="selectMemoryById(memory.id)">
                <div class="flex items-center justify-between border-b border-gray-800 p-1">
                  <span class="text-xs font-mono">[{{ memory.user_id || 'SYSTEM' }}]</span>
                  <span class="text-xs font-mono">{{ formatDate(memory.created_at) }}</span>
                </div>
                <pre class="text-xs p-1 whitespace-pre-wrap break-words overflow-y-auto">{{ memory.value }}</pre>
                <div class="text-[9px] p-1 pt-0 text-gray-500 flex flex-wrap gap-x-2 border-t border-gray-800">
                  <span v-if="memory.memory_type">TYPE:{{ memory.memory_type }}</span>
                  <span v-if="memory.related_message_id">MSG:{{ memory.related_message_id }}</span>
                  <span>ID:{{ memory.id }}</span>
                  <span v-if="memory.resource_id">RES:{{ memory.resource_id }}</span>
                  <span v-if="memory.conversation_id">CONV:{{ memory.conversation_id }}</span>
                  <span v-if="memory.metadata" class="cursor-help"
                    :title="JSON.stringify(memory.metadata)">META:✓</span>
                </div>
              </div>

              <div v-if="visibleMemories.length === 0" class="text-center py-2 border border-dashed border-gray-800">
                <span class="text-xs font-mono">NO_MEMORIES_TO_DISPLAY</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Embedding Map (Fixed at bottom) -->
        <div v-if="showEmbeddingMap" class="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-700 z-40"
          style="height: 30vh;">
          <div class="p-1 h-full">
            <div class="flex justify-between items-center border-b border-gray-700 mb-1 pb-1">
              <span class="text-xs font-mono">MEM_VISUALIZATION</span>
              <div class="flex gap-2 items-center">
                <span class="text-xs font-mono">{{ memoryPositions.length }}</span>
                <button @click="closeEmbeddingMap" class="text-xs px-2 hover:bg-gray-800 transition-colors">×</button>
              </div>
            </div>

            <div class="h-full">
              <!-- Memory Visualization -->
              <div class="h-full w-full relative" ref="vizContainer">
                <svg ref="vizSvg" width="100%" height="100%" class="w-full h-full" style="background-color: #000;">
                  <!-- Major grid lines -->
                  <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#333" stroke-width="1" />
                  <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#333" stroke-width="1" />

                  <!-- Minor grid lines - horizontal -->
                  <line v-for="i in 8" :key="`h-${i}`" x1="0" :y1="`${i * 10}%`" x2="100%" :y2="`${i * 10}%`"
                    stroke="#222" stroke-width="0.5" />

                  <!-- Minor grid lines - vertical -->
                  <line v-for="i in 8" :key="`v-${i}`" :x1="`${i * 10}%`" y1="0" :x2="`${i * 10}%`" y2="100%"
                    stroke="#222" stroke-width="0.5" />

                  <!-- Coordinates indicator - horizontal -->
                  <text v-for="i in 10" :key="`coord-h-${i}`" :x="`${i * 10}%`" y="98%" fill="#444" font-size="8"
                    text-anchor="middle" font-family="monospace">
                    {{ (i / 10).toFixed(1) }}
                  </text>

                  <!-- Coordinates indicator - vertical -->
                  <text v-for="i in 10" :key="`coord-v-${i}`" x="1%" :y="`${i * 10}%`" fill="#444" font-size="8"
                    text-anchor="start" font-family="monospace">
                    {{ (i / 10).toFixed(1) }}
                  </text>

                  <!-- Memory points -->
                  <circle v-for="(position, index) in memoryPositions" :key="index" :cx="xScale(position.x)"
                    :cy="yScale(position.y)" r="8" fill="#00aaff" stroke="#ffffff" stroke-width="2" class="memory-point"
                    @click="selectMemoryById(position.id)" />

                  <!-- Fallback message if no memory positions -->
                  <text v-if="memoryPositions.length === 0 && !(coordinates.value && coordinates.value.length > 0)"
                    x="50%" y="50%" fill="#666" font-size="12" text-anchor="middle" font-family="monospace">
                    NO EMBEDDING DATA AVAILABLE
                  </text>

                  <!-- Loading indicator when TSNE is running -->
                  <g v-if="isRunning" class="loading-indicator">
                    <circle cx="50%" cy="50%" r="30" fill="none" stroke="#6666ff" stroke-width="2"
                      stroke-dasharray="10 5">
                      <animateTransform attributeName="transform" attributeType="XML" type="rotate" from="0 50% 50%"
                        to="360 50% 50%" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <text x="50%" y="50%" fill="#6666ff" font-size="10" text-anchor="middle" font-family="monospace"
                      dy="4">
                      PROCESSING
                    </text>
                    <text x="50%" y="60%" fill="#6666ff" font-size="8" text-anchor="middle" font-family="monospace">
                      {{ iterations }}/{{ maxIterations }}
                    </text>
                  </g>
                </svg>

                <!-- Status and controls -->
                <div class="absolute top-1 left-1 text-[10px] font-mono flex gap-2 items-center z-50">
                  <span v-if="memoryPositions.length > 0">{{ memoryPositions.length }}</span>
                  <span class="px-1 py-0.5 border border-gray-800">{{ visualizationStatus }}</span>
                  <button @click="fetchMemories()"
                    class="px-1 py-0.5 border border-gray-800 hover:bg-gray-900 cursor-pointer">
                    REFRESH
                  </button>
                  <button v-if="!isRunning && memoriesWithEmbeddings.length > 0" @click="runTsne()"
                    class="px-1 py-0.5 border border-gray-800 hover:bg-gray-900 cursor-pointer">
                    RUN_TSNE
                  </button>
                  <button v-if="isRunning" @click="stopTsne()"
                    class="px-1 py-0.5 border border-gray-800 hover:bg-gray-900 cursor-pointer">
                    STOP
                  </button>
                </div>

                <!-- Memory details on selected point -->
                <div v-if="selectedMemoryIndex !== null && dataRef[selectedMemoryIndex]"
                  class="absolute bottom-1 right-1 border border-gray-800 p-1 text-[10px] bg-black z-10 max-w-[200px]">
                  <div class="font-mono">[{{ dataRef[selectedMemoryIndex].user_id || 'SYSTEM' }}]</div>
                  <div class="truncate">{{ dataRef[selectedMemoryIndex].value.substring(0, 30) }}...</div>
                  <div class="text-gray-500">
                    {{ formatDate(dataRef[selectedMemoryIndex].created_at) }}
                  </div>
                </div>

                <!-- Empty state message -->
                <div v-if="memoryPositions.length === 0"
                  class="absolute inset-0 flex items-center justify-center text-xs border border-dashed border-gray-800">
                  <div class="text-center p-1">
                    <div class="font-mono">NO_DATA</div>
                  </div>
                </div>

                <!-- Tooltip for hovered memory -->
                <div v-if="hoveredMemoryIndex !== null && dataRef[hoveredMemoryIndex]"
                  class="absolute border border-gray-800 p-1 text-xs bg-black z-10" :style="{
                    top: `${mouseY + 5}px`,
                    left: `${mouseX + 5}px`,
                    maxWidth: '200px'
                  }">
                  <div class="mb-1 font-mono">[{{ dataRef[hoveredMemoryIndex].user_id || 'SYSTEM' }}]</div>
                  <div class="truncate">{{ dataRef[hoveredMemoryIndex].value.substring(0, 50) }}...</div>
                  <div class="text-[9px] text-gray-500">
                    {{ formatDate(dataRef[hoveredMemoryIndex].created_at) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Show button to re-open map if closed -->
        <button v-if="!showEmbeddingMap" @click="showEmbeddingMap = true"
          class="fixed bottom-1 right-1 bg-gray-900 text-xs border border-gray-800 p-1 z-10 font-mono">
          SHOW_MAP
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import * as d3 from 'd3'
import { ref, computed, onMounted, watch, onUnmounted, nextTick } from 'vue'
import { format } from 'date-fns'
import { useWindowSize, useElementSize, useElementVisibility } from '@vueuse/core'
import { useStaggeredAnimation } from '~/composables/useStaggeredAnimation'
import { stagger } from '~/anime.esm.js'
import { useSupabaseClient } from '#imports'
import { useTsne } from '~/composables/useTsne'

// Window and visualization dimensions
const { width: windowWidth } = useWindowSize()
const width = computed(() => windowWidth.value)
const vizHeight = computed(() => {
  if (vizContainer.value) {
    return vizContainer.value.clientHeight
  }
  return 0
})

// Visualization refs and state
const vizSvg = ref(null)
const vizContainer = ref(null)
const { width: svgWidth, height: svgHeight } = useElementSize(vizSvg)
const isMapVisible = useElementVisibility(vizContainer)
const hoveredMemoryIndex = ref(null)
const selectedMemoryIndex = ref(null)
const selectedMemoryId = ref(null)
const mouseX = ref(0)
const mouseY = ref(0)
const searchQuery = ref('')
const showEmbeddingMap = ref(true) // Control visibility of embedding map

// Data state
const supabase = useSupabaseClient()
const dataRef = ref([])
const memories = ref([])
const memoryIdToIndex = ref({}) // Map memory IDs to indices in dataRef

// Metadata state - for t-SNE input
const memoriesWithEmbeddings = ref([])

// Use the tSNE implementation
const {
  initialize,
  start,
  stop,
  reset,
  coordinates,
  iterations,
  maxIterations,
  isInitialized,
  isRunning
} = useTsne()

// Animation setup
const { animateStaggered } = useStaggeredAnimation()

// Compute visualization status
const visualizationStatus = computed(() => {
  // Check if we have any memories at all
  if (!memories.value || memories.value.length === 0) {
    return 'NO_MEMORIES'
  }

  // Check if we have any valid embeddings
  const withEmbeddings = memoriesWithEmbeddings.value.length
  if (withEmbeddings === 0) {
    return 'NO_EMBEDDINGS'
  }

  // Check if t-SNE is initialized
  if (!isInitialized.value) {
    return `INITIALIZING (${withEmbeddings})`
  }

  // Check if t-SNE is running
  if (isRunning.value) {
    return `RUNNING (${withEmbeddings}, ${iterations.value}/${maxIterations.value})`
  }

  // Ready state
  return `READY (${withEmbeddings})`
})

// Scales for visualization
const xScale = computed(() => {
  // Always map from [0,1] to the full width
  return d3.scaleLinear()
    .domain([0, 1])
    .range([10, svgWidth.value - 10])
})

const yScale = computed(() => {
  // Always map from [0,1] to the visualization height
  return d3.scaleLinear()
    .domain([0, 1])
    .range([10, vizHeight.value - 10])
})

// Extract embeddings from memory object
function extractEmbeddingFromMemory(memory) {
  if (!memory || !memory.embedding) return null

  // Case 1: Direct array
  if (Array.isArray(memory.embedding) && memory.embedding.length > 0) {
    return memory.embedding
  }

  // Case 2: String format (most common with pgvector)
  if (typeof memory.embedding === 'string') {
    try {
      const parsed = JSON.parse(memory.embedding)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    } catch (e) {
      // Not JSON, try pgvector format
      if (memory.embedding.includes(',')) {
        const values = memory.embedding.replace(/[\[\]\(\)]/g, '').split(',')
          .map(v => parseFloat(v.trim()))
          .filter(v => !isNaN(v))

        if (values.length > 0) {
          return values
        }
      }
    }
  }

  return null
}

// Fetch memories data with embeddings
const isLoading = ref(false)

async function fetchMemories() {
  console.log('🔄 Fetching memories with embeddings...')
  isLoading.value = true

  // Track our pagination and results
  let offset = 0
  const pageSize = 100
  let foundEmbeddings = []
  let totalFetched = 0
  const maxFetchAttempts = 5 // Maximum number of fetch attempts (500 memories total)

  try {
    // Keep fetching until we find enough embeddings or reach our limit
    for (let attempt = 0; attempt < maxFetchAttempts; attempt++) {
      console.log(`📚 Fetch attempt ${attempt + 1}/${maxFetchAttempts}, offset: ${offset}`)

      // Query with pagination
      const { data, error } = await supabase
        .from('memories')
        .select('id, value, user_id, created_at, memory_type, related_message_id, conversation_id, metadata, resource_id, embedding')
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1)

      if (error) throw error

      if (!data || data.length === 0) {
        console.log('⚠️ No more memories to fetch')
        break
      }

      totalFetched += data.length
      console.log(`📚 Received ${data.length} memories from database (total: ${totalFetched})`)

      // Process this batch of memories
      data.forEach(memory => {
        memory.extractedEmbedding = extractEmbeddingFromMemory(memory)
      })

      // Filter to only those with successfully extracted embeddings
      const withEmbeddings = data.filter(memory =>
        memory.extractedEmbedding &&
        Array.isArray(memory.extractedEmbedding) &&
        memory.extractedEmbedding.length > 0
      )

      console.log(`📊 Found ${withEmbeddings.length} memories with embeddings in this batch`)

      // Add these to our collection
      foundEmbeddings = foundEmbeddings.concat(withEmbeddings)

      // If we've found enough embeddings, we can stop
      if (foundEmbeddings.length >= 50) { // Increased from 20 to 50 for better visualization
        console.log(`✅ Found ${foundEmbeddings.length} memories with embeddings - sufficient for visualization`)
        break
      }

      // If we got fewer results than pageSize, we've reached the end
      if (data.length < pageSize) {
        console.log('⚠️ Reached the end of available memories')
        break
      }

      // Update offset for next page
      offset += pageSize
    }

    // Report on our findings
    console.log(`📊 Final results: Found ${foundEmbeddings.length} memories with embeddings out of ${totalFetched} total`)

    // Store all fetched memories (with and without embeddings)
    memories.value = foundEmbeddings.length > 0 ? foundEmbeddings : []
    dataRef.value = memories.value

    // Create index mapping for all memories
    memoryIdToIndex.value = {} // Reset the mapping
    memories.value.forEach((memory, index) => {
      memoryIdToIndex.value[memory.id] = index
    })

    // If no embeddings found after all attempts, log the issue
    if (foundEmbeddings.length === 0) {
      console.warn('⚠️ NO EMBEDDINGS FOUND after searching through', totalFetched, 'memories')

      // Fall back to random positions
      console.warn('⚠️ No valid vectors found. Falling back to random positions.')
      generateRandomPositions()
    } else {
      // Store the filtered memories with embeddings
      memoriesWithEmbeddings.value = foundEmbeddings

      // Initialize visualization with the found embeddings
      console.log('🚀 Initializing t-SNE with', foundEmbeddings.length, 'memory embeddings')
      initializeTsne()

      // Automatically run TSNE after initialization
      setTimeout(() => {
        if (isInitialized.value && !isRunning.value) {
          console.log('🚀 Auto-starting t-SNE process')
          runTsne()
        }
      }, 500)
    }
  } catch (error) {
    console.error('Error fetching memories:', error)
  } finally {
    isLoading.value = false
    console.log('🔄 Fetch complete. Current state:', {
      totalMemories: memories.value.length,
      withEmbeddings: memoriesWithEmbeddings.value?.length || 0
    })
  }
}

// Generate random positions as fallback
function generateRandomPositions() {
  console.log('Generating random positions for all memories:', dataRef.value.length)

  // Initialize t-SNE with random positions
  const randomPositions = dataRef.value.map((memory, i) => {
    const idHash = memory.id ? memory.id.toString().split('').reduce((a, b) => a + b.charCodeAt(0), 0) : i
    return [
      (idHash % 100) / 100,
      (idHash % 50) / 100
    ]
  })

  // Use these random positions instead of t-SNE coordinates
  coordinates.value = randomPositions

  console.log('Generated random positions:', randomPositions.length)
}

// Check if a memory is in the current filtered view
function isMemoryVisible(memoryId) {
  return visibleMemories.value.some(memory => memory.id === memoryId)
}

// Format date
function formatDate(timestamp) {
  return format(new Date(timestamp), 'MM-dd-yy HH:mm:ss')
}

// Log memory structure to help debug available fields
function logMemoryStructure() {
  if (memories.value && memories.value.length > 0) {
    console.log('Sample memory data:', memories.value[0])
    return 'Memory structure logged to console'
  }
  return 'No memories to log'
}

// Visible memories (filtered by search or cluster)
const visibleMemories = computed(() => {
  let filtered = memories.value

  // Apply search filter if there's a query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(memory =>
      memory.value.toLowerCase().includes(query) ||
      (memory.user_id && memory.user_id.toLowerCase().includes(query))
    )
  }

  return filtered.slice(0, 50) // Limit to 50 memories for performance
})

// Select memory from list by ID
function selectMemoryById(memoryId) {
  selectedMemoryId.value = memoryId

  // Find the corresponding index in dataRef
  const index = dataRef.value.findIndex(m => m.id === memoryId)
  if (index !== -1) {
    selectedMemoryIndex.value = index
  }
}

// Track mouse position for tooltip
function trackMouse(event) {
  const rect = vizSvg.value.getBoundingClientRect()
  mouseX.value = event.clientX - rect.left
  mouseY.value = event.clientY - rect.top
}

// Lifecycle hooks
onMounted(() => {
  // Fetch memories with embeddings on mount
  fetchMemories()

  // Add event listener for mouse movement
  if (vizSvg.value) {
    vizSvg.value.addEventListener('mousemove', trackMouse)
  }

  // Watch for changes in SVG dimensions
  watch([svgWidth, svgHeight, vizHeight], ([newWidth, newHeight, newVizHeight]) => {
    console.log('SVG dimensions changed:', {
      width: newWidth,
      height: newHeight,
      vizHeight: newVizHeight
    })
  })

  // Watch for changes in coordinates and force a redraw
  watch(coordinates, (newCoords) => {
    if (!newCoords) {
      console.log('🔄 Coordinates updated but are null or undefined')
      return
    }

    console.log(`🔄 Coordinates updated with ${newCoords.length} points, forcing redraw`)

    // Ensure memory positions are recalculated
    nextTick(() => {
      console.log(`Memory positions after coordinates update: ${memoryPositions.value.length}`)
    })
  })
})

// Clean up on component unmount
onUnmounted(() => {
  // Remove event listener
  if (vizSvg.value) {
    vizSvg.value.removeEventListener('mousemove', trackMouse)
  }

  // Stop t-SNE processing
  stop()
})

// Run button click handler
function runTsne() {
  if (!isInitialized.value) {
    initializeTsne()
  }
  start()
}

// Stop button click handler
function stopTsne() {
  stop()
}

// Initialize t-SNE with current memory data
function initializeTsne() {
  console.log('📊 Initializing t-SNE with memories with embeddings')
  if (memoriesWithEmbeddings.value.length === 0) {
    console.warn('⚠️ No memories with embeddings available')
    return
  }

  // Reset previous state
  reset()

  // Initialize with current embeddings
  initialize(memoriesWithEmbeddings.value)

  console.log(`🚀 t-SNE initialized with ${memoriesWithEmbeddings.value.length} memory embeddings`)

  // Automatically start t-SNE process if we're initializing for the first time
  if (!isRunning.value) {
    start()
  }
}

// Use coordinates computed from t-SNE for visualization
const memoryPositions = computed(() => {
  console.log('Computing memory positions:', {
    coordinatesLength: coordinates.value && coordinates.value.length || 0,
    memoriesWithEmbeddingsLength: memoriesWithEmbeddings.value.length
  })

  if (!coordinates.value || coordinates.value.length === 0 || memoriesWithEmbeddings.value.length === 0) {
    console.log('No coordinates or memories with embeddings available')
    return []
  }

  // Map coordinates to memory items
  const positions = memoriesWithEmbeddings.value.map((memory, index) => {
    // Make sure we have a valid coordinate for this index
    if (index >= coordinates.value.length) {
      console.warn(`Missing coordinate for memory at index ${index}`)
      return null
    }

    const position = coordinates.value[index]

    // Validate position values
    if (!position || position.length !== 2 ||
      typeof position[0] !== 'number' || typeof position[1] !== 'number' ||
      isNaN(position[0]) || isNaN(position[1])) {
      console.warn(`Invalid position for memory at index ${index}:`, position)
      return null
    }

    // Ensure position is within [0,1] range
    const x = Math.max(0, Math.min(1, position[0]))
    const y = Math.max(0, Math.min(1, position[1]))

    // Ensure this memory ID is in the memoryIdToIndex mapping
    if (memory.id !== undefined && memoryIdToIndex.value[memory.id] === undefined) {
      memoryIdToIndex.value[memory.id] = index
    }

    return {
      id: memory.id,
      x,
      y,
      memory
    }
  }).filter(position => position !== null) // Filter out any null positions

  console.log(`Created ${positions.length} memory positions from coordinates`)
  return positions
})

// Get memory size for visualization (based on recency)
function getMemorySize(index) {
  if (index === undefined || index === null) return 5 // Increased base size for visibility

  // Base size
  let size = 5 // Increased from 3 to 5 for better visibility

  // Increase size for selected memory
  if (index === selectedMemoryIndex.value) {
    size = 8 // Increased from 5 to 8
  }

  // Increase size for hovered memory
  if (index === hoveredMemoryIndex.value) {
    size = 7 // Increased from 4 to 7
  }

  return size
}

// Get memory color based on index
function getMemoryColor(index) {
  if (index === undefined || index === null) return '#888888'

  // Selected memory
  if (index === selectedMemoryIndex.value) {
    return '#ffffff'
  }

  // Hovered memory
  if (index === hoveredMemoryIndex.value) {
    return '#cccccc'
  }

  // Default color based on memory data
  if (dataRef.value[index]) {
    // Use memory ID to generate a consistent color
    const memory = dataRef.value[index]
    const idHash = memory.id ? memory.id.toString().split('').reduce((a, b) => a + b.charCodeAt(0), 0) : index

    // Generate colors in the blue-purple range for a cohesive look
    const hue = (idHash % 60) + 220 // Range from 220-280 (blue to purple)
    const saturation = 70 + (idHash % 30) // Range from 70-100%
    const lightness = 50 + (idHash % 20) // Range from 50-70%

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`
  }

  return '#6666ff' // Default blue-ish color
}

// Close embedding map
function closeEmbeddingMap() {
  showEmbeddingMap.value = false
}
</script>

<style scoped>
.memory-point {
  cursor: pointer;
  opacity: 1;
  stroke-width: 2;
}

/* Memory item styling */
.memory-item {
  opacity: 1;
  transition: all 0.15s ease;
  font-family: monospace;
}

/* Memory item hover effect */
.memory-item:hover {
  background-color: rgba(45, 45, 45, 0.5);
}

/* Control the max height of memory items */
.memory-item pre {
  max-height: 60px;
  transition: max-height 0.15s ease;
  font-family: monospace;
}

/* Expanded memory item */
.memory-item:hover pre {
  max-height: 200px;
}

/* Loading indicator animation */
.loading-indicator {
  animation: pulse 2s infinite ease-in-out;
}

@keyframes pulse {
  0% {
    opacity: 0.5;
  }

  50% {
    opacity: 1;
  }

  100% {
    opacity: 0.5;
  }
}

/* Reduce bottom padding since we're using percentage heights */
.p-2 {
  padding-bottom: 1rem;
}

/* Make buttons more clickable */
button {
  position: relative;
  z-index: 60;
  pointer-events: auto;
}

/* Ensure the button container doesn't have pointer-events issues */
.absolute.top-1.left-1 {
  pointer-events: auto;
}
</style>
