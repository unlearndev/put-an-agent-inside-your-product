import { getDb } from '../db.ts'
import { NotFound, canSeeCustomerDetails, type User } from '../permissions.ts'

export type OrderStatus = 'paid' | 'packed' | 'shipped' | 'delivered' | 'refunded'

export type OrderSummary = {
  number: number
  placedAt: string
  customer: string
  totalPence: number
  status: OrderStatus
}

export type OrderDetail = OrderSummary & {
  shippedAt: string | null
  refundedPence: number
  customerId: number
  customerEmail: string | null
  deliveryAddress: string
  items: { sku: string; name: string; quantity: number; pricePence: number }[]
  refunds: { amountPence: number; reason: string; createdAt: string }[]
}

export type OrderFilters = {
  status?: OrderStatus
  customer?: string
  placedFrom?: string
  placedTo?: string
  limit?: number
}

// Every query is scoped to the signed-in user's shop.
export function searchOrders(user: User, filters: OrderFilters = {}): OrderSummary[] {
  const where = ['o.shop_id = ?']
  const args: (string | number)[] = [user.shopId]
  if (filters.status) {
    where.push('o.status = ?')
    args.push(filters.status)
  }
  if (filters.customer) {
    where.push('(c.name LIKE ? OR c.email LIKE ?)')
    args.push(`%${filters.customer}%`, `%${filters.customer}%`)
  }
  if (filters.placedFrom) {
    where.push('o.placed_at >= ?')
    args.push(filters.placedFrom)
  }
  if (filters.placedTo) {
    // placedTo is a day: include the whole of it
    where.push('o.placed_at < date(?, \'+1 day\')')
    args.push(filters.placedTo)
  }
  args.push(filters.limit ?? 500)
  const rows = getDb()
    .prepare(
      `SELECT o.number, o.placed_at, c.name AS customer, o.total_pence, o.status
       FROM orders o JOIN customers c ON c.id = o.customer_id
       WHERE ${where.join(' AND ')}
       ORDER BY o.placed_at DESC
       LIMIT ?`,
    )
    .all(...args) as { number: number; placed_at: string; customer: string; total_pence: number; status: OrderStatus }[]
  return rows.map((r) => ({
    number: r.number,
    placedAt: r.placed_at,
    customer: r.customer,
    totalPence: r.total_pence,
    status: r.status,
  }))
}

export function getOrder(user: User, number: number): OrderDetail {
  const db = getDb()
  const row = db
    .prepare(
      `SELECT o.*, c.name AS customer, c.email AS customer_email, c.address
       FROM orders o JOIN customers c ON c.id = o.customer_id
       WHERE o.number = ? AND o.shop_id = ?`,
    )
    .get(number, user.shopId) as Record<string, any> | undefined
  if (!row) throw new NotFound(`There’s no order ${number} in ${user.shopName}.`)
  return toDetail(user, row)
}

export function toDetail(user: User, row: Record<string, any>): OrderDetail {
  const db = getDb()
  const items = db
    .prepare(
      `SELECT p.sku, p.name, i.quantity, i.price_pence
       FROM order_items i JOIN products p ON p.id = i.product_id
       WHERE i.order_number = ?`,
    )
    .all(row.number) as { sku: string; name: string; quantity: number; price_pence: number }[]
  const refunds = db
    .prepare('SELECT amount_pence, reason, created_at FROM refunds WHERE order_number = ? ORDER BY created_at')
    .all(row.number) as { amount_pence: number; reason: string; created_at: string }[]
  return {
    number: row.number,
    placedAt: row.placed_at,
    customer: row.customer,
    customerId: row.customer_id,
    // Warehouse staff pack and post orders: they see the address, not the customer's email.
    customerEmail: canSeeCustomerDetails(user) ? row.customer_email : null,
    deliveryAddress: row.address,
    totalPence: row.total_pence,
    status: row.status,
    shippedAt: row.shipped_at,
    refundedPence: row.refunded_pence,
    items: items.map((i) => ({ sku: i.sku, name: i.name, quantity: i.quantity, pricePence: i.price_pence })),
    refunds: refunds.map((r) => ({ amountPence: r.amount_pence, reason: r.reason, createdAt: r.created_at })),
  }
}
