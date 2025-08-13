<template>
  <div class="p-4">
    <div class="max-w-2xl mx-auto space-y-4">
      <!-- User Selection -->
      <div class="border border-gray-200 dark:border-gray-800 p-2 rounded">
        <label class="text-xs text-gray-500 dark:text-gray-400 block mb-1">DEBUG_USER:</label>
        <select v-model="selectedUser"
          class="w-full bg-transparent border border-gray-200 dark:border-gray-800 p-1 text-sm rounded">
          <option value="">Select User</option>
          <option v-for="user in users" :key="user.id" :value="user.id">
            {{ user.id }}
          </option>
        </select>
      </div>

      <!-- Chat Window -->
      <div class="border border-gray-200 dark:border-gray-800 rounded p-2 h-[400px] overflow-y-auto">
        <div v-for="message in chatMessages" :key="message.id" class="mb-2">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xs font-medium"
              :class="message.user_id === selectedUser ? 'text-blue-500' : 'text-gray-500'">
              {{ message.user_id || 'SYSTEM' }}
            </span>
            <span class="text-xs text-gray-400">{{ formatDate(message.created_at) }}</span>
          </div>
          <div class="bg-gray-100 dark:bg-gray-900 p-2 rounded text-sm">
            {{ message.value }}
          </div>
        </div>
        <div v-if="chatMessages.length === 0" class="text-center py-4 text-gray-400 text-sm">
          NO_MESSAGES
        </div>
      </div>

      <!-- Input Area -->
      <div class="flex gap-2">
        <input v-model="newMessage" @keyup.enter="sendMessage" placeholder="Type a message..."
          class="flex-1 bg-transparent border border-gray-200 dark:border-gray-800 p-2 rounded text-sm" autofocus />
        <button @click="sendMessage" :disabled="!selectedUser || !newMessage.trim()" :class="[
          'px-4 py-2 rounded text-sm transition-colors',
          (!selectedUser || !newMessage.trim())
            ? 'bg-gray-100 dark:bg-gray-900 text-gray-400 cursor-not-allowed'
            : 'bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700'
        ]">
          Send
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
// // import { useSupabaseClient } from '#imports'
import { format } from 'date-fns'

// Types
interface Memory {
  id: number
  created_at: string
  value: string
  user_id: string | null
  memory_type: string | null
}

// // const supabase = useSupabaseClient()
const users = ref<any[]>([])
const memories = ref<Memory[]>([])
const newMessage = ref('')
const selectedUser = ref('')

// Only show chat messages, sorted newest to oldest
const chatMessages = computed(() => {
  return [...memories.value].reverse()
})

// Format date
function formatDate(timestamp: string) {
  return format(new Date(timestamp), 'HH:mm:ss')
}

// Fetch chat messages
async function fetchMessages() {
  // Temporarily disabled - needs migration from Supabase
  memories.value = []
  /*
  const { data, error } = await supabase
    .from('memories')
    .select('id, created_at, value, user_id')
    .eq('memory_type', 'debug_chat')
    .order('created_at', { ascending: true })
    .limit(50)

  if (data) memories.value = data
  if (error) console.error('Error fetching messages:', error)
  */
}

// Fetch users (from memories table since we don't have direct user access)
async function fetchUsers() {
  // Temporarily disabled - needs migration from Supabase
  users.value = []
  return
  /*
  const { data, error } = await supabase
    .from('memories')
    .select('user_id, created_at')
    .not('user_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(100)

  if (data) {
    // Get unique users, keeping only the most recent occurrence of each
    const uniqueUsers = Array.from(
      new Map(data.map(m => [m.user_id, m])).values()
    ).map(m => ({ id: m.user_id }))

    users.value = uniqueUsers

    // Set the most recent user as default
    if (uniqueUsers.length > 0) {
      selectedUser.value = uniqueUsers[0].id
    }
  }
  if (error) console.error('Error fetching users:', error)
  */
}

// Send message
async function sendMessage() {
  // Temporarily disabled - needs migration from Supabase
  /*
  if (!newMessage.value.trim() || !selectedUser.value) return

  const memory = {
    value: newMessage.value,
    user_id: selectedUser.value,
    memory_type: 'debug_chat',
    created_at: new Date().toISOString()
  }

  const { error } = await supabase
    .from('memories')
    .insert([memory])

  if (error) {
    console.error('Error sending message:', error)
    return
  }

  newMessage.value = ''
  */
}

// Subscribe to new messages
function subscribeToMessages() {
  // Temporarily disabled - needs migration from Supabase
  /*
  supabase
    .channel('debugchat')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'memories',
        filter: 'memory_type=eq.debug_chat'
      },
      (payload) => {
        memories.value = [...memories.value, payload.new as Memory]
      }
    )
    .subscribe()
  */
}

onMounted(() => {
  fetchUsers()
  fetchMessages()
  // subscribeToMessages()
})
</script>

<style scoped>
.chat-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
  background-color: #f9f9f9;
}

.user-select {
  margin-bottom: 10px;
}

.chat-window {
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 10px;
  border: 1px solid #ddd;
  padding: 10px;
  background-color: #fff;
}

.chat-bubble {
  padding: 10px;
  margin-bottom: 5px;
  border-radius: 5px;
  background-color: #e0e0e0;
}

.chat-input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
}
</style>