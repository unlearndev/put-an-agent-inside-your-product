import { getDb } from '../db.ts'
import { now } from '../clock.ts'
import { assertCanRefund, NotAllowed, type User } from '../permissions.ts'
import { getOrder, type OrderDetail } from './orders.ts'

export function refundOrder(user: User, number: number, amountPence: number, reason: string): OrderDetail {
  const order = getOrder(user, number)
  if (!Number.isInteger(amountPence) || amountPence <= 0) throw new NotAllowed('A refund has to be a positive amount.')
  const remaining = order.totalPence - order.refundedPence
  if (amountPence > remaining) {
    throw new NotAllowed(`Order ${number} only has £${(remaining / 100).toFixed(2)} left to refund.`)
  }
  assertCanRefund(user, amountPence, order.refundedPence)

  const db = getDb()
  const refunded = order.refundedPence + amountPence
  db.prepare('INSERT INTO refunds (order_number, amount_pence, reason, refunded_by, created_at) VALUES (?, ?, ?, ?, ?)').run(
    number,
    amountPence,
    reason,
    user.id,
    now().toISOString(),
  )
  db.prepare('UPDATE orders SET refunded_pence = ?, status = CASE WHEN ? >= total_pence THEN \'refunded\' ELSE status END WHERE number = ?').run(
    refunded,
    refunded,
    number,
  )
  return getOrder(user, number)
}
