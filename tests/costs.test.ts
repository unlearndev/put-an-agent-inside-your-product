import { beforeEach, describe, expect, it } from 'vitest'
import type { AddressInfo } from 'node:net'
import { freshDb, tom } from './helpers.ts'
import { addUsage, emptyUsage, recordUsage, spentToday } from '../server/assistant/costs.ts'
import { createApp } from '../server/app.ts'

beforeEach(() => {
  freshDb()
})

describe('costs', () => {
  it('prices each kind of token', () => {
    const u = addUsage(emptyUsage(), 'claude-sonnet-5-5', { input_tokens: 1000, cache_creation_input_tokens: 2000, cache_read_input_tokens: 4000, output_tokens: 500 })
    // $2 a million in, $2.50 cache writes, $0.10 cache reads, $10 out
    expect(u.costUsd).toBeCloseTo(0.002 + 0.005 + 0.0004 + 0.005, 6)
    expect(u.requests).toBe(1)
  })

  it('adds up what someone has spent today', () => {
    recordUsage(tom(), 'c1', 'claude-sonnet-5-5', { ...emptyUsage(), requests: 2, costUsd: 0.25 })
    recordUsage(tom(), 'c2', 'claude-sonnet-5-5', { ...emptyUsage(), requests: 3, costUsd: 0.5 })
    expect(spentToday(tom())).toBeCloseTo(0.75)
  })

  it('stops a question before it reaches Claude once the allowance is used', async () => {
    recordUsage(tom(), 'c1', 'claude-sonnet-5-5', { ...emptyUsage(), requests: 40, costUsd: 1.01 })
    const server = createApp().listen(0)
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
    try {
      const signIn = await fetch(`${base}/api/session`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'tom@larkspur.test', password: 'stockroom' }) })
      const cookie = signIn.headers.get('set-cookie')!.split(';')[0]
      const res = await fetch(`${base}/api/assistant`, { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ question: 'Anything to pack?' }) })
      const body = await res.text()
      expect(body).toContain('today’s assistant allowance of $1.00')
    } finally {
      server.close()
    }
  })
})
