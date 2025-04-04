<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    
    <!-- Fixed position dark mode toggle -->
    <button 
      @click="toggleDarkMode" 
      class="fixed bottom-4 right-4 p-2 bg-gray-200 dark:bg-gray-800 rounded-full shadow-md text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
      aria-label="Toggle dark mode"
    >
      <span v-if="isDarkMode">☀️</span>
      <span v-else>🌙</span>
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const isDarkMode = ref(true);

// Toggle dark mode function
function toggleDarkMode() {
  isDarkMode.value = !isDarkMode.value;
  
  if (isDarkMode.value) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('darkMode', 'dark');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('darkMode', 'light');
  }
}

// Check system dark mode preference
function checkSystemDarkMode() {
  // First check localStorage for user preference
  const savedMode = localStorage.getItem('darkMode');
  
  if (savedMode === 'light') {
    isDarkMode.value = false;
    document.documentElement.classList.remove('dark');
  } else if (savedMode === 'dark') {
    isDarkMode.value = true;
    document.documentElement.classList.add('dark');
  } else {
    // If no saved preference, check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    isDarkMode.value = prefersDark;
    
    if (prefersDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}

onMounted(() => {
  checkSystemDarkMode();
  
  // Listen for system preference changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
    // Only update if user hasn't set a preference
    if (!localStorage.getItem('darkMode')) {
      isDarkMode.value = event.matches;
      if (event.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  });
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

body {
  background-color: #ffffff;
  color: #000000;
  font-family: 'Figtree', sans-serif;
  transition: background-color 0.3s ease, color 0.3s ease;
}
</style>
