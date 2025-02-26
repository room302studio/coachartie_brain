<template>
  <div class="font-mono">
    <!-- Header with controls -->
    <div class="flex items-center justify-between mb-2 border-b border-gray-800 pb-1">
      <div class="flex items-center">
        <button 
          @click="refreshMemories" 
          class="text-xs font-mono mr-2 border border-gray-800 px-1"
          aria-label="Refresh memories"
        >
          [REFRESH]
        </button>
        <button 
          @click="showFilters = !showFilters" 
          class="text-xs font-mono mr-2 border border-gray-800 px-1"
        >
          [{{ showFilters ? 'HIDE_FILTER' : 'FILTER' }}]
        </button>
        <span class="text-xs">[{{ filteredMemories.length }}]</span>
      </div>
      <div>
        <button 
          @click="memoriesToShow = 10"
          class="text-xs font-mono ml-1 px-1"
          :class="memoriesToShow === 10 ? 'border-b-2 border-gray-800' : ''"
        >
          10
        </button>
        <button 
          @click="memoriesToShow = 25"
          class="text-xs font-mono ml-1 px-1"
          :class="memoriesToShow === 25 ? 'border-b-2 border-gray-800' : ''"
        >
          25
        </button>
        <button 
          @click="memoriesToShow = 50"
          class="text-xs font-mono ml-1 px-1"
          :class="memoriesToShow === 50 ? 'border-b-2 border-gray-800' : ''"
        >
          50
        </button>
      </div>
    </div>
    
    <!-- Filters -->
    <div v-if="showFilters" class="border border-gray-800 p-2 mb-2">
      <div class="grid grid-cols-1 gap-2">
        <div>
          <label class="text-xs mb-1 block">USERS:</label>
          <select 
            v-model="selectedUsers" 
            multiple
            class="w-full text-xs border border-gray-800 p-1"
          >
            <option v-for="user in uniqueUsers" :key="user" :value="user">{{ user }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs mb-1 block">TYPE:</label>
          <select 
            v-model="selectedTypes" 
            multiple
            class="w-full text-xs border border-gray-800 p-1"
          >
            <option v-for="type in uniqueTypes" :key="type" :value="type">{{ type }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs mb-1 block">SEARCH:</label>
          <input 
            v-model="searchQuery" 
            placeholder="Search memories" 
            class="w-full text-xs border border-gray-800 p-1"
          />
        </div>
      </div>
    </div>
    
    <!-- Memories list -->
    <div class="space-y-1 max-h-[calc(100vh-300px)] overflow-y-auto">
      <div 
        v-for="memory in filteredMemories" 
        :key="memory.id"
        class="border border-gray-800 mb-1"
      >
        <div class="flex items-center justify-between border-b border-gray-800 p-1">
          <div class="flex items-center">
            <span class="text-xs">[{{ memory.user_id || 'SYSTEM' }}]</span>
            <span v-if="memory.type" class="text-xs ml-2">({{ memory.type }})</span>
          </div>
          <div class="text-xs">
            {{ formatDate(memory.created_at) }}
          </div>
        </div>
        
        <div class="p-1">
          <pre class="text-xs border border-gray-800 p-1 whitespace-pre-wrap break-words">{{ memory.value }}</pre>
          
          <div class="flex justify-between mt-1 text-xs">
            <div>
              <span>CLUSTER:{{ memory.cluster_id || 'NONE' }}</span>
              <span v-if="memory.related_message_id" class="ml-2">
                MSG:{{ memory.related_message_id }}
              </span>
            </div>
            <div>
              <button 
                @click="deleteMemory(memory.id)"
                class="text-xs border border-gray-800 px-1 ml-1"
              >
                DELETE
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Empty state -->
      <div v-if="filteredMemories.length === 0" class="text-center py-8 border border-dashed border-gray-800">
        <span class="text-xs">NO_MEMORIES_FOUND</span>
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

const supabase = useSupabaseClient()
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

// Delete a memory
async function deleteMemory(id) {
  const { error } = await supabase
    .from('memories')
    .delete()
    .eq('id', id)
  
  if (!error) {
    memories.value = memories.value.filter(memory => memory.id !== id)
  }
}

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
</style>
