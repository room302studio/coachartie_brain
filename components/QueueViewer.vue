<template>
  <div class="p-4 rounded-lg max-w-screen-lg ">
    <h1 class="text-2xl font-bold mb-4">Queue Viewer</h1>
    <div v-for="item in queueItems" :key="item.id" class="mb-4 p-4 rounded-lg shadow" :class="getItemClasses(item)">
      <div class="flex justify-between items-start">
        <div>
          <span class="block text-lg font-semibold">{{ item.task_type }}</span>
          <span class="block text-sm text-gray-500">ID: {{ item.id }}</span>
        </div>
        <span class="px-2 py-1 text-sm rounded-full bg-blue-500 text-white">
          {{ item.status }}
        </span>
      </div>
      <div class="mt-2 text-sm">
        <p><strong>Priority:</strong> {{ item.priority }}</p>
        <p><strong>Created:</strong> {{ formatDate(item.created_at) }}</p>
        <p v-if="item.started_at"><strong>Started:</strong> {{ formatDate(item.started_at) }}</p>
        <p v-if="item.completed_at"><strong>Completed:</strong> {{ formatDate(item.completed_at) }}</p>
      </div>
      <div class="mt-2">
        <strong class="text-sm">Payload:</strong>
        <pre
          class="text-xs bg-gray-200 p-2 rounded mt-1 overflow-x-auto">{{ JSON.stringify(item.payload, null, 2) }}</pre>
      </div>
      <div v-if="item.metadata" class="mt-2">
        <strong class="text-sm">Metadata:</strong>
        <pre
          class="text-xs bg-gray-200 p-2 rounded mt-1 overflow-x-auto">{{ JSON.stringify(item.metadata, null, 2) }}</pre>
      </div>

      <div v-if="item.respondTo" class="mt-2">
        <strong class="text-sm">respondTo:</strong>
        <pre
          class="text-xs bg-gray-200 p-2 rounded mt-1 overflow-x-auto">{{ JSON.stringify(item.respondTo, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup>
// const supabase = useSupabaseClient()
const queueItems = ref([])

const { data: queueData, error: queueError } = await supabase
  .from('queue')
  .select('*')
  .order('created_at', { ascending: false })
  .order('status', { ascending: true })
  .order('priority', { ascending: false })

if (queueData) {
  queueItems.value = queueData
}

supabase
  .channel('queuechannel')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'queue' },
    (payload) => {
      console.log('Change received!', payload)
      // Fetch the entire queue again to ensure correct ordering
      refreshQueue()
    }
  )
  .subscribe()

const refreshQueue = async () => {
  const { data, error } = await supabase
    .from('queue')
    .select('*')
    .order('created_at', { ascending: false })
    .order('status', { ascending: true })
    .order('priority', { ascending: false })
  if (data) {
    queueItems.value = data
  } else if (error) {
    console.error('Error refreshing queue:', error)
  }
}

const getItemClasses = (item) => {
  let classes = ''
  if (item.status === 'in_progress') {
    classes += 'border-2 border-red-500 '
  }
  switch (item.status) {
    case 'in_progress':
      classes += 'bg-red-100'
      break
    case 'completed':
      classes += 'bg-green-100'
      break
    case 'failed':
      classes += 'bg-yellow-100'
      break
    default:
      classes += 'bg-gray-100'
  }
  return classes
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString()
}
</script>

<style scoped>
/* Add any scoped styles here if needed */
</style>