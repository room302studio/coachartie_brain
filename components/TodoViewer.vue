<template>
  <div class="p-2 font-mono">
    <!-- Todo controls -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center space-x-2">
        <UButton 
          size="xs" 
          color="gray" 
          variant="ghost" 
          :icon="showAddTodo ? 'i-heroicons-minus-circle' : 'i-heroicons-plus-circle'"
          @click="showAddTodo = !showAddTodo"
          class="text-xs font-mono"
        >
          <span class="font-mono">{{ showAddTodo ? 'CANCEL' : 'ADD_TASK' }}</span>
        </UButton>
        <span class="text-xs text-cyan-400">[{{ filteredTodos.length }}]</span>
      </div>
      <div>
        <USelectMenu
          v-model="todoFilter"
          :options="['All', 'Active', 'Completed']"
          size="xs"
          class="w-24 font-mono text-xs"
          placeholder="Filter"
        />
      </div>
    </div>
    
    <!-- Add todo form -->
    <div v-if="showAddTodo" class="bg-slate-700 dark:bg-slate-900 border border-slate-600 dark:border-slate-800 rounded-sm p-3 mb-3 animate-fade-in">
      <div class="space-y-2">
        <div>
          <label class="text-xs text-slate-300 mb-1 block font-mono">TASK_NAME</label>
          <UInput 
            v-model="newTodo.task" 
            placeholder="Enter task name" 
            size="sm"
            class="font-mono text-xs"
          />
        </div>
        <div>
          <label class="text-xs text-slate-300 mb-1 block font-mono">DESCRIPTION</label>
          <UTextarea 
            v-model="newTodo.description" 
            placeholder="Enter description" 
            rows="2"
            class="font-mono text-xs"
          />
        </div>
        <div class="flex justify-end space-x-2">
          <UButton 
            size="xs" 
            color="gray" 
            variant="ghost" 
            @click="showAddTodo = false"
            class="text-xs font-mono"
          >
            CANCEL
          </UButton>
          <UButton 
            size="xs" 
            color="teal" 
            variant="solid" 
            icon="i-heroicons-plus"
            @click="addTodo"
            class="text-xs font-mono"
          >
            ADD_TASK
          </UButton>
        </div>
      </div>
    </div>
    
    <!-- Todos list -->
    <div class="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto scroller pr-1">
      <TransitionGroup name="fade">
        <div 
          v-for="todo in filteredTodos" 
          :key="todo.id" 
          class="bg-slate-700 dark:bg-slate-900 border border-slate-600 dark:border-slate-800 rounded-sm overflow-hidden hover:border-cyan-900 dark:hover:border-cyan-800 transition-colors duration-200"
          :class="{'border-l-4 border-l-teal-500': !todo.completed, 'border-l-4 border-l-gray-500': todo.completed}"
        >
          <div class="p-2">
            <div class="flex items-start">
              <div class="pt-0.5">
                <UCheckbox 
                  v-model="todo.completed"
                  @change="toggleTodo(todo)"
                  size="sm"
                />
              </div>
              <div class="ml-2 flex-1">
                <div class="flex justify-between">
                  <p class="text-xs font-medium" :class="{'line-through text-slate-400': todo.completed, 'text-teal-400': !todo.completed}">
                    {{ todo.task }}
                  </p>
                  <UButton
                    size="2xs"
                    color="red"
                    variant="ghost"
                    icon="i-heroicons-trash"
                    @click="deleteTodo(todo.id)"
                    class="text-xs font-mono -mr-1 -mt-1"
                  />
                </div>
                <p v-if="todo.description" class="text-xs text-slate-300 mt-1 bg-slate-800 dark:bg-black border border-slate-700 dark:border-slate-900 rounded-sm p-1.5 break-words">
                  <span class="text-green-400 font-mono">{{ todo.description }}</span>
                </p>
                <div class="flex justify-between items-center mt-2 text-xs text-slate-400">
                  <div class="flex items-center space-x-2">
                    <span class="flex items-center">
                      <UIcon name="i-heroicons-clock" class="w-3 h-3 mr-1" />
                      {{ formatTimeAgo(todo.created_at) }}
                    </span>
                    <span v-if="todo.due_date" class="flex items-center">
                      <UIcon name="i-heroicons-calendar" class="w-3 h-3 mr-1" />
                      due {{ formatDate(todo.due_date) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </TransitionGroup>
      
      <!-- Empty state -->
      <div v-if="filteredTodos.length === 0" class="text-center py-8 border border-dashed border-slate-700 dark:border-slate-800">
        <UIcon name="i-heroicons-check-circle" class="w-10 h-10 mx-auto text-slate-500 mb-3" />
        <h3 class="text-base font-medium text-slate-300 mb-1 font-mono">NO_TASKS</h3>
        <p class="text-xs text-slate-400 font-mono">SYSTEM :: Add tasks or adjust filters</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { format, formatDistance } from 'date-fns'

const supabase = useSupabaseClient()
const todos = ref([])
const showAddTodo = ref(false)
const todoFilter = ref('All')
const newTodo = ref({
  task: '',
  description: '',
  completed: false
})

// Fetch todos data
async function fetchTodos() {
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .order('created_at', { ascending: false })

  if (data) todos.value = data
}

// Initial fetch
fetchTodos()

// Add new todo
async function addTodo() {
  if (!newTodo.value.task.trim()) return
  
  const todo = {
    task: newTodo.value.task,
    description: newTodo.value.description,
    completed: false,
    created_at: new Date().toISOString()
  }
  
  const { data, error } = await supabase
    .from('todos')
    .insert([todo])
  
  if (!error) {
    newTodo.value.task = ''
    newTodo.value.description = ''
    showAddTodo.value = false
  }
}

// Toggle todo completion
async function toggleTodo(todo) {
  const { data, error } = await supabase
    .from('todos')
    .update({ completed: todo.completed })
    .eq('id', todo.id)
}

// Delete todo
async function deleteTodo(id) {
  const { data, error } = await supabase
    .from('todos')
    .delete()
    .eq('id', id)
}

// Format date
function formatDate(timestamp) {
  return format(new Date(timestamp), 'MM-dd-yy')
}

// Format time ago
function formatTimeAgo(timestamp) {
  return formatDistance(new Date(timestamp), new Date(), { addSuffix: true })
}

// Filtered todos based on selected filter
const filteredTodos = computed(() => {
  if (todoFilter.value === 'All') return todos.value
  if (todoFilter.value === 'Active') return todos.value.filter(todo => !todo.completed)
  if (todoFilter.value === 'Completed') return todos.value.filter(todo => todo.completed)
  return todos.value
})

// Subscribe to changes in todos
supabase
  .channel('todochannel')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'todos' },
    (payload) => {
      fetchTodos()
    }
  )
  .subscribe()
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* Custom scrollbar for hackerpunk feel */
.scroller::-webkit-scrollbar {
  width: 6px;
}

.scroller::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.1);
  border-radius: 3px;
}

.scroller::-webkit-scrollbar-thumb {
  background: rgba(20, 184, 166, 0.5);
  border-radius: 3px;
}

.scroller::-webkit-scrollbar-thumb:hover {
  background: rgba(20, 184, 166, 0.8);
}
</style>
