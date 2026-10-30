import { useEffect, useState } from 'react'
import { api, pounds, shortDate, type OrderDetail, type User } from '../api.ts'
import { Link } from '../router.tsx'
import { StatusBadge } from '../components/StatusBadge.tsx'

export function Order({ number, user }: { number: number; user: User }) {
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [error, setError] = useState('')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [refundError, setRefundError] = useState('')

  useEffect(() => {
    setOrder(null)
    setError('')
    api<OrderDetail>(`/orders/${number}`).then(setOrder, (e) => setError(e.message))
  }, [number])

  if (error) return <div className="empty">{error} <Link to="/orders">Back to orders</Link></div>
  if (!order) return null

  const remaining = order.totalPence - order.refundedPence
  const refund = async () => {
    setRefundError('')
    try {
      const amountPence = Math.round(Number(amount) * 100)
      setOrder(await api<OrderDetail>(`/orders/${number}/refunds`, { method: 'POST', body: JSON.stringify({ amountPence, reason: reason || 'Refunded by staff' }) }))
      setAmount('')
      setReason('')
    } catch (e) {
      setRefundError((e as Error).message)
    }
  }

  return (
    <>
      <header className="page-header">
        <h1>
          Order <span className="mono">#{order.number}</span> <StatusBadge status={order.status} />
        </h1>
        <Link to="/orders" className="link">All orders</Link>
      </header>
      <div className="grid">
        <section className="card">
          <h2>Items</h2>
          <table className="table compact">
            <tbody>
              {order.items.map((i) => (
                <tr key={i.sku}>
                  <td>{i.name}</td>
                  <td className="num">× {i.quantity}</td>
                  <td className="num">{pounds(i.pricePence * i.quantity)}</td>
                </tr>
              ))}
              <tr className="total">
                <td>Total</td>
                <td />
                <td className="num">{pounds(order.totalPence)}</td>
              </tr>
            </tbody>
          </table>
          {order.refunds.length > 0 && (
            <>
              <h2>Refunds</h2>
              <ul className="plain">
                {order.refunds.map((r, i) => (
                  <li key={i}>
                    {pounds(r.amountPence)} on {shortDate(r.createdAt)}: {r.reason}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
        <section className="card">
          <h2>Customer</h2>
          <p className="strong">{order.customer}</p>
          {order.customerEmail && <p>{order.customerEmail}</p>}
          <p className="muted">{order.deliveryAddress}</p>
          <h2>Timeline</h2>
          <ul className="plain">
            <li>Placed {shortDate(order.placedAt)}</li>
            {order.shippedAt && <li>Shipped {shortDate(order.shippedAt)}</li>}
          </ul>
        </section>
        {user.role !== 'warehouse' && remaining > 0 && (
          <section className="card">
            <h2>Refund</h2>
            <p className="muted">
              {pounds(remaining)} left to refund.
              {user.role === 'support' && ' Support can refund up to £50.00 an order.'}
            </p>
            <div className="refund-form">
              <input placeholder="Amount, e.g. 24.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <input placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
              <button className="primary" onClick={refund} disabled={!amount}>Refund</button>
            </div>
            {refundError && <p className="error">{refundError}</p>}
          </section>
        )}
      </div>
    </>
  )
}
