<template>
  <div class="text-gray-900 dark:text-white">
    <div class="flex">
      <!-- Site Navigation Sidebar -->
      <div class="w-52 min-h-screen">
        <SiteNav />
      </div>

      <!-- Main Content -->
      <div class="flex-1 p-4">
        <div class="mb-2 border-b border-gray-300 dark:border-black pb-1 flex justify-between items-center">
          <span class="text-base">MEMORIES</span>
          <input v-model="searchQuery" placeholder="SEARCH"
            class="text-xs border border-gray-300 dark:border-black p-1 w-36 bg-transparent dark:text-white" />
        </div>

        <div class="p-2">
          <div class="flex flex-col gap-2">
            <!-- Memory Feed (Primary) -->
            <div class="flex-grow border border-gray-300 dark:border-black bg-white dark:bg-black">
              <div class="p-1">
                <div class="mb-1 border-b border-gray-300 dark:border-black pb-1 flex justify-between">
                  <span class="text-xs dark:text-white">MEMORY_FEED</span>
                  <span class="text-xs dark:text-white">[{{ visibleMemories.length }}]</span>
                </div>

                <div class="space-y-1 overflow-y-auto" style="height: 75vh;">
                  <div v-for="memory in visibleMemories" :key="memory.id" :id="`memory-${memory.id}`"
                    class="border border-gray-300 dark:border-black mb-1 cursor-pointer memory-item bg-white dark:bg-black"
                    :class="{ 'border-gray-500 dark:border-white': selectedMemoryId === memory.id }"
                    @click="selectMemoryById(memory.id)">
                    <div class="flex items-center justify-between border-b border-gray-300 dark:border-black p-1">
                      <span class="text-xs font-mono dark:text-white">[{{ memory.user_id || 'SYSTEM' }}]</span>
                      <span class="text-xs font-mono dark:text-white">{{ formatDate(memory.created_at) }}</span>
                    </div>
                    <pre
                      class="text-xs p-1 whitespace-pre-wrap break-words overflow-y-auto dark:text-white">{{ memory.value }}</pre>
                    <div
                      class="text-[9px] p-1 pt-0 text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-2 border-t border-gray-300 dark:border-black">
                      <span v-if="memory.memory_type">TYPE:{{ memory.memory_type }}</span>
                      <span v-if="memory.related_message_id">MSG:{{ memory.related_message_id }}</span>
                      <span>ID:{{ memory.id }}</span>
                      <span v-if="memory.resource_id">RES:{{ memory.resource_id }}</span>
                      <span v-if="memory.conversation_id">CONV:{{ memory.conversation_id }}</span>
                      <span v-if="memory.metadata" class="cursor-help"
                        :title="JSON.stringify(memory.metadata)">META:✓</span>
                    </div>
                  </div>

                  <div v-if="visibleMemories.length === 0"
                    class="text-center py-2 border border-dashed border-gray-300 dark:border-black">
                    <span class="text-xs font-mono dark:text-white">NO_MEMORIES_TO_DISPLAY</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { format } from 'date-fns'
// // import { useSupabaseClient } from '#imports'
import SiteNav from '~/components/SiteNav.vue'

// Basic state
const memories = ref([])
const selectedMemoryId = ref(null)
const searchQuery = ref('')

// Supabase client
// const supabase = useDatabase()

// Format date function
function formatDate(timestamp) {
  return format(new Date(timestamp), 'MM-dd-yy HH:mm:ss')
}

// Fetch memories from the database
async function fetchMemories() {
  try {
    const response = await fetch('/api/memories?limit=100')
    const result = await response.json()
    
    if (result.success && result.data) {
      memories.value = result.data.map(m => ({
        ...m,
        value: m.content, // Use content field
        memory_type: m.tags ? 'tagged' : 'general' // Add memory_type for display
      }))
    }
  } catch (error) {
    console.error('Error fetching memories:', error)
  }
}

// Select a memory by ID
function selectMemoryById(memoryId) {
  selectedMemoryId.value = memoryId === selectedMemoryId.value ? null : memoryId
}

// Filtered memories based on search query
const visibleMemories = computed(() => {
  let filtered = memories.value

  // Apply search filter if there's a query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(memory =>
      memory.value.toLowerCase().includes(query) ||
      (memory.user_id && memory.user_id.toLowerCase().includes(query)) ||
      (memory.memory_type && memory.memory_type.toLowerCase().includes(query))
    )
  }

  return filtered
})

// Subscribe to new memories via Supabase realtime
function setupRealtimeSubscription() {
  // Temporarily disabled - needs migration from Supabase
  /*
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
  */
}

// Initialize page
onMounted(() => {
  fetchMemories()
  setupRealtimeSubscription()
})
</script>

<style scoped>
.memory-item {
  opacity: 1;
  transition: all 0.15s ease;
  font-family: monospace;
}

.memory-item:hover {
  background-color: rgba(240, 240, 240, 0.5);
}

.memory-item pre {
  max-height: 60px;
  transition: max-height 0.15s ease;
  font-family: monospace;
}

.memory-item:hover pre {
  max-height: 200px;
}

@media (prefers-color-scheme: dark) {
  .memory-item:hover {
    background-color: #111;
  }
}
</style>
