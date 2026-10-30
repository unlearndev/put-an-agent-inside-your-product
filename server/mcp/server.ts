import { McpServer, type CallToolResult } from '@modelcontextprotocol/server'
import * as z from 'zod'
import { NotAllowed, NotFound, type User } from '../permissions.ts'
import { searchOrders, getOrder, type OrderSummary, type OrderDetail } from '../services/orders.ts'
import { findCustomer } from '../services/customers.ts'
import { listProducts } from '../services/products.ts'
import { refundOrder } from '../services/refunds.ts'
import { pounds } from '../money.ts'

// Stockroom's MCP server, built for one signed-in user. Every tool runs as that user,
// through the same services the app uses, so it can only reach what they can.
export function stockroomMcpServer(user: User): McpServer {
  const server = new McpServer({ name: 'stockroom', version: '1.0.0' })

  server.registerTool(
    'search_orders',
    {
      title: 'Search orders',
      description:
        'Find this shop’s orders by status, customer, or the dates they were placed. Use it for questions about several orders, ' +
        'like which are waiting to be packed or what came in last week. Status "paid" means paid and waiting to be packed.',
      inputSchema: z.object({
        status: z.enum(['paid', 'packed', 'shipped', 'delivered', 'refunded']).optional(),
        customer: z.string().optional().describe('Part of the customer’s name or email'),
        placedFrom: z.string().optional().describe('First day to include, as YYYY-MM-DD'),
        placedTo: z.string().optional().describe('Last day to include, as YYYY-MM-DD'),
      }),
      annotations: { readOnlyHint: true },
    },
    async (filters) => run(() => searchOrders(user, { ...filters, limit: 20 }).map(summary)),
  )

  server.registerTool(
    'get_order',
    {
      title: 'Get an order',
      description: 'Get one order by its number: items, customer, delivery address, status, dates and refunds. Use it whenever someone mentions an order number.',
      inputSchema: z.object({ number: z.number().int().describe('The order number, like 1154') }),
      annotations: { readOnlyHint: true },
    },
    async ({ number }) => run(() => detail(getOrder(user, number))),
  )

  server.registerTool(
    'track_order',
    {
      title: 'Track an order',
      description:
        'Where an order is: its status, when it shipped, and who it’s going to. Use it when someone asks whether an order has shipped or where a parcel is, ' +
        'usually because a customer has emailed quoting the order number.',
      inputSchema: z.object({ number: z.number().int().describe('The order number the customer quoted') }),
      annotations: { readOnlyHint: true },
    },
    async ({ number }) =>
      run(() => {
        const order = getOrder(user, number)
        return {
          number: order.number,
          status: order.status,
          placed: order.placedAt.slice(0, 10),
          shipped: order.shippedAt?.slice(0, 10) ?? null,
          customer: order.customer,
          customerEmail: order.customerEmail ?? undefined,
          deliveryAddress: order.deliveryAddress,
        }
      }),
  )

  server.registerTool(
    'find_customer',
    {
      title: 'Find a customer',
      description: 'Look up one customer by their email or part of their name, with their past orders. Owners and support staff only.',
      inputSchema: z.object({ query: z.string().describe('Email address or part of the name') }),
      annotations: { readOnlyHint: true },
    },
    async ({ query }) =>
      run(() => {
        const c = findCustomer(user, query)
        return { name: c.name, email: c.email, address: c.address, orders: c.orders.map(summary) }
      }),
  )

  server.registerTool(
    'list_products',
    {
      title: 'List products',
      description: 'List this shop’s products with their price and stock. Set lowStockOnly to see only what has reached its reorder level.',
      inputSchema: z.object({ lowStockOnly: z.boolean().optional() }),
      annotations: { readOnlyHint: true },
    },
    async ({ lowStockOnly }) =>
      run(() => listProducts(user, { lowStockOnly }).map((p) => ({ sku: p.sku, name: p.name, price: pounds(p.pricePence), stock: p.stock, reorderAt: p.reorderAt, lowStock: p.lowStock }))),
  )

  server.registerTool(
    'refund_order',
    {
      title: 'Refund an order',
      description: 'Refund some or all of an order, for example when something arrived broken. Support staff can refund up to £50.00 an order.',
      inputSchema: z.object({
        number: z.number().int().describe('The order number'),
        amountPence: z.number().int().positive().describe('How much to refund, in pence: 2400 is £24.00'),
        reason: z.string().describe('Why, in a few words'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ number, amountPence, reason }) => run(() => detail(refundOrder(user, number, amountPence, reason))),
  )

  return server
}

function summary(o: OrderSummary) {
  return { number: o.number, placed: o.placedAt.slice(0, 10), customer: o.customer, total: pounds(o.totalPence), status: o.status }
}

function detail(o: OrderDetail) {
  return {
    ...summary(o),
    customerEmail: o.customerEmail ?? undefined,
    deliveryAddress: o.deliveryAddress,
    shipped: o.shippedAt?.slice(0, 10) ?? null,
    items: o.items.map((i) => ({ name: i.name, quantity: i.quantity, price: pounds(i.pricePence) })),
    refunded: pounds(o.refundedPence),
    refunds: o.refunds.map((r) => ({ amount: pounds(r.amountPence), reason: r.reason, on: r.createdAt.slice(0, 10) })),
  }
}

// Results go back as JSON. A permission or not-found error goes back as a tool error the model can read.
function run(fn: () => unknown): CallToolResult {
  try {
    return { content: [{ type: 'text', text: JSON.stringify(fn()) }] }
  } catch (error) {
    if (error instanceof NotFound || error instanceof NotAllowed) {
      return { content: [{ type: 'text', text: error.message }], isError: true }
    }
    throw error
  }
}
