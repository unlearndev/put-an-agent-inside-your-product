import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, existsSync } from 'node:fs'
import { dirname } from 'node:path'

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS shops (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'support', 'warehouse')),
  password_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id),
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  price_pence INTEGER NOT NULL,
  stock INTEGER NOT NULL,
  reorder_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS orders (
  number INTEGER PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id),
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  placed_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('paid', 'packed', 'shipped', 'delivered', 'refunded')),
  shipped_at TEXT,
  total_pence INTEGER NOT NULL,
  refunded_pence INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS order_items (
  order_number INTEGER NOT NULL REFERENCES orders(number),
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  price_pence INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS refunds (
  id INTEGER PRIMARY KEY,
  order_number INTEGER NOT NULL REFERENCES orders(number),
  amount_pence INTEGER NOT NULL,
  reason TEXT NOT NULL,
  refunded_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS assistant_messages (
  conversation_id TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  position INTEGER NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (conversation_id, position)
);
`

let db: DatabaseSync | undefined

export function openDb(path = process.env.STOCKROOM_DB ?? 'data/stockroom.db'): DatabaseSync {
  if (path !== ':memory:' && !existsSync(dirname(path))) mkdirSync(dirname(path), { recursive: true })
  const conn = new DatabaseSync(path)
  conn.exec('PRAGMA foreign_keys = ON;')
  conn.exec(SCHEMA)
  return conn
}

export function getDb(): DatabaseSync {
  db ??= openDb()
  return db
}

export function setDb(conn: DatabaseSync) {
  db = conn
}
