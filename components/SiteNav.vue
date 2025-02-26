<template>
  <div class="mb-6">
    <!-- Main Navigation -->
    <div class="bg-slate-800 dark:bg-slate-900 border border-slate-700 dark:border-slate-800 rounded-sm overflow-hidden">
      <div class="font-mono text-xs text-slate-500 bg-slate-700 dark:bg-slate-800 border-b border-slate-600 dark:border-slate-700 px-3 py-1 flex items-center">
        <span class="terminal-cursor mr-2">▋</span>SYSTEM_NAVIGATION
      </div>
      <div class="flex items-center space-x-1 py-1 overflow-x-auto hide-scrollbar">
        <div v-for="(view, index) in views" :key="view.key" 
          class="flex-none">
          <NuxtLink v-if="view.route" :to="view.route"
            class="flex items-center px-1 py-0.5 text-xs font-mono bg-gray-200 dark:bg-gray-800 border border-gray-400 dark:border-gray-700 hover:bg-gray-300 dark:hover:bg-gray-700 group transition-colors duration-200">
            <UIcon :name="view.icon" class="w-3 h-3 mr-1 text-gray-700 dark:text-gray-300" />
            <span>{{ view.label }}</span>
          </NuxtLink>
          <button v-else
            @click="view.click" 
            class="flex items-center px-1 py-0.5 text-xs font-mono bg-gray-200 dark:bg-gray-800 border border-gray-400 dark:border-gray-700 hover:bg-gray-300 dark:hover:bg-gray-700 group transition-colors duration-200">
            <UIcon :name="view.icon" class="w-3 h-3 mr-1 text-gray-700 dark:text-gray-300" />
            <span>{{ view.label }}</span>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Stats Bar -->
    <div class="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
      <div 
        v-for="stat in statsData" 
        :key="stat.label" 
        class="bg-slate-800 dark:bg-slate-900 border border-slate-700 dark:border-slate-800 rounded-sm p-3 flex items-center space-x-3 hover:border-cyan-700 transition-colors duration-200"
      >
        <div :class="stat.bgColor" class="rounded-sm p-2 bg-opacity-20 dark:bg-opacity-30">
          <UIcon :name="stat.icon" class="w-5 h-5" :class="stat.iconColor" />
        </div>
        <div>
          <div class="text-xs font-mono text-slate-400">{{ stat.label }}</div>
          <div class="text-lg font-mono font-semibold" :class="stat.valueColor">{{ stat.value }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const emit = defineEmits(['updateView'])
const supabase = useSupabaseClient()

// Stats counters
const userCount = ref(0)
const messageCount = ref(0)
const memoryCount = ref(0)
const todoCount = ref(0)

// Computed stats for display
const statsData = computed(() => [
  {
    label: 'USERS',
    value: userCount.value,
    icon: 'i-heroicons-user-group',
    iconColor: 'text-gray-400',
    valueColor: 'text-gray-300',
    bgColor: 'bg-gray-700'
  },
  {
    label: 'MESSAGES',
    value: messageCount.value,
    icon: 'i-heroicons-chat-bubble-left-right',
    iconColor: 'text-gray-400',
    valueColor: 'text-gray-300',
    bgColor: 'bg-gray-700'
  },
  {
    label: 'MEMORIES',
    value: memoryCount.value,
    icon: 'i-heroicons-brain',
    iconColor: 'text-gray-400',
    valueColor: 'text-gray-300',
    bgColor: 'bg-gray-700'
  },
  {
    label: 'TODOS',
    value: todoCount.value,
    icon: 'i-heroicons-check-circle',
    iconColor: 'text-gray-400',
    valueColor: 'text-gray-300',
    bgColor: 'bg-gray-700'
  }
])

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
}

// Fetch counts on component mount
fetchCounts()

// Navigation links with enhanced icons
const views = [
  {
    label: 'SYSTEM_HOME',
    key: 'coach-artie',
    icon: 'i-heroicons-home-solid',
  },
  {
    label: 'MEMORIES',
    key: 'memories',
    icon: 'i-heroicons-brain',
    click: () => emit('updateView', 'memories')
  },
  {
    label: 'CONFIG',
    key: 'config',
    icon: 'i-heroicons-cog-6-tooth-solid',
    route: '/config'
  },
  {
    label: 'PROMPTS',
    key: 'prompts',
    icon: 'i-heroicons-chat-bubble-bottom-center-text-solid',
    route: '/prompts'
  },
  {
    label: 'CAPABILITIES',
    key: 'capabilities',
    icon: 'i-fluent-cube-32-filled',
    click: () => emit('updateView', 'capabilities')
  },
  {
    label: 'LOGS',
    key: 'logs',
    icon: 'i-heroicons-document-text-solid',
    click: () => emit('updateView', 'logs')
  },
]

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
.terminal-cursor {
  color: #d1d5db;
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
</style>
