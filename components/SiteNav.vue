<template>
  <div class="w-full font-mono">
    <div class="flex justify-between border-b border-gray-800 pb-1 mb-2">
      <div class="flex items-center">
        <span class="text-base mr-2">COACH_ARTIE_v0.1</span>
        <span class="text-xs">{{ currentTimestamp }}</span>
      </div>
      
      <div class="text-xs flex items-center">
        <span v-for="(stat, index) in stats" :key="index" class="ml-4">
          {{ stat.label }}:{{ stat.value }}
        </span>
        
        <button 
          @click="navigateTo('/')"
          class="ml-4 text-xs border border-gray-800 px-1"
          :class="{ 'border-b-2': $route.path === '/' }"
        >
          DASHBOARD
        </button>
        
        <button 
          @click="navigateTo('/memories')"
          class="ml-1 text-xs border border-gray-800 px-1"
          :class="{ 'border-b-2': $route.path === '/memories' }"
        >
          MEMORIES
        </button>
        
        <button 
          @click="navigateTo('/prompts')"
          class="ml-1 text-xs border border-gray-800 px-1"
          :class="{ 'border-b-2': $route.path === '/prompts' }"
        >
          PROMPTS
        </button>
        
        <button 
          @click="navigateTo('/config')"
          class="ml-1 text-xs border border-gray-800 px-1"
          :class="{ 'border-b-2': $route.path === '/config' }"
        >
          CONFIG
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

// Stats data
const stats = ref([
  { label: 'USERS', value: 0 },
  { label: 'MSGS', value: 0 },
  { label: 'MEMORIES', value: 0 },
  { label: 'TODOS', value: 0 }
])

const supabase = useSupabaseClient()

// Current timestamp
const currentTimestamp = ref('00:00:00')

// Update timestamp
function updateTime() {
  const now = new Date()
  currentTimestamp.value = now.toTimeString().slice(0, 8)
}

// Navigation function
function navigateTo(path) {
  router.push(path)
}

// Fetch stats data
async function fetchStats() {
  // Messages count
  const { count: messagesCount } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
  
  // Users count
  const { count: usersCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
  
  // Memories count
  const { count: memoriesCount } = await supabase
    .from('memories')
    .select('*', { count: 'exact', head: true })
  
  // Todos count
  const { count: todosCount } = await supabase
    .from('todos')
    .select('*', { count: 'exact', head: true })
  
  stats.value[0].value = usersCount || 0
  stats.value[1].value = messagesCount || 0
  stats.value[2].value = memoriesCount || 0
  stats.value[3].value = todosCount || 0
}

onMounted(() => {
  updateTime()
  setInterval(updateTime, 1000)
  fetchStats()
  
  // Refresh stats every minute
  setInterval(fetchStats, 60000)
})
</script>
