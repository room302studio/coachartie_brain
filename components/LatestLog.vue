<template>
  <div class="p-4 font-mono">
    <div v-if="mostRecentMessage" class="flex items-start space-x-4">
      <div class="flex-shrink-0 mt-1">
        <div class="terminal-pulse w-3 h-3 bg-gray-500 rounded-full"></div>
      </div>
      <div class="flex-1">
        <div class="flex items-center mb-1 text-xs">
          <span class="bg-slate-700 dark:bg-black border border-slate-600 dark:border-slate-800 text-slate-300 px-2 py-0.5 rounded-sm">
            {{ formatTimeAgo(logs[0]?.timestamp) }}
          </span>
          <span v-if="logs[0]?.service" class="ml-2 bg-gray-800 dark:bg-gray-900 border border-gray-700 text-gray-300 px-2 py-0.5 rounded-sm">
            {{ logs[0]?.service }}
          </span>
          <span v-if="logs[0]?.level" 
            class="ml-2 px-2 py-0.5 rounded-sm border"
            :class="levelToClasses(logs[0]?.level)">
            {{ logs[0]?.level }}
          </span>
        </div>
        <p class="text-sm bg-slate-800 dark:bg-black border border-slate-700 dark:border-slate-800 p-2 rounded-sm font-mono text-gray-400" v-html="formatMessage(mostRecentMessage)"></p>
      </div>
    </div>
    <div v-else class="flex items-center justify-center h-32 border border-dashed border-slate-700 dark:border-slate-800">
      <div class="text-center">
        <UIcon name="i-heroicons-clock" class="w-8 h-8 mx-auto text-slate-500 mb-2" />
        <p class="text-slate-500 font-mono">WAITING_FOR_ACTIVITY...</p>
      </div>
    </div>
    
    <!-- Recent activity summary -->
    <div class="mt-4 pt-4 border-t border-slate-700 dark:border-slate-800">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-sm font-medium flex items-center">
          <span class="terminal-cursor mr-2">▋</span>RECENT_LOGS
        </h3>
        <span class="text-xs text-slate-400">Last {{ Math.min(logs.length, defaultLogsToShow) }} events</span>
      </div>
      
      <!-- Recent logs list -->
      <div class="overflow-y-auto max-h-40 bg-slate-800 dark:bg-black border border-slate-700 dark:border-slate-800 p-1">
        <div v-for="(log, index) in logs.slice(0, 5)" :key="index" 
          class="text-xs py-1 px-2 border-b border-slate-700 dark:border-slate-800 last:border-0 hover:bg-slate-700 dark:hover:bg-slate-900 transition-colors duration-150">
          <div class="flex items-center">
            <div :class="levelToCircleClass(log.level)" class="w-2 h-2 rounded-full mr-2"></div>
            <span class="text-slate-400 mr-2">[{{ formatTime(log.timestamp) }}]</span>
            <span v-if="log.service" class="text-gray-400 mr-2">[{{ log.service }}]</span>
            <span v-if="log.level" 
              :class="levelToTextClass(log.level)"
              class="mr-2">[{{ log.level }}]</span>
          </div>
          <div class="ml-4 mt-1 text-slate-300 break-words">{{ log.message }}</div>
        </div>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
        <!-- Services -->
        <div class="bg-slate-800 dark:bg-black border border-slate-700 dark:border-slate-800 p-2">
          <div class="flex items-center mb-1">
            <UIcon name="i-heroicons-server" class="w-4 h-4 mr-1 text-gray-400" />
            <span class="text-xs font-medium">SERVICES</span>
          </div>
          <div class="flex flex-wrap gap-1">
            <span v-for="service in uniqueServices" :key="service" 
              class="text-xs bg-slate-700 dark:bg-slate-900 border border-slate-600 dark:border-slate-800 px-1.5 py-0.5 rounded-sm">
              {{ service }}
              <span class="text-slate-400 ml-1">{{ countServiceLogs(service) }}</span>
            </span>
          </div>
        </div>
        
        <!-- Log Levels -->
        <div class="bg-slate-800 dark:bg-black border border-slate-700 dark:border-slate-800 p-2">
          <div class="flex items-center mb-1">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 mr-1 text-gray-400" />
            <span class="text-xs font-medium">LOG_LEVELS</span>
          </div>
          <div class="flex flex-wrap gap-1">
            <span v-for="level in uniqueLevels" :key="level" 
              class="text-xs px-1.5 py-0.5 rounded-sm border"
              :class="levelToClasses(level)">
              {{ level }}
              <span class="ml-1 opacity-80">{{ countLevelLogs(level) }}</span>
            </span>
          </div>
        </div>
        
        <!-- Activity -->
        <div class="bg-slate-800 dark:bg-black border border-slate-700 dark:border-slate-800 p-2">
          <div class="flex items-center mb-1">
            <UIcon name="i-heroicons-chart-bar" class="w-4 h-4 mr-1 text-gray-400" />
            <span class="text-xs font-medium">ACTIVITY_TIMELINE</span>
          </div>
          <div class="flex items-end h-12 space-x-0">
            <div v-for="(count, index) in activityCounts" :key="index" 
              class="bg-gray-700 dark:bg-gray-800 rounded-none border-r border-slate-800 dark:border-black flex-1"
              :style="`height: ${Math.max(count * 100 / maxActivityCount, 5)}%`">
            </div>
          </div>
          <div class="text-xs text-center mt-1 text-slate-400">LAST_10_MINUTES</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const supabase = useSupabaseClient()
const logs = ref([])

const defaultLogsToShow = 60

const { data: logsData, error: logsError } = await supabase
  .from('logs')
  .select('*')
  .order('timestamp', { ascending: false })
  .limit(defaultLogsToShow)

if (logsData) {
  logs.value = logsData
}

const mostRecentMessage = computed(() => logs.value[0]?.message)

// Subscribe to new messages
supabase
  .channel('messagechannel')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'logs' },
    (payload) => {
      logs.value = [payload.new, ...logs.value]
    }
  )
  .subscribe()

// Format message with terminal-like styling
function formatMessage(message) {
  if (!message) return '';
  
  // Replace certain patterns with styled versions
  return message
    .replace(/SUCCESS/gi, '<span class="text-gray-400">SUCCESS</span>')
    .replace(/ERROR/gi, '<span class="text-red-400">ERROR</span>')
    .replace(/WARNING/gi, '<span class="text-gray-400">WARNING</span>')
    .replace(/(https?:\/\/[^\s]+)/g, '<span class="text-gray-400 underline">$1</span>');
}

// Format time
function formatTime(timestamp) {
  if (!timestamp) return '--:--:--'
  
  const date = new Date(timestamp)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`
}

// Format time ago
function formatTimeAgo(timestamp) {
  if (!timestamp) return 'Just now'
  
  const now = new Date()
  const logTime = new Date(timestamp)
  const diffMs = now - logTime
  
  // Convert to seconds
  const diffSec = Math.floor(diffMs / 1000)
  
  if (diffSec < 60) return `${diffSec}s ago`
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  return `${Math.floor(diffSec / 86400)}d ago`
}

// Get unique services
const uniqueServices = computed(() => {
  const services = logs.value.map(log => log.service).filter(Boolean)
  return [...new Set(services)]
})

// Get unique log levels
const uniqueLevels = computed(() => {
  const levels = logs.value.map(log => log.level).filter(Boolean)
  return [...new Set(levels)]
})

// Count logs by service
function countServiceLogs(service) {
  return logs.value.filter(log => log.service === service).length
}

// Count logs by level
function countLevelLogs(level) {
  return logs.value.filter(log => log.level === level).length
}

// Style classes for log levels
function levelToClasses(level) {
  if (!level) return {
    'text-slate-300': true,
    'border-slate-700': true,
    'bg-slate-800': true
  }
  
  switch(level.toLowerCase()) {
    case 'error':
      return {
        'text-red-400': true,
        'border-red-800': true,
        'bg-red-950': true
      }
    case 'warning':
      return {
        'text-gray-400': true,
        'border-gray-700': true,
        'bg-gray-800': true
      }
    case 'info':
      return {
        'text-gray-400': true,
        'border-gray-700': true,
        'bg-gray-800': true
      }
    case 'debug':
      return {
        'text-gray-400': true,
        'border-gray-700': true,
        'bg-gray-800': true
      }
    default:
      return {
        'text-slate-300': true,
        'border-slate-700': true,
        'bg-slate-800': true
      }
  }
}

// Text color for log levels
function levelToTextClass(level) {
  if (!level) return 'text-slate-300'
  
  switch(level.toLowerCase()) {
    case 'error':
      return 'text-red-400'
    case 'warning':
      return 'text-gray-400'
    case 'info':
      return 'text-gray-400'
    case 'debug':
      return 'text-gray-400'
    default:
      return 'text-slate-300'
  }
}

// Circle indicator for log levels
function levelToCircleClass(level) {
  if (!level) return 'bg-slate-500'
  
  switch(level.toLowerCase()) {
    case 'error':
      return 'bg-red-500'
    case 'warning':
      return 'bg-gray-500'
    case 'info':
      return 'bg-gray-500'
    case 'debug':
      return 'bg-gray-500'
    default:
      return 'bg-slate-500'
  }
}

// Generate activity chart data
const activityCounts = computed(() => {
  // Create 10 time buckets for the last 10 minutes
  const now = new Date()
  const buckets = Array(10).fill(0)
  
  logs.value.forEach(log => {
    const logTime = new Date(log.timestamp)
    const diffMs = now - logTime
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    
    // Only count logs from the last 10 minutes
    if (diffMinutes < 10) {
      buckets[diffMinutes]++
    }
  })
  
  return buckets.reverse()
})

// Get max count for scaling
const maxActivityCount = computed(() => {
  return Math.max(...activityCounts.value, 1)
})
</script>

<style scoped>
.terminal-pulse {
  animation: terminal-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes terminal-pulse {
  0%, 100% {
    opacity: 1;
    box-shadow: 0 0 8px rgba(148, 163, 184, 0.8);
  }
  50% {
    opacity: 0.5;
    box-shadow: 0 0 3px rgba(148, 163, 184, 0.4);
  }
}

.terminal-cursor {
  color: #d1d5db;
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
</style>

