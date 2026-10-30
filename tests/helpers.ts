import { openDb, setDb, getDb } from '../server/db.ts'
import { seed } from '../server/seed.ts'
import { findUser } from '../server/auth.ts'
import type { User } from '../server/permissions.ts'

// A fresh in-memory copy of the demo data.
export function freshDb() {
  const db = openDb(':memory:')
  seed(db)
  setDb(db)
  return db
}

export const nadia = () => findUser(1) as User // owner, Larkspur Ceramics
export const tom = () => findUser(2) as User // support, Larkspur Ceramics
export const priya = () => findUser(3) as User // warehouse, Larkspur Ceramics
export const owen = () => findUser(4) as User // owner, Hollow Oak Candles

export function orderNumber(shopId: number, where = '1 = 1'): number {
  return (getDb().prepare(`SELECT number FROM orders WHERE shop_id = ? AND ${where} ORDER BY number LIMIT 1`).get(shopId) as { number: number }).number
}
