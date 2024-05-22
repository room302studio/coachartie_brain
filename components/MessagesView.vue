<template>
  <div>
    <h2 class="text-2xl font-bold mb-4">Incoming Messages</h2>
    <transition name="fade">
      <div class="messages">
        <div v-for="message in limitedMessages" :key="message.id" class="py-0.5">
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
                <div class="text-xs bg-blue-500 text-white rounded-lg p-2 px-4 inline">
                  {{ message.value }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { format } from 'date-fns'

const messages = ref([])

const supabase = useSupabaseClient()
const defaultMessagesToShow = 12
const messagesToShow = ref(defaultMessagesToShow)

// Fetch messages data
const { data: messagesData, error: messagesError } = await supabase
  .from('messages')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(defaultMessagesToShow)

if (messagesData) messages.value = messagesData

// watch(
//   [messages, messagesToShow],
//   () => {
//     const limitedMessages = messages.value.slice(0, messagesToShow.value)
//     messages.value = limitedMessages
//   },
//   { immediate: true }
// )

// convert into a computed
const limitedMessages = computed(() => messages.value.slice(0, messagesToShow.value))

// Subscribe to new messages
supabase
  .channel('messagechannel')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages' },
    (payload) => {
      const newMessages = [payload.new, ...messages.value]
      const uniqueMessages = Array.from(new Set(newMessages.map(JSON.stringify))).map(JSON.parse)
      messages.value = uniqueMessages
    }
  )
  .subscribe()
</script>
<style></style>