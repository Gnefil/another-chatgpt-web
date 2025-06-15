import type { OpenAIAPI } from './openai/types'

export type Model = OpenAIAPI.Model

export type MessageContentTypes = 
  | { type: 'text', text: string }
  | { type: 'image_url', image_url: { url: string } }
  | { type: 'file', file: { file_data: string, file_name?: string } }

export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: MessageContentTypes[]
}

export interface RequestProps {
  model: Model
  messages: Message[]
  temperature?: number
  top_p?: number
}

export type StopReason = 'end' | 'length' | 'others'

export interface ResponseChunk {
  delta_text?: string
  stop_reason?: StopReason
  error?: string
}

export interface TokenLimit {
  model_name: string
  max_context_tokens: number
  max_response_tokens: number
}

export interface Usage {
  prompt_tokens: number
  completion_tokens: number
}
