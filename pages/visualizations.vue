<template>
  <div class="p-4 font-mono">
    <h1 class="text-xl text-gray-900 dark:text-primary mb-4">DATA VISUALIZATIONS</h1>
    
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- Network Graph -->
      <div class="col-span-1 lg:col-span-2 border border-gray-300 dark:border-gray-800 p-2">
        <NetworkGraph />
      </div>
      
      <!-- General Visualizations -->
      <div class="border border-gray-300 dark:border-gray-800 p-2">
        <DataVisualizations />
      </div>
      
      <!-- Memory Stats -->
      <div class="border border-gray-300 dark:border-gray-800 p-2">
        <MemoryStats />
      </div>
    </div>
  </div>
</template>

<script setup>
// Import components
import NetworkGraph from '~/components/NetworkGraph.vue'
import DataVisualizations from '~/components/DataVisualizations.vue'
import MemoryStats from '~/components/MemoryStats.vue'

// Define the layout to use
definePageMeta({
  layout: 'main'
})
</script>

<style scoped>
/* Any page-specific styles */
</style> 