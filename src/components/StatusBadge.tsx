import type { OrderStatus } from '../api.ts'

const LABELS: Record<OrderStatus, string> = {
  paid: 'To pack',
  packed: 'Packed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  refunded: 'Refunded',
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`badge badge-${status}`}>{LABELS[status]}</span>
}
