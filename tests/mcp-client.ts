import { Client, InMemoryTransport } from '@modelcontextprotocol/client'
import { stockroomMcpServer } from '../server/mcp/server.ts'
import type { User } from '../server/permissions.ts'

// An MCP client connected to Stockroom's MCP server for one user, in memory.
export async function mcpAs(user: User) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await stockroomMcpServer(user).connect(serverTransport)
  const client = new Client({ name: 'stockroom-tests', version: '1.0.0' })
  await client.connect(clientTransport)
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const result = await client.callTool({ name, arguments: args })
    const text = (result.content as { type: string; text: string }[]).map((c) => c.text).join('')
    return { isError: Boolean(result.isError), text, json: () => JSON.parse(text) }
  }
  return { client, call }
}
