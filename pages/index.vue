<template>
  <div class="min-h-screen font-mono">
    <SiteNav />
    
    <div class="p-2">
      <div class="mb-2 border-b border-gray-800 pb-1">
        <div class="flex items-center justify-between">
          <span class="text-base">DASHBOARD</span>
          <div class="text-xs">
            <button 
              @click="refreshData"
              class="border border-gray-800 px-1"
            >
              REFRESH
            </button>
          </div>
        </div>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
        <!-- Messages and Latest Log -->
        <div>
          <div class="border border-gray-800 mb-2">
            <div class="p-2">
              <MessagesView />
            </div>
          </div>
          
          <div class="border border-gray-800">
            <div class="p-2">
              <LatestLog />
            </div>
          </div>
        </div>
        
        <!-- Memories and To-Do Lists -->
        <div>
          <div class="border border-gray-800 mb-2">
            <div class="p-2">
              <MemoriesView />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import SiteNav from '~/components/SiteNav.vue'
import MessagesView from '~/components/MessagesView.vue'
import MemoriesView from '~/components/MemoriesView.vue'
import LatestLog from '~/components/LatestLog.vue'

// Current active view
const activeView = ref('dashboard')

// Log sample data
const sampleLogs = [
  { message: 'System initialized', level: 'info', service: 'KERNEL' },
  { message: 'Config loaded', level: 'info', service: 'CONFIG' },
  { message: 'API connection established', level: 'info', service: 'API' },
]

// Function to refresh all data
function refreshData() {
  // Dispatch a custom event for components to listen to
  window.dispatchEvent(new CustomEvent('refresh-data'))
  
  // Add a log entry
  window.dispatchEvent(
    new CustomEvent('system-log', { 
      detail: { 
        message: 'Manual refresh triggered',
        service: 'USER',
        level: 'info'
      }
    })
  )
}

// Initialize sample logs
onMounted(() => {
  // Add sample logs with a delay to simulate real activity
  setTimeout(() => {
    sampleLogs.forEach((log, index) => {
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('system-log', { 
            detail: log
          })
        )
      }, index * 1000)
    })
  }, 1000)
})

// Function to handle view changes
function updateView(view) {
  activeView.value = view
}

// Function to navigate to config
function navigateToConfig() {
  router.push('/config')
}

// Provide the router
const router = useRouter()
</script>
