<template>
  <section>
    <UHorizontalNavigation :links="views" />
    <!-- <h1>Coach Artie Memories</h1> -->

    <div v-if="activeView === 'config'">
      <div id="brain-config">
        <div v-for="value in configData" :key="key" class="mb-4">
          <span class="text-sm font-medium text-gray-700 mr-4">{{ value.config_key }}</span>
          <span>{{ value.config_value }}</span>
        </div>
      </div>
    </div>

    <div v-if="activeView === 'prompts'">

      Prompts
      <div v-for="value in promptsData" :key="key" class="mb-4 max-w-prose mx-auto">
        <span class="text-sm font-medium text-gray-700 mr-4">{{ value.prompt_name }}</span>
        <span>{{ value.prompt_text }}</span>
      </div>
    </div>


    <Splitpanes class="h-full p-2 md:p-4 lg:p-8" v-if="activeView === 'memories'">
      <Pane class="@container h-full overflow-y-auto px-1" size="50" min-size="20">
        <!-- <div>
          <h2 class="text-2xl font-bold mb-4">Recent Users</h2>
          <div
            v-for="[user, userMessages] in groupedMessages"
            :key="user"
            class="flex items-center mb-4"
          >
            <UIcon name="i-heroicons-user" class="w-3 h-3 mr-2" />

            <UChip
              :text="countUserMessages(user)"
              size="2xl"
              class="flex items-center"
            > 
              <span class="ml-2">{{ user }}</span>
            </UChip>
          </div>
        </div> -->

        <div class="w-full bg-slate-200 p-4 rounded-lg">
          <LogViewer />
        </div>



        <h2 class="text-2xl font-bold mb-4">Messages</h2>
        <div v-for="[user, userMessages] in groupedMessages" :key="user" class="user-messages">
          <div @click="toggleCollapse(user)" class="cursor-pointer flex items-center justify-between">
            <h3 class="text-2xl font-bold mb-4">{{ user }}</h3>
            <UIcon :name="collapsedUsers[user]
      ? 'i-heroicons-chevron-down'
      : 'i-heroicons-chevron-up'
      " class="w-5 h-5" />
          </div>
          <transition name="fade">
            <div v-if="!collapsedUsers[user]" class="messages">
              <div v-for="message in userMessages" :key="message.id" class="border-b border-gray-500/50 py-1">
                <div class="flex flex-col h-full">
                  <div class="@md:flex items-start justify-between">
                    <!-- Changed from "items-center" to "items-start" -->
                    <!-- date / created_at -->
                    <div class="@md:w-1/5 ml-3 p-1 rounded text-sm">
                      <div class="w-full">
                        <UIcon name="i-heroicons-user" class="w-3 h-3" />
                        {{ message.user_id }}
                      </div>
                      <div class="text-sm font-medium text-gray-700">
                        <!-- {{ message.created_at }} -->
                        <!-- {{ format(new Date(message.created_at), 'MMM d, yyyy') }} -->
                        <!-- more concise -->
                        <span class="font-light bg-gray-900 rounded px-1">{{
      format(new Date(message.created_at), 'M/d')
    }}</span>
                        {{ format(new Date(message.created_at), ' hh:mm:ss') }}
                      </div>
                    </div>

                    <!-- value -->
                    <div class="w-4/5 ml-3">
                      <div class="text-xs">
                        {{ message.value }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </Pane>
      <Pane class="@container h-full overflow-y-auto px-1" size="50" min-size="20">
        <h2 class="text-2xl font-bold mb-4">Memories</h2>
        <div v-for="memory in memories" :key="memory.id" class="@md:flex mb-2">

          <div v-if="memory.related_message_id" class="bg-red-500 rounded-lg p-1 text-xs">
            {{ memory.related_message_id }}
          </div>

          <div class="metadata @md:w-1/5 flex flex-col">
            <div class="flex flex-col justify-between gap-1 p-1 w-full">
              <div class="w-full flex items-center">
                <UIcon name="i-heroicons-user" class="w-3 h-3" />
                <span class="ml-2 text-sm">{{ memory.user_id }}</span>
              </div>
              <div class="w-full">
                <span class="text-sm font-medium text-gray-700">
                  <span class="font-light bg-gray-900 rounded px-1">{{
      format(new Date(memory.created_at), 'M/d')
    }}</span>
                  {{ format(new Date(memory.created_at), ' hh:mm:ss') }}
                </span>
              </div>
            </div>
          </div>

          <pre class="@md:w-4/5 text-xs leading-normal p-1">{{ memory.value }}</pre>
        </div>
      </Pane>
    </Splitpanes>
  </section>
</template>

<script setup>
import { Splitpanes, Pane } from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'
const supabase = useSupabaseClient()
import { group } from 'd3'
import { format } from 'date-fns'
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'
import { animate, svg, stagger } from '~/anime.esm.js'
import { ref, reactive, watch } from 'vue'




// the app is gonna have at least 2 views:
// 1. the main view that shows the memories + messages
// 2. the config view that shows the config for prompts and config table

const activeView = ref('memories')
const views = [{
  label: 'Memories',
  key: 'memories',
  icon: 'i-heroicons-user',
  click: () => activeView.value = 'memories'
}, {
  label: 'Config',
  key: 'config',
  icon: 'i-heroicons-cog-6-tooth-solid',
  click: () => activeView.value = 'config'
},
{
  label: 'Prompts',
  key: 'prompts',
  icon: 'i-heroicons-chat-bubble-bottom-center-20-solid',
  click: () => activeView.value = 'prompts'
}
]





const memories = ref([]) // use ref to store the memories

// config
const messagesToShow = ref(25) // use ref to store the number of messages to show

// use supabase to get the memories from the database
const { data, error } = await supabase
  .from('memories')
  .select('*')
  // we only want the value
  // .select('value')
  // sort by created_at in descending order
  .order('created_at', { ascending: false })
  .limit(10)

if (data) {
  memories.value = data
}

// use supabase to subscribe to a channel that updates when there are new memories
supabase
  .channel('memorychannel')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'memories' },
    (payload) => {
      console.log('Change received!', payload)
      const newMemories = [payload.new, ...memories.value]
      memories.value = newMemories
    }
  )
  .subscribe()

const defaultMessagesToShow = 25

// alright now we do like the same exact thing for messages
const messages = ref([]) // use ref to store the messages
// use supabase to get the messages from the database
const { data: messagesData, error: messagesError } = await supabase
  .from('messages')
  .select('*')
  // we only want the value
  // .select('value')
  // sort by created_at in descending order
  .order('created_at', { ascending: false })
  // .limit(10)
  .limit(defaultMessagesToShow || 25)

if (messagesData) {
  messages.value = messagesData
}

const groupedMessages = ref({})

watch(
  [messages, messagesToShow],
  () => {
    const limitedMessages = messages.value.slice(0, messagesToShow.value)
    groupedMessages.value = group(limitedMessages, (d) => d.user_id)
  },
  { immediate: true }
)

// use supabase to subscribe to a channel that updates when there are new messages
supabase
  .channel('messagechannel')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages' },
    (payload) => {
      console.log('Change received!', payload)
      const newMessages = [payload.new, ...messages.value]
      messages.value = newMessages
    }
  )
  .subscribe()

function countUserMessages(username) {
  const count = messages.value.filter(
    (message) => message.user_id === username
  ).length
  return count
}



// get the config from the database
const { data: configData, error: configError } = await supabase
  .from('config')
  .select('*')

const { data: promptsData, error: promptsError } = await supabase
  .from('prompts')
  .select('*')


// make a function to modify a config value
async function modifyConfig(key, value) {
  const { data, error } = await supabase
    .from('config')
    .update({ config_key: key, config_value: value })
    .single()
  if (error) {
    console.error('Error modifying config:', error)
    return
  }
  console.log('Config updated:', data)
}

// Using a reactive object to track collapsed state for each user
const collapsedUsers = reactive({})

// Function to toggle the collapsed state
function toggleCollapse(user) {
  if (collapsedUsers[user] === undefined) {
    // If the user's state is not tracked, default to true (collapsed)
    collapsedUsers[user] = true
  } else {
    collapsedUsers[user] = !collapsedUsers[user]
  }
}
</script>

<style>
.splitpanes {}

.splitpanes__splitter {
  background-color: rgba(255, 255, 255, 0.2);
  position: relative;
}

.splitpanes__splitter:before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  transition: opacity 0.4s;
  background-color: rgba(255, 255, 255, 0.2);
  opacity: 0;
  z-index: 1;
}

.splitpanes__splitter:hover:before {
  opacity: 1;
}

.splitpanes--vertical>.splitpanes__splitter:before {
  left: -12px;
  right: -12px;
  height: 100%;
}

.splitpanes--horizontal>.splitpanes__splitter:before {
  top: -12px;
  bottom: -12px;
  width: 100%;
}

/* some dope animations for when messages are added with some crazy color animations */
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
