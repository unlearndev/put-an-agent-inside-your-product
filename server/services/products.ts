import { getDb } from '../db.ts'
import type { User } from '../permissions.ts'

export type Product = {
  sku: string
  name: string
  pricePence: number
  stock: number
  reorderAt: number
  lowStock: boolean
}

export function listProducts(user: User, options: { lowStockOnly?: boolean } = {}): Product[] {
  const rows = getDb()
    .prepare(
      `SELECT sku, name, price_pence, stock, reorder_at FROM products
       WHERE shop_id = ? ${options.lowStockOnly ? 'AND stock <= reorder_at' : ''}
       ORDER BY name`,
    )
    .all(user.shopId) as { sku: string; name: string; price_pence: number; stock: number; reorder_at: number }[]
  return rows.map((r) => ({
    sku: r.sku,
    name: r.name,
    pricePence: r.price_pence,
    stock: r.stock,
    reorderAt: r.reorder_at,
    lowStock: r.stock <= r.reorder_at,
  }))
}
