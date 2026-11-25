<template>
  <div class="font-mono text-xs max-w-screen-lg">
    <div class="mb-3 border-b border-gray-300 dark:border-gray-800 pb-1 flex items-baseline justify-between gap-4 flex-wrap">
      <span class="text-base">SPEND BY GUILD</span>
      <span class="flex gap-3">
        <button v-for="r in ranges" :key="r" class="uppercase" :class="rangeClass(r)" @click="setRange(r)">{{ r }}</button>
      </span>
    </div>

    <div v-if="error" class="mb-3">Could not load: {{ error }}</div>

    <template v-if="data">
      <div class="mb-3 grid gap-x-8 gap-y-1" style="grid-template-columns: max-content max-content">
        <span class="text-gray-500">OpenRouter balance</span>
        <span>{{ balanceText }}</span>
        <span class="text-gray-500">Spent in range</span>
        <span>{{ money(data.totals.cost) }} credits ({{ money(data.totals.cost) }} USD)</span>
        <span class="text-gray-500">Calls in range</span>
        <span>{{ int(data.totals.ok) }} ok of {{ int(data.totals.attempts) }} attempts</span>
      </div>

      <div v-if="data.credit_streak.count > 0" class="mb-3 border-l-2 border-current pl-2 font-bold">
        OUT OF CREDITS: {{ int(data.credit_streak.count) }} calls refused by OpenRouter (402) since
        {{ when(data.credit_streak.since) }}. Last successful call {{ when(data.credit_streak.last_ok) }}.
      </div>

      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="text-gray-500 text-left border-b border-gray-300 dark:border-gray-800">
              <th class="py-1 pr-3 font-normal">GUILD</th>
              <th class="py-1 pr-3 font-normal text-right">CREDITS / $</th>
              <th class="py-1 pr-3 font-normal text-right">SHARE</th>
              <th class="py-1 pr-3 font-normal text-right">OK / CALLS</th>
              <th class="py-1 pr-3 font-normal text-right">402s</th>
              <th class="py-1 pr-3 font-normal text-right">INPUT TOK</th>
              <th class="py-1 pr-3 font-normal text-right">CACHED</th>
              <th class="py-1 pr-3 font-normal text-right">OUTPUT TOK</th>
              <th class="py-1 font-normal text-right">LAST OK</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in data.rows" :key="row.guild_id || 'none'" class="border-b border-gray-200 dark:border-gray-900">
              <td class="py-1 pr-3">
                {{ row.name }}
                <span v-if="row.kind === 'left'" class="text-gray-500"> (no longer a member)</span>
              </td>
              <td class="py-1 pr-3 text-right tabular-nums">{{ money(row.cost) }}</td>
              <td class="py-1 pr-3 text-right tabular-nums text-gray-500">{{ share(row.cost) }}</td>
              <td class="py-1 pr-3 text-right tabular-nums">{{ int(row.ok) }} / {{ int(row.attempts) }}</td>
              <td class="py-1 pr-3 text-right tabular-nums">{{ dashIfZero(row.credit_failures) }}</td>
              <td class="py-1 pr-3 text-right tabular-nums">{{ int(row.prompt_tokens) }}</td>
              <td class="py-1 pr-3 text-right tabular-nums text-gray-500">{{ int(row.cached_tokens) }}</td>
              <td class="py-1 pr-3 text-right tabular-nums">{{ int(row.completion_tokens) }}</td>
              <td class="py-1 text-right text-gray-500">{{ when(row.last_ok) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="mt-3 text-gray-500 max-w-prose">
        Dollars are what OpenRouter billed per call (its reported usage cost), falling back to Artie's
        price table when a response carries no cost. 1 OpenRouter credit = $1. Calls were not tagged with a
        guild before {{ data.guild_tagging_began }}, so older spend all sits in the no-guild row. Guild list
        from {{ data.guild_source }}. Updated {{ when(data.generated_at) }}.
      </p>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

definePageMeta({ layout: 'main' })

const ranges = ['1d', '7d', '30d', 'all']
const range = ref('30d')
const data = ref(null)
const error = ref(null)

// Only the newest request may write, so a slow response for an old range can't land late.
let requestSeq = 0

async function load() {
  requestSeq += 1
  const mine = requestSeq
  try {
    const result = await $fetch('/api/spend', { query: { range: range.value } })
    if (mine !== requestSeq) {
      return
    }
    data.value = result
    error.value = null
  } catch (err) {
    if (mine !== requestSeq) {
      return
    }
    error.value = err.message
  }
}

function setRange(r) {
  range.value = r
  void load()
}

function rangeClass(r) {
  if (r === range.value) {
    return 'underline'
  }
  return 'text-gray-500 hover:underline'
}

function money(n) {
  const v = Number(n || 0)
  if (v > 0 && v < 0.01) {
    return '$' + v.toFixed(4)
  }
  return '$' + v.toFixed(2)
}

function int(n) {
  return Number(n || 0).toLocaleString()
}

function dashIfZero(n) {
  if (!n) {
    return '·'
  }
  return int(n)
}

function share(cost) {
  const total = data.value.totals.cost
  if (!total) {
    return '·'
  }
  return Math.round((100 * Number(cost || 0)) / total) + '%'
}

function when(ts) {
  if (!ts) {
    return 'never'
  }
  // SQLite timestamps are UTC without a zone marker.
  let iso = ts
  if (!ts.includes('T')) {
    iso = ts.replace(' ', 'T') + 'Z'
  }
  return new Date(iso).toLocaleString('en-US', {
    timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

const balanceText = computed(() => {
  const b = data.value.balance
  if (b.error) {
    return 'unavailable (' + b.error + ')'
  }
  return money(b.remaining) + ' left of ' + money(b.total_credits) + ' purchased'
})

let timer = null
onMounted(() => {
  void load()
  timer = setInterval(() => { void load() }, 60000)
})
onBeforeUnmount(() => clearInterval(timer))
</script>
