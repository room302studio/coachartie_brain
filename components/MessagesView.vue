<template>
  <div class="font-mono text-gray-900 dark:text-white">
    <!-- Header with controls -->
    <div class="flex items-center justify-between mb-1 border-b border-gray-300 dark:border-gray-800 pb-0.5">
      <div class="flex items-center gap-2">
        <button @click="refreshMessages"
          class="text-[9px] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          aria-label="Refresh messages">
          [REFRESH]
        </button>
        <span class="text-[9px] text-gray-500 dark:text-gray-500">|</span>
        <button @click="showFilters = !showFilters"
          class="text-[9px] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
          [{{ showFilters ? 'HIDE' : 'FILTER' }}]
        </button>
        <span class="text-[9px] text-gray-500 dark:text-gray-500">|</span>
        <span class="text-[9px] font-bold text-gray-700 dark:text-gray-300">{{ filteredMessages.length }} MSGS</span>
      </div>
      <div class="flex items-center gap-1">
        <button v-for="count in [16, 32, 64, 128]" :key="count"
          @click="messagesToShow = count"
          class="text-[9px] px-1 transition-colors"
          :class="messagesToShow === count
            ? 'text-black dark:text-white font-bold border-b border-black dark:border-white'
            : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'">
          {{ count }}
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div v-if="showFilters" class="border-b border-gray-200 dark:border-gray-800 p-1 mb-1 bg-gray-50 dark:bg-gray-950">
      <div class="flex gap-2">
        <input v-model="searchQuery"
          placeholder="Search messages..."
          class="flex-1 text-[9px] text-gray-900 dark:text-white bg-transparent border border-gray-300 dark:border-gray-700 px-1 py-0.5 focus:outline-none focus:border-blue-500" />
        <select v-model="selectedUsers" multiple
          class="text-[9px] text-gray-900 dark:text-white bg-transparent border border-gray-300 dark:border-gray-700 px-1 max-w-[150px]">
          <option v-for="user in uniqueUsers" :key="user" :value="user">{{ user }}</option>
        </select>
      </div>
    </div>

    <!-- Messages list - data dense layout -->
    <div class="max-h-[calc(100vh-280px)] overflow-y-auto overflow-x-hidden">
      <div v-for="(message, idx) in filteredMessages" :key="message.id"
        class="message-item border-b border-gray-200 dark:border-gray-900"
        :data-message-id="message.id"
        :data-memory-id="message.memory_id"
        :data-user-id="message.user_id">

        <!-- Single line layout -->
        <div class="flex items-start gap-2 px-1 py-1">
          <!-- Timestamp -->
          <span class="text-[8px] text-gray-400 dark:text-gray-600 font-mono whitespace-nowrap mt-0.5">
            {{ formatTime(message.created_at) }}
          </span>

          <!-- User badge with color -->
          <span class="text-[9px] font-bold px-1 whitespace-nowrap"
            :style="{
              color: getUserColor(message.user_id),
            }">
            [{{ message.user_id || 'SYSTEM' }}]
          </span>

          <!-- Message content - takes remaining space -->
          <div class="text-[10px] leading-relaxed text-gray-900 dark:text-gray-100 flex-1">
            {{ message.value }}
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="filteredMessages.length === 0"
        class="text-center py-4">
        <span class="text-[10px] text-gray-500 dark:text-gray-500">NO_MESSAGES_FOUND</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { format, formatDistance } from 'date-fns'
import type { Database, Tables } from '~/database.types'

type Message = Tables<'messages'>

const messages = ref<Message[]>([])
const showFilters = ref(false)
const selectedUsers = ref<string[]>([])
const searchQuery = ref('')

// Changed default from 12 to 32
const defaultMessagesToShow = 32
const messagesToShow = ref(defaultMessagesToShow)

// D3 Turbo color scale sampled at 12 points for categorical use
// Turbo goes from dark blue -> cyan -> green -> yellow -> orange -> red
const userColorPalette = [
  '#30123b', // deep purple-blue
  '#4145ab', // blue
  '#4675ed', // bright blue
  '#3f9bff', // cyan-blue
  '#1bcfd4', // cyan
  '#24ed98', // cyan-green
  '#61fc6c', // bright green
  '#a4fc3b', // yellow-green
  '#d1e834', // yellow
  '#faba39', // orange-yellow
  '#fb7022', // orange
  '#e93725', // red-orange
  '#ca2a04', // deep red
  '#7a0403', // dark red
]

// Cache for user colors
const userColorCache = new Map<string, string>()

// Get consistent color for a user
function getUserColor(userId: string, opacity: number = 1): string {
  if (!userId) return opacity < 1 ? `rgba(128, 128, 128, ${opacity})` : '#808080'

  if (!userColorCache.has(userId)) {
    // Generate a consistent index based on user ID
    const hash = userId.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc)
    }, 0)
    const colorIndex = Math.abs(hash) % userColorPalette.length
    userColorCache.set(userId, userColorPalette[colorIndex])
  }

  const color = userColorCache.get(userId)!
  if (opacity < 1) {
    // Convert hex to rgba
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${opacity})`
  }
  return color
}

// Fetch messages data - now fetches more by default
async function refreshMessages() {
  try {
    // Fetch more messages to have a buffer
    const limit = Math.max(messagesToShow.value, 100)
    const response = await fetch('/api/messages?limit=' + limit)
    const data = await response.json()

    if (data.success && data.data) {
      messages.value = data.data
    }
  } catch (error) {
    console.error('Failed to fetch messages:', error)
    messages.value = []
  }
}

// Get unique users
const uniqueUsers = computed(() => {
  const users = messages.value.map(message => message.user_id).filter(Boolean)
  return [...new Set(users)]
})

// Format time (more compact)
function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

  if (diffHours < 24) {
    return format(date, 'HH:mm:ss')
  } else if (diffHours < 168) { // Less than a week
    return format(date, 'EEE HH:mm')
  } else {
    return format(date, 'MM/dd HH:mm')
  }
}

// Filtered messages based on filters
const filteredMessages = computed(() => {
  let filtered = messages.value

  // Filter by selected users
  if (selectedUsers.value.length > 0) {
    filtered = filtered.filter(message =>
      selectedUsers.value.includes(message.user_id)
    )
  }

  // Apply search query
  if (searchQuery.value.length > 0) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(message =>
      message.value?.toLowerCase().includes(query) ||
      message.user_id?.toLowerCase().includes(query) ||
      message.channel_id?.toLowerCase().includes(query)
    )
  }

  return filtered.slice(0, messagesToShow.value)
})

// Watch for changes to messagesToShow
watch(messagesToShow, () => {
  refreshMessages()
})

// Lifecycle
onMounted(() => {
  refreshMessages()

  // Refresh periodically for real-time feel
  const interval = setInterval(refreshMessages, 30000) // Every 30 seconds

  onUnmounted(() => {
    clearInterval(interval)
  })
})
</script>

<style scoped>
/* Custom scrollbar for messages */
::-webkit-scrollbar {
  width: 4px;
}

::-webkit-scrollbar-track {
  @apply bg-gray-100 dark:bg-gray-900;
}

::-webkit-scrollbar-thumb {
  @apply bg-gray-400 dark:bg-gray-600;
}
</style>