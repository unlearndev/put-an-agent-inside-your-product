import { randomUUID } from 'node:crypto'
import type { BetaMessageParam } from '@anthropic-ai/sdk/resources/beta/messages'
import { getDb } from '../db.ts'
import { now } from '../clock.ts'
import type { User } from '../permissions.ts'

// Each conversation belongs to the person who started it. We keep the whole history,
// tool calls and results included, and send it back to Claude with each new question.
export function loadConversation(user: User, id: string | undefined): { id: string; messages: BetaMessageParam[] } {
  if (!id) return { id: randomUUID(), messages: [] }
  const rows = getDb()
    .prepare('SELECT message FROM assistant_messages WHERE conversation_id = ? AND user_id = ? ORDER BY position')
    .all(id, user.id) as { message: string }[]
  if (rows.length === 0) return { id: randomUUID(), messages: [] }
  return { id, messages: rows.map((r) => JSON.parse(r.message)) }
}

export function appendMessages(user: User, id: string, from: number, messages: BetaMessageParam[]) {
  const insert = getDb().prepare('INSERT INTO assistant_messages (conversation_id, user_id, position, message, created_at) VALUES (?, ?, ?, ?, ?)')
  messages.forEach((m, i) => insert.run(id, user.id, from + i, JSON.stringify(m), now().toISOString()))
}
