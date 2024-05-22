<template>
  <div class="@container">
    <h2 class="text-2xl font-bold mb-4 px-4">Logs</h2>
    <!-- make a multi-select to determine which services to show -->
    <div class="mt-1 px-4">
      <span class="text-sm font-medium">Show logs for:</span>
      <USelectMenu v-model="selectedServices" :options="uniqueServices" multiple />
    </div>

    <div class="logs-grid @md:grid @md:grid-cols-2 gap-4 p-4" v-if="filteredLogsByService.length > 0">
      <div v-for="serviceLogs in filteredLogsByService" :key="serviceLogs.service">
        <h3 class="text-lg font-medium">{{ serviceLogs.service }}</h3>
        <div
          class="logs-box max-h-36 @md:max-h-48 @lg:max-h-72 rounded border border-slate-500 overflow-y-auto leading-none py-1 px-2">
          <div v-for="log in serviceLogs.logs" :key="log.id"
            class="w-full overflow-hidden break-words my-0 py-0 mb-0.5">
            <span class="inline-block leading-none text-xs" v-html="log.message" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const supabase = useSupabaseClient()
const logs = ref([])

const logClamp = ref(12)
const defaultLogsToShow = 60

const { data: logsData, error: logsError } = await supabase
  .from('logs')
  .select('*')
  .order('timestamp', { ascending: false })
  .limit(defaultLogsToShow)

if (logsData) {
  logs.value = logsData
}

// Create a data structure to store logs for each service
const serviceLogs = computed(() => {
  const logsByService = {}
  for (const log of logs.value) {
    if (!logsByService[log.service]) {
      logsByService[log.service] = []
    }
    logsByService[log.service].push(log)
  }
  return logsByService
})

// Get the unique services from the logsData
const uniqueServices = computed(() => Object.keys(serviceLogs.value))

const selectedServices = useLocalStorage(
  'selected-services',
  uniqueServices.value
)

// Filter logs based on selected services and clamp the results
const filteredLogsByService = ref([])

watch(
  [serviceLogs, selectedServices, logClamp],
  () => {
    const filtered = []
    for (const service of selectedServices.value) {
      if (serviceLogs.value[service]) {
        const logsForService = serviceLogs.value[service]
        const lastLogs = logsForService.slice(-logClamp.value)
        filtered.push({
          service,
          logs: lastLogs
        })
      }
    }
    filteredLogsByService.value = filtered
  },
  { immediate: true }
)

supabase
  .channel('messagechannel')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'logs' },
    (payload) => {
      // console.log('Change received!', payload)
      logs.value = [payload.new, ...logs.value]
    }
  )
  .subscribe()

const mostRecentMessage = computed(() => logs.value[0]?.message)
</script>
