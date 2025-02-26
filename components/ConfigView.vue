<template>
  <div id="brain-config" class="flex flex-col w-full font-mono">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-1">
      <div v-for="(value, index) in configData" :key="value.config_key"
        class="flex items-center w-full mb-1 bg-gray-200 dark:bg-black border border-gray-400 dark:border-gray-800 p-1 hover:border-gray-600 dark:hover:border-gray-500 transition-colors duration-200">
        <div class="flex items-center">
          <UTooltip :text="value.notes" v-if="value.notes">
            <UIcon name="i-heroicons-information-circle" class="text-gray-700 dark:text-gray-300 w-3 h-3 mr-1" />
          </UTooltip>
          <span class="text-[10px] font-medium text-gray-800 dark:text-gray-200 uppercase">{{ value.config_key }}</span>
        </div>
        <div class="flex-grow mx-1">
          <select v-if="isDropdownField(value.config_key)" 
            v-model="configData[index].config_value" 
            @input="markAsUnsaved" 
            class="w-full text-xs bg-gray-100 dark:bg-gray-900 border border-gray-400 dark:border-gray-700 p-0.5 text-gray-800 dark:text-gray-200 font-mono">
            <option v-for="option in getOptionsForField(value.config_key)" :key="option" :value="option">{{ option }}</option>
          </select>
          <input v-else 
            v-model="configData[index].config_value" 
            @input="markAsUnsaved" 
            class="w-full text-xs bg-gray-100 dark:bg-gray-900 border border-gray-400 dark:border-gray-700 p-0.5 text-gray-800 dark:text-gray-200 font-mono"
            :placeholder="value.config_key" />
        </div>
      </div>
    </div>
    
    <div class="flex items-center mt-2">
      <div v-if="unsavedChanges" class="text-xs text-gray-800 dark:text-gray-200 flex items-center mr-2">
        <div class="hack-indicator-red mr-1 w-2 h-2" aria-hidden="true"></div>
        <span>UNSAVED_CHANGES</span>
      </div>
      <button @click="saveConfig" 
        class="ml-auto text-xs bg-gray-300 dark:bg-gray-800 p-1 border border-gray-500 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-400 dark:hover:bg-gray-700 transition-colors duration-200 font-mono">
        {{ saving ? 'SAVING...' : 'SAVE_CONFIG' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const configData = ref([])
const unsavedChanges = ref(false)
const saving = ref(false)

// Fetch config data
const supabase = useSupabaseClient()
const { data, error } = await supabase.from('config').select('*')
if (data) configData.value = data

// Mark as unsaved when input changes
const markAsUnsaved = () => {
  unsavedChanges.value = true
}

// Field type helpers
const isDropdownField = (key) => {
  return key === 'chat_provider' || key === 'chat_model'
}

const getOptionsForField = (key) => {
  if (key === 'chat_provider') {
    return ["openai", "anthropic", "localhost"]
  } else if (key === 'chat_model') {
    const provider = configData.value.find(item => item.config_key === 'chat_provider')?.config_value || 'openai'
    return chatProviderModelOptions[provider] || []
  }
  return []
}

const chatProviderModelOptions = {
  openai: [
    "gpt-4o",
    "gpt-3.5-turbo",
  ],
  anthropic: [
    'claude-3-5-sonnet-20240620',
    'claude-3-sonnet-20240229',
    'claude-3-opus-20240229',
    'claude-3-haiku-20240307',
  ],
  localhost: ['lmstudio-community/Meta-Llama-3-8B-Instruct-GGUF']
}

// Save config data
const saveConfig = async () => {
  saving.value = true
  for (const value of configData.value) {
    const { error } = await supabase
      .from('config')
      .update({ config_value: value.config_value })
      .eq('config_key', value.config_key)
    if (error) {
      console.error('Error updating config:', error)
    }
  }
  unsavedChanges.value = false
  saving.value = false
}

// Watch for changes in configData to reset unsavedChanges
watch(
  configData,
  () => {
    unsavedChanges.value = true
  },
  { deep: true }
)

// Watch for provider changes to update model options
watch(
  () => configData.value.find(item => item.config_key === 'chat_provider')?.config_value,
  (newProvider, oldProvider) => {
    if (newProvider !== oldProvider) {
      const modelItem = configData.value.find(item => item.config_key === 'chat_model')
      if (modelItem) {
        // Set to first model in the new provider's options
        const options = chatProviderModelOptions[newProvider] || []
        modelItem.config_value = options.length > 0 ? options[0] : ''
      }
    }
  }
)
</script>

<style scoped>
.hack-indicator-red {
  background-color: #EF4444; /* red-500 */
  border-radius: 50%;
  display: inline-block;
  animation: hack-pulse-red 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes hack-pulse-red {
  0%, 100% {
    opacity: 1;
    box-shadow: 0 0 3px rgba(239, 68, 68, 0.7);
  }
  50% {
    opacity: 0.7;
    box-shadow: 0 0 1px rgba(239, 68, 68, 0.5);
  }
}

select, input {
  height: 22px;
}

select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20' stroke-width='1.5' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='m19.5 8.25-7.5 7.5-7.5-7.5' /%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 5px center;
  background-size: 12px;
  padding-right: 20px;
}
</style>