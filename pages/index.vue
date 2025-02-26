<template>
  <section>
    <SiteNav @updateView="activeView = $event" />

    <div class=" mx-auto px-10">
      <LatestLog />
    </div>

    <div v-if="activeView === 'capabilities'">
      <CapabilityManifestView />
    </div>

    <div v-if="activeView === 'config'">
      <ConfigView />
    </div>

    <div v-if="activeView === 'prompts'">
      <PromptsView />
    </div>

    <Splitpanes class="max-h-screen overflow-y-auto px-2 md:px-4 lg:px-8" v-if="activeView === 'memories'"
      :push-other-panes="false">
      <Pane size="18">
        <MessagesView />
      </Pane>

      <Pane size="40" min-size="20">
        <VerboseLogViewer />
      </Pane>

      <Pane size="35">
        <MemoriesView />
      </Pane>
      <Pane size="8" min-size="2" class="overflow-y-auto max-h-screen">
        <TodoViewer />
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
import { animate, stagger, svg } from '~/anime.esm.js'
import { ref, reactive, watch } from 'vue'

const activeView = ref('memories')
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
