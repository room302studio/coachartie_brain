<template>
  <div class="font-mono">
    <!-- Header with controls -->
    <div class="flex items-center justify-between mb-1 border-b border-primary pb-0.5">
      <div class="flex items-center">
        <button @click="refreshData"
          class="text-[10px] text-tertiary font-mono mr-1 border-r border-secondary px-0.5 hover:text-secondary"
          aria-label="Refresh data">
          [REFRESH]
        </button>
        <span class="text-[10px] text-tertiary">[NETWORK_GRAPH]</span>
      </div>
      <div class="flex items-center">
        <button @click="spreadNodes" class="text-[10px] text-tertiary font-mono mr-1 px-0.5 hover:text-secondary">
          [SPREAD]
        </button>
        <button @click="toggleSimulation" class="text-[10px] text-tertiary font-mono mr-1 px-0.5 hover:text-secondary">
          [{{ simulationRunning ? 'PAUSE' : 'PLAY' }}]
        </button>
        <button @click="resetZoom" class="text-[10px] text-tertiary font-mono px-0.5 hover:text-secondary">
          [RESET]
        </button>
      </div>
    </div>

    <!-- Network graph container -->
    <div class="border border-secondary p-1">
      <div class="flex items-center justify-between mb-1">
        <div class="text-[10px] text-tertiary">MEMORY-MESSAGE-USER NETWORK</div>
        <div class="flex items-center">
          <span class="text-[8px] text-quaternary mr-1">FILTER:</span>
          <select v-model="filter" class="text-[8px] text-tertiary bg-transparent border-b border-secondary">
            <option value="all">ALL</option>
            <option value="memory">MEMORIES</option>
            <option value="message">MESSAGES</option>
            <option value="user">USERS</option>
          </select>
        </div>
      </div>
      <div ref="networkRef" class="w-full h-[400px] bg-gray-900/30 relative">
        <!-- Debug info -->
        <div v-if="debugInfo"
          class="absolute top-0 left-0 p-1 bg-black/70 text-white text-[8px] max-w-[200px] overflow-auto z-10">
          <div><strong>Debug:</strong></div>
          <div>Nodes: {{ nodes.length }}</div>
          <div>Links: {{ links.length }}</div>
          <div v-if="errorMessage" class="text-red-500">{{ errorMessage }}</div>
          <div v-if="mockData">Using mock data</div>
        </div>
      </div>

      <!-- Info box for displaying hovered node details -->
      <div class="mt-1 border-t border-secondary pt-1">
        <div class="text-[10px] text-tertiary flex justify-between">
          <span>{{ hoveredNode ? hoveredNode.type.toUpperCase() : 'NODE INFO' }}</span>
          <span v-if="hoveredNode" class="text-[8px] text-quaternary">ID: {{ hoveredNode.id }}</span>
        </div>
        <div class="h-[80px] overflow-auto bg-gray-900/20 p-1 mt-0.5 font-mono text-[10px]">
          <template v-if="hoveredNode">
            <div v-if="hoveredNode.type === 'memory'" class="text-teal-400">
              {{ formatMemoryValue(hoveredNode.data.value) }}
            </div>
            <div v-else-if="hoveredNode.type === 'message'" class="text-blue-400">
              {{ hoveredNode.data.value || hoveredNode.data.content }}
            </div>
            <div v-else-if="hoveredNode.type === 'user'" class="text-purple-400">
              User ID: {{ hoveredNode.data.id }}
            </div>
          </template>
          <div v-else class="text-quaternary text-center h-full flex items-center justify-center">
            <span>Hover over a node to see details</span>
          </div>
        </div>
      </div>

      <!-- Legend -->
      <div class="flex items-center justify-center mt-1 space-x-3">
        <div class="flex items-center">
          <div class="w-2 h-2 rounded-full bg-teal-500 mr-1"></div>
          <span class="text-[8px] text-tertiary">MEMORY</span>
        </div>
        <div class="flex items-center">
          <div class="w-2 h-2 rounded-full bg-blue-500 mr-1"></div>
          <span class="text-[8px] text-tertiary">MESSAGE</span>
        </div>
        <div class="flex items-center">
          <div class="w-2 h-2 rounded-full bg-purple-500 mr-1"></div>
          <span class="text-[8px] text-tertiary">USER</span>
        </div>
        <div class="flex items-center">
          <div class="w-2 h-[1px] bg-gray-500 mr-1"></div>
          <span class="text-[8px] text-tertiary">CONNECTION</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as d3 from 'd3'

// Refs
const networkRef = ref(null)
const filter = ref('all')
const simulationRunning = ref(true)
const errorMessage = ref('')
const debugInfo = ref(true)
const mockData = ref(false)
const showFallback = ref(false)
const containerDimensions = ref({ width: 0, height: 0 })
const hoveredNode = ref(null) // To track the currently hovered node

// Data
const nodes = ref([])
const links = ref([])

// D3 elements
let svg = null
let simulation = null
let zoom = null
let linkElements = null
let nodeElements = null
let textElements = null

// Get Supabase client or create fallback
let supabase = null
try {
  supabase = useDatabase()
  console.log('Supabase client initialized')
} catch (error) {
  console.warn('Supabase client not available:', error)
}

async function refreshData() {
  console.log('Refreshing data')
  errorMessage.value = ''

  try {
    if (!supabase) {
      console.log('No Supabase client, using mock data')
      errorMessage.value = 'Supabase client not available'
      generateMockData()
      return
    }

    const [memories, messages, users] = await Promise.all([
      fetchMemories(),
      fetchMessages(),
      fetchUsers()
    ])

    console.log('Data fetched:', {
      memories: memories.length,
      messages: messages.length,
      users: users.length
    })

    if (!memories.length && !messages.length && !users.length) {
      console.log('No data returned, using mock data')
      errorMessage.value = 'No data returned from queries'
      generateMockData()
      return
    }

    createNetworkData(memories, messages, users)
    // Use the static node rendering function that works
    renderNetworkWithHardcodedNodes()
  } catch (error) {
    console.error('Error refreshing data:', error)
    errorMessage.value = `Error: ${error.message}`
    generateMockData()
  }
}

async function fetchMemories() {
  try {
    const response = await fetch('/api/memories?limit=50')
    const result = await response.json()

    if (result.success && result.data) {
      // Map the data to include value field for consistency
      return result.data.map(memory => ({
        ...memory,
        value: memory.content || memory.value || ''
      }))
    }

    console.error('Error fetching memories:', result.error)
    return []
  } catch (error) {
    console.error('Exception fetching memories:', error)
    return []
  }
}

async function fetchMessages() {
  try {
    const response = await fetch('/api/messages?limit=50')
    const result = await response.json()

    if (result.success && result.data) {
      // Map the data to include content field for consistency
      return result.data.map(message => ({
        ...message,
        content: message.value || message.content || ''
      }))
    }

    console.error('Error fetching messages:', result.error)
    return []
  } catch (error) {
    console.error('Exception fetching messages:', error)
    return []
  }
}

async function fetchUsers() {
  try {
    // Get unique users from memories and messages via API
    const [memoriesResponse, messagesResponse] = await Promise.all([
      fetch('/api/memories?limit=40'),
      fetch('/api/messages?limit=40')
    ])

    const [memoriesData, messagesData] = await Promise.all([
      memoriesResponse.json(),
      messagesResponse.json()
    ])

    const memoryUsers = memoriesData.success && memoriesData.data ? memoriesData.data : []
    const messageUsers = messagesData.success && messagesData.data ? messagesData.data : []

    // Combine and deduplicate users
    const allUsers = [...memoryUsers, ...messageUsers]
    const uniqueUserIds = [...new Set(allUsers.map(u => u.user_id).filter(Boolean))]

    return uniqueUserIds.map(id => ({ id }))
  } catch (error) {
    console.error('Exception fetching users:', error)
    return []
  }
}

function generateMockData() {
  console.log('Generating mock data')
  mockData.value = true

  // Clear existing data
  nodes.value = []
  links.value = []

  // Generate mock data - reduced number for testing
  const memoryCount = 5
  const messageCount = 7
  const userCount = 3

  // Create mock memories
  const memories = Array.from({ length: memoryCount }, (_, i) => ({
    id: `mock-memory-${i}`,
    value: `Memory ${i}`,
    user_id: `user-${Math.floor(Math.random() * userCount)}`,
    created_at: new Date().toISOString(),
    related_message_id: Math.random() > 0.5 ? `message-${Math.floor(Math.random() * messageCount)}` : null
  }))

  // Create mock messages
  const messages = Array.from({ length: messageCount }, (_, i) => ({
    id: `mock-message-${i}`,
    content: `Message ${i}`,
    user_id: `user-${Math.floor(Math.random() * userCount)}`,
    created_at: new Date().toISOString()
  }))

  // Create mock users
  const users = Array.from({ length: userCount }, (_, i) => ({
    id: `user-${i}`,
    name: `User ${i}`,
    created_at: new Date().toISOString()
  }))

  createNetworkData(memories, messages, users)
  renderNetworkWithHardcodedNodes()
}

function createNetworkData(memories = [], messages = [], users = []) {
  console.log('Creating network data from:', {
    memories: memories.length,
    messages: messages.length,
    users: users.length
  })

  // Reset data
  nodes.value = []
  links.value = []

  try {
    // Create nodes
    const memoryNodes = memories.map(memory => ({
      id: `memory-${memory.id}`,
      type: 'memory',
      data: memory,
      label: truncateText(memory.value, 20)
    }))

    const messageNodes = messages.map(message => ({
      id: `message-${message.id}`,
      type: 'message',
      data: message,
      label: truncateText(message.value || message.content, 20)
    }))

    const userNodes = users.map(user => ({
      id: `user-${user.id}`,
      type: 'user',
      data: user,
      label: `User ${user.id.substring(0, 6)}`
    }))

    // Combine nodes
    nodes.value = [...memoryNodes, ...messageNodes, ...userNodes]

    // Create sets of node IDs for quick existence checking
    const nodeIds = new Set(nodes.value.map(node => node.id))
    const messageIds = new Set(messageNodes.map(node => node.id))
    const userIds = new Set(userNodes.map(node => node.id))

    console.log('Node ID sets created:', {
      total: nodeIds.size,
      messages: messageIds.size,
      users: userIds.size
    })

    // Create links
    const newLinks = []
    const linkCount = {
      memory_message: 0,
      memory_user: 0,
      message_user: 0,
      conversation: 0
    }

    // Calculate maximum links to stay under 1000 elements
    const totalNodes = nodes.value.length
    const maxLinks = Math.min(900 - totalNodes, 500) // Cap at 500 links max, and ensure nodes + links < 900
    console.log(`Maximum links allowed: ${maxLinks} (nodes: ${totalNodes})`)

    // Memory to message links - only if both nodes exist
    for (const memory of memories) {
      if (newLinks.length >= maxLinks) break

      if (memory.related_message_id) {
        const sourceId = `memory-${memory.id}`
        const targetId = `message-${memory.related_message_id}`

        // Only create link if both source and target exist
        if (nodeIds.has(sourceId) && nodeIds.has(targetId)) {
          newLinks.push({
            source: sourceId,
            target: targetId,
            type: 'memory-message'
          })
          linkCount.memory_message++
        }
      }
    }

    // Memory to user links - only if both nodes exist and we're under the limit
    for (const memory of memories) {
      if (newLinks.length >= maxLinks) break

      if (memory.user_id) {
        const sourceId = `memory-${memory.id}`
        const targetId = `user-${memory.user_id}`

        // Only create link if both source and target exist
        if (nodeIds.has(sourceId) && nodeIds.has(targetId)) {
          newLinks.push({
            source: sourceId,
            target: targetId,
            type: 'memory-user'
          })
          linkCount.memory_user++
        }
      }
    }

    // Message to user links - only if both nodes exist and we're under the limit
    for (const message of messages) {
      if (newLinks.length >= maxLinks) break

      if (message.user_id) {
        const sourceId = `message-${message.id}`
        const targetId = `user-${message.user_id}`

        // Only create link if both source and target exist
        if (nodeIds.has(sourceId) && nodeIds.has(targetId)) {
          newLinks.push({
            source: sourceId,
            target: targetId,
            type: 'message-user'
          })
          linkCount.message_user++
        }
      }
    }

    // Group memories by conversation_id if it exists
    const conversationGroups = {}
    memories.forEach(memory => {
      if (memory.conversation_id) {
        if (!conversationGroups[memory.conversation_id]) {
          conversationGroups[memory.conversation_id] = { memories: [] }
        }
        conversationGroups[memory.conversation_id].memories.push(memory)
      }
    })

    // Create LIMITED links between memories in the same conversation
    // Instead of all pairs, create a chain or a limited number of connections
    Object.values(conversationGroups).forEach(group => {
      if (newLinks.length >= maxLinks) return

      // Sort memories by created_at if available
      if (group.memories[0]?.created_at) {
        group.memories.sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      }

      // Create chain links (connect sequential memories) instead of all-to-all
      for (let i = 0; i < group.memories.length - 1; i++) {
        if (newLinks.length >= maxLinks) break

        const sourceId = `memory-${group.memories[i].id}`
        const targetId = `memory-${group.memories[i + 1].id}`

        // Only create link if both source and target exist
        if (nodeIds.has(sourceId) && nodeIds.has(targetId)) {
          newLinks.push({
            source: sourceId,
            target: targetId,
            type: 'conversation',
            strength: 0.3 // Weaker link
          })
          linkCount.conversation++
        }
      }
    })

    links.value = newLinks

    console.log('Network data created:', {
      nodes: nodes.value.length,
      links: links.value.length,
      linkTypes: linkCount
    })
  } catch (error) {
    console.error('Error creating network data:', error)
    errorMessage.value = `Error creating network data: ${error.message}`
  }
}

function renderNetwork() {
  if (!networkRef.value) {
    console.error('Network ref is null')
    return
  }

  // Log data for debugging
  console.log('Rendering network with:', {
    nodes: nodes.value.length,
    links: links.value.length,
    containerWidth: networkRef.value.clientWidth,
    containerHeight: networkRef.value.clientHeight
  })

  try {
    // Clear previous chart
    d3.select(networkRef.value).selectAll('*').remove()

    // Set dimensions
    const width = networkRef.value.clientWidth
    const height = networkRef.value.clientHeight

    if (width === 0 || height === 0) {
      console.error('Container has zero dimensions:', { width, height })
      errorMessage.value = 'Container has zero dimensions'
      return
    }

    // Create SVG
    svg = d3.select(networkRef.value)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height])
      .attr('style', 'max-width: 100%; height: auto;')

    // Add zoom behavior
    zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform)
      })

    svg.call(zoom)

    // Create container for zoom
    const container = svg.append('g')

    console.log('SVG created with dimensions:', { width, height })

    // Very simple initial positioning
    nodes.value.forEach(node => {
      node.x = Math.random() * width
      node.y = Math.random() * height
    })

    // Create a very simple simulation
    simulation = d3.forceSimulation(nodes.value)
      .force('link', d3.forceLink(links.value).id(d => d.id).distance(50))
      .force('charge', d3.forceManyBody().strength(-100))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .on('tick', ticked)

    // Create links
    linkElements = container.append('g')
      .selectAll('line')
      .data(links.value)
      .enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1)

    // Create nodes
    nodeElements = container.append('g')
      .selectAll('circle')
      .data(nodes.value)
      .enter()
      .append('circle')
      .attr('r', 5)
      .attr('fill', d => getNodeColor(d))
      .call(drag(simulation))

    // Create labels
    textElements = container.append('g')
      .selectAll('text')
      .data(nodes.value)
      .enter()
      .append('text')
      .text(d => d.label)
      .attr('font-size', '6px')
      .attr('dx', 8)
      .attr('dy', 3)
      .attr('fill', 'white')

    console.log('Elements created:', {
      nodes: nodeElements.size(),
      links: linkElements.size(),
      texts: textElements.size()
    })

    // Debug - add background rect to see container
    container.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'none')
      .attr('stroke', 'red')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2,2')

    // Debug - add center point
    container.append('circle')
      .attr('cx', width / 2)
      .attr('cy', height / 2)
      .attr('r', 3)
      .attr('fill', 'red')

  } catch (error) {
    console.error('Error rendering network:', error)
    errorMessage.value = `Error rendering: ${error.message}`
  }
}

// Drag behavior
function drag(simulation) {
  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart()
    d.fx = d.x
    d.fy = d.y
  }

  function dragged(event, d) {
    d.fx = event.x
    d.fy = event.y
  }

  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0)
    d.fx = null
    d.fy = null
  }

  return d3.drag()
    .on('start', dragstarted)
    .on('drag', dragged)
    .on('end', dragended)
}

// Update positions on tick
function ticked() {
  if (!linkElements || !nodeElements || !textElements) {
    console.warn('Elements not initialized in tick')
    return
  }

  try {
    linkElements
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y)

    nodeElements
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)

    textElements
      .attr('x', d => d.x)
      .attr('y', d => d.y)
  } catch (error) {
    console.error('Error in tick function:', error)
  }
}

// Helper functions
function getNodeRadius(node) {
  switch (node.type) {
    case 'memory':
      return 6
    case 'message':
      return 5
    case 'user':
      return 8
    default:
      return 5
  }
}

function getNodeColor(node) {
  switch (node.type) {
    case 'memory':
      return '#14B8A6' // teal-500
    case 'message':
      return '#3B82F6' // blue-500
    case 'user':
      return '#A855F7' // purple-500
    default:
      return '#9CA3AF' // gray-400
  }
}

function getLinkColor(link) {
  switch (link.type) {
    case 'memory-message':
      return 'rgba(20, 184, 166, 0.6)' // teal with opacity
    case 'memory-user':
      return 'rgba(168, 85, 247, 0.6)' // purple with opacity
    case 'message-user':
      return 'rgba(59, 130, 246, 0.6)' // blue with opacity
    case 'conversation':
      return 'rgba(156, 163, 175, 0.4)' // gray with opacity
    default:
      return 'rgba(156, 163, 175, 0.6)' // gray with opacity
  }
}

function truncateText(text, maxLength) {
  if (!text) return 'N/A'
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

function toggleSimulation() {
  simulationRunning.value = !simulationRunning.value
  console.log(`Simulation ${simulationRunning.value ? 'started' : 'paused'}`)

  if (simulationRunning.value) {
    // Release fixed positions when starting simulation
    if (nodes.value.length > 0) {
      nodes.value.forEach(node => {
        node.fx = null
        node.fy = null
      })
    }

    if (simulation) {
      simulation.alpha(0.3).restart()
    }
  } else {
    // Fix nodes in current positions when pausing
    if (nodes.value.length > 0) {
      nodes.value.forEach(node => {
        node.fx = node.x
        node.fy = node.y
      })
    }

    simulation?.stop()
  }
}

function resetZoom() {
  if (!svg || !zoom) return

  svg.transition()
    .duration(750)
    .call(zoom.transform, d3.zoomIdentity)
}

function spreadNodes() {
  console.log('Spreading nodes')
  if (!simulation || !networkRef.value) return

  const width = networkRef.value.clientWidth
  const height = networkRef.value.clientHeight

  // Only release fixed positions in simulation mode
  if (simulationRunning.value) {
    nodes.value.forEach(node => {
      node.fx = null
      node.fy = null
    })
  }

  // Apply different forces based on node type
  simulation
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('charge', d3.forceManyBody().strength(-300)) // Stronger repulsion for spreading
    .force('collision', d3.forceCollide().radius(d => {
      if (d.type === 'user') return 20
      if (d.type === 'memory') return 15
      if (d.type === 'message') return 12
      return 15
    }))
    .alpha(1) // High alpha for more movement
    .restart()

  // After spreading, reduce forces gradually
  setTimeout(() => {
    if (simulation) {
      simulation
        .force('charge', d3.forceManyBody().strength(-150))
        .force('collision', d3.forceCollide().radius(d => {
          if (d.type === 'user') return 12
          if (d.type === 'memory') return 10
          if (d.type === 'message') return 8
          return 10
        }))
        .alpha(0.3)
        .restart()
    }
  }, 3000)
}

function applyFilter() {
  if (!nodeElements || !linkElements || !textElements) {
    console.warn('Elements not initialized in applyFilter')
    return
  }

  const currentFilter = filter.value
  console.log('Applying filter:', currentFilter)

  try {
    if (currentFilter === 'all') {
      nodeElements.style('display', null)
      linkElements.style('display', null)
      textElements.style('display', null)
      return
    }

    // Filter nodes
    nodeElements.style('display', d => d.type === currentFilter ? null : 'none')

    // Filter links
    linkElements.style('display', d => {
      const sourceType = typeof d.source === 'object' ? d.source.type : d.source.split('-')[0]
      const targetType = typeof d.target === 'object' ? d.target.type : d.target.split('-')[0]
      return sourceType === currentFilter || targetType === currentFilter ? null : 'none'
    })

    // Filter text
    textElements.style('display', d => d.type === currentFilter ? null : 'none')

    // Restart simulation
    if (simulationRunning.value && simulation) {
      simulation.alpha(0.3).restart()
    }
  } catch (error) {
    console.error('Error applying filter:', error)
  }
}

// Watch for filter changes
watch(filter, () => {
  applyFilter()
})

// Lifecycle hooks
onMounted(() => {
  console.log('NetworkGraph mounted')
  refreshData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  console.log('NetworkGraph unmounted')
  window.removeEventListener('resize', handleResize)

  if (simulation) {
    simulation.stop()
    simulation = null
  }

  // Clear references
  svg = null
  zoom = null
  linkElements = null
  nodeElements = null
  textElements = null
})

function handleResize() {
  if (networkRef.value) {
    console.log('Resize detected, re-rendering network')
    renderNetwork()
  }
}

function renderNetworkWithHardcodedNodes() {
  if (!networkRef.value) {
    console.error('Network ref is null')
    return
  }

  try {
    // Clear previous chart and reset D3 references
    d3.select(networkRef.value).selectAll('svg').remove()
    simulation = null

    // Get dimensions
    const width = networkRef.value.clientWidth
    const height = networkRef.value.clientHeight

    containerDimensions.value = { width, height }

    console.log('Dimensions:', { width, height })

    if (width === 0 || height === 0) {
      console.error('Container has zero dimensions')
      return
    }

    // Create SVG element
    const svgElement = d3.select(networkRef.value)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('position', 'absolute')
      .style('top', 0)
      .style('left', 0)
      .style('overflow', 'hidden')

    // Store reference to the SVG
    svg = svgElement

    // Debug rectangle to show SVG boundaries
    svgElement.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .attr('fill', 'none')
      .attr('stroke-opacity', 0.3)

    // Skip adding the fixed position debugging nodes

    // Add actual nodes from data
    if (nodes.value.length > 0) {
      console.log(`Rendering ${nodes.value.length} nodes from real data`)

      // Group nodes by type
      const memoryNodes = nodes.value.filter(n => n.type === 'memory')
      const messageNodes = nodes.value.filter(n => n.type === 'message')
      const userNodes = nodes.value.filter(n => n.type === 'user')

      console.log(`Node types: ${memoryNodes.length} memories, ${messageNodes.length} messages, ${userNodes.length} users`)

      // Create deep copies of nodes to avoid readonly issues
      const nodeData = []

      // Position user nodes on the left
      userNodes.forEach((node, i) => {
        const y = (height * 0.2) + (i * (height * 0.6 / Math.max(userNodes.length, 1)))
        nodeData.push({
          ...node,
          x: width * 0.15,
          y,
          fx: simulationRunning.value ? null : width * 0.15, // Fixed x if not simulating
          fy: simulationRunning.value ? null : y // Fixed y if not simulating
        })
      })

      // Position memory nodes in center grid
      const memoryCols = Math.ceil(Math.sqrt(memoryNodes.length))
      memoryNodes.forEach((node, i) => {
        const col = i % memoryCols
        const row = Math.floor(i / memoryCols)

        const x = (width * 0.35) + (col * (width * 0.3 / Math.max(memoryCols, 1)))
        const y = (height * 0.15) + (row * (height * 0.7 / Math.max(Math.ceil(memoryNodes.length / memoryCols), 1)))

        nodeData.push({
          ...node,
          x,
          y,
          fx: simulationRunning.value ? null : x, // Fixed x if not simulating
          fy: simulationRunning.value ? null : y // Fixed y if not simulating
        })
      })

      // Position message nodes on the right in a grid
      const messageCols = Math.ceil(Math.sqrt(messageNodes.length))
      messageNodes.forEach((node, i) => {
        const col = i % messageCols
        const row = Math.floor(i / messageCols)

        const x = (width * 0.75) + (col * (width * 0.2 / Math.max(messageCols, 1)))
        const y = (height * 0.15) + (row * (height * 0.7 / Math.max(Math.ceil(messageNodes.length / messageCols), 1)))

        nodeData.push({
          ...node,
          x,
          y,
          fx: simulationRunning.value ? null : x, // Fixed x if not simulating
          fy: simulationRunning.value ? null : y // Fixed y if not simulating
        })
      })

      // Create a container group for zoom
      const container = svgElement.append('g')

      // Add zoom behavior
      zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
          container.attr('transform', event.transform)
        })

      svgElement.call(zoom)

      // Prepare a new mutable set of links for the simulation
      const simulationLinks = links.value.map(link => ({ ...link }))

      // Add links first so they appear behind nodes
      linkElements = container.append('g')
        .selectAll('.data-link')
        .data(simulationLinks)
        .enter()
        .append('line')
        .attr('class', 'data-link')
        .attr('stroke', d => {
          // Different colors for different link types
          if (d.type === 'memory-message') return 'rgba(20, 184, 166, 0.4)' // teal
          if (d.type === 'memory-user') return 'rgba(168, 85, 247, 0.4)' // purple 
          if (d.type === 'message-user') return 'rgba(59, 130, 246, 0.4)' // blue
          return 'rgba(156, 163, 175, 0.2)' // gray
        })
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', d => d.type === 'conversation' ? '3,2' : null)

      // Add nodes
      nodeElements = container.append('g')
        .selectAll('.data-node')
        .data(nodeData)
        .enter()
        .append('circle')
        .attr('class', 'data-node')
        .attr('r', d => {
          // Different sizes for different node types
          if (d.type === 'user') return 8
          if (d.type === 'memory') return 6
          if (d.type === 'message') return 5
          return 5
        })
        .attr('fill', d => getNodeColor(d))
        .attr('stroke', '#1E293B')
        .attr('stroke-width', 0.5)
        .attr('opacity', 0.8)
        .on('mouseover', function (event, d) {
          // Store hovered node data
          hoveredNode.value = d

          // Highlight on hover
          d3.select(this)
            .attr('opacity', 1)
            .attr('r', d => {
              if (d.type === 'user') return 10
              if (d.type === 'memory') return 8
              if (d.type === 'message') return 7
              return 7
            })

          // Show label
          d3.selectAll('.data-label')
            .filter(label => label.id === d.id)
            .attr('opacity', 1)
            .attr('font-weight', 'bold')
        })
        .on('mouseout', function (event, d) {
          // Clear hovered node after a delay to allow moving to infobox
          setTimeout(() => {
            if (hoveredNode.value?.id === d.id) {
              hoveredNode.value = null
            }
          }, 300)

          // Restore normal appearance
          d3.select(this)
            .attr('opacity', 0.8)
            .attr('r', d => {
              if (d.type === 'user') return 8
              if (d.type === 'memory') return 6
              if (d.type === 'message') return 5
              return 5
            })

          // Hide label if not a user
          d3.selectAll('.data-label')
            .filter(label => label.id === d.id && label.type !== 'user')
            .attr('opacity', 0.4)
            .attr('font-weight', 'normal')
        })

      // Add labels
      textElements = container.append('g')
        .selectAll('.data-label')
        .data(nodeData)
        .enter()
        .append('text')
        .attr('class', 'data-label')
        .attr('text-anchor', 'middle')
        .attr('fill', 'white')
        .attr('font-size', d => d.type === 'user' ? '9px' : '7px')
        .attr('opacity', d => d.type === 'user' ? 0.9 : 0.4)
        .style('pointer-events', 'none')
        .text(d => {
          if (d.type === 'user') return `User: ${d.data.id.substring(0, 6)}`
          if (d.type === 'memory') return truncateText(d.data.value, 15)
          if (d.type === 'message') return truncateText(d.data.value || d.data.content, 15)
          return d.label?.substring(0, 10) || 'N/A'
        })

      // Create force simulation with our nodes
      simulation = d3.forceSimulation(nodeData)
        .force('link', d3.forceLink()
          .id(d => d.id)
          .links(simulationLinks)
          .distance(d => {
            // Different distances for different link types
            if (d.type === 'memory-message') return 60
            if (d.type === 'memory-user') return 80
            if (d.type === 'message-user') return 70
            if (d.type === 'conversation') return 40
            return 50
          })
        )
        .force('charge', d3.forceManyBody().strength(-150))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('x', d3.forceX(width / 2).strength(0.05))
        .force('y', d3.forceY(height / 2).strength(0.05))
        .force('collision', d3.forceCollide().radius(d => {
          if (d.type === 'user') return 12
          if (d.type === 'memory') return 10
          if (d.type === 'message') return 8
          return 10
        }))

      // Add drag behavior after simulation is created
      nodeElements.call(drag(simulation))

      // Update positions on tick
      simulation.on('tick', () => {
        linkElements
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y)

        nodeElements
          .attr('cx', d => d.x)
          .attr('cy', d => d.y)

        textElements
          .attr('x', d => d.x)
          .attr('y', d => d.y + (d.type === 'user' ? 16 : 12))
      })

      // Start or stop simulation based on state
      if (simulationRunning.value) {
        simulation.alpha(0.3).restart()
      } else {
        simulation.stop()
      }

      console.log('Real data nodes rendered successfully')
    } else {
      console.log('No nodes to render')

      // Add a message when no data
      svgElement.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', 'white')
        .attr('font-size', '12px')
        .text('No network data available')
    }

  } catch (error) {
    console.error('Error rendering nodes:', error)
    errorMessage.value = `Error rendering: ${error.message}`
    showFallback.value = true
  }
}

function formatMemoryValue(value) {
  if (!value) return 'N/A'
  // Remove "CLUSTER:NONE" or similar text patterns
  return value.replace(/\bCLUSTER:NONE\b/gi, '').replace(/\bCLUSTER:\s*$/gi, '').trim()
}
</script>

<style scoped>
/* D3 styling */
:deep(.domain),
:deep(.tick line) {
  stroke: rgba(255, 255, 255, 0.2);
}

:deep(text) {
  fill: rgba(255, 255, 255, 0.55);
  pointer-events: none;
}

.network-graph-tooltip {
  position: absolute;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 5px;
  border-radius: 3px;
  font-size: 10px;
  pointer-events: none;
  opacity: 0;
  z-index: 1000;
}
</style>