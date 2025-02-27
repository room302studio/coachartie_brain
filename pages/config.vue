<template>
  <div>
    <div class="mb-2 border-b border-gray-800 pb-1">
      <span class="text-base">SYSTEM_CONFIG</span>
    </div>

    <div class="border border-gray-800">
      <div class="p-2">
        <ConfigView />
      </div>
    </div>
  </div>
</template>

<script setup>
import ConfigView from '~/components/ConfigView.vue'
</script>

<style scoped>
/* No additional styles needed as global styles are in layout */
</style>