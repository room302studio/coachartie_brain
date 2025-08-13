<template>
  <div class="font-mono">
    <!-- Header with controls -->
    <div class="flex items-center justify-between mb-1 border-b border-gray-300 dark:border-primary pb-0.5">
      <div class="flex items-center">
        <button @click="refreshPrompts"
          class="text-[10px] text-gray-700 dark:text-tertiary font-mono mr-1 border-r border-gray-300 dark:border-secondary px-0.5 hover:text-gray-900 dark:hover:text-secondary"
          aria-label="Refresh prompts">
          [REFRESH]
        </button>
        <button @click="createNewPrompt"
          class="text-[10px] text-gray-700 dark:text-tertiary font-mono mr-1 border-r border-gray-300 dark:border-secondary px-0.5 hover:text-gray-900 dark:hover:text-secondary"
          aria-label="Create new prompt">
          [NEW]
        </button>
        <span class="text-[10px] text-gray-700 dark:text-tertiary">[{{ filteredPrompts.length }}]</span>
      </div>

      <div class="flex items-center space-x-2">
        <select v-model="filterSettings.status"
          class="text-[10px] text-gray-700 dark:text-tertiary font-mono border-r border-gray-300 dark:border-secondary px-0.5 bg-transparent">
          <option value="all">ALL</option>
          <option value="active">ACTIVE</option>
          <option value="archived">ARCHIVED</option>
        </select>

        <select v-model="viewMode"
          class="text-[10px] text-gray-700 dark:text-tertiary font-mono border-r border-gray-300 dark:border-secondary px-0.5 bg-transparent">
          <option value="list">LIST_VIEW</option>
          <option value="expanded">EXPANDED_VIEW</option>
        </select>
      </div>
    </div>

    <!-- Filters -->
    <div class="border-b border-gray-300 dark:border-primary p-1 mb-1">
      <div>
        <label class="text-[10px] text-gray-700 dark:text-tertiary mb-0.5 block">SEARCH:</label>
        <input v-model="searchQuery" placeholder="Search prompts"
          class="w-full text-[10px] text-gray-900 dark:text-secondary bg-transparent border-b border-gray-300 dark:border-secondary p-0.5" />
      </div>
    </div>

    <!-- Full-screen editor when editing -->
    <div v-if="isEditing" class="mb-1">
      <!-- Editor Header -->
      <div class="flex justify-between items-center mb-2 border-b border-gray-300 dark:border-secondary pb-1">
        <div class="flex items-center">
          <span class="text-sm text-gray-900 dark:text-primary font-bold mr-2">EDITING PROMPT:</span>
          <input v-model="editingPrompt.prompt_name" placeholder="Prompt Name"
            class="text-sm text-gray-900 dark:text-primary bg-transparent border-b border-gray-300 dark:border-secondary p-0.5 w-64" />
        </div>
        <div class="flex items-center space-x-3">
          <div class="flex items-center">
            <input type="checkbox" v-model="editingPrompt.active" class="mr-1 h-3 w-3" />
            <label class="text-[11px] text-gray-700 dark:text-tertiary">ACTIVE</label>
          </div>
          <button @click="savePrompt"
            class="text-[11px] bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-tertiary hover:text-gray-900 dark:hover:text-secondary px-2 py-1 rounded">
            SAVE
          </button>
          <button @click="cancelEdit"
            class="text-[11px] text-gray-700 dark:text-tertiary hover:text-gray-900 dark:hover:text-secondary">
            CANCEL
          </button>
        </div>
      </div>

      <!-- Two-panel layout for editing -->
      <div class="grid" :class="showHistory ? 'grid-cols-3' : 'grid-cols-1'">
        <!-- Main panel: Prompt Editor (larger when history is hidden) -->
        <div :class="showHistory ? 'col-span-2' : 'col-span-1'"
          class="border border-gray-300 dark:border-secondary p-2">
          <div class="flex justify-between mb-2">
            <div class="flex space-x-4 items-center">
              <div>
                <label class="text-[11px] text-gray-700 dark:text-tertiary mb-0.5 block">TYPE:</label>
                <select v-model="editingPrompt.type"
                  class="w-full text-[11px] text-gray-900 dark:text-primary bg-transparent border-b border-gray-300 dark:border-secondary p-0.5">
                  <option value="system">SYSTEM</option>
                  <option value="user">USER</option>
                  <option value="assistant">ASSISTANT</option>
                  <option value="function">FUNCTION</option>
                  <option value="other">OTHER</option>
                </select>
              </div>
              <div v-if="editingPrompt.id" class="text-[11px] text-gray-500">
                ID: {{ editingPrompt.id }}
              </div>
              <div v-if="editingPrompt.updated_at" class="text-[11px] text-gray-500">
                UPDATED: {{ formatDate(editingPrompt.updated_at) }}
              </div>
            </div>
            <button @click="showHistory = !showHistory"
              class="text-[11px] text-gray-700 dark:text-tertiary hover:text-gray-900 dark:hover:text-secondary">
              {{ showHistory ? 'HIDE HISTORY' : 'SHOW HISTORY' }}
            </button>
          </div>

          <label class="text-[11px] text-gray-700 dark:text-tertiary mb-1 block font-bold">PROMPT_TEXT:</label>
          <textarea v-model="editingPrompt.prompt_text" placeholder="Enter prompt text here..."
            class="w-full text-[12px] leading-relaxed text-gray-900 dark:text-primary bg-transparent border border-gray-300 dark:border-secondary p-2 resize-y font-mono"
            :style="{ minHeight: showHistory ? '400px' : '60vh' }"></textarea>

          <div class="mt-3">
            <label class="text-[11px] text-gray-700 dark:text-tertiary mb-1 block font-bold">NOTES:</label>
            <textarea v-model="editingPrompt.notes" placeholder="Notes (optional)"
              class="w-full text-[11px] text-gray-900 dark:text-primary bg-transparent border border-gray-300 dark:border-secondary p-1 resize-y"
              style="min-height: 60px;"></textarea>
          </div>
        </div>

        <!-- Right panel: History Viewer (only shown when history toggle is on) -->
        <div v-if="showHistory" class="border border-gray-300 dark:border-secondary p-2">
          <div class="flex justify-between mb-2 border-b border-gray-300 dark:border-secondary pb-1">
            <span class="text-[11px] text-gray-700 dark:text-tertiary font-bold">REVISION_HISTORY</span>
            <span v-if="promptHistory.length > 0" class="text-[11px] text-gray-700 dark:text-tertiary">[{{
              promptHistory.length }}]</span>
          </div>

          <div v-if="promptHistory.length === 0" class="text-center py-4">
            <span class="text-[11px] text-gray-700 dark:text-tertiary">NO_REVISION_HISTORY</span>
          </div>

          <div v-else class="space-y-1 max-h-[400px] overflow-y-auto">
            <div v-for="(entry, index) in promptHistory" :key="index"
              class="border border-gray-300 dark:border-secondary mb-0.5 hover:bg-gray-100 dark:hover:bg-gray-900 cursor-pointer"
              :class="{ 'border-blue-500 dark:border-blue-500': selectedHistoryEntry === entry }"
              @click="viewHistoryEntry(entry)">
              <div class="flex items-center justify-between p-1 border-b border-gray-300 dark:border-secondary">
                <span class="text-[11px] text-gray-900 dark:text-primary">VERSION_{{ promptHistory.length - index
                }}</span>
                <span class="text-[11px] text-gray-700 dark:text-tertiary">{{ formatDate(entry.timestamp) }}</span>
              </div>
              <div class="p-1 text-[11px] text-gray-700 dark:text-tertiary">
                <div v-if="entry.version && entry.version.notes" class="mb-1">NOTES: {{ entry.version.notes }}</div>
                <button @click.stop="restoreVersion(entry)"
                  class="text-[11px] text-gray-700 dark:text-tertiary hover:text-gray-900 dark:hover:text-secondary">
                  RESTORE
                </button>
              </div>
            </div>
          </div>

          <div v-if="selectedHistoryEntry" class="mt-2 border-t border-gray-300 dark:border-secondary pt-1">
            <div class="flex justify-between items-center text-[11px] text-gray-700 dark:text-tertiary mb-1">
              <span>VERSION_PREVIEW:</span>
              <div class="flex items-center space-x-2">
                <span>SHOW:</span>
                <button @click="diffView = false" class="text-[11px]"
                  :class="!diffView ? 'text-blue-600 dark:text-blue-500 font-bold' : 'text-gray-700 dark:text-tertiary'">
                  FULL
                </button>
                <span>|</span>
                <button @click="diffView = true; wordDiff = false" class="text-[11px]"
                  :class="diffView && !wordDiff ? 'text-blue-600 dark:text-blue-500 font-bold' : 'text-gray-700 dark:text-tertiary'">
                  LINE DIFF
                </button>
                <span>|</span>
                <button @click="diffView = true; wordDiff = true" class="text-[11px]"
                  :class="diffView && wordDiff ? 'text-blue-600 dark:text-blue-500 font-bold' : 'text-gray-700 dark:text-tertiary'">
                  WORD DIFF
                </button>
              </div>
            </div>

            <!-- Full version display -->
            <pre v-if="!diffView && selectedHistoryEntry.version && selectedHistoryEntry.version.prompt_text"
              class="text-[11px] text-gray-900 dark:text-primary p-1 whitespace-pre-wrap break-words border border-gray-300 dark:border-secondary max-h-[200px] overflow-y-auto">{{ selectedHistoryEntry.version.prompt_text }}</pre>

            <!-- Diff view display -->
            <div v-if="diffView"
              class="border border-gray-300 dark:border-secondary max-h-[200px] overflow-y-auto p-1 text-[11px]">
              <div v-if="computedDiff.length === 0" class="text-center py-2 text-gray-500">
                No differences found
              </div>
              <div v-else class="diff-container">
                <div v-for="(part, index) in computedDiff" :key="index" class="diff-line">
                  <template v-if="part.added">
                    <div class="bg-green-100 dark:bg-green-900 px-1 py-0.5 rounded">
                      <span class="text-green-600 dark:text-green-400 font-bold">+</span>
                      <span class="text-green-800 dark:text-green-300">{{ part.value }}</span>
                    </div>
                  </template>
                  <template v-else-if="part.removed">
                    <div class="bg-red-100 dark:bg-red-900 px-1 py-0.5 rounded">
                      <span class="text-red-600 dark:text-red-400 font-bold">-</span>
                      <span class="text-red-800 dark:text-red-300">{{ part.value }}</span>
                    </div>
                  </template>
                  <template v-else>
                    <span class="text-gray-600 dark:text-gray-400">{{ part.value }}</span>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Prompt List (only shown when not editing) -->
    <div v-if="!isEditing" class="space-y-1 overflow-y-auto" style="max-height: calc(100vh - 150px);">
      <!-- Prompts (Compact List View) -->
      <div v-if="viewMode === 'list'" v-for="prompt in filteredPrompts" :key="prompt.id"
        class="border border-gray-300 dark:border-secondary mb-0.5 hover:bg-gray-100 dark:hover:bg-gray-900 cursor-pointer prompt-item"
        :class="{ 'opacity-50': prompt.archived }" @click="editPrompt(prompt)">
        <div class="flex items-center justify-between p-1 border-b border-gray-300 dark:border-secondary">
          <div class="flex items-center">
            <span v-if="prompt.active" class="w-1 h-1 bg-green-500 rounded-full mr-1"></span>
            <span v-else class="w-1 h-1 bg-gray-400 rounded-full mr-1"></span>
            <span class="text-sm text-gray-900 dark:text-primary font-medium">{{ prompt.prompt_name || 'UNNAMED'
            }}</span>
            <span v-if="prompt.type" class="text-[10px] text-gray-500 ml-1">[{{ prompt.type.toUpperCase() }}]</span>
          </div>
          <div class="flex items-center">
            <span v-if="getHistoryCount(prompt)" class="text-[10px] text-gray-500 mr-2">
              HISTORY: {{ getHistoryCount(prompt) }}
            </span>
            <button @click.stop="toggleArchived(prompt)"
              class="text-[10px] text-gray-700 dark:text-tertiary hover:text-gray-900 dark:hover:text-secondary ml-2">
              {{ prompt.archived ? 'RESTORE' : 'ARCHIVE' }}
            </button>
            <button @click.stop="deletePrompt(prompt.id)"
              class="text-[10px] text-gray-700 dark:text-tertiary hover:text-gray-900 dark:hover:text-secondary ml-2">
              DELETE
            </button>
          </div>
        </div>
        <pre
          class="text-[10px] text-gray-900 dark:text-primary p-1 whitespace-pre-wrap break-words max-h-[100px] overflow-y-auto">
      {{ truncatePrompt(prompt.prompt_text, 300) }}</pre>
        <div v-if="prompt.notes" class="text-[10px] text-gray-500 px-1 pb-1">
          NOTES: {{ prompt.notes }}
        </div>
        <div class="text-[10px] text-gray-500 px-1 pb-1 flex justify-between">
          <span>ID: {{ prompt.id }}</span>
          <span>{{ formatDate(prompt.updated_at || prompt.created_at) }}</span>
        </div>
      </div>

      <!-- Prompts (Expanded View) -->
      <div v-if="viewMode === 'expanded'" v-for="prompt in filteredPrompts" :key="prompt.id"
        class="border border-gray-300 dark:border-secondary mb-2 hover:bg-gray-100 dark:hover:bg-gray-900 cursor-pointer prompt-item"
        :class="{ 'opacity-50': prompt.archived }">
        <div class="flex items-center justify-between p-1 border-b border-gray-300 dark:border-secondary"
          @click="editPrompt(prompt)">
          <div class="flex items-center">
            <span v-if="prompt.active" class="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
            <span v-else class="w-2 h-2 bg-gray-400 rounded-full mr-1"></span>
            <span class="text-sm text-gray-900 dark:text-primary font-medium">{{ prompt.prompt_name || 'UNNAMED'
            }}</span>
            <span v-if="prompt.type" class="text-[10px] text-gray-500 ml-1">[{{ prompt.type.toUpperCase() }}]</span>
          </div>
          <div class="flex items-center">
            <span v-if="getHistoryCount(prompt)" class="text-[10px] text-gray-500 mr-2">
              HISTORY: {{ getHistoryCount(prompt) }}
            </span>
            <button @click.stop="toggleArchived(prompt)"
              class="text-[10px] text-gray-700 dark:text-tertiary hover:text-gray-900 dark:hover:text-secondary ml-2">
              {{ prompt.archived ? 'RESTORE' : 'ARCHIVE' }}
            </button>
            <button @click.stop="deletePrompt(prompt.id)"
              class="text-[10px] text-gray-700 dark:text-tertiary hover:text-gray-900 dark:hover:text-secondary ml-2">
              DELETE
            </button>
          </div>
        </div>
        <pre @click="editPrompt(prompt)"
          class="text-[11px] text-gray-900 dark:text-primary p-2 whitespace-pre-wrap break-words max-h-[400px] overflow-y-auto">
      {{ prompt.prompt_text }}</pre>
        <div class="border-t border-gray-300 dark:border-secondary p-1">
          <div v-if="prompt.notes" class="text-[10px] text-gray-500 mb-1">
            NOTES: {{ prompt.notes }}
          </div>
          <div class="text-[10px] text-gray-500 flex justify-between">
            <span>ID: {{ prompt.id }}</span>
            <span>{{ formatDate(prompt.updated_at || prompt.created_at) }}</span>
          </div>
        </div>
      </div>

      <!-- Empty state message -->
      <div v-if="filteredPrompts.length === 0"
        class="text-center py-2 border border-dashed border-gray-300 dark:border-secondary">
        <span class="text-[10px] text-gray-700 dark:text-tertiary">NO_PROMPTS_FOUND</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { format } from 'date-fns'
import { useStaggeredAnimation } from '~/composables/useStaggeredAnimation'
import { stagger } from '~/anime.esm.js'
import * as diffLib from 'diff'

// State
const promptsData = ref([])
const isEditing = ref(false)
const editingPrompt = ref({
  id: null,
  prompt_name: '',
  prompt_text: '',
  notes: '',
  type: 'system',
  active: true,
  archived: false,
  history: []
})
const loading = ref(false)
const searchQuery = ref('')
const filterSettings = ref({
  status: 'all' // 'all', 'active', 'archived'
})
const viewMode = ref('list') // 'list' or 'expanded'
const promptHistory = ref([])
const selectedHistoryEntry = ref(null)
const diffView = ref(true) // Default to showing changes
const wordDiff = ref(false) // Default to line diff
const showContext = ref(true) // Show some context lines in diff
const showHistory = ref(true) // Toggle for history panel visibility

// Compute diff when selectedHistoryEntry changes
const computedDiff = computed(() => {
  if (!selectedHistoryEntry.value || !selectedHistoryEntry.value.version) {
    return []
  }

  const oldText = selectedHistoryEntry.value.version.prompt_text || ''
  const newText = editingPrompt.value.prompt_text || ''

  // Use the diff library to generate a diff based on selected mode
  try {
    if (wordDiff.value) {
      return diffLib.diffWordsWithSpace(oldText, newText)
    } else {
      return diffLib.diffLines(oldText, newText)
    }
  } catch (error) {
    console.error('Error computing diff:', error)
    return []
  }
})

// Watch for changes to selectedHistoryEntry or diff mode
watch([selectedHistoryEntry, wordDiff], () => {
  if (selectedHistoryEntry.value && diffView.value) {
    // Force recomputation of diff
    nextTick(() => {
      const currentDiffView = diffView.value
      diffView.value = false
      nextTick(() => {
        diffView.value = currentDiffView
      })
    })
  }
})

// Animation setup
const { animateStaggered } = useStaggeredAnimation()

// Supabase client
// const supabase = useSupabaseClient()

// Format date
function formatDate(timestamp) {
  if (!timestamp) return 'N/A'
  return format(new Date(timestamp), 'MM-dd-yy HH:mm')
}

// Truncate long prompts for display
function truncatePrompt(text, length = 300) {
  if (!text) return ''
  return text.length > length ? text.slice(0, length) + '...' : text
}

// Get number of history entries
function getHistoryCount(prompt) {
  if (!prompt.history) return 0
  try {
    const history = Array.isArray(prompt.history) ? prompt.history : JSON.parse(prompt.history)
    return history.length
  } catch (e) {
    return 0
  }
}

// Fetch prompts data
const refreshPrompts = async () => {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) throw error

    if (data) {
      promptsData.value = data
      // Re-trigger animation after a short delay to ensure DOM has updated
      setTimeout(() => {
        animateStaggered('.prompt-item', {
          delay: stagger(40),
          translateY: [10, 0]
        })
      }, 50)
    }
  } catch (err) {
    console.error('Error fetching prompts:', err)
  } finally {
    loading.value = false
  }
}

// Process prompt history
function processHistory(prompt) {
  if (!prompt.history) {
    promptHistory.value = []
    return
  }

  try {
    // Parse history if it's a string
    const history = Array.isArray(prompt.history) ? prompt.history : JSON.parse(prompt.history)
    // Sort history by timestamp (newest first)
    promptHistory.value = [...history].sort((a, b) => {
      return new Date(b.timestamp) - new Date(a.timestamp)
    })
  } catch (e) {
    console.error('Error processing history:', e)
    promptHistory.value = []
  }
}

// Create new prompt
function createNewPrompt() {
  editingPrompt.value = {
    id: null,
    prompt_name: '',
    prompt_text: '',
    notes: '',
    type: 'system',
    active: true,
    archived: false,
    history: []
  }
  promptHistory.value = []
  selectedHistoryEntry.value = null
  isEditing.value = true
}

// Edit existing prompt
function editPrompt(prompt) {
  editingPrompt.value = { ...prompt }
  processHistory(prompt)
  selectedHistoryEntry.value = null
  isEditing.value = true
}

// View history entry
function viewHistoryEntry(entry) {
  selectedHistoryEntry.value = entry
}

// Restore version from history
function restoreVersion(entry) {
  if (!entry || !entry.version) return

  // Keep the current ID and history
  const id = editingPrompt.value.id
  const history = editingPrompt.value.history

  // Update editing prompt with historical version
  editingPrompt.value = {
    ...entry.version,
    id,
    history
  }
}

// Cancel editing
function cancelEdit() {
  isEditing.value = false
  selectedHistoryEntry.value = null
}

// Update history before saving
function updateHistory() {
  // Don't update history for new prompts
  if (!editingPrompt.value.id) return

  // Find the current prompt in data
  const currentPrompt = promptsData.value.find(p => p.id === editingPrompt.value.id)
  if (!currentPrompt) return

  // Create new history entry with current prompt state
  const historyEntry = {
    version: { ...currentPrompt },
    timestamp: new Date().toISOString()
  }

  // Parse current history
  let history = []
  try {
    history = Array.isArray(currentPrompt.history)
      ? [...currentPrompt.history]
      : (currentPrompt.history ? JSON.parse(currentPrompt.history) : [])
  } catch (e) {
    console.warn('Error parsing history:', e)
    history = []
  }

  // Add new entry to history
  history.push(historyEntry)

  // Update editingPrompt with new history
  editingPrompt.value.history = history
}

// Save prompt data
async function savePrompt() {
  try {
    // Update history before saving
    updateHistory()

    const promptData = { ...editingPrompt.value }

    if (promptData.id) {
      // Update existing prompt
      const { error } = await supabase
        .from('prompts')
        .update(promptData)
        .eq('id', promptData.id)

      if (error) throw error
    } else {
      // Insert new prompt
      const { error } = await supabase
        .from('prompts')
        .insert([promptData])

      if (error) throw error
    }

    // Refresh prompts and exit edit mode
    await refreshPrompts()
    isEditing.value = false
  } catch (err) {
    console.error('Error saving prompt:', err)
  }
}

// Toggle archived state
async function toggleArchived(prompt) {
  try {
    const { error } = await supabase
      .from('prompts')
      .update({ archived: !prompt.archived })
      .eq('id', prompt.id)

    if (error) throw error

    // Update local state
    await refreshPrompts()
  } catch (err) {
    console.error('Error toggling archived state:', err)
  }
}

// Delete prompt
async function deletePrompt(id) {
  if (!confirm('Are you sure you want to delete this prompt?')) return

  try {
    const { error } = await supabase
      .from('prompts')
      .delete()
      .eq('id', id)

    if (error) throw error

    // Refresh prompts
    await refreshPrompts()
  } catch (err) {
    console.error('Error deleting prompt:', err)
  }
}

// Filtered prompts based on search query and status filter
const filteredPrompts = computed(() => {
  let filtered = promptsData.value

  // Apply status filter
  if (filterSettings.value.status === 'active') {
    filtered = filtered.filter(prompt => !prompt.archived)
  } else if (filterSettings.value.status === 'archived') {
    filtered = filtered.filter(prompt => prompt.archived)
  }

  // Apply search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(prompt =>
      (prompt.prompt_name && prompt.prompt_name.toLowerCase().includes(query)) ||
      (prompt.prompt_text && prompt.prompt_text.toLowerCase().includes(query)) ||
      (prompt.notes && prompt.notes.toLowerCase().includes(query)) ||
      (prompt.type && prompt.type.toLowerCase().includes(query))
    )
  }

  return filtered
})

// Initial load
onMounted(() => {
  refreshPrompts()
})
</script>

<style scoped>
textarea {
  resize: vertical;
  line-height: 1.4;
  tab-size: 2;
}

pre {
  line-height: 1.4;
  tab-size: 2;
}

/* Hide items initially to prevent flash before animation */
.prompt-item {
  opacity: 0;
}

/* Override for archived items */
.prompt-item.opacity-50 {
  opacity: 0.5;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
}

::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

.dark ::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}

.dark ::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
}

.dark ::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Diff styles */
.diff-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.diff-line {
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.4;
  margin: 1px 0;
  padding: 2px 0;
}

.diff-line:hover {
  background-color: rgba(0, 0, 0, 0.03);
}

.dark .diff-line:hover {
  background-color: rgba(255, 255, 255, 0.03);
}
</style>