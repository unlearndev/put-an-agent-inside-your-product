export type Role = 'owner' | 'support' | 'warehouse'

export type User = {
  id: number
  shopId: number
  shopName: string
  name: string
  email: string
  role: Role
}

export class NotAllowed extends Error {}
export class NotFound extends Error {}

// Support staff can refund up to £50 an order. Anything bigger needs the shop's owner.
export const SUPPORT_REFUND_LIMIT_PENCE = 5000

export function canSeeCustomerDetails(user: User): boolean {
  return user.role === 'owner' || user.role === 'support'
}

// alreadyRefundedPence: what's been refunded on this order before, since the limit is per order.
export function assertCanRefund(user: User, amountPence: number, alreadyRefundedPence = 0) {
  if (user.role === 'warehouse') {
    throw new NotAllowed('Warehouse staff can’t refund orders. Ask the shop’s owner or support.')
  }
  if (user.role === 'support' && alreadyRefundedPence + amountPence > SUPPORT_REFUND_LIMIT_PENCE) {
    throw new NotAllowed('Support staff can refund up to £50.00 an order. Ask the shop’s owner for anything more.')
  }
}
