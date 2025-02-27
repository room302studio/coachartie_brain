<template>
  <div class="min-h-screen font-mono">
    <!-- Shared Navigation -->
    <div class="w-full font-mono border-b border-gray-800 bg-gray-100 dark:bg-gray-900">
      <div class="max-w-screen-xl mx-auto">
        <div class="flex justify-between items-center py-2 px-4">
          <div class="flex items-center">
            <span class="text-base mr-3 font-bold">COACH_ARTIE_v0.1</span>
            <span class="text-xs">{{ currentTimestamp }}</span>
          </div>

          <div class="flex items-center overflow-x-auto whitespace-nowrap py-1 scrollbar-hide">
            <NuxtLink to="/" class="text-xs border border-gray-800 px-2 py-1 mx-1 transition-colors"
              :class="route.path === '/' ? 'border-b-2 bg-gray-200 dark:bg-gray-800' : 'hover:bg-gray-200 dark:hover:bg-gray-800'">
              DASHBOARD
            </NuxtLink>
            <NuxtLink to="/memories" class="text-xs border border-gray-800 px-2 py-1 mx-1 transition-colors"
              :class="route.path.startsWith('/memories') ? 'border-b-2 bg-gray-200 dark:bg-gray-800' : 'hover:bg-gray-200 dark:hover:bg-gray-800'">
              MEMORIES
            </NuxtLink>
            <NuxtLink to="/prompts" class="text-xs border border-gray-800 px-2 py-1 mx-1 transition-colors"
              :class="route.path.startsWith('/prompts') ? 'border-b-2 bg-gray-200 dark:bg-gray-800' : 'hover:bg-gray-200 dark:hover:bg-gray-800'">
              PROMPTS
            </NuxtLink>
            <NuxtLink to="/queue" class="text-xs border border-gray-800 px-2 py-1 mx-1 transition-colors"
              :class="route.path.startsWith('/queue') ? 'border-b-2 bg-gray-200 dark:bg-gray-800' : 'hover:bg-gray-200 dark:hover:bg-gray-800'">
              QUEUE
            </NuxtLink>
            <NuxtLink to="/config" class="text-xs border border-gray-800 px-2 py-1 mx-1 transition-colors"
              :class="route.path.startsWith('/config') ? 'border-b-2 bg-gray-200 dark:bg-gray-800' : 'hover:bg-gray-200 dark:hover:bg-gray-800'">
              CONFIG
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <!-- Page Content -->
    <div class="p-2">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
const route = useRoute();

// Current timestamp
const currentTimestamp = ref('00:00:00');

// Update timestamp
function updateTime() {
  const now = new Date();
  currentTimestamp.value = now.toTimeString().slice(0, 8);
}

onMounted(() => {
  updateTime();
  setInterval(updateTime, 1000);
});
</script>

<style>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>