<template>
  <div
    id="brain-config"
    class="flex flex-col items-center p-4 max-w-screen-md mx-auto"
  >
    <div
      v-for="(value, index) in configData"
      :key="value.config_key"
      class="flex items-center justify-between w-full mb-4"
    >
      <span class="text-sm font-medium text-gray-700 mr-4 min-w-36">{{
        value.config_key
      }}</span>
      <input
        v-model="configData[index].config_value"
        @input="markAsUnsaved"
        class="border rounded p-1 flex-grow"
        :placeholder="value.config_key"
      />
    </div>
    <div v-if="unsavedChanges" class="text-red-500 mt-2">
      You have unsaved changes!
    </div>
    <button @click="saveConfig" class="mt-4 p-2 bg-blue-500 text-white rounded">
      {{ saving ? 'Saving...' : 'Save' }}
    </button>
  </div>
</template>

<script setup>
const configData = ref([])
const unsavedChanges = ref(false)
const saving = ref(false) // Added saving ref

// Fetch config data
const supabase = useSupabaseClient()
const { data, error } = await supabase.from('config').select('*')
if (data) configData.value = data

// Mark as unsaved when input changes
const markAsUnsaved = () => {
  unsavedChanges.value = true
}

// Save config data
const saveConfig = async () => {
  saving.value = true // Activate saving ref
  for (const value of configData.value) {
    const { error } = await supabase
      .from('config')
      .update({ config_value: value.config_value })
      .eq('config_key', value.config_key)
    if (error) {
      console.error('Error updating config:', error)
      // Optionally, handle the error (e.g., show a notification to the user)
    }
  }
  unsavedChanges.value = false
  saving.value = false // Remove saving ref after save is completed
  // Optionally, show a success message to the user
}

// Watch for changes in configData to reset unsavedChanges
watch(
  configData,
  () => {
    unsavedChanges.value = true
  },
  { deep: true }
)
</script>
