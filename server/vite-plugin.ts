import type { Plugin } from 'vite'
import { createApp } from './app.ts'
import { mcpEndpoint } from './mcp/http.ts'

// Mounts Stockroom's back end inside Vite's dev server, so `npm run dev` serves the whole app on one port:
// the API at /api and the MCP server at /mcp.
export function stockroomServer(): Plugin {
  return {
    name: 'stockroom-server',
    configureServer(server) {
      const app = createApp()
      const mcp = mcpEndpoint()
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith('/api')) return app(req as any, res as any, next)
        if (req.url === '/mcp') return mcp(req, res)
        next()
      })
    },
  }
}
