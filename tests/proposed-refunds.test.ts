import { beforeEach, describe, expect, it } from 'vitest'
import { freshDb, tom, nadia } from './helpers.ts'
import { mcpAs } from './mcp-client.ts'
import { getOrder } from '../server/services/orders.ts'
import { confirmRefund, declineRefund } from '../server/services/proposed-refunds.ts'
import { refundOrder } from '../server/services/refunds.ts'
import { getDb } from '../server/db.ts'
import { NotAllowed, NotFound } from '../server/permissions.ts'

beforeEach(() => {
  freshDb()
})

async function propose(amountPence = 2400) {
  const { call } = await mcpAs(tom())
  return (await call('propose_refund', { number: 1154, amountPence, reason: 'Cracked mug' })).json().proposal.id as string
}

describe('proposed refunds', () => {
  it('move no money until they’re confirmed', async () => {
    const id = await propose()
    expect(getOrder(tom(), 1154).refundedPence).toBe(0)
    expect(confirmRefund(tom(), id).refundedPence).toBe(2400)
  })

  it('can only be confirmed once', async () => {
    const id = await propose()
    confirmRefund(tom(), id)
    expect(() => confirmRefund(tom(), id)).toThrow(NotFound)
  })

  it('can only be confirmed by the person they were proposed to', async () => {
    const id = await propose()
    expect(() => confirmRefund(nadia(), id)).toThrow(NotFound)
  })

  it('do nothing when declined', async () => {
    const id = await propose()
    declineRefund(tom(), id)
    expect(() => confirmRefund(tom(), id)).toThrow(NotFound)
    expect(getOrder(tom(), 1154).refundedPence).toBe(0)
  })

  it('check the limits again when they’re confirmed', async () => {
    const id = await propose(2400)
    refundOrder(tom(), 1154, 3000, 'Bowl chipped') // £30 refunded in the meantime
    expect(() => confirmRefund(tom(), id)).toThrow(NotAllowed) // £54 would be over Tom's £50
  })

  it('expire after 15 minutes', async () => {
    const id = await propose()
    process.env.STOCKROOM_NOW = '2026-11-16T09:46:00Z'
    try {
      expect(() => confirmRefund(tom(), id)).toThrow(NotFound)
    } finally {
      delete process.env.STOCKROOM_NOW
    }
  })
})

describe('a refused confirm', () => {
  it('rolls back, so the proposal is still waiting', async () => {
    const id = await propose(2400)
    refundOrder(tom(), 1154, 3000, 'Bowl chipped')
    expect(() => confirmRefund(tom(), id)).toThrow(NotAllowed)
    const row = getDb().prepare('SELECT status FROM proposed_refunds WHERE id = ?').get(id) as { status: string }
    expect(row.status).toBe('waiting')
  })
})
