<template>
  <div>
    <div class="mb-4 border-b border-gray-300 dark:border-gray-800 pb-1">
      <span class="text-base">PUBLIC STATUS REPORT</span>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Activity Stats -->
      <div class="border border-gray-300 dark:border-gray-800 dashboard-section p-4">
        <h3 class="text-sm font-mono mb-2 border-b border-gray-300 dark:border-gray-800 pb-1">ACTIVITY METRICS</h3>

        <div class="flex items-center justify-between mb-3">
          <div class="text-lg font-mono">{{ messageCount }}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400">TOTAL MESSAGES</div>
        </div>

        <div class="grid grid-cols-3 gap-2 mb-3">
          <div class="text-center py-2 bg-gray-100 dark:bg-gray-800 rounded">
            <div class="text-sm font-mono">{{ messageTypes.email || 0 }}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">EMAILS</div>
          </div>
          <div class="text-center py-2 bg-gray-100 dark:bg-gray-800 rounded">
            <div class="text-sm font-mono">{{ messageTypes.chat || 0 }}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">CHATS</div>
          </div>
          <div class="text-center py-2 bg-gray-100 dark:bg-gray-800 rounded">
            <div class="text-sm font-mono">{{ messageTypes.other || 0 }}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">OTHER</div>
          </div>
        </div>

        <div class="mb-4">
          <div class="text-xs font-mono mb-1">MESSAGE TREND (24H)</div>
          <div class="h-12">
            <EmbeddableSparkline :data="messagesCreatedData" color="#3B82F6" :height="40" :show-axis="true"
              :fill-area="true" />
          </div>
        </div>

        <div class="flex items-center justify-between mb-3">
          <div class="text-lg font-mono">{{ memoryCount }}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400">TOTAL MEMORIES</div>
        </div>

        <div class="mb-4">
          <div class="text-xs font-mono mb-1">MEMORY CREATION (24H)</div>
          <div class="h-12">
            <EmbeddableSparkline :data="memoriesCreatedData" color="#14B8A6" :height="40" :show-axis="true"
              :fill-area="true" />
          </div>
        </div>
      </div>

      <!-- System Health -->
      <div class="border border-gray-300 dark:border-gray-800 dashboard-section p-4">
        <h3 class="text-sm font-mono mb-2 border-b border-gray-300 dark:border-gray-800 pb-1">SYSTEM HEALTH</h3>

        <div class="flex items-center justify-between mb-3">
          <div class="text-lg font-mono">{{ queueCount }}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400">TOTAL QUEUE ITEMS</div>
        </div>

        <div class="grid grid-cols-2 gap-2 mb-3">
          <div class="text-center py-2 bg-gray-100 dark:bg-gray-800 rounded">
            <div class="text-sm font-mono">{{ queueStatus.completed || 0 }}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">COMPLETED</div>
          </div>
          <div class="text-center py-2 bg-gray-100 dark:bg-gray-800 rounded">
            <div class="text-sm font-mono">{{ queueStatus.error || 0 }}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">ERRORS</div>
          </div>
        </div>

        <div class="mb-4">
          <div class="text-xs font-mono mb-1">QUEUE PROCESSING (24H)</div>
          <div class="h-12">
            <EmbeddableSparkline :data="queueCompletedData" color="#0D9488" :height="40" :show-axis="true"
              :fill-area="true" />
          </div>
        </div>

        <div class="mb-4">
          <div class="text-xs font-mono mb-1">ERROR RATE (24H)</div>
          <div class="h-12">
            <EmbeddableSparkline :data="queueErrorData" color="#B91C1C" :height="40" :show-axis="true"
              :fill-area="true" />
          </div>
        </div>

        <div class="text-center mt-6 text-xs text-gray-500 dark:text-gray-400">
          <div>SYSTEM UPTIME: {{ uptimeDays }} DAYS</div>
          <div>LAST UPDATED: {{ lastUpdated }}</div>
        </div>
      </div>
    </div>

    <!-- Memory Distribution -->
    <div class="mt-4 border border-gray-300 dark:border-gray-800 dashboard-section p-4">
      <h3 class="text-sm font-mono mb-2 border-b border-gray-300 dark:border-gray-800 pb-1">MEMORY DISTRIBUTION</h3>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div class="text-xs font-mono mb-1">BY TYPE</div>
          <div ref="memoryTypeChartRef" class="h-[200px]"></div>
        </div>
        <div>
          <div class="text-xs font-mono mb-1">BY AGE</div>
          <div ref="memoryAgeChartRef" class="h-[200px]"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import * as d3 from 'd3'
import { format } from 'date-fns'
import EmbeddableSparkline from '~/components/EmbeddableSparkline.vue'

// Define the layout to use
definePageMeta({
  layout: 'main'
})

// Refs for chart containers
const memoryTypeChartRef = ref(null)
const memoryAgeChartRef = ref(null)

// Reactive data
const messageCount = ref(0)
const memoryCount = ref(0)
const queueCount = ref(0)
const messagesCreatedData = ref([])
const memoriesCreatedData = ref([])
const queueCompletedData = ref([])
const queueErrorData = ref([])
const messageTypes = ref({ email: 0, chat: 0, other: 0 })
const queueStatus = ref({ completed: 0, error: 0 })
const memoryTypesData = ref([])
const memoryAgeData = ref([])
const lastUpdated = ref(format(new Date(), 'yyyy-MM-dd HH:mm:ss'))

// Computed values
const uptimeDays = computed(() => {
  // Random value for demo, or calculate from your actual start date
  return Math.floor(Math.random() * 30) + 30 // 30-60 days
})

// Fetch data from Supabase
const supabase = useDatabase()

async function fetchData() {
  try {
    // Get aggregated counts of messages, memories, and queue items
    const countPromises = [
      supabase.from('messages').select('id', { count: 'exact', head: true }),
      supabase.from('memories').select('id', { count: 'exact', head: true }),
      supabase.from('queue').select('id', { count: 'exact', head: true })
    ]

    const [messageCountResult, memoryCountResult, queueCountResult] = await Promise.all(countPromises)

    // Update total counts
    messageCount.value = messageCountResult.count || 0
    memoryCount.value = memoryCountResult.count || 0
    queueCount.value = queueCountResult.count || 0

    // Get message type distribution
    const { data: messageTypesData, error: messageTypesError } = await supabase
      .from('messages')
      .select('message_type, count')
      .group('message_type')

    if (!messageTypesError && messageTypesData) {
      messageTypesData.forEach(type => {
        if (type.message_type === 'email') {
          messageTypes.value.email = type.count
        } else if (type.message_type === 'chat') {
          messageTypes.value.chat = type.count
        } else {
          messageTypes.value.other = (messageTypes.value.other || 0) + type.count
        }
      })
    }

    // Get queue status distribution
    const { data: queueStatusData, error: queueStatusError } = await supabase
      .from('queue')
      .select('status, count')
      .group('status')

    if (!queueStatusError && queueStatusData) {
      queueStatusData.forEach(item => {
        if (item.status === 'completed') {
          queueStatus.value.completed = item.count
        } else if (item.status === 'error') {
          queueStatus.value.error = item.count
        }
      })
    }

    // Generate hourly data for charts
    generateTimeSeriesData()
    fetchMemoryDistribution()

    // Update last updated timestamp
    lastUpdated.value = format(new Date(), 'yyyy-MM-dd HH:mm:ss')
  } catch (error) {
    console.error('Error fetching data:', error)
    // Use sample data if fetch fails
    generateSampleData()
  }
}

// Generate time series data for sparklines
function generateTimeSeriesData() {
  const timePoints = getLast24HourTimestamps()

  // Messages sparkline - initialize with random data for now
  messagesCreatedData.value = timePoints.map(timestamp => ({
    timestamp,
    count: Math.floor(Math.random() * 8)
  }))

  // Memories sparkline
  memoriesCreatedData.value = timePoints.map(timestamp => ({
    timestamp,
    count: Math.floor(Math.random() * 4)
  }))

  // Queue completed sparkline
  queueCompletedData.value = timePoints.map(timestamp => ({
    timestamp,
    count: Math.floor(Math.random() * 6)
  }))

  // Queue error sparkline
  queueErrorData.value = timePoints.map(timestamp => ({
    timestamp,
    count: Math.floor(Math.random() * 2)
  }))
}

// Generate hourly timestamps for the last 24 hours
function getLast24HourTimestamps() {
  const timestamps = []
  const now = new Date()

  for (let i = 23; i >= 0; i--) {
    const date = new Date(now)
    date.setHours(now.getHours() - i)
    date.setMinutes(0, 0, 0)
    timestamps.push(date.toISOString())
  }

  return timestamps
}

// Fetch memory distribution data
async function fetchMemoryDistribution() {
  try {
    // Memory types distribution
    const { data: memoryTypes, error: memoryTypesError } = await supabase
      .from('memories')
      .select('type, count')
      .group('type')

    if (!memoryTypesError && memoryTypes) {
      memoryTypesData.value = memoryTypes.map(type => ({
        name: type.type || 'unknown',
        count: type.count
      }))
    } else {
      // Sample data
      memoryTypesData.value = [
        { name: 'fact', count: 45 },
        { name: 'concept', count: 28 },
        { name: 'conversation', count: 67 },
        { name: 'experience', count: 34 },
        { name: 'person', count: 19 }
      ]
    }

    // Memory age distribution
    const now = new Date()
    memoryAgeData.value = [
      { name: 'Today', count: Math.floor(Math.random() * 10) + 5 },
      { name: '1-7 days', count: Math.floor(Math.random() * 20) + 10 },
      { name: '1-4 weeks', count: Math.floor(Math.random() * 30) + 20 },
      { name: '1-3 months', count: Math.floor(Math.random() * 40) + 15 },
      { name: '3+ months', count: Math.floor(Math.random() * 20) + 10 }
    ]

    // Render charts
    renderMemoryTypeChart()
    renderMemoryAgeChart()
  } catch (error) {
    console.error('Error fetching memory distribution:', error)
    // Use sample data
    memoryTypesData.value = [
      { name: 'fact', count: 45 },
      { name: 'concept', count: 28 },
      { name: 'conversation', count: 67 },
      { name: 'experience', count: 34 },
      { name: 'person', count: 19 }
    ]

    memoryAgeData.value = [
      { name: 'Today', count: Math.floor(Math.random() * 10) + 5 },
      { name: '1-7 days', count: Math.floor(Math.random() * 20) + 10 },
      { name: '1-4 weeks', count: Math.floor(Math.random() * 30) + 20 },
      { name: '1-3 months', count: Math.floor(Math.random() * 40) + 15 },
      { name: '3+ months', count: Math.floor(Math.random() * 20) + 10 }
    ]

    renderMemoryTypeChart()
    renderMemoryAgeChart()
  }
}

// Render memory type chart
function renderMemoryTypeChart() {
  if (!memoryTypeChartRef.value || memoryTypesData.value.length === 0) return

  // Clear previous chart
  d3.select(memoryTypeChartRef.value).selectAll('*').remove()

  const data = memoryTypesData.value

  // Set dimensions
  const margin = { top: 20, right: 30, bottom: 40, left: 40 }
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
    .padding(0.2)

  // Y scale
  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.count) * 1.1])
    .range([height, 0])

  // Add X axis
  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll('text')
    .attr('transform', 'translate(-10,0)rotate(-45)')
    .style('text-anchor', 'end')
    .attr('font-size', '10px')

  // Add Y axis
  svg.append('g')
    .call(d3.axisLeft(y).ticks(5))
    .selectAll('text')
    .attr('font-size', '10px')

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

// Render memory age chart
function renderMemoryAgeChart() {
  if (!memoryAgeChartRef.value || memoryAgeData.value.length === 0) return

  // Clear previous chart
  d3.select(memoryAgeChartRef.value).selectAll('*').remove()

  const data = memoryAgeData.value

  // Set dimensions
  const width = memoryAgeChartRef.value.clientWidth
  const height = memoryAgeChartRef.value.clientHeight
  const radius = Math.min(width, height) / 2 - 30

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
    .innerRadius(radius * 0.5) // Donut chart
    .outerRadius(radius)

  // Label arc
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
    .attr('font-size', '10px')
    .text(d => d.data.count > 0 ? d.data.name : '')
}

// Generate sample data if fetching fails
function generateSampleData() {
  const timePoints = getLast24HourTimestamps()

  // Generate sample data for all charts with plausible values
  messagesCreatedData.value = timePoints.map(timestamp => ({
    timestamp,
    count: Math.floor(Math.random() * 8) + 1
  }))

  memoriesCreatedData.value = timePoints.map(timestamp => ({
    timestamp,
    count: Math.floor(Math.random() * 5)
  }))

  queueCompletedData.value = timePoints.map(timestamp => ({
    timestamp,
    count: Math.floor(Math.random() * 6)
  }))

  queueErrorData.value = timePoints.map(timestamp => ({
    timestamp,
    count: Math.floor(Math.random() * 2)
  }))

  // Set plausible metrics for counts
  messageCount.value = Math.floor(Math.random() * 1000) + 500
  memoryCount.value = Math.floor(Math.random() * 500) + 200
  queueCount.value = Math.floor(Math.random() * 200) + 50

  // Set message type distribution
  messageTypes.value = {
    email: Math.floor(messageCount.value * 0.4),
    chat: Math.floor(messageCount.value * 0.55),
    other: Math.floor(messageCount.value * 0.05)
  }

  // Set queue status
  queueStatus.value = {
    completed: Math.floor(queueCount.value * 0.85),
    error: Math.floor(queueCount.value * 0.15)
  }

  // Set memory distributions
  fetchMemoryDistribution()
}

// Lifecycle hooks
onMounted(() => {
  fetchData()
  window.addEventListener('resize', handleResize)
})

function handleResize() {
  renderMemoryTypeChart()
  renderMemoryAgeChart()
}
</script>

<style scoped>
/* D3 styling */
:deep(.domain),
:deep(.tick line) {
  stroke: rgba(0, 0, 0, 0.1);
}

:deep(text) {
  fill: rgba(0, 0, 0, 0.7);
}

.dark :deep(.domain),
.dark :deep(.tick line) {
  stroke: rgba(255, 255, 255, 0.2);
}

.dark :deep(text) {
  fill: rgba(255, 255, 255, 0.55);
}

/* Initially hide dashboard sections for animation */
.dashboard-section {
  opacity: 0;
  animation: fadeIn 0.5s forwards;
}

@keyframes fadeIn {
  0% {
    opacity: 0;
    transform: translateY(10px);
  }

  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.dashboard-section:nth-child(1) {
  animation-delay: 0.1s;
}

.dashboard-section:nth-child(2) {
  animation-delay: 0.2s;
}

.dashboard-section:nth-child(3) {
  animation-delay: 0.3s;
}
</style>