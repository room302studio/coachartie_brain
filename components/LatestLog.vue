<template>
  <div>
    <h2
      class="text-xl mb-4 line-clamp-3 font-mono"
      v-html="mostRecentMessage"
    ></h2>
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
</script>
