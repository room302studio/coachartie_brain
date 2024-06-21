<template>
  <div class="md:columns md:columns-2 xl:columns-3 gap-4 lg:gap-8 p-2 md:p-4 lg:p-8">
    <div v-for="(value, index) in promptsData" :key="value.prompt_name" class="mb-4 max-w-prose mx-auto">
      <div class="flex flex-col">
        <div class="flex items-center justify-between mb-2">
          <UTooltip :text="value.notes">
            <UIcon name="i-heroicons-information-circle" class=" text-gray-500 dark:text-gray-300" />
          </UTooltip>

          <span class="text-sm font-medium text-gray-700 dark:text-gray-300 py-2 tracking-wider mr-4">{{
      value.prompt_name
    }}</span>

        </div>
        <textarea v-model="promptsData[index].prompt_text" @input="markAsUnsaved(index)" :class="['text-base leading-5',
      unsavedChanges[index]
        ? 'border-red-500 outline-red-500 border-4'
        : 'border',
      'rounded p-2 w-full min-h-32 text-xs'
    ]" :placeholder="value.prompt_name"></textarea>
        <div v-if="unsavedChanges[index]" class="text-red-500 mt-2">
          You have unsaved changes!
        </div>
        <button v-show="unsavedChanges[index]" @click="savePrompt(index)"
          class="mt-2 p-2 bg-green-700 text-white rounded">
          {{ saving[index] ? 'Saving...' : 'Save' }}
        </button>
      </div>
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
<style scoped>
textarea {
  field-sizing: content;
}
</style>