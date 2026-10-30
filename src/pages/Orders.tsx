import { useEffect, useState } from 'react'
import { api, pounds, shortDate, type OrderStatus, type OrderSummary } from '../api.ts'
import { navigate } from '../router.tsx'
import { StatusBadge } from '../components/StatusBadge.tsx'

const FILTERS: [OrderStatus | '', string][] = [
  ['', 'All'],
  ['paid', 'To pack'],
  ['packed', 'Packed'],
  ['shipped', 'Shipped'],
  ['delivered', 'Delivered'],
  ['refunded', 'Refunded'],
]

export function Orders() {
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [go, setGo] = useState('')

  useEffect(() => {
    api<OrderSummary[]>(`/orders${status ? `?status=${status}` : ''}`).then(setOrders)
  }, [status])

  return (
    <>
      <header className="page-header">
        <h1>Orders</h1>
        <form
          className="go-to"
          onSubmit={(e) => {
            e.preventDefault()
            if (go.trim()) navigate(`/orders/${go.trim().replace('#', '')}`)
          }}
        >
          <input placeholder="Go to order #" value={go} onChange={(e) => setGo(e.target.value)} />
        </form>
      </header>
      <div className="filters">
        {FILTERS.map(([value, label]) => (
          <button key={label} className={status === value ? 'chip active' : 'chip'} onClick={() => setStatus(value)}>
            {label}
          </button>
        ))}
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Placed</th>
            <th>Customer</th>
            <th className="num">Total</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.number} onClick={() => navigate(`/orders/${o.number}`)}>
              <td className="mono">#{o.number}</td>
              <td>{shortDate(o.placedAt)}</td>
              <td>{o.customer}</td>
              <td className="num">{pounds(o.totalPence)}</td>
              <td><StatusBadge status={o.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
