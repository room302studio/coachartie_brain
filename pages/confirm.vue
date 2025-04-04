<script setup lang="ts">
const user = useSupabaseUser()
watch(user, () => {
  if (user.value) {
    return navigateTo('/')
  }
}, { immediate: true })

</script>
<template>
  <div class="flex items-center justify-center min-h-screen">
    <div class="p-8 border border-gray-300 dark:border-gray-800 rounded bg-white dark:bg-black">
      <p class="text-gray-900 dark:text-white font-mono">AUTHENTICATING...</p>
    </div>
  </div>
</template>