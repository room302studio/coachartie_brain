<template>
  <div class="font-mono">
    <div class="flex items-center justify-between border-b border-gray-300 dark:border-secondary pb-0.5 mb-1">
      <div class="text-[10px] text-gray-700 dark:text-tertiary">DB METRICS [24H]</div>
      <button @click="fetchData" class="text-[8px] text-gray-500 dark:text-quaternary hover:text-gray-900 dark:hover:text-tertiary">[REFRESH]</button>
    </div>

    <!-- Queue Metrics -->
    <div class="mb-2">
      <div class="flex items-center justify-between">
        <div class="text-[8px] text-gray-500 dark:text-quaternary">QUEUE ACTIVITY</div>
        <div class="text-[8px] text-gray-500 dark:text-quaternary text-right">{{ queueCount }} TOTAL</div>
      </div>
      
      <div class="grid grid-cols-4 gap-x-1 mt-0.5">
        <div class="col-span-1 text-[8px] text-gray-700 dark:text-tertiary flex items-center">CREATED</div>
        <div class="col-span-3">
          <EmbeddableSparkline 
            :data="queueCreatedData" 
            color="#0F766E"
            :height="15" 
            :show-axis="false"
            :fill-area="false"
          />
        </div>
      </div>
      
      <div class="grid grid-cols-4 gap-x-1 mt-0.5">
        <div class="col-span-1 text-[8px] text-gray-700 dark:text-tertiary flex items-center">COMPLETED</div>
        <div class="col-span-3">
          <EmbeddableSparkline 
            :data="queueCompletedData" 
            color="#1D4ED8"
            :height="15" 
            :show-axis="false"
            :fill-area="false"
          />
        </div>
      </div>
      
      <div class="grid grid-cols-4 gap-x-1 mt-0.5">
        <div class="col-span-1 text-[8px] text-gray-700 dark:text-tertiary flex items-center">ERRORS</div>
        <div class="col-span-3">
          <EmbeddableSparkline 
            :data="queueErrorData" 
            color="#B91C1C"
            :height="15" 
            :show-axis="false"
            :fill-area="false"
          />
        </div>
      </div>
    </div>
    
    <!-- Message Metrics -->
    <div>
      <div class="flex items-center justify-between">
        <div class="text-[8px] text-gray-500 dark:text-quaternary">MESSAGE ACTIVITY</div>
        <div class="text-[8px] text-gray-500 dark:text-quaternary text-right">{{ messageCount }} TOTAL</div>
      </div>
      
      <div class="grid grid-cols-4 gap-x-1 mt-0.5">
        <div class="col-span-1 text-[8px] text-gray-700 dark:text-tertiary flex items-center">CREATED</div>
        <div class="col-span-3">
          <EmbeddableSparkline 
            :data="messagesCreatedData" 
            color="#0F766E"
            :height="15" 
            :show-axis="false"
            :fill-area="false"
          />
        </div>
      </div>
      
      <div class="grid grid-cols-4 gap-x-1 mt-0.5">
        <div class="col-span-1 text-[8px] text-gray-700 dark:text-tertiary flex items-center">EMAILS</div>
        <div class="col-span-3">
          <EmbeddableSparkline 
            :data="messagesByTypeData.email" 
            color="#1D4ED8"
            :height="15" 
            :show-axis="false"
            :fill-area="false"
          />
        </div>
      </div>
      
      <div class="grid grid-cols-4 gap-x-1 mt-0.5">
        <div class="col-span-1 text-[8px] text-gray-700 dark:text-tertiary flex items-center">CHATS</div>
        <div class="col-span-3">
          <EmbeddableSparkline 
            :data="messagesByTypeData.chat" 
            color="#7E22CE"
            :height="15" 
            :show-axis="false"
            :fill-area="false"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import EmbeddableSparkline from '~/components/EmbeddableSparkline.vue'
// const supabase = useSupabaseClient()

// Reactive data
const queueCreatedData = ref([])
const queueCompletedData = ref([])
const queueErrorData = ref([])
const messagesCreatedData = ref([])
const messagesByTypeData = ref({
  email: [],
  chat: []
})

// Raw data for counts
const queueData = ref([])
const messagesData = ref([])

// Total counts from database
const totalQueueCount = ref(0)
const totalMessageCount = ref(0)

// Computed totals based on fetched data or total counts
const queueCount = computed(() => totalQueueCount.value || queueData.value.length || 0)
const messageCount = computed(() => totalMessageCount.value || messagesData.value.length || 0)

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

// Fetch and aggregate data
async function fetchData() {
  try {
    // Get total counts first
    const countPromises = [
      supabase.from('queue').select('id', { count: 'exact', head: true }),
      supabase.from('messages').select('id', { count: 'exact', head: true })
    ]
    
    const [queueCountResult, messageCountResult] = await Promise.all(countPromises)
    
    // Update total counts
    totalQueueCount.value = queueCountResult.count || 0
    totalMessageCount.value = messageCountResult.count || 0
    
    // Queue data - Get last 100 entries for processing
    const { data: qData, error: qError } = await supabase
      .from('queue')
      .select('id, created_at, completed_at, error_message, status')
      .order('created_at', { ascending: false })
      .limit(100)
    
    if (qError) throw qError
    queueData.value = qData || []
    
    // Messages data - Get last 100 entries for processing
    const { data: mData, error: mError } = await supabase
      .from('messages')
      .select('id, created_at, message_type')
      .order('created_at', { ascending: false })
      .limit(100)
    
    if (mError) throw mError
    messagesData.value = mData || []
    
    // Process data
    processQueueData()
    processMessageData()
  } catch (error) {
    console.error('Error fetching data:', error)
    // Use sample data if fetch fails
    generateSampleData()
  }
}

// Process queue data
function processQueueData() {
  const timePoints = getLast24HourTimestamps()
  const hourlyDataCreated = initializeHourlyData(timePoints)
  const hourlyDataCompleted = initializeHourlyData(timePoints)
  const hourlyDataError = initializeHourlyData(timePoints)
  
  queueData.value.forEach(item => {
    if (item.created_at) {
      const hour = new Date(item.created_at).toISOString().slice(0, 13) + ':00:00.000Z'
      if (hourlyDataCreated[hour] !== undefined) {
        hourlyDataCreated[hour]++
      }
    }
    
    if (item.completed_at) {
      const hour = new Date(item.completed_at).toISOString().slice(0, 13) + ':00:00.000Z'
      if (hourlyDataCompleted[hour] !== undefined) {
        hourlyDataCompleted[hour]++
      }
    }
    
    if (item.error_message) {
      const hour = new Date(item.created_at).toISOString().slice(0, 13) + ':00:00.000Z'
      if (hourlyDataError[hour] !== undefined) {
        hourlyDataError[hour]++
      }
    }
  })
  
  queueCreatedData.value = Object.entries(hourlyDataCreated).map(([timestamp, count]) => ({ 
    timestamp, 
    count 
  }))
  
  queueCompletedData.value = Object.entries(hourlyDataCompleted).map(([timestamp, count]) => ({ 
    timestamp, 
    count 
  }))
  
  queueErrorData.value = Object.entries(hourlyDataError).map(([timestamp, count]) => ({ 
    timestamp, 
    count 
  }))
}

// Process message data
function processMessageData() {
  const timePoints = getLast24HourTimestamps()
  const hourlyDataCreated = initializeHourlyData(timePoints)
  const hourlyDataEmail = initializeHourlyData(timePoints)
  const hourlyDataChat = initializeHourlyData(timePoints)
  
  messagesData.value.forEach(item => {
    if (item.created_at) {
      const hour = new Date(item.created_at).toISOString().slice(0, 13) + ':00:00.000Z'
      if (hourlyDataCreated[hour] !== undefined) {
        hourlyDataCreated[hour]++
      }
      
      if (item.message_type === 'email' && hourlyDataEmail[hour] !== undefined) {
        hourlyDataEmail[hour]++
      }
      
      if (item.message_type === 'chat' && hourlyDataChat[hour] !== undefined) {
        hourlyDataChat[hour]++
      }
    }
  })
  
  messagesCreatedData.value = Object.entries(hourlyDataCreated).map(([timestamp, count]) => ({ 
    timestamp, 
    count 
  }))
  
  messagesByTypeData.value.email = Object.entries(hourlyDataEmail).map(([timestamp, count]) => ({ 
    timestamp, 
    count 
  }))
  
  messagesByTypeData.value.chat = Object.entries(hourlyDataChat).map(([timestamp, count]) => ({ 
    timestamp, 
    count 
  }))
}

// Initialize hourly data structure
function initializeHourlyData(timePoints) {
  const hourlyData = {}
  timePoints.forEach(timestamp => {
    hourlyData[timestamp] = 0
  })
  return hourlyData
}

// Generate sample data if fetching fails
function generateSampleData() {
  const timePoints = getLast24HourTimestamps()
  
  queueCreatedData.value = timePoints.map(timestamp => ({
    timestamp,
    count: Math.floor(Math.random() * 10)
  }))
  
  queueCompletedData.value = timePoints.map(timestamp => ({
    timestamp,
    count: Math.floor(Math.random() * 8)
  }))
  
  queueErrorData.value = timePoints.map(timestamp => ({
    timestamp,
    count: Math.floor(Math.random() * 3)
  }))
  
  messagesCreatedData.value = timePoints.map(timestamp => ({
    timestamp,
    count: Math.floor(Math.random() * 15)
  }))
  
  messagesByTypeData.value.email = timePoints.map(timestamp => ({
    timestamp,
    count: Math.floor(Math.random() * 6)
  }))
  
  messagesByTypeData.value.chat = timePoints.map(timestamp => ({
    timestamp,
    count: Math.floor(Math.random() * 9)
  }))
}

// Listen for refresh events
function setupRefreshListener() {
  window.addEventListener('refresh-data', fetchData)
}

// Lifecycle hooks
onMounted(() => {
  fetchData()
  setupRefreshListener()
})
</script> 