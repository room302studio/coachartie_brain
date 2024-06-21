<template>
  <div>
    <UHorizontalNavigation :links="views" />
  </div>
</template>
<script setup>
const emit = defineEmits(['updateView'])
const views = [
  {
    label: 'Coach Artie',
    key: 'coach-artie',
  },
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
  },
  {
    label: 'Capabilities',
    key: 'capabilities',
    icon: 'i-fluent-cube-32-filled',
    click: () => emit('updateView', 'capabilities')
  },
  {
    label: 'Logs',
    key: 'logs',
    icon: 'i-material-symbols-document-scanner-outline-rounded',
    click: () => emit('updateView', 'logs')
  },
]
</script>
