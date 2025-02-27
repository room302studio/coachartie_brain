<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';

// Set dark mode by default for the hacker aesthetic
onMounted(() => {
  document.documentElement.classList.add('dark');
});
</script>

<style>
/* Dark mode tweaks */
html {
  color-scheme: dark;
}

.dark body {
  background-color: #000000;
  color: #ffffff;
}

/* use Figtree font for everything */
body {
  font-family: 'Figtree', sans-serif;
}
</style>
