import express from 'express'
import { chatReplyProcess } from './chatgpt'
import { auth, getAuthConfig } from './middleware/auth'
import type { RequestProps } from './types'
import type { ChatCompletionChunk } from 'openai/src/resources/chat'

const app = express()
const router = express.Router()

app.use(express.static('public'))
app.use(express.json({ limit: '1mb' }))

app.all('*', (_, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'authorization, Content-Type')
  res.header('Access-Control-Allow-Methods', '*')
  next()
})

router.post('/chat-process', [auth], async (req, res) => {
  res.setHeader('Content-type', 'application/octet-stream')

  try {
    const { model, messages, temperature, top_p } = req.body as RequestProps
    const user = req.header('Authorization')?.replace('Bearer ', '').trim()
    let firstChunk = true
    await chatReplyProcess({
      model, messages, temperature, top_p, user,
      callback: (chunk: ChatCompletionChunk) => {
        res.write(firstChunk ? JSON.stringify(chunk) : `\n${JSON.stringify(chunk)}`)
        firstChunk = false
      },
    })
  }
  catch (error) {
    res.write(JSON.stringify(error))
  }
  finally {
    res.end()
  }
})

router.post('/session', async (req, res) => {
  try {
    const authConfig = await getAuthConfig()
    const hasAuth = Object.keys(authConfig).length > 0
    res.send({ status: 'Success', message: '', data: { auth: hasAuth } })
  }
  catch (error) {
    res.send({ status: 'Fail', message: error.message, data: null })
  }
})

router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body as { token: string }
    if (!token)
      throw new Error('Secret key is empty')

    const authConfig = await getAuthConfig()
    if (!(token in authConfig && authConfig[token].allow))
      throw new Error('密钥无效 | Secret key is invalid')

    res.send({ status: 'Success', message: 'Verify successfully', data: authConfig[token].info })
  }
  catch (error) {
    res.send({ status: 'Fail', message: error.message, data: null })
  }
})

app.use('', router)
app.use('/api', router)
app.set('trust proxy', 1)

app.listen(3002, () => global.console.log('Server is running on port 3002'))
