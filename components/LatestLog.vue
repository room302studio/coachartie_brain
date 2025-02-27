<template>
  <div class="font-mono">
    <div class="flex items-center mb-2 border-b border-gray-800 pb-1">
      <span class="text-xs">SYSTEM_LOGS</span>
      <span class="text-xs ml-2">[{{ logs.length }}]</span>
    </div>
    
    <div class="max-h-[calc(100vh-300px)] overflow-y-auto">
      <div v-if="logs.length === 0" class="text-center py-8 border border-dashed border-gray-800">
        <span class="text-xs">NO_LOGS</span>
      </div>
      
      <div v-else>
        <div 
          v-for="(log, index) in logs" 
          :key="index"
          class="border-b border-gray-800 py-1 text-xs"
        >
          <div class="flex">
            <span class="mr-2">{{ log.timestamp }}</span>
            <span class="mr-2">[{{ log.service }}]</span>
            <span :class="log.level === 'error' ? 'text-red-500' : ''">
              {{ log.message }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const logs = ref([])
const maxLogs = 100

// Simple timestamp function
function getTimestamp() {
  const now = new Date()
  return now.toISOString().slice(11, 19) // Extract time HH:MM:SS
}

// Add a log entry
function addLog(message, service = 'SYSTEM', level = 'info') {
  const log = {
    timestamp: getTimestamp(),
    service,
    level,
    message
  }
  
  logs.value.unshift(log)
  
  // Limit the number of logs
  if (logs.value.length > maxLogs) {
    logs.value = logs.value.slice(0, maxLogs)
  }
}

// Event listener for custom log events
const logEventHandler = (event) => {
  const { message, service, level } = event.detail
  addLog(message, service, level)
}

onMounted(() => {
  window.addEventListener('system-log', logEventHandler)
  
  // Initial system log
  setTimeout(() => {
    addLog('System monitor initialized', 'KERNEL', 'info')
  }, 500)
})

onUnmounted(() => {
  window.removeEventListener('system-log', logEventHandler)
})

// Expose log function to other components
defineExpose({
  addLog
})
</script>

