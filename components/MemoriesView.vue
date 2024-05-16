<template>
  <div>
    <h2 class="text-2xl font-bold mb-4">Memories</h2>
    <div v-for="memory in memories" :key="memory.id" class="@md:flex mb-2">
      <div
        v-if="memory.related_message_id"
        class="bg-red-500 rounded-lg p-1 text-xs"
      >
        {{ memory.related_message_id }}
      </div>
      <div class="metadata @md:w-1/5 flex flex-col">
        <div
          class="flex flex-col justify-between gap-1 p-1 w-full leading-none"
        >
          <div class="w-full flex items-center">
            <UIcon name="i-heroicons-user" class="w-3 h-3" />
            <span class="ml-2 text-sm">{{ memory.user_id }}</span>
          </div>
          <div class="w-full">
            <span class="text-sm font-medium text-gray-700">
              <span class="font-light bg-gray-900 rounded px-1">{{
                format(new Date(memory.created_at), 'M/d')
              }}</span>
              {{ format(new Date(memory.created_at), ' hh:mm:ss') }}
            </span>
          </div>
        </div>
      </div>
      <pre class="@md:w-4/5 text-xs leading-normal p-1">{{ memory.value }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { format } from 'date-fns'

const memories = ref([])

const supabase = useSupabaseClient()
const { data, error } = await supabase
  .from('memories')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(10)

if (data) memories.value = data

supabase
  .channel('memorychannel')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'memories' },
    (payload) => {
      const newMemories = [payload.new, ...memories.value]
      memories.value = newMemories
    }
  )
  .subscribe()
</script>
