import { beforeEach, describe, expect, it } from 'vitest'
import { freshDb, tom, priya, owen, orderNumber } from './helpers.ts'
import { mcpAs } from './mcp-client.ts'

beforeEach(() => {
  freshDb()
})

describe('Stockroom MCP server', () => {
  it('lists the tools from the spec', async () => {
    const { client } = await mcpAs(tom())
    const { tools } = await client.listTools()
    expect(tools.map((t) => t.name).sort()).toEqual(['find_customer', 'get_order', 'list_products', 'propose_refund', 'search_orders', 'track_order'])
  })

  it('searches orders in the user’s own shop', async () => {
    const { call } = await mcpAs(tom())
    const orders = (await call('search_orders', { status: 'paid' })).json()
    expect(orders.map((o: { number: number }) => o.number)).toEqual([1177, 1175, 1173, 1166, 1157])
  })

  it('gets an order by number', async () => {
    const { call } = await mcpAs(tom())
    const order = (await call('get_order', { number: 1154 })).json()
    expect(order.customer).toBe('Hannah Webb')
    expect(order.total).toBe('£62.00')
  })

  it('doesn’t show the warehouse customer details', async () => {
    const { call } = await mcpAs(priya())
    expect((await call('get_order', { number: 1154 })).json().customerEmail).toBeUndefined()
    const result = await call('find_customer', { query: 'Hannah Webb' })
    expect(result.isError).toBe(true)
  })

  it('proposes refunds within the user’s limit, and refuses above it', async () => {
    const { call } = await mcpAs(tom())
    expect((await call('propose_refund', { number: 1154, amountPence: 2400, reason: 'Cracked mug' })).json().proposal.amount).toBe('£24.00')
    const tooMuch = await call('propose_refund', { number: 1154, amountPence: 6200, reason: 'Whole order' })
    expect(tooMuch.isError).toBe(true)
    expect(tooMuch.text).toContain('£50.00')
  })

  it('tracks an order', async () => {
    const { call } = await mcpAs(tom())
    const order = (await call('track_order', { number: 1154 })).json()
    expect(order.status).toBe('delivered')
    expect(order.shipped).toBe('2026-11-12')
  })

  it('lists low stock', async () => {
    const { call } = await mcpAs(tom())
    const low = (await call('list_products', { lowStockOnly: true })).json()
    expect(low.map((p: { name: string }) => p.name)).toEqual(['Bud vase', 'Espresso cup', 'Teapot'])
  })

  it('keeps Hollow Oak’s orders away from Larkspur', async () => {
    const { call } = await mcpAs(owen())
    expect((await call('get_order', { number: orderNumber(1) })).isError).toBe(true)
  })
})
