<template>
  <div class="@container p-2">
    <h2 class=" text-2xl font-bold mb-2 p-2">Memories</h2>
    <div class="grid grid-cols-1 @md:grid-cols-2 @xl:grid-cols-3 gap-1">
      <div v-for="memory in memories" :key="memory.id" class="text-justify  leading-none rounded-lg p-1">

        <!-- <div v-if="memory.related_message_id" class="bg-red-500 rounded-lg p-1 text-xs">
          {{ memory.related_message_id }}
        </div> -->

        <div class="metadata flex justify-between items-center">
          <div class="flex items-center">
            <UIcon name="i-heroicons-user" class="w-3 h-3" />
            <span class="ml-2 text-sm">{{ memory.user_id }}</span>
          </div>
          <div>
            <span class="text-sm font-medium text-gray-700">
              <UIcon name="i-heroicons-calendar" class="w-3 h-3 mr-0.5" />
              <span class="font-light bg-gray-900 rounded px-1">{{
        format(new Date(memory.created_at), 'M/d')
      }}</span>
              {{ format(new Date(memory.created_at), ' hh:mm:ss') }}
            </span>
          </div>

          <!-- memory length -->
          <div class="flex items-center">
            <UIcon
              name="i-streamline-interface-text-formatting-paragraph-article-alignment-formatting-normal-paragraph-text"
              class="w-3 h-3" />
            <span class="ml-2 text-sm">{{ memory.value.split(' ').length }}</span>
          </div>
        </div>

        <div class="text-xs leading-normal p-1 max-h-64 overflow-y-auto">
          {{ memory.value }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { format } from 'date-fns'
import { animate } from '../anime.esm'

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
