<template>
  <div class="h-48 flex items-center justify-center dark:bg-slate-950 bg-slate-100 rounded-md mb-2">
    <h2 class="text-base " v-html="mostRecentMessage"></h2>
  </div>
</template>

<script setup>
const supabase = useSupabaseClient()
const logs = ref([])

const defaultLogsToShow = 60

const { data: logsData, error: logsError } = await supabase
  .from('logs')
  .select('*')
  .order('timestamp', { ascending: false })
  .limit(defaultLogsToShow)

if (logsData) {
  logs.value = logsData
}

const mostRecentMessage = computed(() => logs.value[0]?.message)

// Subscribe to new messages
supabase
  .channel('messagechannel')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'logs' },
    (payload) => {
      logs.value = [payload.new, ...logs.value]
    }
  )
  .subscribe()


</script>
