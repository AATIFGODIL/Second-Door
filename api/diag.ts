import type { IncomingMessage, ServerResponse } from 'node:http'

// Temporary. Loads each of extract's dependencies in isolation and reports
// which one fails, because FUNCTION_INVOCATION_FAILED says nothing.
const TARGETS: Array<[string, () => Promise<unknown>]> = [
  ['zod', () => import('zod')],
  ['@google/genai', () => import('@google/genai')],
  ['src/lib/offer', () => import('../src/lib/offer')],
  ['src/data/examples', () => import('../src/data/examples')],
  ['api/_ratelimit', () => import('./_ratelimit')],
  ['api/_core', () => import('./_core')],
]

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  const results: Record<string, string> = {}

  for (const [name, load] of TARGETS) {
    try {
      await load()
      results[name] = 'ok'
    } catch (error) {
      const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
      // Never echo anything key-shaped back out of this endpoint.
      results[name] = message.replace(/[A-Za-z0-9_-]{25,}/g, '[redacted]').slice(0, 400)
    }
  }

  res.statusCode = 200
  res.setHeader('content-type', 'application/json')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(results, null, 1))
}
