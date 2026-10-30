import { useState } from 'react'
import { api, pounds, type OrderDetail } from '../api.ts'

export type Proposal = { id: string; orderNumber: number; customer: string; amount: string; reason: string }

// The assistant proposed it. Nothing is refunded until the person presses Confirm.
export function ProposedRefund({ proposal }: { proposal: Proposal }) {
  const [state, setState] = useState<'waiting' | 'busy' | 'confirmed' | 'declined'>('waiting')
  const [message, setMessage] = useState('')

  const confirm = async () => {
    setState('busy')
    try {
      const order = await api<OrderDetail>(`/proposed-refunds/${proposal.id}/confirm`, { method: 'POST' })
      setState('confirmed')
      window.dispatchEvent(new Event('stockroom:changed')) // so the page behind updates
      setMessage(`Refunded ${proposal.amount}. ${pounds(order.refundedPence)} refunded on this order in total.`)
    } catch (e) {
      setState('waiting')
      setMessage((e as Error).message)
    }
  }

  const decline = async () => {
    setState('busy')
    await api(`/proposed-refunds/${proposal.id}/decline`, { method: 'POST' }).catch(() => {})
    setState('declined')
    setMessage('Declined. Nothing was refunded.')
  }

  return (
    <div className={`proposal ${state}`}>
      <div className="proposal-title">Refund {proposal.amount} on order #{proposal.orderNumber}?</div>
      <div className="muted">{proposal.customer} · {proposal.reason}</div>
      {(state === 'waiting' || state === 'busy') && (
        <div className="proposal-actions">
          <button className="primary" onClick={confirm} disabled={state === 'busy'}>Confirm refund</button>
          <button className="secondary" onClick={decline} disabled={state === 'busy'}>Decline</button>
        </div>
      )}
      {message && <p className={state === 'waiting' ? 'error' : 'proposal-result'}>{message}</p>}
    </div>
  )
}
