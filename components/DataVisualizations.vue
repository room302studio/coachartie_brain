<template>
  <div class="font-mono">
    <!-- Header with controls -->
    <div class="flex items-center justify-between mb-1 border-b border-gray-300 dark:border-primary pb-0.5">
      <div class="flex items-center">
        <button 
          @click="refreshData" 
          class="text-[10px] text-gray-700 dark:text-tertiary font-mono mr-1 border-r border-gray-300 dark:border-secondary px-0.5 hover:text-gray-900 dark:hover:text-secondary"
          aria-label="Refresh data"
        >
          [REFRESH]
        </button>
        <span class="text-[10px] text-gray-700 dark:text-tertiary">[VISUALIZATIONS]</span>
      </div>
    </div>
    
    <!-- Visualizations grid -->
    <div class="grid grid-cols-2 gap-2 max-h-[calc(100vh-250px)] overflow-y-auto p-1">
      <!-- Tool Usage Histogram -->
      <div class="border border-gray-300 dark:border-secondary p-1">
        <div class="text-[10px] text-gray-700 dark:text-tertiary mb-1">TOOL USAGE HISTOGRAM</div>
        <div ref="toolHistogramRef" class="w-full h-[120px]"></div>
      </div>
      
      <!-- User/Memory Pie Chart -->
      <div class="border border-gray-300 dark:border-secondary p-1">
        <div class="text-[10px] text-gray-700 dark:text-tertiary mb-1">USER/MEMORY DISTRIBUTION</div>
        <div ref="userPieRef" class="w-full h-[120px]"></div>
      </div>
      
      <!-- Activity Sparkline - 24h -->
      <div class="border border-gray-300 dark:border-secondary p-1">
        <div class="text-[10px] text-gray-700 dark:text-tertiary mb-1">ACTIVITY (24H)</div>
        <div ref="sparkline24hRef" class="w-full h-[60px]"></div>
      </div>
      
      <!-- Activity Sparkline - 7d -->
      <div class="border border-gray-300 dark:border-secondary p-1">
        <div class="text-[10px] text-gray-700 dark:text-tertiary mb-1">ACTIVITY (7D)</div>
        <div ref="sparkline7dRef" class="w-full h-[60px]"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as d3 from 'd3'

// Refs for chart containers
const toolHistogramRef = ref(null)
const userPieRef = ref(null)
const sparkline24hRef = ref(null)
const sparkline7dRef = ref(null)

// Data refs
const toolUsageData = ref([])
const userMemoryData = ref([])
const activity24hData = ref([])
const activity7dData = ref([])

// Chart instances
let toolHistogram = null
let userPie = null
let sparkline24h = null
let sparkline7d = null

// Fetch data from Supabase
const supabase = useSupabaseClient()

async function refreshData() {
  await Promise.all([
    fetchToolUsageData(),
    fetchUserMemoryData(),
    fetchActivityData()
  ])
  
  renderCharts()
}

async function fetchToolUsageData() {
  // Fetch tool usage data from messages table
  const { data, error } = await supabase
    .from('messages')
    .select('value')
    .limit(100)
  
  if (error) {
    console.error('Error fetching tool usage data:', error)
    return
  }
  
  // Extract tool names from message content (simplified approach)
  const toolCounts = {}
  
  data.forEach(message => {
    const content = message.value || ''
    const toolMatches = content.match(/\b(codebase_search|read_file|run_terminal_cmd|list_dir|grep_search|edit_file|file_search|delete_file|reapply|web_search|diff_history)\b/g)
    
    if (toolMatches) {
      toolMatches.forEach(tool => {
        toolCounts[tool] = (toolCounts[tool] || 0) + 1
      })
    }
  })
  
  // Convert to array format for D3
  toolUsageData.value = Object.entries(toolCounts).map(([name, count]) => ({
    name,
    count
  })).sort((a, b) => b.count - a.count)
}

async function fetchUserMemoryData() {
  // Fetch user/memory distribution
  const { data: messagesData, error: messagesError } = await supabase
    .from('messages')
    .select('user_id, memory_id')
    .limit(100)
  
  if (messagesError) {
    console.error('Error fetching user/memory data:', messagesError)
    return
  }
  
  // Count users
  const userCounts = {}
  messagesData.forEach(message => {
    const user = message.user_id || 'anonymous'
    userCounts[user] = (userCounts[user] || 0) + 1
  })
  
  // Convert to array format for D3
  userMemoryData.value = Object.entries(userCounts).map(([name, count]) => ({
    name: name || 'anonymous',
    count
  })).sort((a, b) => b.count - a.count)
}

async function fetchActivityData() {
  // Generate timestamps for the last 24 hours (hourly)
  const now = new Date()
  const hourly = []
  for (let i = 23; i >= 0; i--) {
    const date = new Date(now)
    date.setHours(now.getHours() - i)
    date.setMinutes(0, 0, 0)
    hourly.push({
      timestamp: date.toISOString(),
      count: 0
    })
  }
  
  // Generate timestamps for the last 7 days (daily)
  const daily = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(now.getDate() - i)
    date.setHours(0, 0, 0, 0)
    daily.push({
      timestamp: date.toISOString(),
      count: 0
    })
  }
  
  // Fetch activity data
  const { data: activityData, error: activityError } = await supabase
    .from('messages')
    .select('created_at')
    .gte('created_at', new Date(now.setDate(now.getDate() - 7)).toISOString())
    .order('created_at', { ascending: false })
  
  if (activityError) {
    console.error('Error fetching activity data:', activityError)
    return
  }
  
  // Process hourly data
  activityData.forEach(item => {
    const timestamp = new Date(item.created_at)
    
    // 24h data (hourly)
    const hourStart = new Date(timestamp)
    hourStart.setMinutes(0, 0, 0)
    const hourlyItem = hourly.find(h => 
      new Date(h.timestamp).getTime() === hourStart.getTime()
    )
    if (hourlyItem) hourlyItem.count++
    
    // 7d data (daily)
    const dayStart = new Date(timestamp)
    dayStart.setHours(0, 0, 0, 0)
    const dailyItem = daily.find(d => 
      new Date(d.timestamp).setHours(0, 0, 0, 0) === dayStart.getTime()
    )
    if (dailyItem) dailyItem.count++
  })
  
  activity24hData.value = hourly
  activity7dData.value = daily
}

function renderCharts() {
  renderToolHistogram()
  renderUserPie()
  renderSparkline24h()
  renderSparkline7d()
}

function renderToolHistogram() {
  if (!toolHistogramRef.value || toolUsageData.value.length === 0) return
  
  // Clear previous chart
  d3.select(toolHistogramRef.value).selectAll('*').remove()
  
  const data = toolUsageData.value.slice(0, 8) // Show top 8 tools
  
  // Set dimensions
  const margin = { top: 10, right: 10, bottom: 20, left: 30 }
  const width = toolHistogramRef.value.clientWidth - margin.left - margin.right
  const height = toolHistogramRef.value.clientHeight - margin.top - margin.bottom
  
  // Create SVG
  const svg = d3.select(toolHistogramRef.value)
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
    .attr('class', 'text-[8px] text-gray-700 dark:text-tertiary')
    .attr('transform', 'translate(-10,0)rotate(-45)')
    .style('text-anchor', 'end')
  
  // Add Y axis
  svg.append('g')
    .call(d3.axisLeft(y).ticks(5))
    .selectAll('text')
    .attr('class', 'text-[8px] text-gray-700 dark:text-tertiary')
  
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
    .attr('fill', 'rgba(20, 184, 166, 0.7)')
}

function renderUserPie() {
  if (!userPieRef.value || userMemoryData.value.length === 0) return
  
  // Clear previous chart
  d3.select(userPieRef.value).selectAll('*').remove()
  
  const data = userMemoryData.value.slice(0, 5) // Show top 5 users
  
  // Set dimensions
  const width = userPieRef.value.clientWidth
  const height = userPieRef.value.clientHeight
  const radius = Math.min(width, height) / 2 - 10
  
  // Create SVG
  const svg = d3.select(userPieRef.value)
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
    .innerRadius(radius * 0.4) // Donut chart
    .outerRadius(radius)
  
  // Small arc for labels
  const labelArc = d3.arc()
    .innerRadius(radius * 0.7)
    .outerRadius(radius * 0.7)
  
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
    .text(d => d.data.name.substring(0, 6))
  
  // Add center text
  svg.append('text')
    .attr('text-anchor', 'middle')
    .attr('class', 'text-[8px] text-gray-700 dark:text-tertiary')
    .text('USERS')
}

function renderSparkline24h() {
  if (!sparkline24hRef.value || activity24hData.value.length === 0) return
  
  // Clear previous chart
  d3.select(sparkline24hRef.value).selectAll('*').remove()
  
  const data = activity24hData.value
  
  // Set dimensions
  const margin = { top: 5, right: 5, bottom: 15, left: 20 }
  const width = sparkline24hRef.value.clientWidth - margin.left - margin.right
  const height = sparkline24hRef.value.clientHeight - margin.top - margin.bottom
  
  // Create SVG
  const svg = d3.select(sparkline24hRef.value)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)
  
  // X scale
  const x = d3.scaleTime()
    .domain(d3.extent(data, d => new Date(d.timestamp)))
    .range([0, width])
  
  // Y scale
  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.count) * 1.1 || 1])
    .range([height, 0])
  
  // Add X axis
  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat('%H:%M')))
    .selectAll('text')
    .attr('class', 'text-[8px] text-gray-700 dark:text-tertiary')
  
  // Add Y axis
  svg.append('g')
    .call(d3.axisLeft(y).ticks(3))
    .selectAll('text')
    .attr('class', 'text-[8px] text-gray-700 dark:text-tertiary')
  
  // Add line
  const line = d3.line()
    .x(d => x(new Date(d.timestamp)))
    .y(d => y(d.count))
    .curve(d3.curveMonotoneX)
  
  svg.append('path')
    .datum(data)
    .attr('fill', 'none')
    .attr('stroke', '#14B8A6')
    .attr('stroke-width', 1.5)
    .attr('d', line)
  
  // Add area
  const area = d3.area()
    .x(d => x(new Date(d.timestamp)))
    .y0(height)
    .y1(d => y(d.count))
    .curve(d3.curveMonotoneX)
  
  svg.append('path')
    .datum(data)
    .attr('fill', 'rgba(20, 184, 166, 0.2)')
    .attr('d', area)
  
  // Add dots
  svg.selectAll('.dot')
    .data(data.filter(d => d.count > 0))
    .enter()
    .append('circle')
    .attr('class', 'dot')
    .attr('cx', d => x(new Date(d.timestamp)))
    .attr('cy', d => y(d.count))
    .attr('r', 2)
    .attr('fill', '#14B8A6')
}

function renderSparkline7d() {
  if (!sparkline7dRef.value || activity7dData.value.length === 0) return
  
  // Clear previous chart
  d3.select(sparkline7dRef.value).selectAll('*').remove()
  
  const data = activity7dData.value
  
  // Set dimensions
  const margin = { top: 5, right: 5, bottom: 15, left: 20 }
  const width = sparkline7dRef.value.clientWidth - margin.left - margin.right
  const height = sparkline7dRef.value.clientHeight - margin.top - margin.bottom
  
  // Create SVG
  const svg = d3.select(sparkline7dRef.value)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)
  
  // X scale
  const x = d3.scaleTime()
    .domain(d3.extent(data, d => new Date(d.timestamp)))
    .range([0, width])
  
  // Y scale
  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.count) * 1.1 || 1])
    .range([height, 0])
  
  // Add X axis
  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(7).tickFormat(d3.timeFormat('%a')))
    .selectAll('text')
    .attr('class', 'text-[8px] text-gray-700 dark:text-tertiary')
  
  // Add Y axis
  svg.append('g')
    .call(d3.axisLeft(y).ticks(3))
    .selectAll('text')
    .attr('class', 'text-[8px] text-gray-700 dark:text-tertiary')
  
  // Add line
  const line = d3.line()
    .x(d => x(new Date(d.timestamp)))
    .y(d => y(d.count))
    .curve(d3.curveMonotoneX)
  
  svg.append('path')
    .datum(data)
    .attr('fill', 'none')
    .attr('stroke', '#14B8A6')
    .attr('stroke-width', 1.5)
    .attr('d', line)
  
  // Add area
  const area = d3.area()
    .x(d => x(new Date(d.timestamp)))
    .y0(height)
    .y1(d => y(d.count))
    .curve(d3.curveMonotoneX)
  
  svg.append('path')
    .datum(data)
    .attr('fill', 'rgba(20, 184, 166, 0.2)')
    .attr('d', area)
  
  // Add dots
  svg.selectAll('.dot')
    .data(data)
    .enter()
    .append('circle')
    .attr('class', 'dot')
    .attr('cx', d => x(new Date(d.timestamp)))
    .attr('cy', d => y(d.count))
    .attr('r', 2)
    .attr('fill', '#14B8A6')
}

// Resize handler
function handleResize() {
  renderCharts()
}

// Colors for light and dark mode
function getColors(isDark = false) {
  return {
    primary: isDark ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.95)',
    secondary: isDark ? 'rgba(255, 255, 255, 0.75)' : 'rgba(0, 0, 0, 0.75)',
    tertiary: isDark ? 'rgba(255, 255, 255, 0.55)' : 'rgba(0, 0, 0, 0.55)',
    quaternary: isDark ? 'rgba(255, 255, 255, 0.35)' : 'rgba(0, 0, 0, 0.35)',
    border: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
    accent: '#14b8a6',
    axis: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'
  }
}

// Check if dark mode is active
function isDarkMode() {
  return document.documentElement.classList.contains('dark');
}

// Update any D3 visualizations when the color scheme changes
function updateVisualizationColors() {
  const dark = isDarkMode();
  const colors = getColors(dark);
  
  // Update text elements
  d3.selectAll('.text-tertiary')
    .style('fill', colors.tertiary);
  
  d3.selectAll('.text-primary')
    .style('fill', colors.primary);
  
  // Update axes
  d3.selectAll('.domain, .tick line')
    .style('stroke', colors.axis);
  
  // Force redraw if needed
  if (toolUsageData.value.length > 0) {
    renderToolHistogram();
  }
  
  if (userMemoryData.value.length > 0) {
    renderUserPie();
  }
  
  renderSparkline24h();
  renderSparkline7d();
}

// Lifecycle hooks
onMounted(() => {
  refreshData()
  window.addEventListener('resize', handleResize)
  
  // Set up a MutationObserver to watch for dark mode class changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'class' && 
          mutation.target === document.documentElement) {
        updateVisualizationColors();
      }
    });
  });
  
  observer.observe(document.documentElement, { attributes: true });
  
  // Clean up
  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    observer.disconnect();
  });
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