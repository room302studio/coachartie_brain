<template>
  <div class="font-mono">
    <!-- Header with controls -->
    <div class="flex items-center justify-between mb-1 border-b border-primary pb-0.5">
      <div class="flex items-center">
        <button 
          @click="refreshTodos" 
          class="text-[10px] text-tertiary font-mono mr-1 border-r border-secondary px-0.5 hover:text-secondary"
          aria-label="Refresh todos"
        >
          [REFRESH]
        </button>
        <button 
          @click="showAddForm = !showAddForm" 
          class="text-[10px] text-tertiary font-mono mr-1 border-r border-secondary px-0.5 hover:text-secondary"
        >
          [{{ showAddForm ? 'HIDE_ADD' : 'ADD' }}]
        </button>
        <button 
          @click="showFilters = !showFilters" 
          class="text-[10px] text-tertiary font-mono mr-1 border-r border-secondary px-0.5 hover:text-secondary"
        >
          [{{ showFilters ? 'HIDE_FILTER' : 'FILTER' }}]
        </button>
        <span class="text-[10px] text-tertiary">[{{ filteredTodos.length }}]</span>
      </div>
    </div>
    
    <!-- Add Todo Form -->
    <div v-if="showAddForm" class="border-b border-primary p-1 mb-1">
      <div class="grid grid-cols-1 gap-1">
        <div>
          <label class="text-[10px] text-tertiary mb-0.5 block">TITLE:</label>
          <input 
            v-model="newTodo.title" 
            placeholder="Todo title" 
            class="w-full text-[10px] text-secondary bg-transparent border-b border-secondary p-0.5"
          />
        </div>
        <div>
          <label class="text-[10px] text-tertiary mb-0.5 block">DESCRIPTION:</label>
          <textarea 
            v-model="newTodo.description" 
            placeholder="Todo description" 
            class="w-full text-[10px] text-secondary bg-transparent border-b border-secondary p-0.5 min-h-[40px] resize-y"
          ></textarea>
        </div>
        <div class="grid grid-cols-2 gap-1">
          <div>
            <label class="text-[10px] text-tertiary mb-0.5 block">PRIORITY:</label>
            <select 
              v-model="newTodo.priority" 
              class="w-full text-[10px] text-secondary bg-transparent border-b border-secondary p-0.5"
            >
              <option value="low">LOW</option>
              <option value="medium">MEDIUM</option>
              <option value="high">HIGH</option>
            </select>
          </div>
          <div>
            <label class="text-[10px] text-tertiary mb-0.5 block">STATUS:</label>
            <select 
              v-model="newTodo.status" 
              class="w-full text-[10px] text-secondary bg-transparent border-b border-secondary p-0.5"
            >
              <option value="pending">PENDING</option>
              <option value="in_progress">IN_PROGRESS</option>
              <option value="completed">COMPLETED</option>
            </select>
          </div>
        </div>
        <div class="flex justify-end">
          <button 
            @click="addTodo" 
            class="text-[10px] text-tertiary font-mono px-1 py-0.5 border border-secondary hover:bg-gray-900"
            :disabled="isAddingTodo"
          >
            {{ isAddingTodo ? 'ADDING...' : 'ADD_TODO' }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Filters -->
    <div v-if="showFilters" class="border-b border-primary p-1 mb-1">
      <div class="grid grid-cols-1 gap-1">
        <div class="grid grid-cols-2 gap-1">
          <div>
            <label class="text-[10px] text-tertiary mb-0.5 block">STATUS:</label>
            <select 
              v-model="filters.status" 
              class="w-full text-[10px] text-secondary bg-transparent border-b border-secondary p-0.5"
            >
              <option value="">ALL</option>
              <option value="pending">PENDING</option>
              <option value="in_progress">IN_PROGRESS</option>
              <option value="completed">COMPLETED</option>
            </select>
          </div>
          <div>
            <label class="text-[10px] text-tertiary mb-0.5 block">PRIORITY:</label>
            <select 
              v-model="filters.priority" 
              class="w-full text-[10px] text-secondary bg-transparent border-b border-secondary p-0.5"
            >
              <option value="">ALL</option>
              <option value="low">LOW</option>
              <option value="medium">MEDIUM</option>
              <option value="high">HIGH</option>
            </select>
          </div>
        </div>
        <div>
          <label class="text-[10px] text-tertiary mb-0.5 block">SEARCH:</label>
          <input 
            v-model="filters.search" 
            placeholder="Search todos" 
            class="w-full text-[10px] text-secondary bg-transparent border-b border-secondary p-0.5"
          />
        </div>
      </div>
    </div>
    
    <!-- Todos list -->
    <div class="space-y-0.5 max-h-[calc(100vh-250px)] overflow-y-auto">
      <div 
        v-for="todo in filteredTodos" 
        :key="todo.id"
        class="border-b border-secondary mb-0.5 hover:bg-gray-900"
      >
        <div class="flex items-center justify-between border-b border-secondary p-0.5">
          <div class="flex items-center">
            <input 
              type="checkbox" 
              :checked="todo.status === 'completed'" 
              @change="toggleTodoStatus(todo)"
              class="mr-1 h-2 w-2"
            />
            <span 
              class="text-[10px] font-medium"
              :class="{
                'text-primary': todo.status !== 'completed',
                'text-tertiary line-through': todo.status === 'completed',
                'text-red-500': todo.priority === 'high',
                'text-yellow-500': todo.priority === 'medium',
                'text-green-500': todo.priority === 'low'
              }"
            >
              {{ todo.title }}
            </span>
          </div>
          <div class="text-[10px] text-tertiary">
            {{ formatDate(todo.created_at) }}
          </div>
        </div>
        
        <div class="p-0.5">
          <pre v-if="todo.description" class="text-[10px] text-primary border-b border-secondary p-0.5 whitespace-pre-wrap break-words">{{ todo.description }}</pre>
          
          <div class="flex justify-between mt-0.5 text-[10px] text-quaternary">
            <div>
              <span>STATUS:{{ todo.status }}</span>
              <span class="ml-1">PRIORITY:{{ todo.priority }}</span>
            </div>
            <button 
              @click="deleteTodo(todo)" 
              class="text-[10px] text-red-500 hover:text-red-400"
            >
              DELETE
            </button>
          </div>
        </div>
      </div>
      
      <!-- Empty state -->
      <div v-if="filteredTodos.length === 0" class="text-center py-2 border-b border-dashed border-secondary">
        <span class="text-[10px] text-tertiary">NO_TODOS_FOUND</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { format, formatDistance } from 'date-fns'

const supabase = useDatabase()
const todos = ref([])
const showAddForm = ref(false)
const showFilters = ref(false)
const filters = ref({
  status: '',
  priority: '',
  search: ''
})
const newTodo = ref({
  title: '',
  description: '',
  priority: 'low',
  status: 'pending'
})
const isAddingTodo = ref(false)

// Fetch todos data
async function refreshTodos() {
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .order('created_at', { ascending: false })

  if (data) todos.value = data
  if (error) console.error('Error fetching todos:', error)
}

// Initial fetch
refreshTodos()

// Add new todo
async function addTodo() {
  if (!newTodo.value.title.trim()) return
  
  isAddingTodo.value = true
  
  const todo = {
    title: newTodo.value.title,
    description: newTodo.value.description,
    priority: newTodo.value.priority,
    status: newTodo.value.status,
    created_at: new Date().toISOString()
  }
  
  const { data, error } = await supabase
    .from('todos')
    .insert([todo])
  
  if (!error) {
    newTodo.value.title = ''
    newTodo.value.description = ''
    showAddForm.value = false
  }
  
  isAddingTodo.value = false
}

// Toggle todo completion
async function toggleTodoStatus(todo) {
  // Toggle between 'completed' and 'pending'
  todo.status = todo.status === 'completed' ? 'pending' : 'completed'
  
  const { data, error } = await supabase
    .from('todos')
    .update({ status: todo.status })
    .eq('id', todo.id)
    
  if (error) {
    console.error('Error updating todo status:', error)
    // Revert the change if there was an error
    todo.status = todo.status === 'completed' ? 'pending' : 'completed'
  }
}

// Delete todo
async function deleteTodo(todo) {
  const { data, error } = await supabase
    .from('todos')
    .delete()
    .eq('id', todo.id)
}

// Format date
function formatDate(timestamp) {
  return format(new Date(timestamp), 'MM-dd-yy')
}

// Format time ago
function formatTimeAgo(timestamp) {
  return formatDistance(new Date(timestamp), new Date(), { addSuffix: true })
}

// Filtered todos based on selected filters
const filteredTodos = computed(() => {
  let filtered = todos.value
  
  // Filter by status
  if (filters.value.status) {
    filtered = filtered.filter(todo => todo.status === filters.value.status)
  }
  
  // Filter by priority
  if (filters.value.priority) {
    filtered = filtered.filter(todo => todo.priority === filters.value.priority)
  }
  
  // Filter by search query
  if (filters.value.search) {
    const query = filters.value.search.toLowerCase()
    filtered = filtered.filter(todo => 
      todo.title.toLowerCase().includes(query) || 
      (todo.description && todo.description.toLowerCase().includes(query))
    )
  }
  
  return filtered
})

// Subscribe to changes in todos
supabase
  .channel('todochannel')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'todos' },
    (payload) => {
      refreshTodos()
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
