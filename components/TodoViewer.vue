<template>
  <div class="text-sm p-4 rounded-lg">
    <div v-for="todo in todos" :key="todo.id" class="mb-2">
      <span class="block leading-none" v-html="todo.name" />
      <span
        class="block leading-none text-gray-500"
        v-html="todo.description"
      />
    </div>
  </div>
</template>

<script setup>
const supabase = useSupabaseClient()
const todos = ref([])

const { data: todosData, error: todosError } = await supabase
  .from('todos')
  .select('*')
  .order('created_at', { ascending: false })
// .limit(defaulttodosToShow || 25)

if (todosData) {
  todos.value = todosData
}

supabase
  .channel('messagechannel')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'todos' },
    (payload) => {
      console.log('Change received!', payload)
      // todos.value.push(payload.new)
      // need to overwrite todos so it's reactive
      todos.value = [payload.new, ...todos.value]
    }
  )
  .subscribe()
</script>

<style scoped></style>
