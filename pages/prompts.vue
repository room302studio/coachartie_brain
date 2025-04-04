<template>
  <div>
    <div class="mb-2 border-b border-gray-300 dark:border-gray-800 pb-1">
      <span class="text-base">SYSTEM_PROMPTS</span>
    </div>

    <div class="border border-gray-300 dark:border-gray-800">
      <div class="p-2">
        <PromptsView />
      </div>
    </div>
  </div>
</template>

<script setup>
import PromptsView from '~/components/PromptsView.vue'

// Define the layout to use
definePageMeta({
  layout: 'main'
})
</script>

<style scoped>
/* No additional styles needed as global styles are in layout */
</style>