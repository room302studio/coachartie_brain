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
      <div ref="networkRef" class="w-full h-[400px] bg-gray-900/30"></div>

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

// Fetch data from Supabase
const supabase = useSupabaseClient()

async function refreshData() {
  await Promise.all([
    fetchMemories(),
    fetchMessages(),
    fetchUsers()
  ])

  createNetworkData()
  renderNetwork()
}

async function fetchMemories() {
  const { data, error } = await supabase
    .from('memories')
    .select('id, value, user_id, related_message_id, memory_type, conversation_id')
    .limit(50)

  if (error) {
    console.error('Error fetching memories:', error)
    return []
  }

  return data || []
}

async function fetchMessages() {
  const { data, error } = await supabase
    .from('messages')
    .select('id, value, user_id, message_type')
    .limit(50)

  if (error) {
    console.error('Error fetching messages:', error)
    return []
  }

  return data || []
}

async function fetchUsers() {
  // Get unique users from memories and messages
  const { data: memoryUsers, error: memoryError } = await supabase
    .from('memories')
    .select('user_id')
    .not('user_id', 'is', null)
    .limit(20)

  const { data: messageUsers, error: messageError } = await supabase
    .from('messages')
    .select('user_id')
    .not('user_id', 'is', null)
    .limit(20)

  if (memoryError || messageError) {
    console.error('Error fetching users:', memoryError || messageError)
    return []
  }

  // Combine and deduplicate users
  const allUsers = [...(memoryUsers || []), ...(messageUsers || [])]
  const uniqueUserIds = [...new Set(allUsers.map(u => u.user_id).filter(Boolean))]

  return uniqueUserIds.map(id => ({ id }))
}

function createNetworkData() {
  // Reset data
  nodes.value = []
  links.value = []

  // Process data
  const processData = async () => {
    const memories = await fetchMemories()
    const messages = await fetchMessages()
    const users = await fetchUsers()

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
      label: truncateText(message.value, 20)
    }))

    const userNodes = users.map(user => ({
      id: `user-${user.id}`,
      type: 'user',
      data: user,
      label: user.id
    }))

    // Combine nodes
    nodes.value = [...memoryNodes, ...messageNodes, ...userNodes]

    // Create links
    const newLinks = []

    // Memory to message links
    memories.forEach(memory => {
      if (memory.related_message_id) {
        newLinks.push({
          source: `memory-${memory.id}`,
          target: `message-${memory.related_message_id}`,
          type: 'memory-message'
        })
      }
    })

    // Memory to user links
    memories.forEach(memory => {
      if (memory.user_id) {
        newLinks.push({
          source: `memory-${memory.id}`,
          target: `user-${memory.user_id}`,
          type: 'memory-user'
        })
      }
    })

    // Message to user links
    messages.forEach(message => {
      if (message.user_id) {
        newLinks.push({
          source: `message-${message.id}`,
          target: `user-${message.user_id}`,
          type: 'message-user'
        })
      }
    })

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

    // Create links between memories in the same conversation
    Object.values(conversationGroups).forEach(group => {
      for (let i = 0; i < group.memories.length; i++) {
        for (let j = i + 1; j < group.memories.length; j++) {
          newLinks.push({
            source: `memory-${group.memories[i].id}`,
            target: `memory-${group.memories[j].id}`,
            type: 'conversation',
            strength: 0.3 // Weaker link
          })
        }
      }
    })

    links.value = newLinks
  }

  processData()
}

function renderNetwork() {
  if (!networkRef.value) return

  // Clear previous chart
  d3.select(networkRef.value).selectAll('*').remove()

  // Set dimensions
  const width = networkRef.value.clientWidth
  const height = networkRef.value.clientHeight

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

  // Create links
  linkElements = container.append('g')
    .selectAll('line')
    .data(links.value)
    .enter()
    .append('line')
    .attr('stroke', d => getLinkColor(d))
    .attr('stroke-width', d => d.strength ? 0.5 : 1)
    .attr('stroke-opacity', d => d.strength ? 0.3 : 0.6)
    .attr('stroke-dasharray', d => d.type === 'conversation' ? '2,2' : null)

  // Create nodes
  nodeElements = container.append('g')
    .selectAll('circle')
    .data(nodes.value)
    .enter()
    .append('circle')
    .attr('r', d => getNodeRadius(d))
    .attr('fill', d => getNodeColor(d))
    .attr('stroke', '#1E293B')
    .attr('stroke-width', 0.5)
    .call(drag(simulation))
    .on('mouseover', showTooltip)
    .on('mouseout', hideTooltip)

  // Create node labels
  textElements = container.append('g')
    .selectAll('text')
    .data(nodes.value)
    .enter()
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', d => getNodeRadius(d) + 8)
    .attr('class', 'text-[6px] text-tertiary')
    .text(d => d.label)
    .style('pointer-events', 'none')
    .style('opacity', 0.7)

  // Create tooltip
  const tooltip = d3.select('body').append('div')
    .attr('class', 'tooltip')
    .style('position', 'absolute')
    .style('background', 'rgba(0, 0, 0, 0.8)')
    .style('color', 'white')
    .style('padding', '5px')
    .style('border-radius', '3px')
    .style('font-size', '10px')
    .style('pointer-events', 'none')
    .style('opacity', 0)
    .style('z-index', 1000)

  // Create simulation
  simulation = d3.forceSimulation(nodes.value)
    .force('link', d3.forceLink(links.value)
      .id(d => d.id)
      .distance(d => d.strength ? 100 : 50)
      .strength(d => d.strength || 0.7)
    )
    .force('charge', d3.forceManyBody().strength(-100))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(d => getNodeRadius(d) + 5))
    .on('tick', ticked)

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

  // Tooltip functions
  function showTooltip(event, d) {
    let content = `Type: ${d.type.toUpperCase()}<br>`

    if (d.type === 'memory') {
      content += `ID: ${d.data.id}<br>`
      content += `Value: ${truncateText(d.data.value, 50)}<br>`
      if (d.data.memory_type) content += `Type: ${d.data.memory_type}<br>`
    } else if (d.type === 'message') {
      content += `ID: ${d.data.id}<br>`
      content += `Value: ${truncateText(d.data.value, 50)}<br>`
    } else if (d.type === 'user') {
      content += `ID: ${d.data.id}<br>`
    }

    tooltip.style('opacity', 1)
      .html(content)
      .style('left', (event.pageX + 10) + 'px')
      .style('top', (event.pageY - 28) + 'px')

    // Highlight connected nodes
    const connectedNodeIds = links.value
      .filter(link => link.source.id === d.id || link.target.id === d.id)
      .flatMap(link => [link.source.id, link.target.id])

    nodeElements.attr('opacity', node =>
      connectedNodeIds.includes(node.id) || node.id === d.id ? 1 : 0.3
    )

    linkElements.attr('opacity', link =>
      link.source.id === d.id || link.target.id === d.id ? 1 : 0.1
    )

    textElements.attr('opacity', node =>
      connectedNodeIds.includes(node.id) || node.id === d.id ? 1 : 0.1
    )
  }

  function hideTooltip() {
    tooltip.style('opacity', 0)

    // Reset opacity
    nodeElements.attr('opacity', 1)
    linkElements.attr('opacity', d => d.type === 'conversation' ? 0.3 : 0.6)
    textElements.attr('opacity', 0.7)
  }

  // Update positions on tick
  function ticked() {
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
  }

  // Apply initial filter
  applyFilter()
}

// Helper functions
function getNodeRadius(node) {
  switch (node.type) {
    case 'memory':
      return 5
    case 'message':
      return 4
    case 'user':
      return 6
    default:
      return 4
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

  if (simulationRunning.value) {
    simulation.restart()
  } else {
    simulation.stop()
  }
}

function resetZoom() {
  if (!svg || !zoom) return

  svg.transition()
    .duration(750)
    .call(zoom.transform, d3.zoomIdentity)
}

function applyFilter() {
  if (!nodeElements || !linkElements || !textElements) return

  const currentFilter = filter.value

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
    const sourceType = d.source.type || d.source.split('-')[0]
    const targetType = d.target.type || d.target.split('-')[0]
    return sourceType === currentFilter || targetType === currentFilter ? null : 'none'
  })

  // Filter text
  textElements.style('display', d => d.type === currentFilter ? null : 'none')

  // Restart simulation
  if (simulationRunning.value) {
    simulation.alpha(0.3).restart()
  }
}

// Watch for filter changes
watch(filter, () => {
  applyFilter()
})

// Lifecycle hooks
onMounted(() => {
  refreshData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (simulation) simulation.stop()
})

function handleResize() {
  renderNetwork()
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
}
</style>