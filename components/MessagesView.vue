<template>
  <div class="font-mono text-gray-900 dark:text-white">
    <!-- Header with controls -->
    <div class="flex items-center justify-between mb-1 border-b border-gray-300 dark:border-black pb-0.5">
      <div class="flex items-center">
        <button @click="refreshMessages"
          class="text-[10px] text-gray-700 dark:text-white font-mono mr-1 border-r border-gray-300 dark:border-black px-0.5 hover:text-gray-900 dark:hover:text-gray-300"
          aria-label="Refresh messages">
          [REFRESH]
        </button>
        <button @click="showFilters = !showFilters"
          class="text-[10px] text-gray-700 dark:text-white font-mono mr-1 border-r border-gray-300 dark:border-black px-0.5 hover:text-gray-900 dark:hover:text-gray-300">
          [{{ showFilters ? 'HIDE_FILTER' : 'FILTER' }}]
        </button>
        <span class="text-[10px] text-gray-700 dark:text-white">[{{ filteredMessages.length }}]</span>
      </div>
      <div>
        <button @click="messagesToShow = 10" class="text-[10px] text-gray-700 dark:text-white font-mono px-0.5"
          :class="messagesToShow === 10 ? 'border-b border-gray-700 dark:border-white text-gray-900 dark:text-white' : ''">
          10
        </button>
        <button @click="messagesToShow = 25" class="text-[10px] text-gray-700 dark:text-white font-mono px-0.5"
          :class="messagesToShow === 25 ? 'border-b border-gray-700 dark:border-white text-gray-900 dark:text-white' : ''">
          25
        </button>
        <button @click="messagesToShow = 50" class="text-[10px] text-gray-700 dark:text-white font-mono px-0.5"
          :class="messagesToShow === 50 ? 'border-b border-gray-700 dark:border-white text-gray-900 dark:text-white' : ''">
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
          <label class="text-[10px] text-gray-700 dark:text-white mb-0.5 block">SEARCH:</label>
          <input v-model="searchQuery" placeholder="Search messages"
            class="w-full text-[10px] text-gray-900 dark:text-white bg-transparent border-b border-gray-300 dark:border-black p-0.5" />
        </div>
      </div>
    </div>

    <!-- Messages list -->
    <div class="space-y-0.5 max-h-[calc(100vh-250px)] overflow-y-auto">
      <div v-for="message in filteredMessages" :key="message.id"
        class="border-b border-gray-300 dark:border-black mb-0.5 hover:bg-gray-100 dark:hover:bg-gray-900 message-item">
        <div class="flex items-center justify-between border-b border-gray-300 dark:border-black p-0.5">
          <div class="flex items-center">
            <span class="text-[10px] text-gray-900 dark:text-white font-medium">[{{ message.user_id || 'SYSTEM'
            }}]</span>
            <span v-if="message.role" class="text-[10px] text-gray-700 dark:text-gray-300 ml-1">({{ message.role
            }})</span>
          </div>
          <div class="text-[10px] text-gray-700 dark:text-white">
            {{ formatDate(message.created_at) }}
          </div>
        </div>

        <div class="p-0.5">
          <pre
            class="text-[10px] text-gray-900 dark:text-white border-b border-gray-300 dark:border-black p-0.5 whitespace-pre-wrap break-words">{{ message.value }}</pre>

          <div class="flex justify-between mt-0.5 text-[10px] text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-2">
            <div>
              <span>CONV:{{ message.conversation_id || 'NONE' }}</span>
              <span v-if="message.memory_id" class="ml-1">
                MEM:{{ message.memory_id }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="filteredMessages.length === 0"
        class="text-center py-2 border-b border-dashed border-gray-300 dark:border-black">
        <span class="text-[10px] text-gray-700 dark:text-white">NO_MESSAGES_FOUND</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { format, formatDistance } from 'date-fns'
import { useStaggeredAnimation } from '~/composables/useStaggeredAnimation'

const messages = ref([])
const showFilters = ref(false)
const selectedUsers = ref([])
const dateFilter = ref('')
const searchQuery = ref('')

const supabase = useSupabaseClient()
const defaultMessagesToShow = 12
const messagesToShow = ref(defaultMessagesToShow)

// Animation setup
const { animateStaggered } = useStaggeredAnimation()

// Fetch messages data
async function refreshMessages() {
  const { data: messagesData, error: messagesError } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(messagesToShow.value)

  if (messagesData) messages.value = messagesData

  // Add animation after data is loaded with simplified parameters
  if (messages.value.length > 0) {
    setTimeout(() => {
      animateStaggered('.message-item', {
        translateY: true
      })
    }, 50)
  }
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

  // Apply search query if specified
  if (searchQuery.value.length > 0) {
    filtered = filtered.filter(message =>
      message.value.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
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

// Lifecycle
onMounted(() => {
  refreshMessages()

  // ... existing onMounted logic ...
})
</script>

<style scoped>
/* Stripped down to only essential styles */

/* Hide message items initially */
.message-item {
  opacity: 0;
}

.hover\:bg-gray-100:hover {
  background-color: rgba(249, 249, 249, 0.5);
}

@media (prefers-color-scheme: dark) {
  .dark\:hover\:bg-gray-900:hover {
    background-color: #111;
  }
}
</style>