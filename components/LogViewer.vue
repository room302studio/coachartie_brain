<template>
  <div>
    <h2 class="text-xl mb-4 line-clamp-3 p-8" v-html="mostRecentMessage">
    </h2>

    <!-- make a multi-select to determine which services to show -->
    <USelectMenu v-model="selectedServices" :options="uniqueServices" multiple />

    <transition-group name="log-slide" tag="div" class="logs-container">
      <div v-for="log in clampedFilteredLogs" :key="`${log.service}-${log.timestamp}`"
        class="w-full overflow-hidden break-words">
        <UBadge class="inline" v-if="log.level === 'ERROR'" color="red">Error</UBadge>
        <UBadge class="inline" v-else-if="log.level === 'WARNING'" color="yellow">Warning</UBadge>
        <UBadge class="inline" v-else color="gray">Info</UBadge>

        <UBadge class="inline" color="black">{{ log.service }}</UBadge>
        <span class="inline-block leading-none text-xs" v-html="log.message" />
      </div>
    </transition-group>
  </div>
</template>

<script setup>
const supabase = useSupabaseClient()
const logs = ref([])

const logClamp = 5
const clampedLogs = computed(() => logs.value.slice(0, logClamp))

const defaultLogsToShow = 25

const { data: logsData, error: logsError } = await supabase
  .from('logs')
  .select('*')
  .order('timestamp', { ascending: false })
  .limit(defaultLogsToShow || 25)

if (logsData) {
  logs.value = logsData
}



// figure out all the unique service values from the logsData
const uniqueServices = computed(() => {
  const services = logsData.map((log) => log.service)
  return [...new Set(services)]
})

// const selectedServices = ref(uniqueServices.value)
const selectedServices = useLocalStorage('selected-services', uniqueServices.value)

// filter only to the services we have selected to show
const clampedFilteredLogs = computed(() => {
  return logs.value.filter((log) => selectedServices.value.includes(log.service)).slice(0, logClamp)
})



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

<style scoped>
/* log-slide animation */
.log-slide-move,
.log-slide-enter-active,
.log-slide-leave-active {
  transition: all 0.3s;
}

.log-slide-leave-active {
  position: absolute;
}

.log-slide-enter-from {
  opacity: 0;
  transform: translateY(-30px);
}

.log-slide-enter-to {
  opacity: 1;
  transform: translateY(0);
}

.log-slide-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.log-slide-leave-to {
  opacity: 0;
  transform: translateY(30px);
}
</style>