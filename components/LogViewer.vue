<template>
  <div>
    <h2 class="text-xl mb-4 line-clamp-3 p-8" v-html="mostRecentMessage">
    </h2>
    <div v-for="log in logs" :key="log.id">
      <UBadge v-if="log.level === 'ERROR'" color="red">Error</UBadge>
      <UBadge v-else-if="log.level === 'WARNING'" color="yellow">Warning</UBadge>
      <UBadge v-else color="gray">Info</UBadge>

      <UBadge color="black">{{ log.service }}</UBadge>
      <p v-html="log.message" />
    </div>
  </div>
</template>

<script setup>
const supabase = useSupabaseClient()
const logs = ref([])
// subscribe to rls changes on the logs table

const defaultLogsToShow = 25

const { data: logsData, error: logsError } = await supabase
  .from('logs')
  .select('*')
  .order('timestamp', { ascending: false })
  .limit(defaultLogsToShow || 25)

if (logsData) {
  logs.value = logsData
}


supabase
  .channel('messagechannel')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'logs' },
    (payload) => {
      console.log('Change received!', payload)
      // logs.value.push(payload.new)
      // need to overwrite logs so it's reactive
      logs.value = [payload.new, ...logs.value]
    }
  )
  .subscribe()


const mostRecentMessage = computed(() => logs.value[0]?.message)


</script>

<style scoped></style>