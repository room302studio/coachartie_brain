<template>
  <div class="font-mono">
    <!-- Prompts filter and controls -->
    <div class="flex items-center justify-between mb-1">
      <div class="flex items-center space-x-1">
        <UButton size="xs" color="gray" variant="ghost" icon="i-heroicons-arrow-path" @click="refreshPrompts"
          class="text-xs font-mono !p-1" aria-label="Refresh prompts">
          <span class="font-mono text-xs">REFRESH</span>
        </UButton>
        <span class="text-xs text-gray-600 dark:text-gray-400">[{{ promptsData.length }}]</span>
      </div>
    </div>

    <!-- Prompts grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-1">
      <div v-for="(value, index) in promptsData" :key="value.prompt_name"
        class="bg-gray-200 dark:bg-black border border-gray-400 dark:border-gray-800 hover:border-gray-600 dark:hover:border-gray-500 transition-colors duration-200 prompt-item">
        <div
          class="p-1 bg-gray-300 dark:bg-gray-800 border-b border-gray-400 dark:border-gray-700 flex items-center justify-between">
          <div class="flex items-center">
            <div class="hack-indicator mr-1 w-2 h-2" aria-hidden="true"></div>
            <UTooltip :text="value.notes" v-if="value.notes">
              <UIcon name="i-heroicons-information-circle" class="text-gray-700 dark:text-gray-300 w-3 h-3 mr-1" />
            </UTooltip>
            <span class="text-[10px] font-medium text-gray-800 dark:text-gray-200 uppercase truncate max-w-[150px]">{{
              value.prompt_name }}</span>
          </div>
          <div class="flex items-center">
            <div v-if="unsavedChanges[index]" class="hack-indicator-red mr-1 w-2 h-2" aria-hidden="true"></div>
            <button v-if="unsavedChanges[index]" @click="savePrompt(index)"
              class="text-[10px] bg-gray-300 dark:bg-gray-800 px-1 border border-gray-500 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-400 dark:hover:bg-gray-700 transition-colors duration-200 font-mono">
              {{ saving[index] ? 'SAVING...' : 'SAVE' }}
            </button>
          </div>
        </div>
        <div class="p-1">
          <textarea v-model="promptsData[index].prompt_text" @input="markAsUnsaved(index)"
            class="w-full text-xs bg-gray-100 dark:bg-gray-900 border border-gray-400 dark:border-gray-700 p-1 text-gray-800 dark:text-gray-200 font-mono h-32 resize-none"
            :placeholder="value.prompt_name">
          </textarea>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="promptsData.length === 0"
      class="text-center py-4 border border-dashed border-gray-400 dark:border-gray-800 mt-2">
      <UIcon name="i-heroicons-document-text" class="w-6 h-6 mx-auto text-gray-500 mb-2" />
      <h3 class="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1 font-mono">NO_PROMPTS</h3>
      <p class="text-xs text-gray-600 dark:text-gray-400 font-mono">SYSTEM :: Add prompts in the database</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useStaggeredAnimation } from '~/composables/useStaggeredAnimation'
import { stagger } from '~/anime.esm.js'

const promptsData = ref([])
const unsavedChanges = ref({})
const saving = ref({})

// Animation setup
const { animateStaggered } = useStaggeredAnimation()

// Fetch prompts data
const supabase = useSupabaseClient()
const refreshPrompts = async () => {
  const { data, error } = await supabase.from('prompts').select('*')
  if (data) {
    promptsData.value = data
    // Re-trigger animation after a short delay to ensure DOM has updated
    setTimeout(() => {
      animateStaggered('.prompt-item', {
        delay: stagger(40),
        translateY: [10, 0]
      })
    }, 50)
  }
  if (error) console.error('Error fetching prompts:', error)
}

// Initial load
refreshPrompts()

// After data is loaded, animate the items
onMounted(() => {
  animateStaggered('.prompt-item', {
    delay: stagger(40),
    translateY: [10, 0]
  })
})

// Mark as unsaved when input changes
const markAsUnsaved = (index) => {
  unsavedChanges.value[index] = true
}

// Save prompt data
const savePrompt = async (index) => {
  saving.value[index] = true
  const value = promptsData.value[index]
  const { error } = await supabase
    .from('prompts')
    .update({ prompt_text: value.prompt_text })
    .eq('prompt_name', value.prompt_name)

  if (error) {
    console.error('Error updating prompt:', error)
  }

  unsavedChanges.value[index] = false
  saving.value[index] = false
}
</script>

<style scoped>
textarea {
  field-sizing: content;
}

.hack-indicator-red {
  background-color: #EF4444;
  /* red-500 - keeping red for error indicators */
  border-radius: 50%;
  display: inline-block;
  animation: hack-pulse-red 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes hack-pulse-red {

  0%,
  100% {
    opacity: 1;
    box-shadow: 0 0 3px rgba(239, 68, 68, 0.7);
  }

  50% {
    opacity: 0.7;
    box-shadow: 0 0 1px rgba(239, 68, 68, 0.5);
  }
}

/* Hide items initially to prevent flash before animation */
.prompt-item {
  opacity: 0;
}
</style>