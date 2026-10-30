import { beforeEach, describe, expect, it } from 'vitest'
import { freshDb, nadia, tom, priya, owen, orderNumber } from './helpers.ts'
import { searchOrders, getOrder } from '../server/services/orders.ts'
import { listCustomers } from '../server/services/customers.ts'
import { refundOrder } from '../server/services/refunds.ts'
import { NotAllowed, NotFound } from '../server/permissions.ts'

beforeEach(() => {
  freshDb()
})

describe('orders', () => {
  it('only lists the signed-in user’s shop', () => {
    expect(searchOrders(tom()).length).toBeGreaterThan(0)
    const hollowOak = new Set(searchOrders(owen()).map((o) => o.number))
    expect(searchOrders(tom()).some((o) => hollowOak.has(o.number))).toBe(false)
  })

  it('won’t open another shop’s order', () => {
    expect(() => getOrder(tom(), orderNumber(2))).toThrow(NotFound)
  })

  it('hides customer emails from the warehouse', () => {
    const number = orderNumber(1)
    expect(getOrder(priya(), number).customerEmail).toBeNull()
    expect(getOrder(tom(), number).customerEmail).toContain('@')
  })
})

describe('customers', () => {
  it('are hidden from the warehouse', () => {
    expect(() => listCustomers(priya())).toThrow(NotAllowed)
    expect(listCustomers(tom()).length).toBeGreaterThan(0)
  })
})

describe('refunds', () => {
  it('lets support refund up to £50', () => {
    const number = orderNumber(1, "status = 'delivered' AND total_pence > 6000")
    expect(refundOrder(tom(), number, 2400, 'Cracked').refundedPence).toBe(2400)
    expect(() => refundOrder(tom(), number, 5100, 'Cracked')).toThrow(NotAllowed)
  })

  it('lets the owner refund more', () => {
    const number = orderNumber(1, "status = 'delivered' AND total_pence > 6000")
    expect(refundOrder(nadia(), number, 6000, 'Lost').refundedPence).toBe(6000)
  })

  it('never lets the warehouse refund', () => {
    expect(() => refundOrder(priya(), orderNumber(1, "status = 'delivered'"), 100, 'Test')).toThrow(NotAllowed)
  })
})
