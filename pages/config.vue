<template>
  <section class="min-h-screen hack-bg bg-gray-100 dark:bg-gray-900">
    <!-- Header -->
    <div class="bg-gradient-to-r from-gray-800 to-gray-900 dark:from-black dark:to-gray-900 text-white p-2 border-b border-gray-500 dark:border-gray-700 scanlines">
      <div class="max-w-full mx-auto flex items-center justify-between px-2">
        <div>
          <div class="flex items-center">
            <div class="mr-2 font-mono text-base text-gray-300 dark:text-gray-400 glitch-text">[>_]</div>
            <h1 class="text-xl font-mono font-bold hack-title text-white dark:text-gray-200">COACH_ARTIE::CONFIG</h1>
          </div>
        </div>
        <div class="flex items-center">
          <UButton
            color="gray" 
            variant="ghost" 
            icon="i-heroicons-arrow-left"
            @click="navigateBack"
            class="text-gray-300 dark:text-gray-400 !p-1"
            aria-label="Back to dashboard"
          />
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-full mx-auto mt-2 px-2">
      <div class="bg-gray-200 dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-none overflow-hidden">
        <div class="p-1 bg-gray-300 dark:bg-gray-800 border-b border-gray-400 dark:border-gray-700 flex items-center">
          <div class="hack-indicator mr-1 w-2 h-2" aria-hidden="true"></div>
          <UIcon name="i-heroicons-cog-6-tooth" class="w-3 h-3 mr-1 text-gray-700 dark:text-gray-300" aria-hidden="true" />
          <h2 id="config-heading" class="font-mono text-xs font-semibold text-gray-800 dark:text-gray-200">SYSTEM_CONFIG.ini</h2>
        </div>
        <div class="p-2">
          <ConfigView />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

// Navigate back to dashboard
const navigateBack = () => {
  router.push('/')
}
</script>

<style scoped>
/* Reuse styles from index.vue */
.hack-bg {
  background-image: 
    radial-gradient(rgba(0, 0, 0, 0.1) 2px, transparent 2px),
    radial-gradient(rgba(0, 0, 0, 0.1) 2px, transparent 2px);
  background-size: 20px 20px;
  background-position: 0 0, 10px 10px;
  position: relative;
}

.dark .hack-bg {
  background-image: 
    radial-gradient(rgba(255, 255, 255, 0.05) 2px, transparent 2px),
    radial-gradient(rgba(255, 255, 255, 0.05) 2px, transparent 2px);
}

.hack-bg::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: linear-gradient(rgba(0, 0, 0, 0.03) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(0, 0, 0, 0.03) 1px, transparent 1px);
  background-size: 10px 10px;
  z-index: -1;
}

.dark .hack-bg::after {
  background-image: linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
}

.scanlines {
  position: relative;
  overflow: hidden;
}

.scanlines::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  background: linear-gradient(
    to bottom,
    transparent 50%,
    rgba(0, 0, 0, 0.05) 51%
  );
  background-size: 100% 2px;
  z-index: 2;
  pointer-events: none;
}

.dark .scanlines::before {
  background: linear-gradient(
    to bottom,
    transparent 50%,
    rgba(255, 255, 255, 0.05) 51%
  );
}

.hack-indicator {
  background-color: #374151; /* gray-700 */
  border-radius: 50%;
  display: inline-block;
  animation: hack-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.dark .hack-indicator {
  background-color: #D1D5DB; /* gray-300 */
}

@keyframes hack-pulse {
  0%, 100% {
    opacity: 1;
    box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
  }
  50% {
    opacity: 0.6;
    box-shadow: 0 0 1px rgba(0, 0, 0, 0.3);
  }
}

.dark @keyframes hack-pulse {
  0%, 100% {
    opacity: 1;
    box-shadow: 0 0 2px rgba(255, 255, 255, 0.5);
  }
  50% {
    opacity: 0.6;
    box-shadow: 0 0 1px rgba(255, 255, 255, 0.3);
  }
}

.glitch-text {
  position: relative;
  animation: glitch-skew 1s infinite linear alternate-reverse;
}

.glitch-text::before,
.glitch-text::after {
  content: "[>_]";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0.8;
}

.glitch-text::before {
  color: rgba(255, 255, 255, 0.7);
  animation: glitch-anim 5s infinite linear alternate-reverse;
}

.glitch-text::after {
  color: rgba(0, 0, 0, 0.3);
  animation: glitch-anim2 1s infinite linear alternate-reverse;
}

.dark .glitch-text::before {
  color: rgba(255, 255, 255, 0.7);
}

.dark .glitch-text::after {
  color: rgba(255, 255, 255, 0.3);
}

.hack-title {
  text-shadow: 0 0 3px rgba(255, 255, 255, 0.5);
}

.dark .hack-title {
  text-shadow: 0 0 3px rgba(255, 255, 255, 0.3);
}
</style> 