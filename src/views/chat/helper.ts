import { getEncoding } from 'js-tiktoken'
import { useChatStore, useSettingStore } from '@/store'
import { t } from '@/locales'
import { fetchChatAPIProcess } from '@/api'
import type { MessageContentTypes, PostMessage, ResponseChunk } from '@/api/helper'

const chatStore = useChatStore()
const settingStore = useSettingStore()

export function buildContextMessages(cid: CID | null, startIndex?: number, endIndex?: number, systemMsg: boolean = true, maxTokens: number = 128000): PostMessage[] {
  const sourceMessages = chatStore.getMessages(cid)

  startIndex = startIndex !== undefined ? Math.max(0, startIndex) : 0
  endIndex = endIndex !== undefined ? Math.min(sourceMessages.length, endIndex) : sourceMessages.length

  const encoding = getEncoding('cl100k_base')
  const tokens_per_message = 3
  const count_message_token = (message: PostMessage) => {
    let tokens = tokens_per_message
    tokens += encoding.encode(message.role).length
    message.content.forEach((content) => {
      if (content.type === 'text') {
        tokens += encoding.encode(content.text).length
      }
      else if (content.type === 'image_url') {
        tokens += 1000 // Rough estimate for image tokens, which is capped by 1536 when width/32*height/32 is bigger than it.
      }
      else if (content.type === 'file') {
        tokens += encoding.encode(content.file.file_data).length
        if (content.file.file_name)
          tokens += encoding.encode(content.file.file_name).length
      }
    })
    return tokens
  }
  let estimated_tokens = 3

  const systemMessage: PostMessage = { role: 'system', content: [{ type: 'text', text: settingStore.systemMessage }] }
  if (systemMsg)
    estimated_tokens += count_message_token(systemMessage)

  const messages: PostMessage[] = []
  for (let i = endIndex - 1; i >= startIndex; i--) {
    const item = sourceMessages[i]
    const content: MessageContentTypes[] = [{ type: 'text', text: item.text }]
    for (const multimedia of item.multimedia || []) {
      if (multimedia.type === 'image_url') {
        content.push({ type: 'image_url', image_url: { url: multimedia.contentBase64 } })
      }
      else if (multimedia.type === 'file') {
        content.push({ type: 'file', file: { file_data: multimedia.contentBase64, file_name: multimedia.name } })
      }
    }
    if (!item.error) {
      const message: PostMessage = {
        role: item.inversion ? 'user' : 'assistant',
        content: content,
      }
      estimated_tokens += count_message_token(message)
      if (estimated_tokens > maxTokens)
        break
      messages.push(message)
    }
  }
  if (systemMsg)
    messages.push(systemMessage)
  messages.reverse()
  return messages
}

export async function generateTitle(cid: CID | null) {
  chatStore.setTitle(cid, t('chat.thinking'))

  let messages: PostMessage[] = buildContextMessages(cid, undefined, undefined, false)
  messages.push({ role: 'system', content: [{ type: 'text', text: 'Extract keywords from above messages to generate a summary title of the conversation topic, following the language used by the user. Respond as briefly as possible (less than 10 words) and do not add heading.' }] })
  try {
    await fetchChatAPIProcess<ResponseChunk>({
      model: 'gpt-4o',
      messages,
      temperature: 0,
      top_p: 1,
      onDownloadProgress: ({ event }) => {
        const xhr = event.target
        const { responseText } = xhr
        try {
          const chunks = responseText.trim().split('\n')
          const data: ResponseChunk[] = chunks.map((chunk: string) => JSON.parse(chunk))
          const text = data.map((response) => response.delta_text || '').join('')
          chatStore.setTitle(cid, text)
        }
        catch { }
      },
    })
  }
  catch {
    if (chatStore.getTitle(cid) === t('chat.thinking'))
      chatStore.setTitle(cid, t('chat.newChatTitle'))
  }
}
