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
      select: async (_columns?: string) => {
        // Return empty data for now - components will handle gracefully
        return { 
          data: mockData[table] || [], 
          error: null 
        }
      },
      insert: async (_data: any) => {
        return { 
          data: null, 
          error: null 
        }
      },
      update: async (_data: any) => ({
        eq: (_field: string, _value: any) => Promise.resolve({ data: null, error: null })
      }),
      upsert: async (_data: any, _options?: any) => {
        return { 
          data: null, 
          error: null 
        }
      },
      delete: async () => ({
        eq: (_field: string, _value: any) => Promise.resolve({ data: null, error: null })
      }),
      order: (_column: string, _options?: any) => ({
        limit: (_count: number) => Promise.resolve({ data: mockData[table] || [], error: null })
      })
    }),
    
    // Mock realtime channels
    channel: (name: string) => ({
      on: (_event: string, _filter: any, _callback: (...args: unknown[]) => void) => ({
        subscribe: () => {
          console.log(`Mock channel subscription: ${name}`)
          return { unsubscribe: () => {} }
        }
      }),
      subscribe: () => ({ unsubscribe: () => {} })
    }),
    
    removeChannel: (_name: string) => Promise.resolve()
  }
}

// DO NOT export as useSupabaseClient - causes Nuxt conflict