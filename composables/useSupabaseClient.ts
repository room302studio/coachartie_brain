// Mock Supabase client to prevent runtime errors
// This is a placeholder that should be replaced with actual database integration

export const useSupabaseClient = () => {
  return {
    from: (table: string) => ({
      select: () => Promise.resolve({ data: [], error: null }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => Promise.resolve({ data: null, error: null }),
      delete: () => Promise.resolve({ data: null, error: null })
    }),
    auth: {
      getUser: () => Promise.resolve({ data: null, error: null }),
      signIn: () => Promise.resolve({ data: null, error: null }),
      signOut: () => Promise.resolve({ error: null })
    },
    channel: (name: string) => ({
      on: (event: string, callback: Function) => ({ subscribe: () => {} }),
      subscribe: () => ({ unsubscribe: () => {} })
    }),
    removeChannel: (name: string) => Promise.resolve()
  }
}