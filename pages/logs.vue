<template>
  <div>
    <div class="mb-2 border-b border-gray-300 dark:border-gray-800 pb-1">
      <span class="text-base">SYSTEM_LOGS</span>
    </div>
    
    <div class="border border-gray-300 dark:border-gray-800">
      <div class="p-2">
        <VerboseLogViewer class="prose-xl" />
      </div>
    </div>
  </div>
</template>

<script setup>
// Define the layout to use
definePageMeta({
  layout: 'main'
})
</script>

<style scoped></style>