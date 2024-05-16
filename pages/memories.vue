<template>
  <div>


    <div ref="viz">
      <svg :width="width" :height="height">
        <!-- <g v-for="(embedding, index) in embeddingPositions" :transform="embeddingToScreenTransform(embedding)"
          class="embedding">
          <circle r="2.5" :fill="colorScale(clusterId(index))" />

        </g> -->
      </svg>
    </div>

    <h2 class="text-2xl font-bold mb-4">Memories</h2>
    <div v-for="memory in memories" :key="memory.id" class="@md:flex mb-2">

      <div v-if="memory.related_message_id" class="bg-red-500 rounded-lg p-1 text-xs">
        {{ memory.related_message_id }}
      </div>

      <div class="metadata @md:w-1/5 flex flex-col">
        <div class="flex flex-col justify-between gap-1 p-1 w-full leading-none">
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
import * as d3 from 'd3'
import { format } from 'date-fns'

const supabase = useSupabaseClient()
const { width, height: windowHeight } = useWindowSize();
const height = computed(() => windowHeight.value * 0.5)
const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
const xScale = d3.scaleLinear().range([0, width.value]);
const yScale = d3.scaleLinear().range([0, height.value]);

const memories = ref([]) // use ref to store the memories

// config
const messagesToShow = ref(25) // use ref to store the number of messages to show


const { data, error } = await supabase
  .from('memories')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(33)

const dataRef = ref(data.map((d) => {
  return {
    id: d.id,
    value: d.value.slice(0, 1024),
    user_id: d.user_id,
    created_at: d.created_at,
    embedding: d.embedding,
  }
})
)

console.log(dataRef)

const { embeddingPositions } = useUmap(dataRef)

</script>

<style scoped></style>