import type { Plugin } from 'vite'
import { createApp } from './app.ts'

// Mounts Stockroom's back end inside Vite's dev server, so `npm run dev` serves the whole app on one port.
export function stockroomServer(): Plugin {
  return {
    name: 'stockroom-server',
    configureServer(server) {
      const app = createApp()
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith('/api')) return app(req as any, res as any, next)
        next()
      })
    },
  }
}
