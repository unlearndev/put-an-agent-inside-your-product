import { getDb } from '../db.ts'
import { NotAllowed, NotFound, canSeeCustomerDetails, type User } from '../permissions.ts'
import { searchOrders, type OrderSummary } from './orders.ts'

export type Customer = {
  id: number
  name: string
  email: string
  address: string
  orders: OrderSummary[]
}

function assertCanSee(user: User) {
  if (!canSeeCustomerDetails(user)) {
    throw new NotAllowed('Warehouse staff can’t see customer details. Ask support or the shop’s owner.')
  }
}

export function listCustomers(user: User): Omit<Customer, 'orders'>[] {
  assertCanSee(user)
  return getDb()
    .prepare('SELECT id, name, email, address FROM customers WHERE shop_id = ? ORDER BY name')
    .all(user.shopId) as Omit<Customer, 'orders'>[]
}

// Find one customer by email, or by part of their name.
export function findCustomer(user: User, query: string): Customer {
  assertCanSee(user)
  const row = getDb()
    .prepare(
      `SELECT id, name, email, address FROM customers
       WHERE shop_id = ? AND (lower(email) = lower(?) OR name LIKE ?)
       ORDER BY name LIMIT 1`,
    )
    .get(user.shopId, query, `%${query}%`) as Omit<Customer, 'orders'> | undefined
  if (!row) throw new NotFound(`There’s no customer matching “${query}” in ${user.shopName}.`)
  return { ...row, orders: searchOrders(user, { customer: row.email }) }
}

export function getCustomer(user: User, id: number): Customer {
  assertCanSee(user)
  const row = getDb()
    .prepare('SELECT id, name, email, address FROM customers WHERE id = ? AND shop_id = ?')
    .get(id, user.shopId) as Omit<Customer, 'orders'> | undefined
  if (!row) throw new NotFound(`There’s no customer ${id} in ${user.shopName}.`)
  return { ...row, orders: searchOrders(user, { customer: row.email }) }
}
