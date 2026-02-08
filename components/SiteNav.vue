<template>
  <div class="font-mono border-r border-primary h-full p-0.5 dark:bg-black text-gray-900 dark:text-white">
    <!-- Status indicators -->
    <div class="border-b border-secondary pb-0.5 mb-1">
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <div class="w-1.5 h-1.5 rounded-full mr-1"
            :class="connectionStatus === 'connected' ? 'bg-green-500' : connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'">
          </div>
          <span class="text-[10px] text-gray-700 dark:text-tertiary">{{ connectionStatus.toUpperCase() }}</span>
        </div>
        <div class="text-[10px] text-gray-500 dark:text-quaternary">{{ currentTime }}</div>
      </div>
      <div class="flex items-center mt-0.5">
        <div class="w-1.5 h-1.5 rounded-full mr-1"
          :class="systemStatus === 'ready' ? 'bg-green-500' : systemStatus === 'busy' ? 'bg-yellow-500' : 'bg-red-500'">
        </div>
        <span class="text-[10px] text-gray-700 dark:text-tertiary">{{ systemStatus.toUpperCase() }}</span>
      </div>
    </div>

    <!-- Quick stats -->
    <div class="grid grid-cols-3 gap-0.5 border-b border-secondary pb-0.5 mb-1">
      <div class="text-center">
        <div class="text-[10px] text-gray-500 dark:text-quaternary">MEMORIES</div>
        <div class="text-[10px] text-gray-700 dark:text-secondary">{{ stats.memories }}</div>
      </div>
      <div class="text-center">
        <div class="text-[10px] text-gray-500 dark:text-quaternary">MESSAGES</div>
        <div class="text-[10px] text-gray-700 dark:text-secondary">{{ stats.messages }}</div>
      </div>
      <div class="text-center">
        <div class="text-[10px] text-gray-500 dark:text-quaternary">QUEUE</div>
        <div class="text-[10px] text-gray-700 dark:text-secondary">{{ stats.queue }}</div>
      </div>
    </div>

    <!-- Navigation links -->
    <div class="grid grid-cols-2 gap-0.5 border-b border-secondary pb-0.5 mb-1">
      <NuxtLink v-for="link in navLinks" :key="link.path" :to="link.path"
        class="text-[10px] text-gray-700 dark:text-tertiary hover:text-gray-900 dark:hover:text-secondary px-0.5 py-0.5"
        active-class="border-l border-secondary text-gray-900 dark:text-primary">
        {{ link.name }}
      </NuxtLink>
    </div>

    <!-- System info -->
    <div class="text-[10px] text-gray-500 dark:text-quaternary">
      <div class="flex justify-between">
        <span>MODEL:</span>
        <span class="text-gray-700 dark:text-tertiary">{{ systemInfo.model }}</span>
      </div>
      <div class="flex justify-between">
        <span>TEMP:</span>
        <span class="text-gray-700 dark:text-tertiary">{{ systemInfo.temperature }}</span>
      </div>
      <div class="flex justify-between">
        <span>VERSION:</span>
        <span class="text-gray-700 dark:text-tertiary">{{ systemInfo.version }}</span>
      </div>
    </div>

    <!-- Light/Dark Mode Toggle -->
    <div class="flex justify-between items-center mt-1 py-1 border-t border-secondary">
      <span class="text-[10px] text-gray-500 dark:text-quaternary">THEME:</span>
      <button @click="toggleDarkMode"
        class="text-[10px] text-gray-700 dark:text-tertiary hover:text-gray-900 dark:hover:text-secondary">
        {{ isDarkMode ? 'LIGHT MODE' : 'DARK MODE' }}
      </button>
    </div>

    <!-- Activity sparkline -->
    <div class="mt-1 border-t border-secondary pt-0.5">
      <div class="text-[10px] text-gray-500 dark:text-quaternary mb-0.5">ACTIVITY (24H)</div>
      <EmbeddableSparkline :data="activityData" :height="20" :color="isDarkMode ? '#14B8A6' : '#0F766E'"
        :show-axis="false" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import EmbeddableSparkline from '~/components/EmbeddableSparkline.vue'
// // import { useSupabaseClient } from '#imports'

// const supabase = useDatabase()

// Dark mode state
const isDarkMode = ref(true)

// Reactive variables
const connectionStatus = ref('disconnected')
const systemStatus = ref('initializing')
const currentTime = ref('')

// Navigation links
const navLinks = [
  { path: '/', name: 'DASHBOARD' },
  { path: '/debugChat', name: 'CHAT' },
  { path: '/memories', name: 'MEMORIES' },
  { path: '/messages', name: 'MESSAGES' },
  { path: '/prompts', name: 'PROMPTS' },
  { path: '/todos', name: 'TODOS' },
  { path: '/visualizations', name: 'VISUALIZE' },
  { path: '/status', name: 'STATUS' },
  { path: '/config', name: 'CONFIG' }
]

// Stats
const stats = ref({
  memories: 0,
  messages: 0,
  queue: 0
})

// System info
const systemInfo = ref({
  model: 'Loading...',
  temperature: '0.0',
  version: '0.1.0'
})

// Config
const config = ref({
  default_model: '',
  temperature: 0,
})

// Activity data
const activityData = ref([])

// Toggle dark mode
function toggleDarkMode() {
  isDarkMode.value = !isDarkMode.value
  if (isDarkMode.value) {
    document.documentElement.classList.add('dark')
    localStorage.setItem('darkMode', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('darkMode', 'light')
  }
}

// Fetch config from the database
async function fetchConfig() {
  // Temporarily disabled - needs migration from Supabase
  return
  /*
  try {
    const { data, error } = await supabase
      .from('config')
      .select('config_key, config_value, notes')

    if (error) throw error

    if (data && data.length > 0) {
      // Process key-value pairs into config object
      const configMap = {}
      data.forEach(item => {
        configMap[item.config_key] = item.config_value
      })

      // Update local config with values from database
      config.value = {
        default_model: configMap['default_model'] || 'gpt-3.5-turbo',
        temperature: parseFloat(configMap['temperature'] || '0.7')
      }

      // Update systemInfo with real values
      systemInfo.value.model = formatModelName(config.value.default_model)
      systemInfo.value.temperature = config.value.temperature.toString()

      // Update version if available
      if (configMap['version']) {
        systemInfo.value.version = configMap['version']
      }
    }
  } catch (err) {
    console.error('Error fetching config:', err)
  }
  */
}

// Format model name for display
function formatModelName(model) {
  if (!model) return 'Unknown'

  // Convert model name to display format
  const modelMap = {
    'gpt-4': 'GPT-4',
    'gpt-4-turbo': 'GPT-4 Turbo',
    'gpt-3.5-turbo': 'GPT-3.5',
    'claude-3-opus': 'Claude Opus',
    'claude-3-sonnet': 'Claude Sonnet',
    'claude-3-haiku': 'Claude Haiku'
  }

  return modelMap[model] || model
}

// Generate activity data for the sparkline
async function generateActivityData() {
  try {
    // Try to fetch real activity data
    const hoursAgo24 = new Date()
    hoursAgo24.setHours(hoursAgo24.getHours() - 24)

    // Fetch from API instead of Supabase
    const response = await fetch('/api/status')
    const statusData = await response.json()
    
    // Use the memoriesCreatedData from the status API
    if (statusData.memoriesCreatedData) {
      activityData.value = statusData.memoriesCreatedData
    } else {
      throw new Error('No activity data')
    }

  } catch (err) {
    console.error('Error fetching activity data:', err)
    // Use fallback data (zeros) instead of random data
    const now = new Date()
    const data = []

    for (let i = 23; i >= 0; i--) {
      const date = new Date(now)
      date.setHours(now.getHours() - i)
      date.setMinutes(0, 0, 0)

      data.push({
        timestamp: date.toISOString(),
        count: 0
      })
    }

    activityData.value = data
  }
}

// Process timestamps to hourly counts
function processTimestampsToHourly(items, dateField) {
  // Create a map of the last 24 hours
  const hourlyMap = {}
  const now = new Date()

  for (let i = 23; i >= 0; i--) {
    const date = new Date(now)
    date.setHours(now.getHours() - i)
    date.setMinutes(0, 0, 0)
    date.setSeconds(0)
    date.setMilliseconds(0)

    const isoHour = date.toISOString()
    hourlyMap[isoHour] = 0
  }

  // Count items per hour
  items.forEach(item => {
    const date = new Date(item[dateField])
    date.setMinutes(0, 0, 0)
    date.setSeconds(0)
    date.setMilliseconds(0)

    const hourKey = date.toISOString()
    if (hourlyMap[hourKey] !== undefined) {
      hourlyMap[hourKey]++
    }
  })

  // Convert to array format
  return Object.entries(hourlyMap).map(([timestamp, count]) => ({
    timestamp,
    count
  }))
}

// Update current time
function updateTime() {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// Fetch real stats
async function fetchStats() {
  try {
    // Get counts from the status API
    const response = await fetch('/api/status')
    const statusData = await response.json()
    
    stats.value = {
      memories: statusData.memoryCount || 0,
      messages: statusData.messageCount || 0,
      queue: statusData.queueCount || 0
    }
  } catch (err) {
    console.error('Error fetching stats:', err)
    // Do not update with fake data if real data fetch fails
  }
}

// Check database connection
async function checkConnectionStatus() {
  try {
    const response = await fetch('/api/status')
    if (response.ok) {
      connectionStatus.value = 'connected'
    } else {
      connectionStatus.value = 'disconnected'
    }
  } catch (e) {
    connectionStatus.value = 'disconnected'
  }
}

// Determine system status based on queue
async function determineSystemStatus() {
  try {
    const response = await fetch('/api/queue/status')
    const result = await response.json()

    if (result.success && result.data) {
      // Check if there are any processing items
      const processingItems = result.data.filter(item => item.status === 'processing')
      systemStatus.value = processingItems.length > 0 ? 'busy' : 'ready'
    } else {
      systemStatus.value = 'ready'
    }
  } catch (err) {
    console.error('Error checking system status:', err)
    systemStatus.value = 'error'
  }
}

// Check dark mode from system preference
function checkSystemDarkMode() {
  if (typeof window !== 'undefined') {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode) {
      // Use saved preference if available
      isDarkMode.value = savedMode === 'dark';
    } else {
      // Fall back to system preference
      isDarkMode.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    // Apply theme to document
    if (isDarkMode.value) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}

// Set up data loading based on visibility
function setupVisibilityHandler() {
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        fetchStats()
        fetchConfig()
        checkConnectionStatus()
        determineSystemStatus()
        generateActivityData()
      }
    })
  }
}

// Lifecycle
onMounted(() => {
  // Check system dark mode preference
  checkSystemDarkMode()

  // Initial data loads
  updateTime()
  fetchStats()
  fetchConfig()
  checkConnectionStatus()
  determineSystemStatus()
  generateActivityData()

  // Set up handlers
  setupVisibilityHandler()

  // Set up intervals (less frequent than before to reduce API calls)
  setInterval(updateTime, 1000)
  setInterval(fetchStats, 30000) // Every 30 seconds
  setInterval(checkConnectionStatus, 60000) // Every minute
  setInterval(determineSystemStatus, 60000) // Every minute
  setInterval(generateActivityData, 300000) // Every 5 minutes
})
</script>
