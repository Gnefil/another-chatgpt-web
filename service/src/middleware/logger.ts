import fs from 'fs/promises'
import type { Usage } from '../types'

interface UsageRecord {
  [date: string]: {
    [user: string]: {
      [model: string]: Usage
    }
  }
}

export async function logUsage(model: string, usage: Usage, user?: string) {
  user = user ?? '__default__'
  const date = new Date()
  const monthKey = `${date.getFullYear()}_${(date.getMonth() + 1).toString().padStart(2, '0')}`
  const dateKey = `${monthKey}_${date.getDate()}`

  const recordStr = await fs.readFile(`logs/${monthKey}.json`, 'utf8').catch(() => '{}')
  const record: UsageRecord = JSON.parse(recordStr)

  record[dateKey] = record[dateKey] ?? {}
  record[dateKey][user] = record[dateKey][user] ?? {}
  record[dateKey][user][model] = record[dateKey][user][model] ?? { input_tokens: 0, output_tokens: 0, total_tokens: 0 }
  record[dateKey][user][model].input_tokens += usage.input_tokens
  record[dateKey][user][model].output_tokens += usage.output_tokens

  fs.mkdir('logs', { recursive: true })
  await fs.writeFile(`logs/${monthKey}.json`, JSON.stringify(record, null, 2))
}
