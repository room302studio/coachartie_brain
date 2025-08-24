// Mock database composable that replaces ALL Supabase usage
// This provides a unified interface for all components

export const useDatabase = () => {
  // Mock data storage
  const mockData = {
    config: [],
    memories: [],
    messages: [],
    prompts: [],
    queue: [],
    todos: [],
    logs: []
  }

  return {
    from: (table: string) => ({
      select: async (columns?: string) => {
        // Return empty data for now - components will handle gracefully
        return { 
          data: mockData[table] || [], 
          error: null 
        }
      },
      insert: async (data: any) => {
        return { 
          data: null, 
          error: null 
        }
      },
      update: async (data: any) => ({
        eq: (field: string, value: any) => Promise.resolve({ data: null, error: null })
      }),
      upsert: async (data: any, options?: any) => {
        return { 
          data: null, 
          error: null 
        }
      },
      delete: async () => ({
        eq: (field: string, value: any) => Promise.resolve({ data: null, error: null })
      }),
      order: (column: string, options?: any) => ({
        limit: (count: number) => Promise.resolve({ data: mockData[table] || [], error: null })
      })
    }),
    
    // Mock realtime channels
    channel: (name: string) => ({
      on: (event: string, filter: any, callback: Function) => ({
        subscribe: () => {
          console.log(`Mock channel subscription: ${name}`)
          return { unsubscribe: () => {} }
        }
      }),
      subscribe: () => ({ unsubscribe: () => {} })
    }),
    
    removeChannel: (name: string) => Promise.resolve()
  }
}

// DO NOT export as useSupabaseClient - causes Nuxt conflict