import { beforeEach, describe, expect, it } from 'vitest'
import { freshDb, tom, priya } from './helpers.ts'
import { mcpAs } from './mcp-client.ts'

beforeEach(() => {
  freshDb()
})

// Order 1171, Grace Lin and the candles belong to Hollow Oak Candles. Tom works at Larkspur Ceramics.
const HOLLOW_OAK = ['Hollow Oak', 'Grace Lin', 'Cotham Grove', 'Fig and cedar', 'Gift box']

// Every tool, called as Tom, with Hollow Oak's identifiers where it takes one.
const otherShop = [
  ['search_orders', { customer: 'Grace' }],
  ['get_order', { number: 1171 }],
  ['track_order', { number: 1171 }],
  ['find_customer', { query: 'grace.lin@example.org' }],
  ['list_products', {}],
  ['refund_order', { number: 1171, amountPence: 100, reason: 'Test' }],
] as const

describe('every tool stays inside the user’s shop', () => {
  // A new tool fails here until it's added to the list above.
  it('covers every tool the server has', async () => {
    const { client } = await mcpAs(tom())
    const { tools } = await client.listTools()
    expect(tools.map((t) => t.name).sort()).toEqual(otherShop.map(([name]) => name).sort())
  })

  it.each(otherShop)('%s', async (tool, args) => {
    const { call } = await mcpAs(tom())
    const { text } = await call(tool, args)
    for (const name of HOLLOW_OAK) expect(text).not.toContain(name)
  })
})

describe('the warehouse never sees customer emails', () => {
  it.each([
    ['get_order', { number: 1154 }],
    ['track_order', { number: 1154 }],
    ['find_customer', { query: 'Hannah Webb' }],
  ] as const)('%s', async (tool, args) => {
    const { call } = await mcpAs(priya())
    expect((await call(tool, args)).text).not.toContain('@example.com')
  })
})
