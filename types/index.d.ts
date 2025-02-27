export interface Memory {
  id: string
  value: string
  user_id?: string
  created_at: string
  memory_type?: string
  related_message_id?: string
  conversation_id?: string
  metadata?: any
  resource_id?: string
  embedding?: any
  extractedEmbedding?: number[]
}
