<template>
  <div class="font-mono border-r border-primary h-full p-0.5 bg-white dark:bg-black text-gray-900 dark:text-white">
    <!-- Status indicators -->
    <div class="border-b border-secondary pb-0.5 mb-1">
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <div class="w-1.5 h-1.5 rounded-full mr-1"
            :class="statusDotClass()">
          </div>
          <span class="text-[10px] text-gray-700 dark:text-tertiary">{{ connectionStatus.toUpperCase() }}</span>
        </div>
        <div class="text-[10px] text-gray-500 dark:text-quaternary">{{ currentTime }}</div>
      </div>
    </div>

    <!-- Quick stats (the QUEUE count went with the v3 cutover: there is no queue) -->
    <div class="grid grid-cols-2 gap-0.5 border-b border-secondary pb-0.5 mb-1">
      <div class="text-center">
        <div class="text-[10px] text-gray-500 dark:text-quaternary">MEMORIES</div>
        <div class="text-[10px] text-gray-700 dark:text-secondary">{{ stats.memories }}</div>
      </div>
      <div class="text-center">
        <div class="text-[10px] text-gray-500 dark:text-quaternary">MESSAGES</div>
        <div class="text-[10px] text-gray-700 dark:text-secondary">{{ stats.messages }}</div>
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

    <!-- Light/Dark Mode Toggle -->
    <div class="flex justify-between items-center mt-1 py-1 border-t border-secondary">
      <span class="text-[10px] text-gray-500 dark:text-quaternary">THEME:</span>
      <button @click="toggleDarkMode"
        class="text-[10px] text-gray-700 dark:text-tertiary hover:text-gray-900 dark:hover:text-secondary">
        <span v-if="isDarkMode">LIGHT MODE</span><span v-else>DARK MODE</span>
      </button>
    </div>

    <!-- Activity sparkline -->
    <div class="mt-1 border-t border-secondary pt-0.5">
      <div class="text-[10px] text-gray-500 dark:text-quaternary mb-0.5">ACTIVITY (24H)</div>
      <EmbeddableSparkline :data="activityData" :height="20" :color="sparklineColor()"
        :show-axis="false" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

function statusDotClass() {
  if (connectionStatus.value === 'connected') {
    return 'bg-green-500'
  }
  if (connectionStatus.value === 'connecting') {
    return 'bg-yellow-500'
  }
  return 'bg-red-500'
}

function sparklineColor() {
  if (isDarkMode.value) {
    return '#14B8A6'
  }
  return '#0F766E'
}
import EmbeddableSparkline from '~/components/EmbeddableSparkline.vue'
// // import { useSupabaseClient } from '#imports'

// const supabase = useDatabase()

// Dark mode state
const isDarkMode = ref(true)

// Reactive variables
const connectionStatus = ref('disconnected')
const currentTime = ref('')

// Navigation links: only pages backed by real data (2026-11-21). Gone: CHAT (called a dead
// localhost:18239 from the browser), MESSAGES and TODOS (no such pages), VISUALIZE and CONFIG
// (read the empty useDatabase() stand-in left from the Supabase removal).
const navLinks = [
  { path: '/', name: 'DASHBOARD' },
  { path: '/memories', name: 'MEMORIES' },
  { path: '/prompts', name: 'PROMPTS' },
  { path: '/status', name: 'STATUS' },
  { path: '/spend', name: 'SPEND' }
]

// Stats
const stats = ref({
  memories: 0,
  messages: 0
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
// Unused as of 2026-11-23 (lint pass); kept for reference.
function _processTimestampsToHourly(items, dateField) {
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
      messages: statusData.messageCount || 0
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
  } catch {
    connectionStatus.value = 'disconnected'
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
        void fetchStats()
        void checkConnectionStatus()
        void generateActivityData()
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
  void fetchStats()
  void checkConnectionStatus()
  void generateActivityData()

  // Set up handlers
  setupVisibilityHandler()

  // Set up intervals (less frequent than before to reduce API calls)
  setInterval(updateTime, 1000)
  setInterval(() => { void fetchStats() }, 30000) // Every 30 seconds
  setInterval(() => { void checkConnectionStatus() }, 60000) // Every minute
  setInterval(() => { void generateActivityData() }, 300000) // Every 5 minutes
})
</script>
