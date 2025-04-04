<template>
  <div class="font-mono">
    <!-- Header with controls -->
    <div class="flex items-center justify-between mb-1 border-b border-gray-300 dark:border-primary pb-0.5">
      <div class="flex items-center">
        <button 
          @click="loadConfig" 
          class="text-[10px] text-gray-700 dark:text-tertiary font-mono mr-1 border-r border-gray-300 dark:border-secondary px-0.5 hover:text-gray-900 dark:hover:text-secondary"
          aria-label="Refresh config"
        >
          [REFRESH]
        </button>
        <span class="text-[10px] text-gray-700 dark:text-tertiary">[CONFIG]</span>
      </div>
      <div>
        <button 
          @click="saveConfig" 
          class="text-[10px] text-gray-700 dark:text-tertiary font-mono px-0.5 hover:text-gray-900 dark:hover:text-secondary"
          :disabled="isSaving"
        >
          {{ isSaving ? 'SAVING...' : 'SAVE' }}
        </button>
      </div>
    </div>
    
    <!-- Config form -->
    <div v-if="loading" class="text-center py-4">
      <span class="text-[10px] text-gray-700 dark:text-tertiary">LOADING_CONFIG...</span>
    </div>
    
    <div v-else-if="error" class="text-center py-4">
      <span class="text-[10px] text-red-500">{{ error }}</span>
    </div>
    
    <div v-else class="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto p-0.5">
      <!-- API Keys Section -->
      <div class="border-b border-gray-300 dark:border-secondary pb-1">
        <h3 class="text-[10px] text-gray-700 dark:text-secondary font-medium mb-1">API KEYS</h3>
        
        <div class="grid grid-cols-1 gap-1">
          <div>
            <label class="text-[10px] text-gray-700 dark:text-tertiary mb-0.5 block">OPENAI_API_KEY:</label>
            <input 
              v-model="config.openai_api_key" 
              type="password"
              class="w-full text-[10px] text-gray-900 dark:text-primary bg-transparent border-b border-gray-300 dark:border-secondary p-0.5"
            />
          </div>
          
          <div>
            <label class="text-[10px] text-gray-700 dark:text-tertiary mb-0.5 block">ANTHROPIC_API_KEY:</label>
            <input 
              v-model="config.anthropic_api_key" 
              type="password"
              class="w-full text-[10px] text-gray-900 dark:text-primary bg-transparent border-b border-gray-300 dark:border-secondary p-0.5"
            />
          </div>
        </div>
      </div>
      
      <!-- Model Settings Section -->
      <div class="border-b border-gray-300 dark:border-secondary pb-1">
        <h3 class="text-[10px] text-gray-700 dark:text-secondary font-medium mb-1">MODEL SETTINGS</h3>
        
        <div class="grid grid-cols-1 gap-1">
          <div>
            <label class="text-[10px] text-gray-700 dark:text-tertiary mb-0.5 block">DEFAULT_MODEL:</label>
            <select 
              v-model="config.default_model" 
              class="w-full text-[10px] text-gray-900 dark:text-primary bg-transparent border-b border-gray-300 dark:border-secondary p-0.5"
            >
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              <option value="claude-3-opus">Claude 3 Opus</option>
              <option value="claude-3-sonnet">Claude 3 Sonnet</option>
              <option value="claude-3-haiku">Claude 3 Haiku</option>
            </select>
          </div>
          
          <div>
            <label class="text-[10px] text-gray-700 dark:text-tertiary mb-0.5 block">TEMPERATURE: {{ config.temperature }}</label>
            <input 
              v-model.number="config.temperature" 
              type="range"
              min="0"
              max="1"
              step="0.1"
              class="w-full"
            />
          </div>
        </div>
      </div>
      
      <!-- System Settings Section -->
      <div class="border-b border-gray-300 dark:border-secondary pb-1">
        <h3 class="text-[10px] text-gray-700 dark:text-secondary font-medium mb-1">SYSTEM SETTINGS</h3>
        
        <div class="grid grid-cols-1 gap-1">
          <div>
            <label class="text-[10px] text-gray-700 dark:text-tertiary mb-0.5 block">MAX_MEMORY_ITEMS:</label>
            <input 
              v-model.number="config.max_memory_items" 
              type="number"
              min="10"
              max="1000"
              class="w-full text-[10px] text-gray-900 dark:text-primary bg-transparent border-b border-gray-300 dark:border-secondary p-0.5"
            />
          </div>
          
          <div>
            <label class="text-[10px] text-gray-700 dark:text-tertiary mb-0.5 block">MEMORY_RETENTION_DAYS:</label>
            <input 
              v-model.number="config.memory_retention_days" 
              type="number"
              min="1"
              max="365"
              class="w-full text-[10px] text-gray-900 dark:text-primary bg-transparent border-b border-gray-300 dark:border-secondary p-0.5"
            />
          </div>
          
          <div class="flex items-center mt-1">
            <input 
              v-model="config.debug_mode" 
              type="checkbox"
              class="mr-1 h-2 w-2"
            />
            <label class="text-[10px] text-gray-700 dark:text-tertiary">DEBUG_MODE</label>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useSupabaseClient } from '#imports'

const supabase = useSupabaseClient()
const config = ref({
  openai_api_key: '',
  anthropic_api_key: '',
  default_model: 'gpt-4',
  temperature: 0.7,
  max_memory_items: 100,
  memory_retention_days: 30,
  debug_mode: false
})
const loading = ref(true)
const error = ref(null)
const isSaving = ref(false)

onMounted(() => {
  loadConfig()
})

async function loadConfig() {
  loading.value = true
  error.value = null
  
  try {
    const { data, error: fetchError } = await supabase
      .from('config')
      .select('config_key, config_value, notes')
    
    if (fetchError) throw fetchError
    
    if (data && data.length > 0) {
      // Process key-value pairs from the database
      const configValues = {}
      
      data.forEach(item => {
        // Handle different types of values (numbers, booleans, etc.)
        let value = item.config_value
        
        // Auto-convert known number fields
        if (['temperature', 'max_memory_items', 'memory_retention_days'].includes(item.config_key)) {
          value = parseFloat(value)
        }
        // Auto-convert known boolean fields
        else if (['debug_mode'].includes(item.config_key)) {
          value = value.toLowerCase() === 'true'
        }
        
        configValues[item.config_key] = value
      })
      
      // Merge with default config values, only update fields that exist in the database
      config.value = {
        ...config.value,
        ...configValues
      }
    }
  } catch (err) {
    error.value = `Error loading config: ${err.message}`
    console.error(err)
  } finally {
    loading.value = false
  }
}

async function saveConfig() {
  isSaving.value = true
  error.value = null
  
  try {
    // Convert config object to array of key-value records
    const configRecords = Object.entries(config.value).map(([config_key, config_value]) => ({
      config_key,
      config_value: String(config_value) // Convert all values to strings for storage
    }))
    
    // Perform individual upserts
    const promises = configRecords.map(record => 
      supabase
        .from('config')
        .upsert(record, { onConflict: 'config_key' })
    )
    
    await Promise.all(promises)
    
  } catch (err) {
    error.value = `Error saving config: ${err.message}`
    console.error(err)
  } finally {
    isSaving.value = false
  }
}
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