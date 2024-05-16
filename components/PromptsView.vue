<template>
  <div class="columns columns-2 gap-4">
    <div
      v-for="(value, index) in promptsData"
      :key="value.prompt_name"
      class="mb-4 max-w-prose mx-auto"
    >
      <span class="text-sm font-medium text-gray-700 mr-4">{{
        value.prompt_name
      }}</span>
      <textarea
        v-model="promptsData[index].prompt_text"
        @input="markAsUnsaved(index)"
        :class="[
          unsavedChanges[index]
            ? 'border-red-500 outline-red-500 border-4'
            : 'border',
          'rounded p-2 w-full min-h-32 text-xs'
        ]"
        :placeholder="value.prompt_name"
      ></textarea>
      <div v-if="unsavedChanges[index]" class="text-red-500 mt-2">
        You have unsaved changes!
      </div>
      <button
        @click="savePrompt(index)"
        class="mt-2 p-2 bg-green-700 text-white rounded"
      >
        {{ saving[index] ? 'Saving...' : 'Save' }}
      </button>
    </div>
  </div>
</template>
<script setup>
const promptsData = ref([])
const unsavedChanges = ref({})
const saving = ref({})

// Fetch prompts data
const supabase = useSupabaseClient()
const { data, error } = await supabase.from('prompts').select('*')
if (data) promptsData.value = data

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
    // Optionally, handle the error (e.g., show a notification to the user)
  }
  unsavedChanges.value[index] = false
  saving.value[index] = false
  // Optionally, show a success message to the user
}
</script>
