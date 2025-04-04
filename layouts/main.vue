<template>
  <div class="flex h-screen bg-white text-gray-900 dark:bg-black dark:text-white font-mono">
    <!-- SiteNav Component -->
    <div class="w-64 h-full border-r border-gray-300 dark:border-primary overflow-y-auto">
      <SiteNav />
    </div>
    
    <!-- Main Content -->
    <div class="flex-1 overflow-y-auto p-4">
      <slot />
    </div>
  </div>
</template>

<script setup>
import SiteNav from '~/components/SiteNav.vue'
</script> 