import express from 'express'
import { requireUser } from '../auth.ts'
import { loadConversation, appendMessages } from './conversations.ts'
import { runAssistant, MODEL, type AssistantEvent } from './run.ts'
import { DAILY_ALLOWANCE_USD, recordUsage, spentToday } from './costs.ts'

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

    // The allowance is checked here, in code, before anything is sent to Claude.
    const allowance = DAILY_ALLOWANCE_USD[user.role]
    if (spentToday(user) >= allowance) {
      send({ type: 'text', text: `You’ve used today’s assistant allowance of $${allowance.toFixed(2)}. It resets tomorrow, or the shop’s owner can raise it.` })
      send({ type: 'done', conversationId: conversation.id })
      return res.end()
    }

    try {
      const { messages, usage } = await runAssistant(user, conversation.messages, question, send)
      appendMessages(user, conversation.id, conversation.messages.length, messages)
      recordUsage(user, conversation.id, MODEL, usage)
      send({ type: 'done', conversationId: conversation.id })
    } catch (error) {
      console.error(error)
      send({ type: 'error', message: 'The assistant couldn’t answer that. Try again in a moment.' })
    }
    res.end()
  })
  return router
}
