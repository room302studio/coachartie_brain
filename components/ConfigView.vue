<template>
  <div id="brain-config">
    <div v-for="value in configData" :key="value.config_key" class="mb-4">
      <span class="text-sm font-medium text-gray-700 mr-4">{{
        value.config_key
      }}</span>
      <span>{{ value.config_value }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const configData = ref([])

// Fetch config data
const supabase = useSupabaseClient()
const { data, error } = await supabase.from('config').select('*')
if (data) configData.value = data
</script>
