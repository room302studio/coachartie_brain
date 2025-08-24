<template>
  <div class="font-mono">
    <!-- Header with controls -->
    <div class="flex items-center justify-between mb-1 border-b border-primary pb-0.5">
      <div class="flex items-center">
        <button 
          @click="refreshData" 
          class="text-[10px] text-tertiary font-mono mr-1 border-r border-secondary px-0.5 hover:text-secondary"
          aria-label="Refresh data"
        >
          [REFRESH]
        </button>
        <span class="text-[10px] text-tertiary">[MEMORY_STATS]</span>
      </div>
    </div>
    
    <!-- Stats grid -->
    <div class="grid grid-cols-2 gap-2 max-h-[calc(100vh-250px)] overflow-y-auto p-1">
      <!-- Memory Bubble Chart -->
      <div class="border border-secondary p-1 col-span-2">
        <div class="text-[10px] text-tertiary mb-1">MEMORY CLUSTERS</div>
        <div ref="bubbleChartRef" class="w-full h-[200px]"></div>
      </div>
      
      <!-- Memory Type Distribution -->
      <div class="border border-secondary p-1">
        <div class="text-[10px] text-tertiary mb-1">MEMORY TYPES</div>
        <div ref="memoryTypeChartRef" class="w-full h-[120px]"></div>
      </div>
      
      <!-- Memory Age Distribution -->
      <div class="border border-secondary p-1">
        <div class="text-[10px] text-tertiary mb-1">MEMORY AGE</div>
        <div ref="memoryAgeChartRef" class="w-full h-[120px]"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as d3 from 'd3'
import { format, formatDistance, subDays } from 'date-fns'

// Refs for chart containers
const bubbleChartRef = ref(null)
const memoryTypeChartRef = ref(null)
const memoryAgeChartRef = ref(null)

// Data refs
const memoriesData = ref([])
const memoryTypesData = ref([])
const memoryAgeData = ref([])

// Fetch data from Supabase
const supabase = useDatabase()

async function refreshData() {
  await Promise.all([
    fetchMemoriesData(),
    fetchMemoryTypesData(),
    fetchMemoryAgeData()
  ])
  
  renderCharts()
}

async function fetchMemoriesData() {
  // Fetch memories data
  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .limit(100)
  
  if (error) {
    console.error('Error fetching memories data:', error)
    return
  }
  
  // Process data for bubble chart
  // Group memories by some criteria (e.g., type or category)
  const groupedData = {}
  
  data.forEach(memory => {
    // Extract keywords from memory content for clustering
    const content = memory.value || ''
    const words = content.split(/\s+/).filter(word => 
      word.length > 4 && !['about', 'there', 'their', 'would', 'should'].includes(word.toLowerCase())
    )
    
    // Take the most frequent words
    const wordCounts = {}
    words.forEach(word => {
      wordCounts[word.toLowerCase()] = (wordCounts[word.toLowerCase()] || 0) + 1
    })
    
    // Sort by frequency
    const topWords = Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([word]) => word)
    
    // Use the top word as the group
    const group = topWords[0] || 'unknown'
    
    if (!groupedData[group]) {
      groupedData[group] = {
        name: group,
        children: []
      }
    }
    
    groupedData[group].children.push({
      name: memory.id,
      value: content.length, // Size based on content length
      data: memory
    })
  })
  
  // Convert to array format for D3
  memoriesData.value = {
    name: 'memories',
    children: Object.values(groupedData)
  }
}

async function fetchMemoryTypesData() {
  // Fetch memory types data
  const { data, error } = await supabase
    .from('memories')
    .select('type')
    .limit(100)
  
  if (error) {
    console.error('Error fetching memory types data:', error)
    return
  }
  
  // Count types
  const typeCounts = {}
  data.forEach(memory => {
    const type = memory.type || 'unknown'
    typeCounts[type] = (typeCounts[type] || 0) + 1
  })
  
  // Convert to array format for D3
  memoryTypesData.value = Object.entries(typeCounts).map(([name, count]) => ({
    name,
    count
  })).sort((a, b) => b.count - a.count)
}

async function fetchMemoryAgeData() {
  // Fetch memory age data
  const { data, error } = await supabase
    .from('memories')
    .select('created_at')
    .limit(100)
  
  if (error) {
    console.error('Error fetching memory age data:', error)
    return
  }
  
  // Group by age
  const now = new Date()
  const ageGroups = {
    'Today': 0,
    '1-7 days': 0,
    '1-4 weeks': 0,
    '1-3 months': 0,
    '3+ months': 0
  }
  
  data.forEach(memory => {
    const createdAt = new Date(memory.created_at)
    const daysDiff = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24))
    
    if (daysDiff < 1) {
      ageGroups['Today']++
    } else if (daysDiff < 8) {
      ageGroups['1-7 days']++
    } else if (daysDiff < 29) {
      ageGroups['1-4 weeks']++
    } else if (daysDiff < 91) {
      ageGroups['1-3 months']++
    } else {
      ageGroups['3+ months']++
    }
  })
  
  // Convert to array format for D3
  memoryAgeData.value = Object.entries(ageGroups).map(([name, count]) => ({
    name,
    count
  }))
}

function renderCharts() {
  renderBubbleChart()
  renderMemoryTypeChart()
  renderMemoryAgeChart()
}

function renderBubbleChart() {
  if (!bubbleChartRef.value || !memoriesData.value.children?.length) return
  
  // Clear previous chart
  d3.select(bubbleChartRef.value).selectAll('*').remove()
  
  const data = memoriesData.value
  
  // Set dimensions
  const width = bubbleChartRef.value.clientWidth
  const height = bubbleChartRef.value.clientHeight
  
  // Create SVG
  const svg = d3.select(bubbleChartRef.value)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform', `translate(0,0)`)
  
  // Create a pack layout
  const pack = d3.pack()
    .size([width, height])
    .padding(3)
  
  // Create hierarchy
  const root = d3.hierarchy(data)
    .sum(d => d.value || 1)
    .sort((a, b) => b.value - a.value)
  
  // Generate the pack layout
  pack(root)
  
  // Color scale for clusters
  const color = d3.scaleOrdinal()
    .domain(data.children.map(d => d.name))
    .range(d3.schemeTableau10)
  
  // Create a group for each cluster
  const clusters = svg.selectAll('.cluster')
    .data(root.children)
    .enter()
    .append('g')
    .attr('class', 'cluster')
    .attr('transform', d => `translate(${d.x},${d.y})`)
  
  // Add a background circle for each cluster
  clusters.append('circle')
    .attr('r', d => d.r)
    .attr('fill', d => d3.color(color(d.data.name)).darker(0.3))
    .attr('fill-opacity', 0.2)
    .attr('stroke', d => d3.color(color(d.data.name)).darker(0.5))
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '3,3')
  
  // Add cluster label
  clusters.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', d => -d.r + 10)
    .attr('class', 'text-[8px] text-primary font-bold')
    .text(d => d.data.name.toUpperCase())
  
  // Add memory bubbles
  const memories = clusters.selectAll('.memory')
    .data(d => d.children || [])
    .enter()
    .append('g')
    .attr('class', 'memory')
    .attr('transform', d => `translate(${d.x - d.parent.x},${d.y - d.parent.y})`)
  
  // Add bubble for each memory
  memories.append('circle')
    .attr('r', d => d.r)
    .attr('fill', d => color(d.parent.data.name))
    .attr('fill-opacity', 0.7)
    .attr('stroke', '#1E293B')
    .attr('stroke-width', 0.5)
    .on('mouseover', function(event, d) {
      d3.select(this)
        .attr('fill-opacity', 1)
        .attr('stroke-width', 1.5)
      
      // Show tooltip
      tooltip.style('opacity', 1)
        .html(`ID: ${d.data.name}<br>Size: ${d.data.value}`)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 28) + 'px')
    })
    .on('mouseout', function() {
      d3.select(this)
        .attr('fill-opacity', 0.7)
        .attr('stroke-width', 0.5)
      
      // Hide tooltip
      tooltip.style('opacity', 0)
    })
  
  // Add tooltip
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
}

function renderMemoryTypeChart() {
  if (!memoryTypeChartRef.value || memoryTypesData.value.length === 0) return
  
  // Clear previous chart
  d3.select(memoryTypeChartRef.value).selectAll('*').remove()
  
  const data = memoryTypesData.value
  
  // Set dimensions
  const margin = { top: 10, right: 10, bottom: 30, left: 40 }
  const width = memoryTypeChartRef.value.clientWidth - margin.left - margin.right
  const height = memoryTypeChartRef.value.clientHeight - margin.top - margin.bottom
  
  // Create SVG
  const svg = d3.select(memoryTypeChartRef.value)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)
  
  // X scale
  const x = d3.scaleBand()
    .domain(data.map(d => d.name))
    .range([0, width])
    .padding(0.1)
  
  // Y scale
  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.count) * 1.1])
    .range([height, 0])
  
  // Add X axis
  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll('text')
    .attr('class', 'text-[8px] text-tertiary')
    .attr('transform', 'translate(-10,0)rotate(-45)')
    .style('text-anchor', 'end')
  
  // Add Y axis
  svg.append('g')
    .call(d3.axisLeft(y).ticks(5))
    .selectAll('text')
    .attr('class', 'text-[8px] text-tertiary')
  
  // Add bars
  svg.selectAll('.bar')
    .data(data)
    .enter()
    .append('rect')
    .attr('class', 'bar')
    .attr('x', d => x(d.name))
    .attr('width', x.bandwidth())
    .attr('y', d => y(d.count))
    .attr('height', d => height - y(d.count))
    .attr('fill', '#0D9488')
}

function renderMemoryAgeChart() {
  if (!memoryAgeChartRef.value || memoryAgeData.value.length === 0) return
  
  // Clear previous chart
  d3.select(memoryAgeChartRef.value).selectAll('*').remove()
  
  const data = memoryAgeData.value
  
  // Set dimensions
  const width = memoryAgeChartRef.value.clientWidth
  const height = memoryAgeChartRef.value.clientHeight
  const radius = Math.min(width, height) / 2 - 10
  
  // Create SVG
  const svg = d3.select(memoryAgeChartRef.value)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform', `translate(${width / 2},${height / 2})`)
  
  // Color scale
  const color = d3.scaleOrdinal()
    .domain(data.map(d => d.name))
    .range(['#14B8A6', '#0D9488', '#0F766E', '#115E59', '#134E4A'])
  
  // Pie layout
  const pie = d3.pie()
    .value(d => d.count)
    .sort(null)
  
  // Arc generator
  const arc = d3.arc()
    .innerRadius(0) // Pie chart
    .outerRadius(radius)
  
  // Small arc for labels
  const labelArc = d3.arc()
    .innerRadius(radius * 0.6)
    .outerRadius(radius * 0.6)
  
  // Add arcs
  const arcs = svg.selectAll('.arc')
    .data(pie(data))
    .enter()
    .append('g')
    .attr('class', 'arc')
  
  arcs.append('path')
    .attr('d', arc)
    .attr('fill', d => color(d.data.name))
    .attr('stroke', '#1E293B')
    .attr('stroke-width', 1)
  
  // Add labels
  arcs.append('text')
    .attr('transform', d => `translate(${labelArc.centroid(d)})`)
    .attr('dy', '0.35em')
    .attr('text-anchor', 'middle')
    .attr('class', 'text-[8px] text-primary')
    .text(d => d.data.count > 0 ? d.data.name : '')
}

// Resize handler
function handleResize() {
  renderCharts()
}

// Lifecycle hooks
onMounted(() => {
  refreshData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
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