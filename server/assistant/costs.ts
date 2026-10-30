import { getDb } from '../db.ts'
import { now, today } from '../clock.ts'
import type { Role, User } from '../permissions.ts'

// US dollars per million tokens, from Anthropic's pricing page (October 2026).
// Cache writes are the 5-minute kind, which is what automatic caching uses.
const PRICES: Record<string, { input: number; cacheWrite: number; cacheRead: number; output: number }> = {
  'claude-opus-5-5': { input: 4, cacheWrite: 5, cacheRead: 0.2, output: 20 },
  'claude-sonnet-5-5': { input: 2, cacheWrite: 2.5, cacheRead: 0.1, output: 10 },
  'claude-haiku-5-5': { input: 0.1, cacheWrite: 0.125, cacheRead: 0.01, output: 0.5 }, // prompts up to 100,000 tokens
}

// How much each person can spend on the assistant in a day, in US dollars.
export const DAILY_ALLOWANCE_USD: Record<Role, number> = { owner: 2, support: 1, warehouse: 0.5 }

// The most requests to Claude for one question, tool calls included.
export const MAX_STEPS = 8

export type Usage = { requests: number; inputTokens: number; cacheWriteTokens: number; cacheReadTokens: number; outputTokens: number; costUsd: number }

export function emptyUsage(): Usage {
  return { requests: 0, inputTokens: 0, cacheWriteTokens: 0, cacheReadTokens: 0, outputTokens: 0, costUsd: 0 }
}

type ApiUsage = { input_tokens: number; output_tokens: number; cache_creation_input_tokens?: number | null; cache_read_input_tokens?: number | null }

export function addUsage(total: Usage, model: string, usage: ApiUsage): Usage {
  const price = PRICES[model] ?? PRICES['claude-opus-5-5']
  const cacheWrite = usage.cache_creation_input_tokens ?? 0
  const cacheRead = usage.cache_read_input_tokens ?? 0
  const cost = (usage.input_tokens * price.input + cacheWrite * price.cacheWrite + cacheRead * price.cacheRead + usage.output_tokens * price.output) / 1_000_000
  return {
    requests: total.requests + 1,
    inputTokens: total.inputTokens + usage.input_tokens,
    cacheWriteTokens: total.cacheWriteTokens + cacheWrite,
    cacheReadTokens: total.cacheReadTokens + cacheRead,
    outputTokens: total.outputTokens + usage.output_tokens,
    costUsd: total.costUsd + cost,
  }
}

export function recordUsage(user: User, conversationId: string, model: string, u: Usage) {
  getDb()
    .prepare(
      `INSERT INTO assistant_usage (user_id, conversation_id, model, requests, input_tokens, cache_write_tokens, cache_read_tokens, output_tokens, cost_usd, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(user.id, conversationId, model, u.requests, u.inputTokens, u.cacheWriteTokens, u.cacheReadTokens, u.outputTokens, u.costUsd, now().toISOString())
}

export function spentToday(user: User): number {
  const row = getDb().prepare('SELECT coalesce(sum(cost_usd), 0) AS spent FROM assistant_usage WHERE user_id = ? AND created_at >= ?').get(user.id, today()) as { spent: number }
  return row.spent
}
