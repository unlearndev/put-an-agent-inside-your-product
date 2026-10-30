export type Role = 'owner' | 'support' | 'warehouse'
export type User = { id: number; shopId: number; shopName: string; name: string; email: string; role: Role }
export type OrderStatus = 'paid' | 'packed' | 'shipped' | 'delivered' | 'refunded'
export type OrderSummary = { number: number; placedAt: string; customer: string; totalPence: number; status: OrderStatus }
export type OrderDetail = OrderSummary & {
  shippedAt: string | null
  refundedPence: number
  customerId: number
  customerEmail: string | null
  deliveryAddress: string
  items: { sku: string; name: string; quantity: number; pricePence: number }[]
  refunds: { amountPence: number; reason: string; createdAt: string }[]
}
export type Product = { sku: string; name: string; pricePence: number; stock: number; reorderAt: number; lowStock: boolean }
export type Customer = { id: number; name: string; email: string; address: string; orders?: OrderSummary[] }

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  })
  if (res.status === 204) return undefined as T
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(body.error ?? 'Something went wrong.', res.status)
  return body as T
}

export const pounds = (pence: number) => `£${(pence / 100).toFixed(2)}`

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })

export const roleName: Record<Role, string> = { owner: 'Owner', support: 'Support', warehouse: 'Warehouse' }
