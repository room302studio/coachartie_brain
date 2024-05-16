<template>
  <div>
    <h2 class="text-2xl font-bold mb-4">Messages</h2>
    <div
      v-for="[user, userMessages] in groupedMessages"
      :key="user"
      class="user-messages"
    >
      <div
        @click="toggleCollapse(user)"
        class="cursor-pointer flex items-center justify-between"
      >
        <h3 class="text-2xl font-bold mb-4">{{ user }}</h3>
        <UIcon
          :name="
            collapsedUsers[user]
              ? 'i-heroicons-chevron-down'
              : 'i-heroicons-chevron-up'
          "
          class="w-5 h-5"
        />
      </div>
      <transition name="fade">
        <div v-if="!collapsedUsers[user]" class="messages">
          <div v-for="message in userMessages" :key="message.id" class="py-0.5">
            <div class="flex flex-col h-full">
              <div class="@md:flex items-start justify-between">
                <div class="@md:w-1/5 ml-3 p-1 rounded text-sm">
                  <div class="w-full">
                    <UIcon name="i-heroicons-user" class="w-3 h-3" />
                    {{ message.user_id }}
                  </div>
                  <div class="text-sm font-medium text-gray-700">
                    <span class="font-light bg-gray-900 rounded px-1">{{
                      format(new Date(message.created_at), 'M/d')
                    }}</span>
                    {{ format(new Date(message.created_at), ' hh:mm:ss') }}
                  </div>
                </div>
                <div class="w-4/5 ml-3">
                  <div
                    class="text-xs bg-blue-500 text-white rounded-lg p-2 px-4 inline"
                  >
                    {{ message.value }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { group } from 'd3'
import { format } from 'date-fns'

const messages = ref([])
const groupedMessages = ref({})
const collapsedUsers = reactive({})

const supabase = useSupabaseClient()
const defaultMessagesToShow = 25
const messagesToShow = ref(defaultMessagesToShow)

// Fetch messages data
const { data: messagesData, error: messagesError } = await supabase
  .from('messages')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(defaultMessagesToShow)

if (messagesData) messages.value = messagesData

watch(
  [messages, messagesToShow],
  () => {
    const limitedMessages = messages.value.slice(0, messagesToShow.value)
    groupedMessages.value = group(limitedMessages, (d) => d.user_id)
  },
  { immediate: true }
)

// Subscribe to new messages
supabase
  .channel('messagechannel')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages' },
    (payload) => {
      const newMessages = [payload.new, ...messages.value]
      messages.value = newMessages
    }
  )
  .subscribe()

function toggleCollapse(user) {
  if (collapsedUsers[user] === undefined) {
    collapsedUsers[user] = true
  } else {
    collapsedUsers[user] = !collapsedUsers[user]
  }
}
</script>

<style scoped>
.user-messages {
  margin-bottom: 1rem;
}

.messages {
  padding-left: 1rem;
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.5s;
}

.fade-enter-from {
  opacity: 0;
  background-color: rgba(255, 255, 0, 0.3);
  transform: translateY(-100px) scale(0.5);
}

.fade-leave-to {
  opacity: 0;
  background-color: rgba(0, 255, 0, 0.3);
  transform: translateY(10px) scale(0.5);
}
</style>
