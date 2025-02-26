<template>
  <div class="p-2 font-mono">
    <!-- Messages filter and controls -->
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
        <span class="text-xs text-gray-400">[{{ filteredMessages.length }}]</span>
      </div>
      <div class="flex items-center space-x-2">
        <UButton 
          size="xs" 
          color="gray" 
          variant="ghost" 
          icon="i-heroicons-arrow-path"
          @click="refreshMessages"
          class="text-xs font-mono"
        >
          <span class="font-mono">REFRESH</span>
        </UButton>
        <USelect
          v-model="messagesToShow"
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
          <label class="text-xs text-slate-300 mb-1 block font-mono">USERS</label>
          <USelectMenu 
            v-model="selectedUsers" 
            :options="uniqueUsers" 
            multiple 
            placeholder="Filter by user"
            size="sm"
            class="font-mono text-xs"
          />
        </div>
        <div>
          <label class="text-xs text-slate-300 mb-1 block font-mono">DATE_RANGE</label>
          <UInput 
            v-model="dateFilter" 
            placeholder="e.g. last 7 days" 
            size="sm"
            class="font-mono text-xs"
          />
        </div>
      </div>
    </div>
    
    <!-- Messages list -->
    <div class="space-y-1 max-h-[calc(100vh-300px)] overflow-y-auto scroller pr-1">
      <TransitionGroup name="fade">
        <div 
          v-for="message in filteredMessages" 
          :key="message.id" 
          class="bg-slate-700 dark:bg-slate-900 border border-slate-600 dark:border-slate-800 rounded-sm overflow-hidden hover:border-gray-500 dark:hover:border-gray-600 transition-colors duration-200"
        >
          <div class="flex items-center justify-between p-2 bg-slate-750 dark:bg-slate-950 border-b border-slate-600 dark:border-slate-800">
            <div class="flex items-center space-x-2">
              <div class="terminal-pulse w-2 h-2 bg-gray-500 rounded-full"></div>
              <span class="text-xs font-medium text-gray-400">[{{ message.user_id }}]</span>
            </div>
            <div class="flex items-center space-x-2">
              <span class="text-xs bg-slate-800 dark:bg-black border border-slate-700 dark:border-slate-900 px-2 py-0.5 rounded-sm">
                {{ formatDate(message.created_at) }}
              </span>
              <span class="text-xs text-slate-400">
                {{ formatTime(message.created_at) }}
              </span>
            </div>
          </div>
          
          <div class="p-2">
            <div class="text-xs bg-slate-800 dark:bg-black border border-slate-700 dark:border-slate-900 rounded-sm p-2 break-words">
              <div class="text-gray-400 font-mono">{{ message.value }}</div>
            </div>
            
            <!-- Message metadata -->
            <div class="flex items-center justify-between mt-2 text-xs text-slate-400">
              <div class="flex items-center space-x-3">
                <span class="flex items-center">
                  <UIcon name="i-heroicons-clock" class="w-3 h-3 mr-1" />
                  {{ formatTimeAgo(message.created_at) }}
                </span>
                <span v-if="message.type" class="flex items-center">
                  <UIcon name="i-heroicons-tag" class="w-3 h-3 mr-1" />
                  {{ message.type }}
                </span>
              </div>
              <div>
                <UButton 
                  size="xs" 
                  color="gray" 
                  variant="ghost" 
                  icon="i-heroicons-arrow-path-rounded-square"
                  class="text-xs font-mono"
                >
                  REPLAY
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </TransitionGroup>
      
      <!-- Empty state -->
      <div v-if="filteredMessages.length === 0" class="text-center py-8 border border-dashed border-slate-700 dark:border-slate-800">
        <UIcon name="i-heroicons-chat-bubble-left-ellipsis" class="w-10 h-10 mx-auto text-slate-500 mb-3" />
        <h3 class="text-base font-medium text-slate-300 mb-1 font-mono">NO_MESSAGES</h3>
        <p class="text-xs text-slate-400 font-mono">SYSTEM :: Adjust filters or wait for new messages</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { format, formatDistance } from 'date-fns'

const messages = ref([])
const showFilters = ref(false)
const selectedUsers = ref([])
const dateFilter = ref('')

const supabase = useSupabaseClient()
const defaultMessagesToShow = 12
const messagesToShow = ref(defaultMessagesToShow)

// Fetch messages data
async function refreshMessages() {
  const { data: messagesData, error: messagesError } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(messagesToShow.value)

  if (messagesData) messages.value = messagesData
}

// Initial fetch
refreshMessages()

// Get unique users
const uniqueUsers = computed(() => {
  const users = messages.value.map(message => message.user_id)
  return [...new Set(users)]
})

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

// Filtered messages based on selected users
const filteredMessages = computed(() => {
  let filtered = messages.value
  
  // Filter by selected users if any are selected
  if (selectedUsers.value.length > 0) {
    filtered = filtered.filter(message => 
      selectedUsers.value.includes(message.user_id)
    )
  }
  
  // Apply date filter if specified
  if (dateFilter.value.toLowerCase().includes('last')) {
    const match = dateFilter.value.match(/last\s+(\d+)\s+days?/i)
    if (match && match[1]) {
      const days = parseInt(match[1])
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - days)
      
      filtered = filtered.filter(message => 
        new Date(message.created_at) >= cutoff
      )
    }
  }
  
  return filtered.slice(0, messagesToShow.value)
})

// Subscribe to new messages
supabase
  .channel('messagechannel')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages' },
    (payload) => {
      const newMessages = [payload.new, ...messages.value]
      const uniqueMessages = Array.from(new Set(newMessages.map(JSON.stringify))).map(JSON.parse)
      messages.value = uniqueMessages
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
</style>