<script setup lang="ts">
const supabase = useDatabase()
const email = ref('')

const signInWithOtp = async () => {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.value,
    options: {
      emailRedirectTo: 'http://localhost:3000/confirm',
    }
  })
  if (error) console.log(error)
}
</script>
<template>
  <div class="max-w-screen-md mx-auto mt-12 p-6 bg-white dark:bg-black border border-gray-300 dark:border-gray-800 rounded shadow-sm">
    <h1 class="text-lg mb-6 text-gray-900 dark:text-white">COACH_ARTIE_LOGIN</h1>
    
    <div class="flex flex-col space-y-4">
      <input 
        v-model="email" 
        type="email" 
        placeholder="email@example.com"
        class="p-2 border border-gray-300 dark:border-gray-800 bg-transparent text-gray-900 dark:text-white" 
      />

      <button 
        @click="signInWithOtp" 
        class="p-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
      >
        SIGN_IN_WITH_EMAIL
      </button>
    </div>
  </div>
</template>