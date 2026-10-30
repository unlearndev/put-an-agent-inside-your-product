import { randomUUID } from 'node:crypto'
import { getDb } from '../db.ts'
import { now } from '../clock.ts'
import { assertCanRefund, NotAllowed, NotFound, type User } from '../permissions.ts'
import { getOrder, type OrderDetail } from './orders.ts'
import { refundOrder } from './refunds.ts'

export type ProposedRefund = {
  id: string
  orderNumber: number
  customer: string
  amountPence: number
  reason: string
  status: 'waiting' | 'confirmed' | 'declined'
}

const EXPIRES_AFTER_MS = 15 * 60_000

// The assistant can only propose a refund. Nothing moves until the person confirms it in Stockroom.
// The same checks run now, so we never propose something they couldn't do, and again when they confirm.
export function proposeRefund(user: User, number: number, amountPence: number, reason: string): ProposedRefund {
  const order = getOrder(user, number)
  if (!Number.isInteger(amountPence) || amountPence <= 0) throw new NotAllowed('A refund has to be a positive amount.')
  if (amountPence > order.totalPence - order.refundedPence) {
    throw new NotAllowed(`Order ${number} only has £${((order.totalPence - order.refundedPence) / 100).toFixed(2)} left to refund.`)
  }
  assertCanRefund(user, amountPence, order.refundedPence)

  const id = randomUUID()
  const created = now()
  getDb()
    .prepare('INSERT INTO proposed_refunds (id, user_id, order_number, amount_pence, reason, status, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, user.id, number, amountPence, reason, 'waiting', created.toISOString(), new Date(created.getTime() + EXPIRES_AFTER_MS).toISOString())
  return { id, orderNumber: number, customer: order.customer, amountPence, reason, status: 'waiting' }
}

// Only the person it was proposed to can confirm it, once, before it expires.
// It's claimed with a conditional update inside a transaction, so two confirms can't both get through,
// and if the refund is refused, the transaction rolls back and the proposal is still waiting.
export function confirmRefund(user: User, id: string): OrderDetail {
  const db = getDb()
  db.exec('BEGIN')
  try {
    const claimed = db
      .prepare("UPDATE proposed_refunds SET status = 'confirmed' WHERE id = ? AND user_id = ? AND status = 'waiting' AND expires_at > ?")
      .run(id, user.id, now().toISOString())
    if (Number(claimed.changes) === 0) throw new NotFound('That refund isn’t waiting for you any more. Ask the assistant again.')
    const row = db.prepare('SELECT order_number, amount_pence, reason FROM proposed_refunds WHERE id = ?').get(id) as {
      order_number: number
      amount_pence: number
      reason: string
    }
    // The normal refund code, as this person, so every check runs again now.
    const order = refundOrder(user, row.order_number, row.amount_pence, row.reason)
    db.exec('COMMIT')
    return order
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

export function declineRefund(user: User, id: string) {
  const declined = getDb()
    .prepare("UPDATE proposed_refunds SET status = 'declined' WHERE id = ? AND user_id = ? AND status = 'waiting' AND expires_at > ?")
    .run(id, user.id, now().toISOString())
  if (Number(declined.changes) === 0) throw new NotFound('That refund isn’t waiting for you any more. Ask the assistant again.')
}
