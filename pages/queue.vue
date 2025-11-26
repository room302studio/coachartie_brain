<template>
  <div>
    <div class="p-2">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center">
          <span class="text-base font-mono mr-2 dark:text-gray-100">QUEUE</span>
          <button @click="refreshQueue"
            class="text-xs font-mono mr-2 hover:bg-gray-100 dark:hover:bg-gray-700 px-1 py-0.5 rounded dark:text-gray-200">
            [REFRESH]
          </button>
          <span class="text-xs font-mono dark:text-gray-300">[{{ queueItems.length }}]</span>
        </div>
        <div class="flex items-center space-x-1">
          <button @click="filterStatus = null"
            :class="filterStatus === null ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'"
            class="text-xs px-2 py-0.5 rounded dark:text-gray-200">ALL</button>
          <button @click="filterStatus = 'pending'"
            :class="filterStatus === 'pending' ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'"
            class="text-xs px-2 py-0.5 rounded dark:text-gray-200">PENDING</button>
          <button @click="filterStatus = 'in_progress'"
            :class="filterStatus === 'in_progress' ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'"
            class="text-xs px-2 py-0.5 rounded dark:text-gray-200">IN PROGRESS</button>
          <button @click="filterStatus = 'completed'"
            :class="filterStatus === 'completed' ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'"
            class="text-xs px-2 py-0.5 rounded dark:text-gray-200">COMPLETED</button>
          <button @click="filterStatus = 'failed'"
            :class="filterStatus === 'failed' ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'"
            class="text-xs px-2 py-0.5 rounded dark:text-gray-200">FAILED</button>
        </div>
      </div>

      <!-- Sort controls -->
      <div class="mb-4 flex justify-between items-center">
        <div class="sort-controls flex items-center">
          <label for="sort-select" class="mr-2 text-sm font-medium dark:text-gray-300">Sort by:</label>
          <div class="relative group">
            <select id="sort-select" v-model="selectedSort" v-highlight-selected
              class="pl-9 pr-8 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
              aria-label="Sort queue items">
              <option v-for="option in sortOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>

            <!-- Tooltip -->
            <div class="absolute left-0 top-full mt-1 hidden group-hover:block z-10 tooltip-container">
              <div class="bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap tooltip">
                {{ currentSortOption.label }}
              </div>
            </div>
          </div>

          <div class="ml-4 flex items-center text-xs text-gray-500 dark:text-gray-400">
            <span>{{ sortedItems.length }} items</span>
          </div>
        </div>

        <!-- Refresh button with animation -->
        <button @click="refreshQueue"
          class="px-3 py-1.5 text-sm bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded hover:bg-primary-100 dark:hover:bg-primary-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
          aria-label="Refresh queue items" :disabled="loading">
          {{ loading ? 'Refreshing...' : 'Refresh' }}
        </button>
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="text-center py-4">
        <p class="text-xs font-mono dark:text-gray-300">LOADING_QUEUE_DATA...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="text-center py-4 bg-red-50 dark:bg-red-900/30 rounded">
        <h3 class="text-base font-mono mb-1 text-red-600 dark:text-red-400">ERROR_LOADING_QUEUE</h3>
        <p class="text-xs font-mono dark:text-gray-300">{{ error }}</p>
        <button @click="refreshQueue"
          class="mt-2 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 px-2 py-1 rounded dark:text-gray-200">
          RETRY
        </button>
      </div>

      <!-- Queue Items -->
      <div v-else class="space-y-1 max-h-[calc(100vh-120px)] overflow-y-auto">
        <div v-for="item in sortedItems" :key="item.id"
          class="p-1.5 mb-1.5 queue-item rounded-sm hover:bg-gray-50 dark:hover:bg-gray-800/50"
          :class="getItemClasses(item)">
          <!-- Queue item header -->
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-1">
              <!-- Status indicator -->
              <div v-if="item.status === 'in_progress'" class="hack-indicator-red mr-1 w-2 h-2" aria-hidden="true">
              </div>
              <div v-else-if="item.status === 'completed'" class="hack-indicator-green mr-1 w-2 h-2" aria-hidden="true">
              </div>
              <div v-else-if="item.status === 'failed'" class="hack-indicator-yellow mr-1 w-2 h-2" aria-hidden="true">
              </div>
              <div v-else class="hack-indicator mr-1 w-2 h-2" aria-hidden="true"></div>

              <!-- Task type with monospace font -->
              <div class="flex items-center">
                <span class="text-xs font-mono font-semibold dark:text-gray-100">{{ item.task_type }}</span>
                <span class="mx-1 text-gray-400 dark:text-gray-500 text-xs">|</span>
                <span class="font-mono text-xs text-gray-500 dark:text-gray-400">ID:{{ truncateId(item.id) }}</span>
              </div>
            </div>

            <div class="flex items-center space-x-1">
              <!-- Status badge -->
              <span class="text-xs font-mono px-1.5 py-0.5 rounded-sm" :class="getStatusClass(item.status)">
                {{ item.status }}
              </span>

              <!-- Retries badge (if any) -->
              <span v-if="item.retries > 0"
                class="text-xs font-mono px-1.5 py-0.5 rounded-sm bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                {{ item.retries }}/{{ item.max_retries }}
              </span>

              <!-- Priority badge -->
              <span
                class="text-xs font-mono px-1.5 py-0.5 rounded-sm bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                P{{ item.priority }}
              </span>

              <!-- Timestamp -->
              <span class="text-xs font-mono text-gray-500 dark:text-gray-400">
                {{ formatRelativeTime(item.created_at) }}
              </span>
            </div>
          </div>

          <!-- Task Summary -->
          <div v-if="getPayloadSummary(item.payload)" class="task-summary mt-1.5 mb-1.5">
            <div class="flex items-center justify-between mb-1">
              <div class="font-medium text-xs flex items-center">
                <span>TASK_DATA</span>
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400 font-mono">
                {{ getPayloadProperty(item.payload, 'name') || 'UNNAMED' }}
              </div>
            </div>

            <div class="grid grid-cols-12 gap-1.5">
              <!-- Action badge -->
              <div class="col-span-3" v-if="getPayloadProperty(item.payload, 'action')">
                <div class="action-badge">
                  <span class="truncate">{{ getPayloadProperty(item.payload, 'action') }}</span>
                </div>
              </div>

              <!-- Parameters -->
              <div class="col-span-9" v-if="Object.keys(getPayloadParams(item.payload) || {}).length > 0">
                <div class="params-grid">
                  <div v-for="(value, key) in getPayloadParams(item.payload)" :key="key" class="param-chip"
                    @click="isExpandableParam(value) && toggleNestedParam(item.id, key)"
                    :class="{ 'cursor-pointer': isExpandableParam(value) }">
                    <span class="param-key">{{ key }}</span>
                    <span class="param-value truncate" :title="formatParamValue(value)">
                      {{ formatParamValue(value) }}
                      <span v-if="isExpandableParam(value)" class="text-xs ml-0.5">{{ isNestedParamExpanded(item.id, key) ? '▲' : '▼' }}</span>
                    </span>

                    <!-- Expanded nested object -->
                    <div v-if="isNestedParamExpanded(item.id, key)" class="param-nested-content mt-1">
                      <div v-for="(nestedValue, nestedKey) in value" :key="nestedKey" class="nested-param-chip">
                        <span class="param-key">{{ nestedKey }}</span>
                        <span class="param-value truncate" :title="formatParamValue(nestedValue)">
                          {{ formatParamValue(nestedValue) }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Content preview (if it exists) -->
              <div v-if="getPayloadProperty(item.payload, 'content')" class="col-span-12 mt-0.5">
                <div class="content-chip">
                  <span class="content-text truncate">{{ getPayloadProperty(item.payload, 'content') }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Queue item footer -->
          <div class="mt-1.5 flex justify-end items-center">
            <div v-if="expandedItem !== item.id" class="flex items-center">
              <button @click="expandedItem = item.id"
                class="text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 px-2 py-0.5 rounded-sm dark:text-gray-300 font-mono transition-colors">
                [DETAILS]
              </button>
            </div>

            <div v-else class="flex items-center">
              <button @click="expandedItem = null"
                class="text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 px-2 py-0.5 rounded-sm dark:text-gray-200 font-mono transition-colors">
                [COLLAPSE]
              </button>
            </div>
          </div>

          <div v-if="expandedItem === item.id">
            <!-- Expanded details -->
            <div class="mt-2 space-y-2">
              <!-- Timestamps section -->
              <div class="bg-gray-50 dark:bg-gray-800/60 p-2 rounded border border-gray-200 dark:border-gray-700">
                <div class="text-xs font-semibold mb-1 dark:text-gray-300">
                  TIMESTAMPS
                </div>
                <div class="grid grid-cols-2 gap-1 text-xs">
                  <div>
                    <span class="text-gray-500 dark:text-gray-400">Created:</span>
                    <span class="ml-1 font-mono dark:text-gray-300">{{ formatDetailedTime(item.created_at) }}</span>
                  </div>
                  <div v-if="item.scheduled_for">
                    <span class="text-gray-500 dark:text-gray-400">Scheduled:</span>
                    <span class="ml-1 font-mono dark:text-gray-300">{{ formatDetailedTime(item.scheduled_for) }}</span>
                  </div>
                  <div v-if="item.started_at">
                    <span class="text-gray-500 dark:text-gray-400">Started:</span>
                    <span class="ml-1 font-mono dark:text-gray-300">{{ formatDetailedTime(item.started_at) }}</span>
                  </div>
                  <div v-if="item.completed_at">
                    <span class="text-gray-500 dark:text-gray-400">Completed:</span>
                    <span class="ml-1 font-mono dark:text-gray-300">{{ formatDetailedTime(item.completed_at) }}</span>
                  </div>
                  <div v-if="item.started_at && item.completed_at" class="col-span-2">
                    <span class="text-gray-500 dark:text-gray-400">Duration:</span>
                    <span class="ml-1 font-mono dark:text-gray-300">{{ formatDuration(item.started_at,
                      item.completed_at) }}</span>
                  </div>
                </div>
              </div>

              <!-- Payload section -->
              <div class="bg-gray-50 dark:bg-gray-800/60 p-2 rounded border border-gray-200 dark:border-gray-700">
                <div class="text-xs font-semibold mb-1 dark:text-gray-300">
                  PAYLOAD
                </div>
                <pre
                  class="text-xs whitespace-pre-wrap break-words dark:text-gray-300 font-mono">{{ formatJson(item.payload) }}</pre>
              </div>

              <!-- Metadata section (if exists) -->
              <div v-if="item.metadata"
                class="bg-gray-50 dark:bg-gray-800/60 p-2 rounded border border-gray-200 dark:border-gray-700">
                <div class="text-xs font-semibold mb-1 dark:text-gray-300">
                  METADATA
                </div>
                <pre
                  class="text-xs whitespace-pre-wrap break-words dark:text-gray-300 font-mono">{{ formatJson(item.metadata) }}</pre>
              </div>

              <!-- Respond to section (if exists) -->
              <div v-if="item.respond_to"
                class="bg-gray-50 dark:bg-gray-800/60 p-2 rounded border border-gray-200 dark:border-gray-700">
                <div class="text-xs font-semibold mb-1 dark:text-gray-300">
                  RESPOND_TO
                </div>
                <pre
                  class="text-xs whitespace-pre-wrap break-words dark:text-gray-300 font-mono">{{ formatJson(item.respond_to) }}</pre>
              </div>

              <!-- Error section (if exists) -->
              <div v-if="item.error_message"
                class="bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-800">
                <div class="text-xs font-semibold mb-1 text-red-600 dark:text-red-400">
                  ERROR
                </div>
                <pre
                  class="text-xs whitespace-pre-wrap break-words text-red-600 dark:text-red-400 font-mono">{{ item.error_message }}</pre>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-if="sortedItems.length === 0" class="text-center py-6 bg-gray-50 dark:bg-gray-800 rounded">
          <h3 class="text-base font-mono mb-1 dark:text-gray-200">NO_QUEUE_ITEMS</h3>
          <p class="text-xs font-mono text-gray-500 dark:text-gray-400">SYSTEM :: Adjust filters or wait for new items
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRuntimeConfig } from '#app'

const supabase = useDatabase()
const config = useRuntimeConfig()
const baseUrl = config.public.apiBase || ''

const queueItems = ref([])
const expandedItem = ref(null)
const filterStatus = ref(null)
const loading = ref(true)
const error = ref(null)
const now = ref(new Date())

// Sorting functionality
const sortOptions = [
  { value: 'createdAt-desc', label: 'Newest First' },
  { value: 'createdAt-asc', label: 'Oldest First' },
  { value: 'priority-desc', label: 'Highest Priority First' },
  { value: 'priority-asc', label: 'Lowest Priority First' },
  { value: 'status', label: 'By Status' }
]
const selectedSort = ref('createdAt-desc')

// Get the current sort option
const currentSortOption = computed(() => {
  return sortOptions.find(option => option.value === selectedSort.value) || sortOptions[0]
})

// Update current time every minute for relative time calculations
let timeInterval
onMounted(() => {
  timeInterval = setInterval(() => {
    now.value = new Date()
  }, 60000) // Update every minute
})

onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval)
})

// Fetch queue data
const fetchQueue = async () => {
  loading.value = true
  error.value = null

  try {
    const { data, error: fetchError } = await supabase
      .from('queue')
      .select('*')
      .order('created_at', { ascending: false })
      .order('status', { ascending: true })
      .order('priority', { ascending: false })

    if (fetchError) throw fetchError

    queueItems.value = data || []
  } catch (err) {
    console.error('Error fetching queue:', err)
    error.value = err.message || 'Failed to load queue data'
  } finally {
    loading.value = false
  }
}

// Initial fetch
onMounted(async () => {
  await fetchQueue()

  // Subscribe to queue changes
  const channel = supabase
    .channel('queuechannel')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'queue' },
      (payload) => {
        // Refresh the queue data
        refreshQueue()
      }
    )
    .subscribe()

  // Clean up subscription on component unmount
  onUnmounted(() => {
    channel.unsubscribe()
  })
})

// Refresh queue data
const refreshQueue = async () => {
  await fetchQueue()
}

// Filtered queue items based on status filter
const filteredQueueItems = computed(() => {
  if (!filterStatus.value) return queueItems.value

  return queueItems.value.filter(item => item.status === filterStatus.value)
})

// Format date for display
const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// Format relative time (e.g., "2 hours ago")
const formatRelativeTime = (dateString) => {
  if (!dateString) return 'N/A'

  const date = new Date(dateString)
  const seconds = Math.floor((now.value - date) / 1000)

  let interval = Math.floor(seconds / 31536000)
  if (interval >= 1) return interval + 'y ago'

  interval = Math.floor(seconds / 2592000)
  if (interval >= 1) return interval + 'mo ago'

  interval = Math.floor(seconds / 86400)
  if (interval >= 1) return interval + 'd ago'

  interval = Math.floor(seconds / 3600)
  if (interval >= 1) return interval + 'h ago'

  interval = Math.floor(seconds / 60)
  if (interval >= 1) return interval + 'm ago'

  return 'just now'
}

// Format detailed timestamp
const formatDetailedTime = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)

  // Format: YYYY-MM-DD HH:MM:SS
  return date.toISOString().replace('T', ' ').substring(0, 19)
}

// Format JSON for display
const formatJson = (data) => {
  try {
    return JSON.stringify(data, null, 2)
  } catch (e) {
    return String(data)
  }
}

// Truncate long IDs
const truncateId = (id) => {
  if (!id) return ''
  const idStr = String(id)
  if (idStr.length <= 8) return idStr
  return idStr.substring(0, 8) + '...'
}

// Get classes for queue items based on status
const getItemClasses = (item) => {
  if (!item || !item.status) return ''

  let classes = ''

  if (item.status === 'in_progress') {
    classes += 'border-l-4 border-red-500 dark:border-red-600 '
  } else if (item.status === 'failed') {
    classes += 'border-l-4 border-yellow-500 dark:border-yellow-600 '
  } else if (item.status === 'completed') {
    classes += 'border-l-4 border-green-500 dark:border-green-600 '
  } else {
    classes += 'border-l-4 border-gray-300 dark:border-gray-600 '
  }

  return classes
}

// Get status badge class
const getStatusClass = (status) => {
  switch (status) {
    case 'in_progress':
      return 'bg-red-200 text-red-900 dark:bg-red-900 dark:text-red-100'
    case 'completed':
      return 'bg-green-200 text-green-900 dark:bg-green-900 dark:text-green-100'
    case 'failed':
      return 'bg-yellow-200 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100'
    case 'pending':
      return 'bg-blue-200 text-blue-900 dark:bg-blue-900 dark:text-blue-100'
    default:
      return 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
  }
}

// Format duration
const formatDuration = (start, end) => {
  const startDate = new Date(start)
  const endDate = new Date(end)
  const duration = Math.abs(endDate - startDate)
  const hours = Math.floor(duration / 3600000)
  const minutes = Math.floor((duration % 3600000) / 60000)
  const seconds = Math.floor((duration % 60000) / 1000)
  return `${hours}h ${minutes}m ${seconds}s`
}

// Get payload summary
const getPayloadSummary = (payload) => {
  if (!payload) return false
  return typeof payload === 'object' && Object.keys(payload).length > 0
}

// Get payload property
const getPayloadProperty = (payload, property) => {
  if (!payload || !property) return null
  return payload[property]
}

// Get payload parameters
const getPayloadParams = (payload) => {
  if (!payload || typeof payload !== 'object') return null

  // Check if there's a params object
  if (payload.params && typeof payload.params === 'object') {
    return payload.params
  }

  // Otherwise extract top-level parameters excluding certain keys
  return Object.entries(payload).reduce((params, [key, value]) => {
    if (key !== 'name' && key !== 'action' && key !== 'content' && key !== 'params') {
      params[key] = value
    }
    return params
  }, {})
}

// Format parameter value for display
const formatParamValue = (value) => {
  if (value === null || value === undefined) return 'null'

  if (typeof value === 'object') {
    if (Object.keys(value).length === 0) return '{}'
    return '{ ... }' // Indicate nested object
  }

  if (typeof value === 'string') {
    // Truncate long strings
    if (value.length > 50) {
      return `"${value.substring(0, 47)}..."`
    }
    return `"${value}"`
  }

  return String(value)
}

// Check if a parameter value is expandable (object with properties)
const isExpandableParam = (value) => {
  return typeof value === 'object' && value !== null && Object.keys(value).length > 0
}

// Track expanded nested parameters
const expandedNestedParams = ref({})

// Toggle expanded state of nested parameter
const toggleNestedParam = (itemId, paramKey) => {
  if (!expandedNestedParams.value[itemId]) {
    expandedNestedParams.value[itemId] = {}
  }

  expandedNestedParams.value[itemId][paramKey] = !expandedNestedParams.value[itemId][paramKey]
}

// Check if a nested parameter is expanded
const isNestedParamExpanded = (itemId, paramKey) => {
  return expandedNestedParams.value[itemId]?.[paramKey] || false
}

// Sorting functionality
const sortedItems = computed(() => {
  if (!filteredQueueItems.value || filteredQueueItems.value.length === 0) return []

  const [field, direction] = selectedSort.value.split('-')

  return [...filteredQueueItems.value].sort((a, b) => {
    if (field === 'createdAt') {
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return direction === 'asc' ? dateA - dateB : dateB - dateA
    }

    if (field === 'priority') {
      const priorityA = a.priority || 0
      const priorityB = b.priority || 0
      return direction === 'asc' ? priorityA - priorityB : priorityB - priorityA
    }

    if (field === 'status') {
      // Order: processing, waiting, completed, failed
      const statusOrder = { processing: 1, waiting: 2, completed: 3, failed: 4 }
      return statusOrder[a.status] - statusOrder[b.status]
    }

    return 0
  })
})

// Add a custom directive to highlight the selected option
const vHighlightSelected = {
  mounted(el) {
    const select = el;
    const options = select.options;

    // Add a class to the selected option
    const updateSelectedClass = () => {
      for (let i = 0; i < options.length; i++) {
        if (options[i].selected) {
          options[i].classList.add('selected-option');
        } else {
          options[i].classList.remove('selected-option');
        }
      }
    };

    // Initial update
    updateSelectedClass();

    // Update on change
    select.addEventListener('change', updateSelectedClass);
  }
};

</script>

<style scoped>
/* Status indicators */
.queue-item {
  opacity: 0;
  animation: fadeIn 0.3s ease-in-out forwards;
  border-width: 1px;
  border-style: solid;
  border-color: rgba(var(--v-theme-surface-variant), 0.1);
  background-color: rgba(var(--v-theme-surface), 0.02);
  transition: all 0.2s ease;
}

.queue-item:hover {
  background-color: rgba(var(--v-theme-surface), 0.05);
  border-color: rgba(var(--v-theme-primary), 0.2);
  box-shadow: 0 0 8px rgba(var(--v-theme-primary), 0.1);
}

.dark .queue-item {
  border-color: rgba(255, 255, 255, 0.05);
  background-color: rgba(0, 0, 0, 0.2);
}

.dark .queue-item:hover {
  background-color: rgba(0, 0, 0, 0.3);
  border-color: rgba(var(--v-theme-primary), 0.3);
  box-shadow: 0 0 12px rgba(var(--v-theme-primary), 0.15);
}

/* Status indicators with enhanced glow */
.hack-indicator {
  background-color: #374151;
  border-radius: 50%;
  display: inline-block;
  animation: hack-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  width: 8px;
  height: 8px;
  position: relative;
}

.hack-indicator::after {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border-radius: 50%;
  background: transparent;
  border: 1px solid rgba(55, 65, 81, 0.3);
  animation: hack-pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.hack-indicator-red {
  background-color: #EF4444;
  border-radius: 50%;
  display: inline-block;
  animation: hack-pulse-red 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  width: 8px;
  height: 8px;
  position: relative;
}

.hack-indicator-red::after {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border-radius: 50%;
  background: transparent;
  border: 1px solid rgba(239, 68, 68, 0.3);
  animation: hack-pulse-red-ring 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.hack-indicator-green {
  background-color: #10B981;
  border-radius: 50%;
  display: inline-block;
  animation: hack-pulse-green 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  width: 8px;
  height: 8px;
  position: relative;
}

.hack-indicator-green::after {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border-radius: 50%;
  background: transparent;
  border: 1px solid rgba(16, 185, 129, 0.3);
  animation: hack-pulse-green-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.hack-indicator-yellow {
  background-color: #F59E0B;
  border-radius: 50%;
  display: inline-block;
  animation: hack-pulse-yellow 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  width: 8px;
  height: 8px;
  position: relative;
}

.hack-indicator-yellow::after {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border-radius: 50%;
  background: transparent;
  border: 1px solid rgba(245, 158, 11, 0.3);
  animation: hack-pulse-yellow-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes hack-pulse-ring {

  0%,
  100% {
    transform: scale(1);
    opacity: 0.3;
  }

  50% {
    transform: scale(1.5);
    opacity: 0.1;
  }
}

@keyframes hack-pulse-red-ring {

  0%,
  100% {
    transform: scale(1);
    opacity: 0.5;
  }

  50% {
    transform: scale(1.5);
    opacity: 0.2;
  }
}

@keyframes hack-pulse-green-ring {

  0%,
  100% {
    transform: scale(1);
    opacity: 0.5;
  }

  50% {
    transform: scale(1.5);
    opacity: 0.2;
  }
}

@keyframes hack-pulse-yellow-ring {

  0%,
  100% {
    transform: scale(1);
    opacity: 0.5;
  }

  50% {
    transform: scale(1.5);
    opacity: 0.2;
  }
}

/* Hide queue items initially for animation */
.queue-item {
  opacity: 0;
  animation: fadeIn 0.3s ease-in-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(5px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Add staggered delay to queue items */
.queue-item:nth-child(1) {
  animation-delay: 0.05s;
}

.queue-item:nth-child(2) {
  animation-delay: 0.1s;
}

.queue-item:nth-child(3) {
  animation-delay: 0.15s;
}

.queue-item:nth-child(4) {
  animation-delay: 0.2s;
}

.queue-item:nth-child(5) {
  animation-delay: 0.25s;
}

.queue-item:nth-child(6) {
  animation-delay: 0.3s;
}

.queue-item:nth-child(7) {
  animation-delay: 0.35s;
}

.queue-item:nth-child(8) {
  animation-delay: 0.4s;
}

.queue-item:nth-child(9) {
  animation-delay: 0.45s;
}

.queue-item:nth-child(10) {
  animation-delay: 0.5s;
}

/* Dark mode adjustments for indicators */
@media (prefers-color-scheme: dark) {
  @keyframes hack-pulse {

    0%,
    100% {
      opacity: 1;
      box-shadow: 0 0 3px rgba(255, 255, 255, 0.5);
    }

    50% {
      opacity: 0.6;
      box-shadow: 0 0 2px rgba(255, 255, 255, 0.3);
    }
  }
}

.task-summary {
  background-color: rgba(var(--v-theme-primary), 0.03);
  border-left: 2px solid rgb(var(--v-theme-primary));
  padding: 6px 10px;
  border-radius: 2px;
  margin-left: 2px;
}

.dark .task-summary {
  background-color: rgba(var(--v-theme-primary), 0.06);
}

/* Status badge styles */
.getStatusClass {
  position: relative;
  overflow: hidden;
}

.getStatusClass::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to right, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0));
  transform: translateX(-100%);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}

.params-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.param-item {
  display: flex;
  align-items: flex-start;
}

.param-key {
  font-weight: 500;
  margin-right: 4px;
  color: rgba(var(--v-theme-on-surface), 0.8);
}

.param-value {
  word-break: break-word;
}

.content-preview {
  font-size: 0.875rem;
}

.content-text {
  font-style: italic;
  color: rgba(var(--v-theme-on-surface), 0.8);
  word-break: break-word;
  max-height: 80px;
  overflow-y: auto;
}

.sort-controls select {
  transition: all 0.2s ease;
}

.sort-controls select:hover {
  border-color: rgba(var(--v-theme-primary), 0.5);
}

.sort-controls select:focus {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.2);
}


.tooltip-container {
  opacity: 0;
  transform: translateY(-5px);
  transition: all 0.2s ease;
}

.group:hover .tooltip-container {
  opacity: 1;
  transform: translateY(0);
  display: block;
}

.tooltip {
  position: relative;
}

.tooltip::after {
  content: '';
  position: absolute;
  top: -4px;
  left: 10px;
  width: 8px;
  height: 8px;
  background-color: rgb(31, 41, 55);
  /* bg-gray-800 */
  transform: rotate(45deg);
}

/* Style for the selected option */
:deep(.selected-option) {
  background-color: rgba(var(--v-theme-primary), 0.1);
  font-weight: 500;
}

.param-nested-summary {
  display: flex;
  align-items: center;
}

.param-nested-content {
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.cursor-pointer {
  cursor: pointer;
}

.action-badge {
  display: flex;
  align-items: center;
  background-color: rgba(var(--v-theme-primary), 0.1);
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 0.75rem;
  font-weight: 500;
  color: rgb(var(--v-theme-primary));
  border: 1px solid rgba(var(--v-theme-primary), 0.2);
}

.params-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.param-chip {
  display: inline-flex;
  flex-direction: column;
  background-color: rgba(var(--v-theme-surface), 0.8);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 3px;
  padding: 2px 6px;
  font-size: 0.7rem;
  max-width: 100%;
}

.nested-param-chip {
  display: flex;
  flex-direction: column;
  background-color: rgba(var(--v-theme-surface), 0.6);
  border-left: 2px solid rgba(var(--v-theme-primary), 0.3);
  padding: 2px 4px;
  margin-top: 2px;
  font-size: 0.7rem;
}

.content-chip {
  display: flex;
  align-items: center;
  background-color: rgba(var(--v-theme-surface), 0.6);
  border-left: 2px solid rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 2px;
  padding: 3px 6px;
  font-size: 0.75rem;
  font-style: italic;
  color: rgba(var(--v-theme-on-surface), 0.8);
}

.dark .param-chip {
  background-color: rgba(30, 30, 30, 0.6);
  border-color: rgba(255, 255, 255, 0.1);
}

.dark .nested-param-chip {
  background-color: rgba(20, 20, 20, 0.8);
}

.dark .content-chip {
  background-color: rgba(20, 20, 20, 0.6);
}

@keyframes hack-pulse {

  0%,
  100% {
    opacity: 1;
    box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
  }

  50% {
    opacity: 0.6;
    box-shadow: 0 0 1px rgba(0, 0, 0, 0.3);
  }
}

@keyframes hack-pulse-red {

  0%,
  100% {
    opacity: 1;
    box-shadow: 0 0 3px rgba(239, 68, 68, 0.7);
  }

  50% {
    opacity: 0.7;
    box-shadow: 0 0 1px rgba(239, 68, 68, 0.5);
  }
}

@keyframes hack-pulse-green {

  0%,
  100% {
    opacity: 1;
    box-shadow: 0 0 3px rgba(16, 185, 129, 0.7);
  }

  50% {
    opacity: 0.7;
    box-shadow: 0 0 1px rgba(16, 185, 129, 0.5);
  }
}

@keyframes hack-pulse-yellow {

  0%,
  100% {
    opacity: 1;
    box-shadow: 0 0 3px rgba(245, 158, 11, 0.7);
  }

  50% {
    opacity: 0.7;
    box-shadow: 0 0 1px rgba(245, 158, 11, 0.5);
  }
}
</style>