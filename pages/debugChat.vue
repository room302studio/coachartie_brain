<template>
  <div class="h-screen w-screen flex flex-col dark:bg-black text-gray-800 dark:text-gray-100 overflow-hidden">
    <!-- Header (compact) -->
    <header class="px-3 py-1 flex flex-col gap-1 border-b border-gray-200 dark:border-gray-800 text-[10px] select-none">
      <div class="flex items-center gap-3">
        <div class="font-semibold tracking-wide text-xs">Debug Chat</div>
        <div class="opacity-60">Dense mode</div>
        <div class="ml-auto flex gap-1 items-center">
          <button
            class="px-2 py-0.5 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition uppercase"
            @click="clearChat" :disabled="isLoading">Clear</button>
        </div>
      </div>
      <div class="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] leading-tight">
        <span class="opacity-70">Msgs: {{ messages.length }}</span>
        <span v-if="stats.totalAssistantMessages">Assistant: {{ stats.totalAssistantMessages }}</span>
        <span v-if="stats.avgLatencyMs">Avg Lat: {{ formatMs(stats.avgLatencyMs) }}</span>
        <span v-if="stats.lastLatencyMs" class="font-medium">Last Lat: {{ formatMs(stats.lastLatencyMs) }}</span>
        <span v-if="stats.throughputPerMin">Throughput: {{ stats.throughputPerMin.toFixed(1) }}/min</span>
        <span v-if="stats.totalTokens">Est Tokens: {{ stats.totalTokens }}</span>
        <span v-if="stats.memoryHits">Mem Hits: {{ stats.memoryHits }}</span>
      </div>
    </header>

    <!-- Chat + Input Container -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Messages Scroll Area -->
      <div ref="chatWindow" class="flex-1 overflow-y-auto px-3 py-2 space-y-2 text-[13px] leading-snug">
        <template v-for="(message, i) in messages" :key="message.id">
          <div class="group relative">
            <div class="flex items-center gap-2 mb-0.5 text-[10px] uppercase tracking-wide font-medium select-none">
              <span :class="message.role === 'user' ? 'text-blue-500' : 'text-green-500'">{{ message.role === 'user' ?
                'You' : 'Artie' }}</span>
              <span class="text-gray-400">{{ formatTime(message.timestamp) }}</span>
              <span v-if="showTokens && message.tokenCount" class="text-gray-300 dark:text-gray-600">• {{
                message.tokenCount }}t</span>
              <span v-if="message.meta?.processingTime" class="text-purple-600 dark:text-purple-400">• {{
                formatMs(message.meta.processingTime) }}</span>
              <span v-if="message.meta?.memoryCount" class="text-amber-600 dark:text-amber-400">• {{
                message.meta.memoryCount }} mem</span>
            </div>
            <div
              class="rounded px-2 py-1.5 whitespace-pre-wrap break-words border border-transparent group-hover:border-gray-300 dark:group-hover:border-gray-700 transition-colors"
              :class="message.role === 'user' ? 'bg-blue-50/60 dark:bg-blue-900/20' : 'bg-gray-50 dark:bg-gray-900'">
              <MarkdownRenderer :text="message.content" />
            </div>
            <!-- Metadata badges -->
            <div v-if="message.meta && Object.keys(filteredMeta(message.meta)).length"
              class="mt-0.5 flex flex-wrap gap-1 pl-1">
              <template v-for="(val, key) in filteredMeta(message.meta)" :key="key">
                <span
                  class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[10px] leading-none flex items-center gap-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                  @click="toggleMetaDetail(message.id, key)">
                  <span class="font-medium">{{ key }}</span>
                  <span class="opacity-70 truncate max-w-[140px]">{{ formatMetaValue(val) }}</span>
                </span>
              </template>
            </div>
            <!-- Expanded meta detail -->
            <div v-for="(val, key) in filteredMeta(message.meta || {})" :key="key + '-detail'"
              v-show="isMetaDetailOpen(message.id, key)"
              class="mt-1 ml-1 border border-dashed border-gray-300 dark:border-gray-700 rounded p-1.5 dark:bg-black/40 text-[11px] max-h-48 overflow-auto leading-snug">
              <pre class="whitespace-pre-wrap break-words">{{ pretty(val) }}</pre>
            </div>
          </div>
        </template>

        <!-- Loading / streaming placeholder -->
        <div v-if="isLoading" class="animate-pulse">
          <div class="flex items-center gap-2 mb-0.5 text-[10px] uppercase tracking-wide font-medium">
            <span class="text-green-500">Artie</span>
            <span class="text-gray-400">thinking…</span>
          </div>
          <div class="rounded px-2 py-1.5 bg-gray-50 dark:bg-gray-900 text-gray-400">…</div>
        </div>
      </div>

      <!-- Input Bar (sticky) -->
      <div class="border-t border-gray-200 dark:border-gray-800 p-2 dark:bg-black/80 backdrop-blur-sm">
        <div class="flex items-end gap-2">
          <textarea ref="textarea" v-model="newMessage" @keydown.enter.exact.prevent="sendMessage"
            @keydown.enter.shift.exact="insertNewline" :disabled="isLoading"
            placeholder="Type a message (Enter to send, Shift+Enter newline)"
            class="flex-1 resize-none bg-transparent rounded border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 px-2 py-1.5 text-[13px] leading-snug max-h-40 disabled:opacity-50"
            rows="1" />
          <div class="flex flex-col gap-1 w-28">
            <button @click="sendMessage" :disabled="!newMessage.trim() || isLoading"
              class="w-full rounded bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/40 text-white text-[11px] font-medium py-2 tracking-wide uppercase disabled:cursor-not-allowed">Send</button>
            <button @click="toggleTokens"
              class="w-full rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-[10px] py-1 uppercase tracking-wide"
              type="button">Tok {{ showTokens ? 'On' : 'Off' }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch, defineComponent, h } from 'vue'

// Lightweight inline markdown renderer component (economical) - swap out for a full parser if needed
const MarkdownRenderer = defineComponent<{ text: string }>({
  name: 'MarkdownRenderer',
  props: { text: { type: String, required: true } },
  setup(props) {
    return () => {
      const html = props.text
        .replace(/`([^`]+)`/g, '<code class="px-1 bg-gray-200 dark:bg-gray-800 rounded text-[12px]">$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="underline text-blue-600 dark:text-blue-400">$1</a>')
      return h('span', { innerHTML: html })
    }
  }
})

// Types
interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  tokenCount?: number
  meta?: Record<string, any>
}

// State
const messages = ref<ChatMessage[]>([])
const newMessage = ref('')
const isLoading = ref(false)
const chatWindow = ref<HTMLElement>()
const textarea = ref<HTMLTextAreaElement>()
const showTokens = ref(false)
const metaDetailOpen = ref<Record<string, Set<string>>>({}) // messageId -> set of keys

// Stats store
const stats = ref({
  totalAssistantMessages: 0,
  lastLatencyMs: 0,
  avgLatencyMs: 0,
  totalLatencyMs: 0,
  totalTokens: 0,
  startedAt: Date.now(),
  memoryHits: 0,
  throughputPerMin: 0
})

// Format time
function formatTime(timestamp: Date) {
  return timestamp.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

// Scroll to bottom
async function scrollToBottom() {
  await nextTick()
  if (chatWindow.value) {
    chatWindow.value.scrollTop = chatWindow.value.scrollHeight
  }
}

// Auto grow textarea
watch(newMessage, () => {
  if (!textarea.value) return
  textarea.value.style.height = 'auto'
  textarea.value.style.height = Math.min(textarea.value.scrollHeight, 320) + 'px'
})

function insertNewline() {
  newMessage.value += '\n'
}

function toggleTokens() {
  showTokens.value = !showTokens.value
}

function clearChat() {
  messages.value = []
  stats.value = { totalAssistantMessages: 0, lastLatencyMs: 0, avgLatencyMs: 0, totalLatencyMs: 0, totalTokens: 0, startedAt: Date.now(), memoryHits: 0, throughputPerMin: 0 }
}

// Send message to capabilities API
async function sendMessage() {
  if (!newMessage.value.trim() || isLoading.value) return

  const userMessage = newMessage.value.trim()

  // Add user message
  messages.value.push({
    id: Date.now().toString() + '-user',
    role: 'user',
    content: userMessage,
    timestamp: new Date()
  })

  newMessage.value = ''
  isLoading.value = true
  await scrollToBottom()

  try {
    // Call capabilities API directly
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        userId: 'brain-user'
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()

    if (data.success && data.jobUrl) {
      // Poll for result
      await pollForResult(data.jobUrl)
    } else {
      throw new Error('Invalid response format')
    }
  } catch (error: any) {
    console.error('Chat error:', error)
    messages.value.push({
      id: Date.now().toString() + '-error',
      role: 'assistant',
      content: `❌ Error: ${error.message}`,
      timestamp: new Date()
    })
  } finally {
    isLoading.value = false
    await scrollToBottom()
  }
}

// Poll for job completion
async function pollForResult(jobUrl: string) {
  const maxAttempts = 30
  let attempts = 0

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(`/api${jobUrl}`)
      const data = await response.json()

      if (data.status === 'completed') {
        const tokenCount = estimateTokens(data.response)
        const meta = { ...data }
        delete meta.response
        messages.value.push({
          id: Date.now().toString() + '-assistant',
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          tokenCount,
          meta
        })
        // Update stats
        if (meta.processingTime) {
          stats.value.lastLatencyMs = meta.processingTime
          stats.value.totalLatencyMs += meta.processingTime
        }
        stats.value.totalAssistantMessages += 1
        stats.value.totalTokens += tokenCount
        if (meta.memoryCount) stats.value.memoryHits += meta.memoryCount
        stats.value.avgLatencyMs = stats.value.totalLatencyMs / Math.max(stats.value.totalAssistantMessages, 1)
        const minutes = (Date.now() - stats.value.startedAt) / 60000
        stats.value.throughputPerMin = stats.value.totalAssistantMessages / Math.max(minutes, 0.01)
        break
      } else if (data.status === 'failed') {
        throw new Error(data.error || 'Job failed')
      }

      // Wait 1 second before next poll
      await new Promise(resolve => setTimeout(resolve, 1000))
      attempts++
    } catch (error: any) {
      console.error('Polling error:', error)
      messages.value.push({
        id: Date.now().toString() + '-poll-error',
        role: 'assistant',
        content: `❌ Polling error: ${error.message}`,
        timestamp: new Date()
      })
      break
    }
  }

  if (attempts >= maxAttempts) {
    messages.value.push({
      id: Date.now().toString() + '-timeout',
      role: 'assistant',
      content: '❌ Request timed out',
      timestamp: new Date()
    })
  }
}

// Very rough token estimate (4 chars per token heuristic)
function estimateTokens(text: string) {
  if (!text) return 0
  return Math.ceil(text.length / 4)
}

// Formatting helpers
function formatMs(ms: number) { return ms < 1000 ? ms + 'ms' : (ms / 1000).toFixed(2) + 's' }
function pretty(v: any) { try { return typeof v === 'string' ? v : JSON.stringify(v, null, 2) } catch { return String(v) } }

function filteredMeta(meta: Record<string, any>) {
  const omit = new Set(['success'])
  const out: Record<string, any> = {}
  Object.keys(meta || {}).forEach(k => { if (!omit.has(k)) out[k] = meta[k] })
  return out
}

function formatMetaValue(val: any) {
  if (val == null) return 'null'
  if (typeof val === 'string') return val.length > 22 ? val.slice(0, 22) + '…' : val
  if (typeof val === 'number') return val
  if (Array.isArray(val)) return `[${val.length}]`
  if (typeof val === 'object') return '{…}'
  return String(val)
}

function toggleMetaDetail(messageId: string, key: string) {
  if (!metaDetailOpen.value[messageId]) metaDetailOpen.value[messageId] = new Set()
  const set = metaDetailOpen.value[messageId]
  if (set.has(key)) {
    set.delete(key)
  } else {
    set.add(key)
  }
  // force reactive update
  metaDetailOpen.value = { ...metaDetailOpen.value }
}

function isMetaDetailOpen(messageId: string, key: string) {
  return !!metaDetailOpen.value[messageId]?.has(key)
}
</script>