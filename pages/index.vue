<template>
  <div>
    <div class="mb-2 border-b border-gray-800 pb-1">
      <span class="text-base">DASHBOARD</span>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
      <!-- Messages and Latest Log -->
      <div>
        <div class="border border-gray-800 mb-2 dashboard-section">
          <div class="p-2">
            <MessagesView />
          </div>
        </div>

        <div class="border border-gray-800 dashboard-section">
          <div class="p-2">
            <LatestLog />
          </div>
        </div>
      </div>

      <!-- Memories and To-Do Lists -->
      <div>
        <div class="border border-gray-800 mb-2 dashboard-section">
          <div class="p-2">
            <MemoriesView />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import MessagesView from '~/components/MessagesView.vue'
import MemoriesView from '~/components/MemoriesView.vue'
import LatestLog from '~/components/LatestLog.vue'
import { useStaggeredAnimation } from '~/composables/useStaggeredAnimation'

// Animation setup
const { animateStaggered } = useStaggeredAnimation()

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

// Initialize sample logs and animations
onMounted(() => {
  // Animate dashboard sections
  animateStaggered('.dashboard-section', {
    translateY: true
  })
})
</script>

<style scoped>
/* Initially hide dashboard sections */
.dashboard-section {
  opacity: 0;
}
</style>
