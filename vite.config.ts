/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Serve /api/extract during `npm run dev`.
 *
 * Vercel runs api/extract.ts in production; this mounts the same handleExtract
 * on the dev server so local development and the deployed site exercise one
 * implementation. Without it you would be developing against a stub and
 * discovering the differences during the demo.
 *
 * The key is read here, in the config, and only ever reaches the middleware —
 * Vite exposes nothing to the browser bundle unless it is prefixed VITE_, and
 * this deliberately is not.
 */
function extractApi(env: Record<string, string>): Plugin {
  return {
    name: 'second-door:extract-api',
    configureServer(server) {
      server.middlewares.use('/api/extract', async (req, res) => {
        const { handleExtract } = await import('./api/_core.ts')

        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ ok: false, code: 'no_input', message: 'POST an offer.' }))
          return
        }

        const chunks: Buffer[] = []
        for await (const chunk of req) chunks.push(chunk as Buffer)

        let payload: unknown = null
        try {
          payload = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        } catch {
          payload = null
        }

        const previous = { key: process.env.GEMINI_API_KEY, demo: process.env.DEMO_ONLY }
        process.env.GEMINI_API_KEY = env.GEMINI_API_KEY ?? previous.key
        process.env.DEMO_ONLY = env.DEMO_ONLY ?? previous.demo

        const forwarded = req.headers['x-forwarded-for']
        const ip =
          (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0].trim() ??
          req.socket.remoteAddress ??
          'local'

        const result = await handleExtract(payload, ip)

        res.statusCode = result.status
        res.setHeader('content-type', 'application/json')
        res.setHeader('cache-control', 'no-store')
        for (const [name, value] of Object.entries(result.headers ?? {})) {
          res.setHeader(name, value)
        }
        res.end(JSON.stringify(result.body))
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), extractApi(env)],
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  }
})
