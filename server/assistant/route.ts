import express from 'express'
import { requireUser } from '../auth.ts'
import { loadConversation, appendMessages } from './conversations.ts'
import { runAssistant, type AssistantEvent } from './run.ts'

// POST /api/assistant { conversationId?, question }
// Streams the answer back as server-sent events: text as it's written, and each tool call as it happens.
export function assistantRoute() {
  const router = express.Router()
  router.post('/assistant', express.json(), requireUser, async (req, res) => {
    const user = req.user!
    const question = String(req.body?.question ?? '').trim()
    if (!question) return res.status(400).json({ error: 'Ask a question.' })
    const conversation = loadConversation(user, req.body?.conversationId)

    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' })
    const send = (event: AssistantEvent) => res.write(`data: ${JSON.stringify(event)}\n\n`)

    try {
      const added = await runAssistant(user, conversation.messages, question, send)
      appendMessages(user, conversation.id, conversation.messages.length, added)
      send({ type: 'done', conversationId: conversation.id })
    } catch (error) {
      console.error(error)
      send({ type: 'error', message: 'The assistant couldn’t answer that. Try again in a moment.' })
    }
    res.end()
  })
  return router
}
