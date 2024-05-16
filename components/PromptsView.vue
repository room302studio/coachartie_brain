<template>
  <div class="columns columns-2 gap-4">
    <div
      v-for="value in promptsData"
      :key="value.prompt_name"
      class="mb-4 max-w-prose mx-auto"
    >
      <span class="text-sm font-medium text-gray-700 mr-4">{{
        value.prompt_name
      }}</span>
      <span>{{ value.prompt_text }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const promptsData = ref([])

// Fetch prompts data
const supabase = useSupabaseClient()
const { data, error } = await supabase.from('prompts').select('*')
if (data) promptsData.value = data
</script>
