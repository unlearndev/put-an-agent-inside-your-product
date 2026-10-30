import express from 'express'
import { getDb } from './db.ts'
import { seed } from './seed.ts'
import { createApi } from './api.ts'
import { assistantRoute } from './assistant/route.ts'

// The whole back end: Vite's dev server mounts this app (server/vite-plugin.ts).
export function createApp() {
  const db = getDb()
  if (!db.prepare('SELECT 1 FROM shops LIMIT 1').get()) seed(db)

  const app = express()
  app.use('/api', assistantRoute())
  app.use('/api', createApi())
  return app
}
