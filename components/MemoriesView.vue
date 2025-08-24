<template>
  <div class="font-mono text-gray-900 dark:text-white">
    <!-- Header with controls -->
    <div class="flex items-center justify-between mb-1 border-b border-gray-300 dark:border-black pb-0.5">
      <div class="flex items-center">
        <button @click="refreshMemories"
          class="text-[10px] text-gray-700 dark:text-white font-mono mr-1 border-r border-gray-300 dark:border-black px-0.5 hover:text-gray-900 dark:hover:text-gray-300"
          aria-label="Refresh memories">
          [REFRESH]
        </button>
        <button @click="showFilters = !showFilters"
          class="text-[10px] text-gray-700 dark:text-white font-mono mr-1 border-r border-gray-300 dark:border-black px-0.5 hover:text-gray-900 dark:hover:text-gray-300">
          [{{ showFilters ? 'HIDE_FILTER' : 'FILTER' }}]
        </button>
        <span class="text-[10px] text-gray-700 dark:text-white">[{{ filteredMemories.length }}]</span>
      </div>
      <div>
        <button @click="memoriesToShow = 10" class="text-[10px] text-gray-700 dark:text-white font-mono px-0.5"
          :class="memoriesToShow === 10 ? 'border-b border-gray-700 dark:border-white text-gray-900 dark:text-white' : ''">
          10
        </button>
        <button @click="memoriesToShow = 25" class="text-[10px] text-gray-700 dark:text-white font-mono px-0.5"
          :class="memoriesToShow === 25 ? 'border-b border-gray-700 dark:border-white text-gray-900 dark:text-white' : ''">
          25
        </button>
        <button @click="memoriesToShow = 50" class="text-[10px] text-gray-700 dark:text-white font-mono px-0.5"
          :class="memoriesToShow === 50 ? 'border-b border-gray-700 dark:border-white text-gray-900 dark:text-white' : ''">
          50
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div v-if="showFilters" class="border-b border-gray-300 dark:border-black p-1 mb-1">
      <div class="grid grid-cols-1 gap-1">
        <div>
          <label class="text-[10px] text-gray-700 dark:text-white mb-0.5 block">USERS:</label>
          <select v-model="selectedUsers" multiple
            class="w-full text-[10px] text-gray-900 dark:text-white bg-transparent border-b border-gray-300 dark:border-black p-0.5">
            <option v-for="user in uniqueUsers" :key="user" :value="user">{{ user }}</option>
          </select>
        </div>
        <div>
          <label class="text-[10px] text-gray-700 dark:text-white mb-0.5 block">TYPE:</label>
          <select v-model="selectedTypes" multiple
            class="w-full text-[10px] text-gray-900 dark:text-white bg-transparent border-b border-gray-300 dark:border-black p-0.5">
            <option v-for="type in uniqueTypes" :key="type" :value="type">{{ type }}</option>
          </select>
        </div>
        <div>
          <label class="text-[10px] text-gray-700 dark:text-white mb-0.5 block">SEARCH:</label>
          <input v-model="searchQuery" placeholder="Search memories"
            class="w-full text-[10px] text-gray-900 dark:text-white bg-transparent border-b border-gray-300 dark:border-black p-0.5" />
        </div>
      </div>
    </div>

    <!-- Memories list -->
    <div class="space-y-0.5 max-h-[calc(100vh-250px)] overflow-y-auto">
      <div v-for="memory in filteredMemories" :key="memory.id"
        class="border-b border-gray-300 dark:border-black mb-0.5 hover:bg-gray-100 dark:hover:bg-gray-900">
        <div class="flex items-center justify-between border-b border-gray-300 dark:border-black p-0.5">
          <div class="flex items-center">
            <span class="text-[10px] text-gray-900 dark:text-white font-medium">[{{ memory.user_id || 'SYSTEM'
            }}]</span>
            <span v-if="memory.type" class="text-[10px] text-gray-700 dark:text-gray-300 ml-1">({{ memory.type
            }})</span>
          </div>
          <div class="text-[10px] text-gray-700 dark:text-white">
            {{ formatDate(memory.created_at) }}
          </div>
        </div>

        <div class="p-0.5">
          <pre
            class="text-[10px] text-gray-900 dark:text-white border-b border-gray-300 dark:border-black p-0.5 whitespace-pre-wrap break-words">{{ memory.value }}</pre>

          <div class="flex justify-between mt-0.5 text-[10px] text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-2">
            <div>
              <span>CLUSTER:{{ memory.cluster_id || 'NONE' }}</span>
              <span v-if="memory.related_message_id" class="ml-1">
                MSG:{{ memory.related_message_id }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="filteredMemories.length === 0"
        class="text-center py-2 border-b border-dashed border-gray-300 dark:border-black">
        <span class="text-[10px] text-gray-700 dark:text-white">NO_MEMORIES_FOUND</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { format } from 'date-fns'

const memories = ref([])
const showFilters = ref(false)
const selectedUsers = ref([])
const selectedTypes = ref([])
const searchQuery = ref('')

const supabase = useDatabase()
const defaultMemoriesToShow = 25
const memoriesToShow = ref(defaultMemoriesToShow)

// Fetch memories data
async function refreshMemories() {
  const { data: memoriesData, error: memoriesError } = await supabase
    .from('memories')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (memoriesData) memories.value = memoriesData
}

// Initial fetch
refreshMemories()

// Get unique users
const uniqueUsers = computed(() => {
  const users = memories.value.map(memory => memory.user_id).filter(Boolean)
  return [...new Set(users)]
})

// Get unique memory types
const uniqueTypes = computed(() => {
  const types = memories.value.map(memory => memory.type).filter(Boolean)
  return [...new Set(types)]
})

// Format date
function formatDate(timestamp) {
  return format(new Date(timestamp), 'MM-dd-yy HH:mm:ss')
}

// Filtered memories based on selected filters
const filteredMemories = computed(() => {
  let filtered = memories.value

  // Filter by selected users
  if (selectedUsers.value.length > 0) {
    filtered = filtered.filter(memory =>
      selectedUsers.value.includes(memory.user_id)
    )
  }

  // Filter by selected types
  if (selectedTypes.value.length > 0) {
    filtered = filtered.filter(memory =>
      selectedTypes.value.includes(memory.type)
    )
  }

  // Filter by search query
  if (searchQuery.value.trim() !== '') {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(memory =>
      memory.value.toLowerCase().includes(query) ||
      (memory.user_id && memory.user_id.toLowerCase().includes(query)) ||
      (memory.type && memory.type.toLowerCase().includes(query))
    )
  }

  return filtered.slice(0, memoriesToShow.value)
})

// Subscribe to new memories
supabase
  .channel('memorychannel')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'memories' },
    (payload) => {
      memories.value = [payload.new, ...memories.value]
    }
  )
  .subscribe()
</script>

<style scoped>
/* Stripped down to only essential styles */
.hover\:bg-gray-100:hover {
  background-color: rgba(249, 249, 249, 0.5);
}

@media (prefers-color-scheme: dark) {
  .dark\:hover\:bg-gray-900:hover {
    background-color: #111;
  }
}
</style>
