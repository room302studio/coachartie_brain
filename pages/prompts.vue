<template>
  <div class="font-mono text-xs max-w-screen-xl">
    <div class="mb-3 border-b border-gray-300 dark:border-gray-800 pb-1 flex items-baseline justify-between gap-4 flex-wrap">
      <span class="text-base">LIVE PROMPTS</span>
      <span class="text-gray-500">read-only · these override the copies in Artie's code</span>
    </div>

    <div v-if="error" class="mb-3">Could not load: {{ error }}</div>

    <div v-if="data" class="flex gap-6 flex-col md:flex-row">
      <!-- Prompt list -->
      <div class="md:w-80 shrink-0">
        <table class="w-full border-collapse">
          <tbody>
            <tr v-for="p in data.prompts" :key="p.id"
              class="border-b border-gray-200 dark:border-gray-900 cursor-pointer"
              :class="rowClass(p)" @click="select(p.name)">
              <td class="py-1 pr-2 break-all">
                {{ p.name }}
                <span v-if="!p.is_active" class="text-gray-500"> (inactive)</span>
              </td>
              <td class="py-1 pr-2 text-right tabular-nums">v{{ p.version }}</td>
              <td class="py-1 text-right tabular-nums whitespace-nowrap" :class="dateClass(p)">{{ day(p.updated_at) }}</td>
            </tr>
          </tbody>
        </table>
        <p class="mt-2 text-gray-500">Bold dates changed in the last {{ RECENT_DAYS }} days.</p>
      </div>

      <!-- Selected prompt -->
      <div v-if="current" class="flex-1 min-w-0">
        <div class="mb-2 grid gap-x-6 gap-y-1" style="grid-template-columns: max-content 1fr">
          <span class="text-gray-500">name</span><span class="break-all">{{ current.name }}</span>
          <span class="text-gray-500">version</span><span>v{{ current.version }}, changed {{ when(current.updated_at) }}</span>
          <span class="text-gray-500">category</span><span>{{ current.category || '·' }}</span>
          <span v-if="current.description" class="text-gray-500">about</span>
          <span v-if="current.description">{{ current.description }}</span>
          <span class="text-gray-500">size</span><span>{{ (current.content || '').length.toLocaleString() }} chars</span>
        </div>

        <div class="mb-1 text-gray-500">LIVE TEXT</div>
        <pre class="whitespace-pre-wrap break-words border-l border-gray-300 dark:border-gray-700 pl-3 mb-5 leading-relaxed">{{ current.content }}</pre>

        <div class="mb-1 text-gray-500">CHANGES, NEWEST FIRST</div>
        <p v-if="steps.length === 0" class="text-gray-500">No earlier versions saved.</p>
        <div v-for="s in steps" :key="s.key" class="mb-4">
          <div class="mb-1">
            v{{ s.from }} → v{{ s.to }}
            <span class="text-gray-500">· {{ when(s.at) }}</span>
            <span v-if="s.by" class="text-gray-500"> · by {{ s.by }}</span>
            <span v-if="s.reason" class="text-gray-500"> · {{ s.reason }}</span>
          </div>
          <p v-if="s.lines.length === 0" class="text-gray-500">(whitespace only)</p>
          <div v-for="(l, i) in s.lines" :key="i" class="flex">
            <span class="select-none w-4 shrink-0 text-gray-500">{{ lineMark(l) }}</span>
            <span class="whitespace-pre-wrap break-words min-w-0" :class="lineClass(l)">{{ l.text }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { diffLines } from 'diff'

definePageMeta({ layout: 'main' })

const RECENT_DAYS = 30
const route = useRoute()
const router = useRouter()

const data = ref(null)
const error = ref(null)
const selected = ref(null)

async function load() {
  try {
    data.value = await $fetch('/api/prompts')
    error.value = null
    // An unknown or repeated ?name= falls back to the newest prompt instead of a blank pane.
    const names = data.value.prompts.map((p) => p.name)
    let wanted = route.query.name
    if (!names.includes(wanted) && names.length > 0) {
      wanted = names[0]
    }
    selected.value = wanted || null
  } catch (err) {
    error.value = err.message
  }
}

function select(name) {
  selected.value = name
  router.replace({ query: { name } }).catch((err) => console.error('router.replace failed:', err))
}

const current = computed(() => {
  if (!data.value) {
    return null
  }
  return data.value.prompts.find((p) => p.name === selected.value) || null
})

/**
 * Versions oldest-to-newest made into diffs: the live row plus every saved history row below
 * it. One entry per version (history can hold a duplicate of a version; the newest row wins).
 */
const steps = computed(() => {
  const p = current.value
  if (!p) {
    return []
  }
  const versions = [{ version: p.version, content: p.content, at: p.updated_at, by: null, reason: null }]
  const seen = new Set([p.version])
  for (const h of p.history) {
    if (seen.has(h.version)) {
      continue
    }
    seen.add(h.version)
    versions.push({ version: h.version, content: h.content, at: h.created_at, by: h.changed_by, reason: h.change_reason })
  }
  versions.sort((a, b) => b.version - a.version)
  const out = []
  for (let i = 0; i < versions.length - 1; i++) {
    const newer = versions[i]
    const older = versions[i + 1]
    out.push({
      key: older.version + '-' + newer.version,
      from: older.version,
      to: newer.version,
      // A history row is the backup taken when its version was replaced, so its date, author
      // and reason describe this change (e.g. v3 row: "pre never-name removal", 2026-11-20).
      at: older.at,
      by: older.by,
      reason: older.reason,
      lines: changedLines(older.content, newer.content),
    })
  }
  return out
})

/** Only the added and removed lines, blank lines dropped. */
function changedLines(before, after) {
  const lines = []
  for (const part of diffLines(before || '', after || '')) {
    if (!part.added && !part.removed) {
      continue
    }
    let kind = 'removed'
    if (part.added) {
      kind = 'added'
    }
    for (const text of part.value.split('\n')) {
      if (text.trim() === '') {
        continue
      }
      lines.push({ kind, text })
    }
  }
  return lines
}

function lineMark(l) {
  if (l.kind === 'added') {
    return '+'
  }
  return '−'
}

function lineClass(l) {
  if (l.kind === 'added') {
    return 'font-bold'
  }
  return 'text-gray-500 line-through'
}

function parseUtc(ts) {
  if (!ts) {
    return null
  }
  // SQLite timestamps are UTC without a zone marker.
  let iso = ts
  if (!ts.includes('T')) {
    iso = ts.replace(' ', 'T') + 'Z'
  }
  return new Date(iso)
}

function isRecent(p) {
  const d = parseUtc(p.updated_at)
  if (!d) {
    return false
  }
  return Date.now() - d.getTime() < RECENT_DAYS * 24 * 60 * 60 * 1000
}

function rowClass(p) {
  if (p.name === selected.value) {
    return 'bg-gray-100 dark:bg-gray-900'
  }
  return 'hover:bg-gray-50 dark:hover:bg-gray-950'
}

function dateClass(p) {
  if (isRecent(p)) {
    return 'font-bold'
  }
  return 'text-gray-500'
}

function day(ts) {
  const d = parseUtc(ts)
  if (!d) {
    return '·'
  }
  return d.toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric' })
}

function when(ts) {
  const d = parseUtc(ts)
  if (!d) {
    return 'unknown'
  }
  return d.toLocaleString('en-US', {
    timeZone: 'America/New_York', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

onMounted(load)
</script>
