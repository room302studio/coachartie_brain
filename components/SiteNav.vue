<template>
  <div>
    <UHorizontalNavigation :links="views" />
  </div>
</template>
<script setup>
const emit = defineEmits(['updateView'])
const views = [
  {
    label: 'Memories',
    key: 'memories',
    icon: 'i-heroicons-user',
    click: () => emit('updateView', 'memories')
  },
  {
    label: 'Config',
    key: 'config',
    icon: 'i-heroicons-cog-6-tooth-solid',
    click: () => emit('updateView', 'config')
  },
  {
    label: 'Prompts',
    key: 'prompts',
    icon: 'i-heroicons-chat-bubble-bottom-center-20-solid',
    click: () => emit('updateView', 'prompts')
  }
]
</script>
