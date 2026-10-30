// Fills a database with Stockroom's demo data: two shops on the platform, four members of staff,
// their products, customers and orders. Every run gives the same data. Every name, email and address is made up.
//
//   npm run seed            resets data/stockroom.db
//
import type { DatabaseSync } from 'node:sqlite'
import { openDb, SCHEMA } from './db.ts'
import { hashPassword } from './auth.ts'

export const DEMO_PASSWORD = 'stockroom'

export const SHOPS = [
  { id: 1, name: 'Larkspur Ceramics' },
  { id: 2, name: 'Hollow Oak Candles' },
]

export const USERS = [
  { id: 1, shopId: 1, name: 'Nadia Ellis', email: 'nadia@larkspur.test', role: 'owner' },
  { id: 2, shopId: 1, name: 'Tom Reid', email: 'tom@larkspur.test', role: 'support' },
  { id: 3, shopId: 1, name: 'Priya Nair', email: 'priya@larkspur.test', role: 'warehouse' },
  { id: 4, shopId: 2, name: 'Owen Hart', email: 'owen@hollowoak.test', role: 'owner' },
] as const

// [sku, name, price in pence, stock, reorder at]
const PRODUCTS: Record<number, [string, string, number, number, number][]> = {
  1: [
    ['LC-MUG-L', 'Large speckled mug', 2400, 34, 10],
    ['LC-MUG-S', 'Small speckled mug', 1800, 41, 10],
    ['LC-ESP', 'Espresso cup', 1400, 3, 6],
    ['LC-BWL-SV', 'Serving bowl', 3800, 12, 4],
    ['LC-BWL-PA', 'Pasta bowl', 2200, 26, 8],
    ['LC-BWL-SA', 'Salad bowl', 4600, 7, 3],
    ['LC-PLT-SD', 'Side plate', 1600, 30, 8],
    ['LC-PLT-DN', 'Dinner plate', 2000, 28, 8],
    ['LC-VASE', 'Bud vase', 2800, 4, 5],
    ['LC-JUG', 'Stoneware jug', 3400, 9, 4],
    ['LC-TEA', 'Teapot', 5400, 2, 3],
    ['LC-SET4', 'Dinner set for four', 12000, 6, 2],
  ],
  2: [
    ['HO-FIG', 'Fig and cedar candle', 2800, 40, 10],
    ['HO-SALT', 'Sea salt candle', 2400, 35, 10],
    ['HO-3WICK', 'Large three-wick candle', 4800, 11, 4],
    ['HO-TEA', 'Tea light set', 1200, 60, 15],
    ['HO-MELT', 'Wax melts', 900, 8, 12],
    ['HO-REED', 'Reed diffuser', 3200, 14, 5],
    ['HO-SNUF', 'Candle snuffer', 1500, 18, 5],
    ['HO-GIFT', 'Gift box', 6000, 9, 3],
  ],
}

const FIRST = ['Hannah', 'James', 'Amara', 'Oliver', 'Chloe', 'Daniel', 'Freya', 'Kwame', 'Isla', 'Rhys', 'Sofia', 'Ethan', 'Leah', 'Arjun', 'Megan', 'Callum', 'Zara', 'Finn', 'Ruby', 'Luca', 'Niamh', 'Theo', 'Esme', 'Adam', 'Maisie', 'Jacob', 'Aisha', 'Harvey', 'Poppy', 'Samuel']
const LAST = ['Webb', 'Carter', 'Okafor', 'Hughes', 'Patel', 'Morgan', 'Fraser', 'Mensah', 'Doyle', 'Price', 'Rossi', 'Baker', 'Shaw', 'Mehta', 'Lloyd', 'Grant', 'Malik', 'Byrne', 'Fox', 'Bianchi', 'Kelly', 'Ward', 'Turner', 'Ali', 'Bell', 'Reeves', 'Khan', 'Cole', 'Dunn', 'Ellis']
const STREETS = ['Mill Lane', 'Church Street', 'Station Road', 'Park Avenue', 'Orchard Close', 'Victoria Road', 'High Street', 'Meadow Way', 'Queens Road', 'Albert Terrace']
const TOWNS = [
  ['Hebden Bridge', 'HX7 8AB'], ['Totnes', 'TQ9 5RY'], ['Frome', 'BA11 1AA'], ['Ludlow', 'SY8 1AY'], ['Whitby', 'YO21 3DE'],
  ['Malvern', 'WR14 4PZ'], ['Kendal', 'LA9 4DL'], ['Hexham', 'NE46 1QJ'], ['Stroud', 'GL5 1AP'], ['Leith', 'EH6 6QU'],
]

// A small seeded random number generator, so every run makes the same data.
function random(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Draft = {
  shopId: number
  customer: string // email
  placedAt: string
  status?: string
  items: [string, number][] // [sku, quantity]
}

export function seed(db: DatabaseSync) {
  const rand = random(11)
  const pick = <T,>(list: readonly T[]) => list[Math.floor(rand() * list.length)]

  for (const s of SHOPS) db.prepare('INSERT INTO shops (id, name) VALUES (?, ?)').run(s.id, s.name)
  const hash = hashPassword(DEMO_PASSWORD)
  for (const u of USERS) {
    db.prepare('INSERT INTO users (id, shop_id, name, email, role, password_hash) VALUES (?, ?, ?, ?, ?, ?)').run(u.id, u.shopId, u.name, u.email, u.role, hash)
  }

  const productIds = new Map<string, { id: number; price: number }>()
  for (const [shopId, products] of Object.entries(PRODUCTS)) {
    for (const [sku, name, price, stock, reorderAt] of products) {
      const { lastInsertRowid } = db
        .prepare('INSERT INTO products (shop_id, sku, name, price_pence, stock, reorder_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(Number(shopId), sku, name, price, stock, reorderAt)
      productIds.set(sku, { id: Number(lastInsertRowid), price })
    }
  }

  // Customers: 40 for Larkspur, 25 for Hollow Oak, plus the two the lessons use.
  const customerIds = new Map<string, number>()
  const customersByShop: Record<number, string[]> = { 1: [], 2: [] }
  const addCustomer = (shopId: number, name: string, email: string, address: string) => {
    const { lastInsertRowid } = db.prepare('INSERT INTO customers (shop_id, name, email, address) VALUES (?, ?, ?, ?)').run(shopId, name, email, address)
    customerIds.set(`${shopId}:${email}`, Number(lastInsertRowid))
    customersByShop[shopId].push(email)
  }
  addCustomer(1, 'Hannah Webb', 'hannah.webb@example.com', '7 Orchard Close, Frome, BA11 2HD')
  addCustomer(2, 'Grace Lin', 'grace.lin@example.org', '4 Cotham Grove, Bristol, BS6 6AL')
  for (const [shopId, count] of [[1, 40], [2, 25]] as const) {
    let made = 0
    while (made < count) {
      const first = pick(FIRST)
      const last = pick(LAST)
      const email = `${first}.${last}${shopId === 2 ? '.home' : ''}@example.com`.toLowerCase()
      if (customerIds.has(`${shopId}:${email}`) || `${first} ${last}` === 'Hannah Webb') continue
      const [town, postcode] = pick(TOWNS)
      addCustomer(shopId, `${first} ${last}`, email, `${1 + Math.floor(rand() * 90)} ${pick(STREETS)}, ${town}, ${postcode}`)
      made++
    }
  }

  // Orders run from 1 October to 09:00 on Monday 16 November 2026.
  const drafts: Draft[] = []
  const at = (day: string, minutes: number) => new Date(Date.parse(`${day}T08:00:00Z`) + minutes * 60_000).toISOString()
  const basket = (shopId: number): [string, number][] => {
    const skus = PRODUCTS[shopId].map((p) => p[0])
    const lines = 1 + Math.floor(rand() * 3)
    const chosen = new Set<string>()
    while (chosen.size < lines) chosen.add(pick(skus))
    return [...chosen].map((sku) => [sku, rand() < 0.8 ? 1 : 2])
  }
  const days = (from: string, to: string) => {
    const out: string[] = []
    for (let d = Date.parse(from); d <= Date.parse(to); d += 86_400_000) out.push(new Date(d).toISOString().slice(0, 10))
    return out
  }
  const spread = (shopId: number, from: string, to: string, count: number) => {
    const list = days(from, to)
    for (let i = 0; i < count; i++) {
      const day = list[Math.floor((i * list.length) / count)]
      drafts.push({ shopId, customer: pick(customersByShop[shopId].slice(2)), placedAt: at(day, Math.floor(rand() * 13 * 60)), items: basket(shopId) })
    }
  }
  spread(1, '2026-10-01', '2026-10-31', 64) // exactly 64 Larkspur orders in October
  spread(2, '2026-10-01', '2026-10-31', 41)
  spread(1, '2026-11-01', '2026-11-13', 38)
  spread(2, '2026-11-01', '2026-11-13', 22)

  // The orders the lessons use.
  drafts.push({ shopId: 1, customer: 'hannah.webb@example.com', placedAt: at('2026-10-06', 190), items: [['LC-PLT-SD', 2]] })
  drafts.push({ shopId: 1, customer: 'hannah.webb@example.com', placedAt: at('2026-10-27', 75), items: [['LC-VASE', 1]] })
  drafts.push({ shopId: 1, customer: 'hannah.webb@example.com', placedAt: at('2026-11-10', 372), status: 'delivered', items: [['LC-MUG-L', 1], ['LC-BWL-SV', 1]] })
  drafts.push({ shopId: 2, customer: 'grace.lin@example.org', placedAt: at('2026-11-14', 145), status: 'shipped', items: [['HO-FIG', 2], ['HO-GIFT', 1]] })
  // Waiting to be packed: two from last week that are late, and the weekend's.
  drafts.push({ shopId: 1, customer: pick(customersByShop[1].slice(2)), placedAt: at('2026-11-11', 95), status: 'paid', items: [['LC-TEA', 1]] })
  drafts.push({ shopId: 1, customer: pick(customersByShop[1].slice(2)), placedAt: at('2026-11-12', 410), status: 'paid', items: [['LC-SET4', 1]] })
  drafts.push({ shopId: 1, customer: pick(customersByShop[1].slice(2)), placedAt: at('2026-11-14', 200), status: 'packed', items: [['LC-MUG-S', 2], ['LC-ESP', 2]] })
  drafts.push({ shopId: 1, customer: pick(customersByShop[1].slice(2)), placedAt: at('2026-11-15', 130), status: 'paid', items: [['LC-BWL-PA', 2]] })
  drafts.push({ shopId: 1, customer: pick(customersByShop[1].slice(2)), placedAt: at('2026-11-15', 560), status: 'paid', items: [['LC-JUG', 1], ['LC-MUG-L', 2]] })
  drafts.push({ shopId: 1, customer: pick(customersByShop[1].slice(2)), placedAt: at('2026-11-16', 40), status: 'paid', items: [['LC-PLT-DN', 4]] })
  drafts.push({ shopId: 2, customer: pick(customersByShop[2].slice(2)), placedAt: at('2026-11-15', 300), status: 'paid', items: [['HO-SALT', 1]] })
  drafts.push({ shopId: 2, customer: pick(customersByShop[2].slice(2)), placedAt: at('2026-11-16', 20), status: 'paid', items: [['HO-REED', 1]] })

  drafts.sort((a, b) => a.placedAt.localeCompare(b.placedAt))
  const clock = Date.parse('2026-11-16T09:30:00Z')
  let number = 1001
  for (const d of drafts) {
    const placed = Date.parse(d.placedAt)
    const ageDays = (clock - placed) / 86_400_000
    // Before 13 November everything has gone out; the lessons' own orders set their status above.
    const status = d.status ?? (ageDays > 5 ? 'delivered' : 'shipped')
    const shippedAt = status === 'paid' || status === 'packed' ? null : new Date(placed + (1 + Math.floor(rand() * 2)) * 86_400_000).toISOString()
    const lines = d.items.map(([sku, quantity]) => ({ ...productIds.get(sku)!, quantity }))
    const total = lines.reduce((sum, l) => sum + l.price * l.quantity, 0)
    db.prepare('INSERT INTO orders (number, shop_id, customer_id, placed_at, status, shipped_at, total_pence) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      number,
      d.shopId,
      customerIds.get(`${d.shopId}:${d.customer}`)!,
      d.placedAt,
      status,
      shippedAt,
      total,
    )
    for (const l of lines) {
      db.prepare('INSERT INTO order_items (order_number, product_id, quantity, price_pence) VALUES (?, ?, ?, ?)').run(number, l.id, l.quantity, l.price)
    }
    number++
  }

  // Three refunds from October, one of them for a whole order.
  const larkspurOctober = db
    .prepare("SELECT number, total_pence FROM orders WHERE shop_id = 1 AND placed_at < '2026-11-01' ORDER BY number")
    .all() as { number: number; total_pence: number }[]
  const refund = (orderNumber: number, amount: number, reason: string, by: number, day: string) => {
    db.prepare('INSERT INTO refunds (order_number, amount_pence, reason, refunded_by, created_at) VALUES (?, ?, ?, ?, ?)').run(orderNumber, amount, reason, by, `${day}T11:20:00.000Z`)
    db.prepare("UPDATE orders SET refunded_pence = refunded_pence + ?, status = CASE WHEN refunded_pence + ? >= total_pence THEN 'refunded' ELSE status END WHERE number = ?").run(amount, amount, orderNumber)
  }
  refund(larkspurOctober[9].number, 1800, 'Mug arrived chipped', 2, '2026-10-14')
  refund(larkspurOctober[30].number, larkspurOctober[30].total_pence, 'Parcel lost in the post', 1, '2026-10-24')
  refund(larkspurOctober[47].number, 2200, 'Wrong glaze sent', 2, '2026-10-29')
}

// npm run seed
if (import.meta.filename === process.argv[1]) {
  const path = process.env.STOCKROOM_DB ?? 'data/stockroom.db'
  const db = openDb(path)
  // Empty it in place, so it's safe to run while the app is running.
  db.exec('PRAGMA foreign_keys = OFF;')
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[]
  db.exec('BEGIN')
  for (const { name } of tables) db.exec(`DROP TABLE "${name}"`)
  db.exec(SCHEMA)
  seed(db)
  db.exec('COMMIT')
  db.exec('PRAGMA foreign_keys = ON;')
  const count = (sql: string) => (db.prepare(sql).get() as { n: number }).n
  console.log(`Seeded ${path}: ${count('SELECT count(*) AS n FROM orders')} orders, ${count('SELECT count(*) AS n FROM customers')} customers, ${count('SELECT count(*) AS n FROM products')} products.`)
  console.log(`Sign in as nadia@larkspur.test, tom@larkspur.test, priya@larkspur.test or owen@hollowoak.test, password "${DEMO_PASSWORD}".`)
}
