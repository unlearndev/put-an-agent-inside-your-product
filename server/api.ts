import express, { type Request, type Response, type NextFunction } from 'express'
import { requireUser, signIn, sessionToken, SESSION_COOKIE } from './auth.ts'
import { NotAllowed, NotFound } from './permissions.ts'
import { searchOrders, getOrder, type OrderStatus } from './services/orders.ts'
import { listProducts } from './services/products.ts'
import { listCustomers, getCustomer } from './services/customers.ts'
import { refundOrder } from './services/refunds.ts'

export function createApi() {
  const api = express.Router()
  api.use(express.json())

  api.post('/session', async (req, res) => {
    const user = signIn(String(req.body?.email ?? ''), String(req.body?.password ?? ''))
    if (!user) return res.status(401).json({ error: 'That email and password don’t match.' })
    res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${await sessionToken(user)}; Path=/; HttpOnly; SameSite=Lax`)
    res.json(user)
  })

  api.delete('/session', (_req, res) => {
    res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
    res.status(204).end()
  })

  api.use(requireUser)

  api.get('/me', (req, res) => res.json(req.user))

  api.get('/orders', (req, res) => {
    res.json(searchOrders(req.user!, { status: (req.query.status as OrderStatus) || undefined, customer: (req.query.q as string) || undefined }))
  })

  api.get('/orders/:number', (req, res) => res.json(getOrder(req.user!, Number(req.params.number))))

  api.post('/orders/:number/refunds', (req, res) => {
    res.json(refundOrder(req.user!, Number(req.params.number), Number(req.body?.amountPence), String(req.body?.reason ?? 'Refunded by staff')))
  })

  api.get('/products', (req, res) => res.json(listProducts(req.user!, { lowStockOnly: req.query.low === '1' })))

  api.get('/customers', (req, res) => res.json(listCustomers(req.user!)))

  api.get('/customers/:id', (req, res) => res.json(getCustomer(req.user!, Number(req.params.id))))

  api.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof NotFound) return res.status(404).json({ error: err.message })
    if (err instanceof NotAllowed) return res.status(403).json({ error: err.message })
    console.error(err)
    res.status(500).json({ error: 'Something went wrong.' })
  })

  return api
}
