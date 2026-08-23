/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'

type Handler = (req: IncomingMessage, res: ServerResponse) => Promise<void>

/**
 * Mount the real api/ handlers on the dev server.
 *
 * Loaded through ssrLoadModule rather than imported, so the api graph never
 * enters the config module graph and its imports can stay extensionless for
 * Vercel. Calling the same default export the platform calls is the point: the
 * previous version reimplemented the request handling here, which hid a
 * signature mismatch that only showed up in production.
 *
 * The key is read here and reaches the handler through process.env. Vite
 * exposes nothing to the browser bundle unless it is prefixed VITE_.
 */
function apiRoutes(env: Record<string, string>): Plugin {
  return {
    name: 'second-door:api',
    configureServer(server) {
      for (const route of ['extract', 'health']) {
        server.middlewares.use(`/api/${route}`, async (req, res) => {
          process.env.GEMINI_API_KEY = env.GEMINI_API_KEY ?? process.env.GEMINI_API_KEY
          process.env.DEMO_ONLY = env.DEMO_ONLY ?? process.env.DEMO_ONLY

          const module = (await server.ssrLoadModule(`/api/${route}.ts`)) as { default: Handler }
          await module.default(req, res)
        })
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), apiRoutes(env)],
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  }
})
