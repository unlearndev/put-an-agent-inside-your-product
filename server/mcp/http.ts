import type { IncomingMessage, ServerResponse } from 'node:http'
import { createMcpHandler } from '@modelcontextprotocol/server'
import { toNodeHandler, localhostHostValidation } from '@modelcontextprotocol/node'
import { stockroomMcpServer } from './server.ts'
import { verifyMcpToken } from './tokens.ts'
import type { User } from '../permissions.ts'

// POST /mcp: Stockroom's MCP server over Streamable HTTP.
// The token is checked here, before the MCP handler, and the server is built for that one user.
export function mcpEndpoint() {
  const handler = createMcpHandler(({ authInfo }) => stockroomMcpServer(authInfo?.extra?.user as User))
  const node = toNodeHandler(handler)
  const validateHost = localhostHostValidation()

  return async (req: IncomingMessage & { auth?: any }, res: ServerResponse) => {
    if (!validateHost(req, res)) return
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1]
    const user = token ? await verifyMcpToken(token) : undefined
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json', 'WWW-Authenticate': 'Bearer' })
      return res.end(JSON.stringify({ error: 'Send a Stockroom MCP token as a bearer token.' }))
    }
    req.auth = { token, clientId: `user-${user.id}`, scopes: [], extra: { user } }
    await node(req, res)
  }
}
