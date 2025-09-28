<template>
  <svg
    ref="svgRef"
    class="connection-layer"
    :width="svgDimensions.width"
    :height="svgDimensions.height"
    :viewBox="`0 0 ${svgDimensions.width} ${svgDimensions.height}`"
  >
    <!-- Debug background - uncomment to see SVG bounds -->
    <rect
      width="100%"
      height="100%"
      fill="rgba(0,255,0,0.02)"
      stroke="rgba(0,255,0,0.1)"
      stroke-dasharray="5,5"
    />

    <!-- Connection curves -->
    <g class="connections">
      <path
        v-for="connection in connections"
        :key="`${connection.messageId}-${connection.memoryId}`"
        :d="connection.path"
        :stroke="connection.color"
        :stroke-width="connection.width"
        :opacity="connection.opacity"
        fill="none"
        stroke-linecap="round"
      />
    </g>
  </svg>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

// SVG element reference
const svgRef = ref<SVGElement>()

// SVG dimensions
const svgDimensions = ref({
  width: 0,
  height: 0
})

// Connection data structure
interface Connection {
  messageId: number
  memoryId: number
  messageBounds: DOMRect
  memoryBounds: DOMRect
  path: string
  color: string
  width: number
  opacity: number
}

const connections = ref<Connection[]>([])

// Animation frame ID for cleanup
let animationFrameId: number | null = null

// Color palette for connections (brighter for visibility in both light/dark modes)
const connectionColors = [
  '#6366f1', '#8b5cf6', '#a855f7', '#06b6d4', '#10b981',
  '#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444',
  '#ec4899', '#d946ef', '#8b5cf6', '#06b6d4'
]

// Get color for a connection based on user or ID
function getConnectionColor(messageId: number, memoryId: number): string {
  const hash = (messageId + memoryId) % connectionColors.length
  return connectionColors[hash]
}

// Generate bezier curve path
function createBezierPath(
  start: { x: number; y: number },
  end: { x: number; y: number }
): string {
  const midX = (start.x + end.x) / 2
  const controlOffset = Math.abs(end.x - start.x) * 0.6

  // Control points for smooth S-curve
  const cp1x = start.x + controlOffset
  const cp1y = start.y
  const cp2x = end.x - controlOffset
  const cp2y = end.y

  return `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`
}

// Get element bounds relative to SVG container
function getRelativeBounds(element: Element, svgContainer: Element): DOMRect {
  const elementRect = element.getBoundingClientRect()
  const svgRect = svgContainer.getBoundingClientRect()

  return new DOMRect(
    elementRect.left - svgRect.left,
    elementRect.top - svgRect.top,
    elementRect.width,
    elementRect.height
  )
}

// Find all connections between messages and memories
function findConnections(): Connection[] {
  if (!svgRef.value) return []

  const messageElements = document.querySelectorAll('[data-message-id]')
  const memoryElements = document.querySelectorAll('[data-memory-id]')

  console.log(`[ConnectionLayer] Found ${messageElements.length} message elements, ${memoryElements.length} memory elements`)

  const newConnections: Connection[] = []

  // Get all message and memory data for relationship matching
  messageElements.forEach((messageEl, idx) => {
    const messageId = parseInt(messageEl.getAttribute('data-message-id') || '0')
    const memoryId = parseInt(messageEl.getAttribute('data-memory-id') || '0')

    if (idx === 0) {
      console.log(`[ConnectionLayer] Sample message element:`, {
        messageId,
        memoryId,
        userId: messageEl.getAttribute('data-user-id'),
        allAttributes: Array.from(messageEl.attributes).map(attr => `${attr.name}="${attr.value}"`).join(', ')
      })
    }

    if (memoryId) {
      // Find corresponding memory element
      const memoryEl = document.querySelector(`[data-memory-id="${memoryId}"]`)
      if (memoryEl) {
        const messageBounds = getRelativeBounds(messageEl, svgRef.value!)
        const memoryBounds = getRelativeBounds(memoryEl, svgRef.value!)

        // Calculate connection points (center-right of message, center-left of memory)
        const startPoint = {
          x: messageBounds.right,
          y: messageBounds.top + messageBounds.height / 2
        }
        const endPoint = {
          x: memoryBounds.left,
          y: memoryBounds.top + memoryBounds.height / 2
        }

        const path = createBezierPath(startPoint, endPoint)
        const distance = Math.sqrt(
          Math.pow(endPoint.x - startPoint.x, 2) +
          Math.pow(endPoint.y - startPoint.y, 2)
        )

        newConnections.push({
          messageId,
          memoryId,
          messageBounds,
          memoryBounds,
          path,
          color: getConnectionColor(messageId, memoryId),
          width: Math.max(2, Math.min(4, distance / 150)),
          opacity: Math.max(0.6, Math.min(0.9, 1 - distance / 1500))
        })
      }
    }
  })

  // Also check for memories that reference messages
  memoryElements.forEach((memoryEl, idx) => {
    const memoryId = parseInt(memoryEl.getAttribute('data-memory-id') || '0')
    const relatedMessageId = parseInt(memoryEl.getAttribute('data-related-message-id') || '0')

    if (idx === 0) {
      console.log(`[ConnectionLayer] Sample memory element:`, {
        memoryId,
        relatedMessageId,
        userId: memoryEl.getAttribute('data-user-id'),
        allAttributes: Array.from(memoryEl.attributes).map(attr => `${attr.name}="${attr.value}"`).join(', ')
      })
    }

    if (relatedMessageId && !newConnections.some(c => c.messageId === relatedMessageId && c.memoryId === memoryId)) {
      const messageEl = document.querySelector(`[data-message-id="${relatedMessageId}"]`)
      if (messageEl) {
        const messageBounds = getRelativeBounds(messageEl, svgRef.value!)
        const memoryBounds = getRelativeBounds(memoryEl, svgRef.value!)

        const startPoint = {
          x: messageBounds.right,
          y: messageBounds.top + messageBounds.height / 2
        }
        const endPoint = {
          x: memoryBounds.left,
          y: memoryBounds.top + memoryBounds.height / 2
        }

        const path = createBezierPath(startPoint, endPoint)
        const distance = Math.sqrt(
          Math.pow(endPoint.x - startPoint.x, 2) +
          Math.pow(endPoint.y - startPoint.y, 2)
        )

        newConnections.push({
          messageId: relatedMessageId,
          memoryId,
          messageBounds,
          memoryBounds,
          path,
          color: getConnectionColor(relatedMessageId, memoryId),
          width: Math.max(2, Math.min(4, distance / 150)),
          opacity: Math.max(0.6, Math.min(0.9, 1 - distance / 1500))
        })
      }
    }
  })

  console.log(`[ConnectionLayer] Found ${newConnections.length} connections`)
  if (newConnections.length > 0) {
    console.log('[ConnectionLayer] Sample connection:', newConnections[0])
  }

  return newConnections
}

// Update SVG dimensions to match container
function updateDimensions() {
  if (!svgRef.value) return

  const parentElement = svgRef.value.parentElement
  if (parentElement) {
    const rect = parentElement.getBoundingClientRect()
    svgDimensions.value = {
      width: rect.width,
      height: rect.height
    }
  }
}

// Animation loop
function animate() {
  updateDimensions()
  connections.value = findConnections()

  animationFrameId = requestAnimationFrame(animate)
}

// Start animation
function startAnimation() {
  if (animationFrameId) return
  animate()
}

// Stop animation
function stopAnimation() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
}

// Lifecycle
onMounted(async () => {
  await nextTick()
  updateDimensions()

  // Start animation after a short delay to ensure elements are rendered
  setTimeout(startAnimation, 500)

  // Listen for window resize
  window.addEventListener('resize', updateDimensions)
})

onUnmounted(() => {
  stopAnimation()
  window.removeEventListener('resize', updateDimensions)
})
</script>

<style scoped>
.connection-layer {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 1;
}

.connections path {
  transition: opacity 0.3s ease;
}
</style>