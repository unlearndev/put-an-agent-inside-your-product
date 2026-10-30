import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { stockroomServer } from './server/vite-plugin.ts'

export default defineConfig(({ mode }) => {
  // Load .env into the server's environment. Anything already set in the environment wins.
  for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), ''))) process.env[key] ??= value
  return {
    plugins: [react(), stockroomServer()],
  }
})
