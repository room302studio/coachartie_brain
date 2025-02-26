<template>
  <div class="p-2 font-mono">
    <!-- Memories filter and controls -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center space-x-2">
        <UButton 
          size="xs" 
          color="gray" 
          variant="ghost" 
          :icon="showFilters ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
          @click="showFilters = !showFilters"
          class="text-xs font-mono"
        >
          <span class="font-mono">FILTER</span>
        </UButton>
        <span class="text-xs text-gray-400">[{{ filteredMemories.length }}]</span>
      </div>
      <div class="flex items-center space-x-2">
        <UButton 
          size="xs" 
          color="gray" 
          variant="ghost" 
          icon="i-heroicons-arrow-path"
          @click="refreshMemories"
          class="text-xs font-mono"
        >
          <span class="font-mono">REFRESH</span>
        </UButton>
        <USelect
          v-model="memoriesToShow"
          :options="[5, 10, 15, 20, 25, 50]"
          size="xs"
          placeholder="Show"
          class="w-20 font-mono text-xs"
        />
      </div>
    </div>
    
    <!-- Filters panel -->
    <div v-if="showFilters" class="bg-slate-700 dark:bg-slate-900 border border-slate-600 dark:border-slate-800 rounded-sm p-3 mb-3 animate-fade-in">
      <div class="grid grid-cols-1 gap-3">
        <div>
          <label class="text-xs text-slate-300 mb-1 block font-mono">SEARCH_MEMORY</label>
          <UInput 
            v-model="searchQuery" 
            placeholder="Search memories..." 
            size="sm"
            class="font-mono text-xs"
            icon="i-heroicons-magnifying-glass"
          />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-slate-300 mb-1 block font-mono">MIN_LENGTH</label>
            <UInput 
              v-model="minLength" 
              type="number"
              placeholder="Min length" 
              size="sm"
              class="font-mono text-xs"
            />
          </div>
          <div>
            <label class="text-xs text-slate-300 mb-1 block font-mono">MAX_LENGTH</label>
            <UInput 
              v-model="maxLength" 
              type="number"
              placeholder="Max length" 
              size="sm"
              class="font-mono text-xs"
            />
          </div>
        </div>
      </div>
    </div>
    
    <!-- Memories grid -->
    <div class="grid grid-cols-1 gap-2 max-h-[calc(100vh-300px)] overflow-y-auto scroller pr-1">
      <TransitionGroup name="fade">
        <div 
          v-for="memory in filteredMemories" 
          :key="memory.id" 
          class="bg-slate-700 dark:bg-slate-900 border border-slate-600 dark:border-slate-800 rounded-sm overflow-hidden hover:border-gray-500 dark:hover:border-gray-600 transition-colors duration-200"
        >
          <div class="flex items-center justify-between p-2 bg-slate-750 dark:bg-slate-950 border-b border-slate-600 dark:border-slate-800">
            <div class="flex items-center space-x-2">
              <div class="terminal-pulse w-2 h-2 bg-gray-500 rounded-full"></div>
              <span class="text-xs font-medium text-gray-400">[{{ memory.user_id || 'SYSTEM' }}]</span>
            </div>
            <div class="flex items-center space-x-2">
              <span class="text-xs bg-slate-800 dark:bg-black border border-slate-700 dark:border-slate-900 px-2 py-0.5 rounded-sm">
                {{ formatDate(memory.created_at) }}
              </span>
              <span class="text-xs text-slate-400">
                {{ formatTime(memory.created_at) }}
              </span>
            </div>
          </div>
          
          <div class="p-2">
            <div class="text-xs bg-slate-800 dark:bg-black border border-slate-700 dark:border-slate-900 rounded-sm p-2 max-h-24 overflow-y-auto scroller break-words">
              <div class="text-gray-400 font-mono whitespace-pre-line">{{ memory.value }}</div>
            </div>
            
            <!-- Memory metadata -->
            <div class="flex items-center justify-between mt-2 text-xs text-slate-400">
              <div class="flex items-center space-x-3">
                <span class="flex items-center">
                  <UIcon name="i-heroicons-clock" class="w-3 h-3 mr-1" />
                  {{ formatTimeAgo(memory.created_at) }}
                </span>
                <span class="flex items-center">
                  <UIcon name="i-heroicons-document-text" class="w-3 h-3 mr-1" />
                  {{ memory.value.length }} chars
                </span>
              </div>
              <div>
                <UButton 
                  size="xs" 
                  color="gray" 
                  variant="ghost" 
                  icon="i-heroicons-pencil-square"
                  class="text-xs font-mono"
                >
                  EDIT
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </TransitionGroup>
      
      <!-- Empty state -->
      <div v-if="filteredMemories.length === 0" class="text-center py-8 border border-dashed border-slate-700 dark:border-slate-800">
        <UIcon name="i-heroicons-document-text" class="w-10 h-10 mx-auto text-slate-500 mb-3" />
        <h3 class="text-base font-medium text-slate-300 mb-1 font-mono">NO_MEMORIES</h3>
        <p class="text-xs text-slate-400 font-mono">SYSTEM :: Adjust filters or create new memories</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { format, formatDistance } from 'date-fns'
import { animate } from '../anime.esm'

const memories = ref([])
const showFilters = ref(false)
const searchQuery = ref('')
const minLength = ref(null)
const maxLength = ref(null)

const supabase = useSupabaseClient()
const defaultMemoriesToShow = 12
const memoriesToShow = ref(defaultMemoriesToShow)

// Fetch memories data
async function refreshMemories() {
  const { data: memoriesData, error: memoriesError } = await supabase
    .from('memories')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(memoriesToShow.value)

  if (memoriesData) memories.value = memoriesData
}

// Initial fetch
refreshMemories()

// Format date
function formatDate(timestamp) {
  return format(new Date(timestamp), 'MM-dd-yy')
}

// Format time
function formatTime(timestamp) {
  return format(new Date(timestamp), 'HH:mm:ss')
}

// Format time ago
function formatTimeAgo(timestamp) {
  return formatDistance(new Date(timestamp), new Date(), { addSuffix: true })
}

// Filtered memories based on search query, min/max length
const filteredMemories = computed(() => {
  let filtered = memories.value
  
  // Apply search filter if specified
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(memory => 
      memory.value.toLowerCase().includes(query)
    )
  }
  
  // Apply min length filter if specified
  if (minLength.value !== null && minLength.value !== '') {
    filtered = filtered.filter(memory => 
      memory.value.length >= parseInt(minLength.value)
    )
  }
  
  // Apply max length filter if specified
  if (maxLength.value !== null && maxLength.value !== '') {
    filtered = filtered.filter(memory => 
      memory.value.length <= parseInt(maxLength.value)
    )
  }
  
  return filtered.slice(0, memoriesToShow.value)
})

// Subscribe to new memories
supabase
  .channel('memorieschannel')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'memories' },
    (payload) => {
      const newMemories = [payload.new, ...memories.value]
      const uniqueMemories = Array.from(new Set(newMemories.map(JSON.stringify))).map(JSON.parse)
      memories.value = uniqueMemories
    }
  )
  .subscribe()
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* Custom background colors */
.bg-slate-750 {
  background-color: rgba(30, 41, 59, 0.95);
}

.bg-slate-950 {
  background-color: rgba(2, 6, 23, 0.95);
}

.bg-slate-650 {
  background-color: rgba(51, 65, 85, 0.95);
}

/* Terminal pulse animation */
.terminal-pulse {
  animation: terminal-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes terminal-pulse {
  0%, 100% {
    opacity: 1;
    box-shadow: 0 0 5px rgba(148, 163, 184, 0.8);
  }
  50% {
    opacity: 0.5;
    box-shadow: 0 0 2px rgba(148, 163, 184, 0.4);
  }
}

/* Custom scrollbar for hackerpunk feel */
.scroller::-webkit-scrollbar {
  width: 6px;
}

.scroller::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.1);
  border-radius: 3px;
}

.scroller::-webkit-scrollbar-thumb {
  background: rgba(100, 116, 139, 0.5);
  border-radius: 3px;
}

.scroller::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.8);
}
</style>
