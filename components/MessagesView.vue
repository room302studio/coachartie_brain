<template>
  <div class="p-2 font-mono">
    <!-- Messages header -->
    <div class="flex items-center justify-between mb-2 border-b border-gray-800 pb-1">
      <div class="flex items-center">
        <button 
          @click="refreshMessages"
          class="text-xs font-mono mr-2 border border-gray-800 px-1"
          aria-label="Refresh messages"
        >
          [REFRESH]
        </button>
        <button 
          @click="showFilters = !showFilters"
          class="text-xs font-mono mr-2 border border-gray-800 px-1"
          aria-label="Toggle filters"
        >
          [{{ showFilters ? 'HIDE_FILTER' : 'FILTER' }}]
        </button>
        <span class="text-xs">[{{ filteredMessages.length }}]</span>
      </div>
      <div>
        <button 
          @click="messagesToShow = 5"
          class="text-xs font-mono ml-1 px-1"
          :class="messagesToShow === 5 ? 'border-b-2 border-gray-800' : ''"
        >
          5
        </button>
        <button 
          @click="messagesToShow = 10"
          class="text-xs font-mono ml-1 px-1"
          :class="messagesToShow === 10 ? 'border-b-2 border-gray-800' : ''"
        >
          10
        </button>
        <button 
          @click="messagesToShow = 25"
          class="text-xs font-mono ml-1 px-1"
          :class="messagesToShow === 25 ? 'border-b-2 border-gray-800' : ''"
        >
          25
        </button>
      </div>
    </div>
    
    <!-- Filters panel -->
    <div v-if="showFilters" class="border border-gray-800 p-2 mb-2">
      <div class="grid grid-cols-1 gap-2">
        <div>
          <label class="text-xs mb-1 block font-mono">USERS:</label>
          <select 
            v-model="selectedUsers"
            multiple
            class="w-full font-mono text-xs border border-gray-800 p-1"
          >
            <option v-for="user in uniqueUsers" :key="user" :value="user">{{ user }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs mb-1 block font-mono">DATE_RANGE:</label>
          <input 
            v-model="dateFilter" 
            placeholder="e.g. last 7 days" 
            class="w-full font-mono text-xs border border-gray-800 p-1"
          />
        </div>
      </div>
    </div>
    
    <!-- Messages list -->
    <div class="space-y-1 max-h-[calc(100vh-300px)] overflow-y-auto">
      <div 
        v-for="message in filteredMessages" 
        :key="message.id" 
        class="border border-gray-800 mb-1"
      >
        <div class="flex items-center justify-between p-1 border-b border-gray-800">
          <div class="flex items-center">
            <span class="text-xs font-mono">[{{ message.user_id }}]</span>
          </div>
          <div class="flex items-center">
            <span class="text-xs font-mono">
              {{ formatDate(message.created_at) }} {{ formatTime(message.created_at) }}
            </span>
          </div>
        </div>
        
        <div class="p-1">
          <pre class="text-xs border border-gray-800 p-1 whitespace-pre-wrap break-words">{{ message.value }}</pre>
          
          <!-- Message metadata -->
          <div class="flex items-center justify-between mt-1 text-xs">
            <div class="flex items-center space-x-3">
              <span class="font-mono">{{ formatTimeAgo(message.created_at) }}</span>
              <span v-if="message.type" class="font-mono">TYPE:{{ message.type }}</span>
            </div>
            <div>
              <button 
                class="text-xs font-mono border border-gray-800 px-1"
              >
                REPLAY
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Empty state -->
      <div v-if="filteredMessages.length === 0" class="text-center py-8 border border-dashed border-gray-800">
        <h3 class="text-base font-mono mb-1">NO_MESSAGES</h3>
        <p class="text-xs font-mono">SYSTEM :: Adjust filters or wait for new messages</p>
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
/* Stripped down to only essential styles */
</style>