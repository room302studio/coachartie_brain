// Re-export the built-in Supabase client from the @nuxtjs/supabase module
import { useSupabaseClient as useNuxtSupabaseClient } from '#imports'

/**
 * Returns the Supabase client instance from the @nuxtjs/supabase module
 * This wrapper allows us to customize the client if needed in the future
 */
export function useSupabaseClient() {
  return useNuxtSupabaseClient()
}
