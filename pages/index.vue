<template>
  <div class="text-gray-900 dark:text-white">
    <div class="flex">
      <!-- Site Navigation Sidebar -->
      <div class="w-52 min-h-screen">
        <SiteNav />
      </div>

      <!-- Main Content -->
      <div class="flex-1 p-4 relative">
        <div class="mb-2 border-b border-gray-300 dark:border-black pb-1">
          <span class="text-base font-medium text-gray-900 dark:text-white">DASHBOARD</span>
        </div>

        <!-- Connection Layer for visual links between messages and memories -->
        <ConnectionLayer />

        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 relative z-10">
          <!-- Messages and Latest Log -->
          <div>
            <div
              class="border border-gray-300 dark:border-black mb-2 dashboard-section dark:bg-black rounded-md shadow-sm dark:shadow-none">
              <div class="section-title">MESSAGES</div>
              <div class="p-2">
                <MessagesView />
              </div>
            </div>

            <div
              class="border border-gray-300 dark:border-black dashboard-section dark:bg-black rounded-md shadow-sm dark:shadow-none">
              <div class="section-title">LATEST LOG</div>
              <div class="p-2">
                <LatestLog />
              </div>
            </div>
          </div>

          <!-- Memories, To-Do Lists, and Sparklines -->
          <div>
            <div
              class="border border-gray-300 dark:border-black mb-2 dashboard-section dark:bg-black rounded-md shadow-sm dark:shadow-none">
              <div class="section-title">MEMORIES</div>
              <div class="p-2">
                <MemoriesView />
              </div>
            </div>

            <div
              class="border border-gray-300 dark:border-black dashboard-section dark:bg-black rounded-md shadow-sm dark:shadow-none">
              <div class="section-title">DATA OVERVIEW</div>
              <div class="p-2">
                <TableOverviewSparklines />
              </div>
            </div>
          </div>
        </div>

        <!-- Network Graph Section -->
        <div
          class="mt-2 border border-gray-300 dark:border-black dashboard-section dark:bg-black rounded-md shadow-sm dark:shadow-none relative z-10">
          <div class="section-title">NETWORK GRAPH</div>
          <div class="p-2">
            <NetworkGraph />
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
import TableOverviewSparklines from '~/components/TableOverviewSparklines.vue'
import NetworkGraph from '~/components/NetworkGraph.vue'
import ConnectionLayer from '~/components/ConnectionLayer.vue'
import { useStaggeredAnimation } from '~/composables/useStaggeredAnimation'

// Define the layout to use
definePageMeta({
  layout: 'main'
})

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
  transition: opacity 0.3s ease, transform 0.4s ease;
}

/* Add hover effect for dashboard sections */
.dashboard-section:hover {
  border-color: #333333;
}

/* Section title styling */
.section-title {
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 0.5rem 0.75rem 0;
  color: #333;
  text-transform: uppercase;
  font-family: system-ui, -apple-system, sans-serif;
  line-height: 1;
}

@media (prefers-color-scheme: dark) {
  .dashboard-section:hover {
    border-color: #ffffff;
  }

  .section-title {
    color: #fff;
  }
}
</style>
