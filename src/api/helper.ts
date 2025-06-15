export type MessageContentTypes = 
  | { type: 'text', text: string }
  | { type: 'image_url', image_url: { url: string } }
  | { type: 'file', file: { file_data: string, file_name?: string } }

export interface PostMessage {
  role: 'system' | 'user' | 'assistant'
  content: MessageContentTypes[]
}

export type StopReason = 'end' | 'length' | 'others'

export interface ResponseChunk {
  delta_text?: string
  stop_reason?: StopReason
  error?: string
}
