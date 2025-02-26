<template>
  <section class="min-h-screen hack-bg bg-gray-100 dark:bg-gray-900">
    <!-- Header with hackerpunk-inspired header - reduced padding -->
    <div class="bg-gradient-to-r from-gray-800 to-gray-900 dark:from-black dark:to-gray-900 text-white p-2 border-b border-gray-500 dark:border-gray-700 scanlines">
      <div class="max-w-full mx-auto flex items-center justify-between px-2">
        <div>
          <div class="flex items-center">
            <div class="mr-2 font-mono text-base text-gray-300 dark:text-gray-400 glitch-text">[>_]</div>
            <h1 class="text-xl font-mono font-bold hack-title text-white dark:text-gray-200">COACH_ARTIE::BRAIN</h1>
          </div>
          <div class="flex items-center mt-0.5">
            <div class="text-xs font-mono text-gray-300 dark:text-gray-400">
              <span class="text-white dark:text-gray-300">{{ userCount }}</span>u | 
              <span class="text-white dark:text-gray-300">{{ messageCount }}</span>m | 
              <span class="text-white dark:text-gray-300">{{ memoryCount }}</span>mem
            </div>
          </div>
        </div>
        <div class="flex items-center">
          <UButton
            color="gray" 
            variant="ghost" 
            :icon="isDark ? 'i-heroicons-sun' : 'i-heroicons-moon'"
            @click="toggleDarkMode"
            class="mr-1 text-gray-300 dark:text-gray-400 !p-1"
            aria-label="Toggle dark mode"
          />
          <UButton
            color="gray" 
            variant="ghost" 
            icon="i-heroicons-cog-6-tooth"
            class="text-gray-300 dark:text-gray-400 !p-1"
            aria-label="Settings"
            @click="navigateToConfig"
          />
        </div>
      </div>
    </div>

    <!-- Navigation with improved styling - reduced margin -->
    <div class="max-w-full mx-auto mt-1 px-2">
      <SiteNav @updateView="activeView = $event" />
    </div>

    <!-- Main Dashboard - increased height, reduced spacing -->
    <div class="max-w-full mx-auto mt-1 px-2 pb-2">
      <div class="bg-gray-200 dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-none overflow-hidden">
        <div class="p-1 bg-gray-300 dark:bg-gray-800 border-b border-gray-400 dark:border-gray-700 flex items-center">
          <div class="hack-indicator mr-1 w-2 h-2" aria-hidden="true"></div>
          <UIcon name="i-heroicons-command-line" class="w-3 h-3 mr-1 text-gray-700 dark:text-gray-300" aria-hidden="true" />
          <h2 id="mission-control-heading" class="font-mono text-xs font-semibold text-gray-800 dark:text-gray-200">MISSION_CONTROL.sys</h2>
          <span class="text-[10px] ml-1 font-mono text-gray-600 dark:text-gray-400">[drag]</span>
        </div>
        
        <Splitpanes class="default-theme" style="height: calc(100vh - 180px);" aria-labelledby="mission-control-heading">
          <!-- Left panel: User Messages (40%) -->
          <Pane min-size="25" size="40">
            <div class="p-1 bg-gray-300 dark:bg-gray-800 border-b border-gray-400 dark:border-gray-700 flex items-center">
              <div class="hack-indicator mr-1 w-2 h-2" aria-hidden="true"></div>
              <UIcon name="i-heroicons-chat-bubble-left-right" class="w-3 h-3 mr-1 text-gray-700 dark:text-gray-300" aria-hidden="true" />
              <h3 id="messages-heading" class="font-mono text-xs font-medium text-gray-800 dark:text-gray-200">USER_MESSAGES.db</h3>
            </div>
            <div aria-labelledby="messages-heading" class="overflow-auto" style="max-height: calc(100vh - 200px);">
              <MessagesView />
            </div>
          </Pane>
          
          <!-- Right panel: Top panel is Memories, Bottom panel is Logs -->
          <Pane min-size="25" size="60">
            <Splitpanes horizontal>
              <!-- Memories Panel (60% of right side) -->
              <Pane min-size="30" size="60">
                <div class="p-1 bg-gray-300 dark:bg-gray-800 border-b border-gray-400 dark:border-gray-700 flex items-center">
                  <div class="hack-indicator mr-1 w-2 h-2" aria-hidden="true"></div>
                  <UIcon name="i-heroicons-brain" class="w-3 h-3 mr-1 text-gray-700 dark:text-gray-300" aria-hidden="true" />
                  <h3 id="memories-heading" class="font-mono text-xs font-medium text-gray-800 dark:text-gray-200">BOT_MEMORIES.log</h3>
                </div>
                <div aria-labelledby="memories-heading" class="overflow-auto" style="max-height: calc(100vh - 350px);">
                  <MemoriesView />
                </div>
              </Pane>
              
              <!-- Logs Panel (40% of right side) -->
              <Pane min-size="20" size="40">
                <div class="p-1 bg-gray-300 dark:bg-gray-800 border-b border-gray-400 dark:border-gray-700 flex items-center">
                  <div class="hack-indicator mr-1 w-2 h-2" aria-hidden="true"></div>
                  <UIcon name="i-heroicons-exclamation-triangle" class="w-3 h-3 mr-1 text-gray-700 dark:text-gray-300" aria-hidden="true" />
                  <h3 id="logs-heading" class="font-mono text-xs font-medium text-gray-800 dark:text-gray-200">SYSTEM_LOGS.bin</h3>
                </div>
                <div aria-labelledby="logs-heading" class="overflow-auto" style="max-height: calc(100vh - 350px);">
                  <LatestLog />
                </div>
              </Pane>
            </Splitpanes>
          </Pane>
        </Splitpanes>
      </div>
    </div>

    <!-- System Stats - tighter layout -->
    <div class="max-w-full mx-auto mt-1 px-2 pb-2">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
        <!-- System Usage Bar with tighter styling -->
        <div class="bg-gray-200 dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-none overflow-hidden">
          <div class="p-1 bg-gray-300 dark:bg-gray-800 border-b border-gray-400 dark:border-gray-700 flex items-center">
            <div class="hack-indicator mr-1 w-2 h-2" aria-hidden="true"></div>
            <UIcon name="i-heroicons-cpu-chip" class="w-3 h-3 mr-1 text-gray-700 dark:text-gray-300" aria-hidden="true" />
            <h2 id="system-stats-heading" class="font-mono text-xs font-semibold text-gray-800 dark:text-gray-200">SYSTEM_STATS.mon</h2>
          </div>
          <div class="p-1 font-mono" aria-labelledby="system-stats-heading">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-1">
              <!-- User Count -->
              <div class="bg-gray-300 dark:bg-black border border-gray-400 dark:border-gray-800 p-1 hover:border-gray-600 dark:hover:border-gray-500 transition-colors duration-200">
                <div class="text-[10px] text-gray-600 dark:text-gray-400 flex items-center">
                  <UIcon name="i-heroicons-user-group" class="w-2 h-2 mr-0.5 text-gray-700 dark:text-gray-300" aria-hidden="true" />
                  USERS
                </div>
                <div class="flex items-center justify-between">
                  <div class="text-sm font-bold text-gray-800 dark:text-gray-200">{{ userCount }}</div>
                  <div class="text-[10px] text-gray-600 dark:text-gray-500">unique</div>
                </div>
              </div>
              
              <!-- Message Count -->
              <div class="bg-gray-300 dark:bg-black border border-gray-400 dark:border-gray-800 p-1 hover:border-gray-600 dark:hover:border-gray-500 transition-colors duration-200">
                <div class="text-[10px] text-gray-600 dark:text-gray-400 flex items-center">
                  <UIcon name="i-heroicons-chat-bubble-left-right" class="w-2 h-2 mr-0.5 text-gray-700 dark:text-gray-300" aria-hidden="true" />
                  MESSAGES
                </div>
                <div class="flex items-center justify-between">
                  <div class="text-sm font-bold text-gray-800 dark:text-gray-200">{{ messageCount }}</div>
                  <div class="text-[10px] text-gray-600 dark:text-gray-500">total</div>
                </div>
              </div>
              
              <!-- Memory Count -->
              <div class="bg-gray-300 dark:bg-black border border-gray-400 dark:border-gray-800 p-1 hover:border-gray-600 dark:hover:border-gray-500 transition-colors duration-200">
                <div class="text-[10px] text-gray-600 dark:text-gray-400 flex items-center">
                  <UIcon name="i-heroicons-brain" class="w-2 h-2 mr-0.5 text-gray-700 dark:text-gray-300" aria-hidden="true" />
                  MEMORIES
                </div>
                <div class="flex items-center justify-between">
                  <div class="text-sm font-bold text-gray-800 dark:text-gray-200">{{ memoryCount }}</div>
                  <div class="text-[10px] text-gray-600 dark:text-gray-500">stored</div>
                </div>
              </div>
              
              <!-- Todo Count -->
              <div class="bg-gray-300 dark:bg-black border border-gray-400 dark:border-gray-800 p-1 hover:border-gray-600 dark:hover:border-gray-500 transition-colors duration-200">
                <div class="text-[10px] text-gray-600 dark:text-gray-400 flex items-center">
                  <UIcon name="i-heroicons-check-circle" class="w-2 h-2 mr-0.5 text-gray-700 dark:text-gray-300" aria-hidden="true" />
                  TODOS
                </div>
                <div class="flex items-center justify-between">
                  <div class="text-sm font-bold text-gray-800 dark:text-gray-200">{{ todoCount }}</div>
                  <div class="text-[10px] text-gray-600 dark:text-gray-500">tasks</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- System Activity with tighter styling -->
        <div class="bg-gray-200 dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-none overflow-hidden">
          <div class="p-1 bg-gray-300 dark:bg-gray-800 border-b border-gray-400 dark:border-gray-700 flex items-center">
            <div class="hack-indicator mr-1 w-2 h-2" aria-hidden="true"></div>
            <UIcon name="i-heroicons-chart-bar" class="w-3 h-3 mr-1 text-gray-700 dark:text-gray-300" aria-hidden="true" />
            <h2 id="activity-metrics-heading" class="font-mono text-xs font-semibold text-gray-800 dark:text-gray-200">ACTIVITY_METRICS.log</h2>
          </div>
          <div class="p-1 font-mono" aria-labelledby="activity-metrics-heading">
            <div class="grid grid-cols-1 gap-1">
              <!-- Log level distribution -->
              <div class="border border-gray-400 dark:border-gray-800 p-1 bg-gray-300 dark:bg-black">
                <div class="text-[10px] text-gray-600 dark:text-gray-400 flex items-center">
                  <UIcon name="i-heroicons-exclamation-triangle" class="w-2 h-2 mr-0.5 text-gray-700 dark:text-gray-300" aria-hidden="true" />
                  LOG_LEVELS
                </div>
                <div class="grid grid-cols-4 gap-1 mt-0.5">
                  <div v-for="(count, level) in logLevelCounts" :key="level" 
                    class="bg-gray-200 dark:bg-gray-900 p-1 text-center border border-gray-300 dark:border-gray-800">
                    <div class="text-[10px] text-gray-800 dark:text-gray-300">{{ level.toUpperCase() }}</div>
                    <div class="text-sm font-bold text-gray-800 dark:text-gray-200">{{ count }}</div>
                  </div>
                </div>
              </div>

              <!-- Recent activity by service -->
              <div class="border border-gray-400 dark:border-gray-800 p-1 bg-gray-300 dark:bg-black">
                <div class="text-[10px] text-gray-600 dark:text-gray-400 flex items-center">
                  <UIcon name="i-heroicons-server" class="w-2 h-2 mr-0.5 text-gray-700 dark:text-gray-300" aria-hidden="true" />
                  SERVICE_ACTIVITY
                </div>
                <div class="grid grid-cols-3 xxs:grid-cols-4 sm:grid-cols-6 gap-1 mt-0.5">
                  <div v-for="(count, service) in logServiceCounts" :key="service" 
                    class="bg-gray-200 dark:bg-gray-900 p-1 flex justify-between items-center border border-gray-300 dark:border-gray-800">
                    <div class="text-[10px] text-gray-800 dark:text-gray-200 font-mono truncate pr-1">{{ service }}</div>
                    <div class="text-[10px] font-bold text-gray-800 dark:text-gray-200">{{ count }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer with status info -->
    <div class="border-t border-gray-300 dark:border-gray-800 mt-auto p-1 text-[10px] font-mono text-gray-600 dark:text-gray-500 bg-gray-200 dark:bg-gray-900">
      <div class="max-w-full mx-auto flex justify-between px-2">
        <div>COACH_ARTIE::BRAIN v{{ version }} | {{ currentDate }}</div>
        <div class="flex items-center">
          <span class="flex items-center mr-2">
            <div class="w-1.5 h-1.5 bg-gray-100 dark:bg-gray-300 border border-gray-400 dark:border-gray-600 rounded-full mr-0.5 pulse-slow" aria-hidden="true"></div>
            ONLINE
          </span>
          <span>UP:{{ uptime }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { Splitpanes, Pane } from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'
const supabase = useSupabaseClient()
import { format } from 'date-fns'
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

// App version from package.json
const version = ref('0.0.2')

// Format current date
const currentDate = computed(() => {
  return format(new Date(), 'yy-MM-dd HH:mm:ss')
})

// Calculate uptime
const startTime = new Date()
const uptime = computed(() => {
  const now = new Date()
  const diffMs = now - startTime
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const remainingMins = diffMins % 60
  
  return `${diffHours}h${remainingMins}m`
})

// Dark mode toggle
const isDark = ref(false)

onMounted(() => {
  // Initialize dark mode based on system preference
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  isDark.value = prefersDark
  document.documentElement.classList.toggle('dark', isDark.value)
  
  // Listen for system preference changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
    isDark.value = event.matches
    document.documentElement.classList.toggle('dark', isDark.value)
  })
})

const toggleDarkMode = () => {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
}

// Store active view
const activeView = ref('dashboard')
const router = useRouter()

// Navigation functions
const navigateToConfig = () => {
  router.push('/config')
}

// Stats counters
const userCount = ref(0)
const messageCount = ref(0)
const memoryCount = ref(0)
const todoCount = ref(0)
const logs = ref([])
const logLevelCounts = ref({})
const logServiceCounts = ref({})

// Fetch counts from database
async function fetchCounts() {
  // Get message count
  const { count: msgCount, error: msgError } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
  
  if (!msgError) messageCount.value = msgCount || 0
  
  // Get memory count
  const { count: memCount, error: memError } = await supabase
    .from('memories')
    .select('*', { count: 'exact', head: true })
  
  if (!memError) memoryCount.value = memCount || 0
  
  // Get todo count
  const { count: tdCount, error: tdError } = await supabase
    .from('todos')
    .select('*', { count: 'exact', head: true })
  
  if (!tdError) todoCount.value = tdCount || 0
  
  // Get unique user count
  const { data: userData, error: userError } = await supabase
    .from('messages')
    .select('user_id')
  
  if (!userError && userData) {
    const uniqueUsers = new Set(userData.map(msg => msg.user_id))
    userCount.value = uniqueUsers.size
  }
  
  // Get logs and count by level and service
  const { data: logsData, error: logsError } = await supabase
    .from('logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(200)
    
  if (!logsError && logsData) {
    logs.value = logsData
    
    // Count by level
    const levelCounts = {}
    // Count by service
    const serviceCounts = {}
    
    logsData.forEach(log => {
      if (log.level) {
        levelCounts[log.level] = (levelCounts[log.level] || 0) + 1
      }
      
      if (log.service) {
        serviceCounts[log.service] = (serviceCounts[log.service] || 0) + 1
      }
    })
    
    logLevelCounts.value = levelCounts
    logServiceCounts.value = serviceCounts
  }
}

// Helper function for log level text colors - now returns grayscale only
function levelToTextColor(level) {
  // All log levels now use the same grayscale colors with good contrast
  // Only error logs should have red color
  if (level && level.toLowerCase() === 'error') {
    return 'text-red-400 dark:text-red-400'
  }
  return 'text-gray-800 dark:text-gray-200'
}

// Initialize data
fetchCounts()

// Subscribe to database changes to update counts
supabase
  .channel('db-changes')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public' },
    (payload) => {
      // Refresh counts when database changes
      fetchCounts()
    }
  )
  .subscribe()
</script>

<style scoped>
.hack-bg {
  background-image: 
    radial-gradient(rgba(0, 0, 0, 0.1) 2px, transparent 2px),
    radial-gradient(rgba(0, 0, 0, 0.1) 2px, transparent 2px);
  background-size: 20px 20px;
  background-position: 0 0, 10px 10px;
  position: relative;
}

.dark .hack-bg {
  background-image: 
    radial-gradient(rgba(255, 255, 255, 0.05) 2px, transparent 2px),
    radial-gradient(rgba(255, 255, 255, 0.05) 2px, transparent 2px);
}

.hack-bg::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: linear-gradient(rgba(0, 0, 0, 0.03) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(0, 0, 0, 0.03) 1px, transparent 1px);
  background-size: 10px 10px;
  z-index: -1;
}

.dark .hack-bg::after {
  background-image: linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
}

.scanlines {
  position: relative;
  overflow: hidden;
}

.scanlines::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  background: linear-gradient(
    to bottom,
    transparent 50%,
    rgba(0, 0, 0, 0.05) 51%
  );
  background-size: 100% 2px;
  z-index: 2;
  pointer-events: none;
}

.dark .scanlines::before {
  background: linear-gradient(
    to bottom,
    transparent 50%,
    rgba(255, 255, 255, 0.05) 51%
  );
}

.hack-indicator {
  background-color: #374151; /* gray-700 */
  border-radius: 50%;
  display: inline-block;
  animation: hack-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.dark .hack-indicator {
  background-color: #D1D5DB; /* gray-300 */
}

@keyframes hack-pulse {
  0%, 100% {
    opacity: 1;
    box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
  }
  50% {
    opacity: 0.6;
    box-shadow: 0 0 1px rgba(0, 0, 0, 0.3);
  }
}

.dark @keyframes hack-pulse {
  0%, 100% {
    opacity: 1;
    box-shadow: 0 0 2px rgba(255, 255, 255, 0.5);
  }
  50% {
    opacity: 0.6;
    box-shadow: 0 0 1px rgba(255, 255, 255, 0.3);
  }
}

.glitch-text {
  position: relative;
  animation: glitch-skew 1s infinite linear alternate-reverse;
}

.glitch-text::before,
.glitch-text::after {
  content: "[>_]";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0.8;
}

.glitch-text::before {
  color: rgba(255, 255, 255, 0.7);
  animation: glitch-anim 5s infinite linear alternate-reverse;
}

.glitch-text::after {
  color: rgba(0, 0, 0, 0.3);
  animation: glitch-anim2 1s infinite linear alternate-reverse;
}

.dark .glitch-text::before {
  color: rgba(255, 255, 255, 0.7);
}

.dark .glitch-text::after {
  color: rgba(255, 255, 255, 0.3);
}

@keyframes glitch-anim {
  0% {
    clip-path: inset(80% 0 0 0);
    transform: translate(-1px, -1px);
  }
  10% {
    clip-path: inset(10% 0 85% 0);
    transform: translate(1px, 1px);
  }
  20% {
    clip-path: inset(80% 0 0 0);
    transform: translate(-1px, 1px);
  }
  30% {
    clip-path: inset(10% 0 85% 0);
    transform: translate(0px, 0px);
  }
  40% {
    clip-path: inset(50% 0 30% 0);
    transform: translate(1px, 1px);
  }
  50% {
    clip-path: inset(0% 0 100% 0);
    transform: translate(-1px, -1px);
  }
  60% {
    clip-path: inset(100% 0 0% 0);
    transform: translate(1px, 1px);
  }
  70% {
    clip-path: inset(0% 0 70% 0);
    transform: translate(-1px, 1px);
  }
  80% {
    clip-path: inset(50% 0 30% 0);
    transform: translate(0px, 0px);
  }
  90% {
    clip-path: inset(10% 0 60% 0);
    transform: translate(1px, -1px);
  }
  100% {
    clip-path: inset(40% 0 40% 0);
    transform: translate(-1px, 1px);
  }
}

@keyframes glitch-anim2 {
  0% {
    clip-path: inset(20% 0 70% 0);
    transform: translate(-1px, 1px);
  }
  100% {
    clip-path: inset(60% 0 20% 0);
    transform: translate(1px, -1px);
  }
}

@keyframes glitch-skew {
  0% {
    transform: skew(0deg);
  }
  10% {
    transform: skew(0.5deg);
  }
  20% {
    transform: skew(0deg);
  }
  30% {
    transform: skew(-0.5deg);
  }
  40% {
    transform: skew(0deg);
  }
  50% {
    transform: skew(0.5deg);
  }
  60% {
    transform: skew(0deg);
  }
  70% {
    transform: skew(-0.5deg);
  }
  80% {
    transform: skew(0deg);
  }
  90% {
    transform: skew(0.5deg);
  }
  100% {
    transform: skew(0deg);
  }
}

.hack-title {
  text-shadow: 0 0 3px rgba(255, 255, 255, 0.5);
}

.dark .hack-title {
  text-shadow: 0 0 3px rgba(255, 255, 255, 0.3);
}

.pulse-slow {
  animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse-slow {
  0%, 100% {
    opacity: 1;
    box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
  }
  50% {
    opacity: 0.5;
    box-shadow: 0 0 1px rgba(0, 0, 0, 0.3);
  }
}

.dark @keyframes pulse-slow {
  0%, 100% {
    opacity: 1;
    box-shadow: 0 0 2px rgba(255, 255, 255, 0.5);
  }
  50% {
    opacity: 0.5;
    box-shadow: 0 0 1px rgba(255, 255, 255, 0.3);
  }
}

/* Splitpanes custom styling */
:deep(.splitpanes__splitter) {
  background-color: #6B7280 !important; /* gray-500 */
  position: relative;
}

:deep(.splitpanes--vertical > .splitpanes__splitter) {
  width: 2px !important;
}

:deep(.splitpanes--horizontal > .splitpanes__splitter) {
  height: 2px !important;
}

:deep(.splitpanes__splitter:before) {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  transition: opacity 0.4s;
  background-color: #9CA3AF; /* gray-400 */
  opacity: 0;
  z-index: 1;
}

:deep(.splitpanes__splitter:hover:before) {
  opacity: 0.35;
}

:deep(.splitpanes--vertical > .splitpanes__splitter:before) {
  left: 0;
  right: 0;
  height: 100%;
}

:deep(.splitpanes--horizontal > .splitpanes__splitter:before) {
  top: 0;
  bottom: 0;
  width: 100%;
}
</style>
