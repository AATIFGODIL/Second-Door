import type { IncomingMessage, ServerResponse } from 'node:http'

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.statusCode = 200
  res.setHeader('content-type', 'application/json')
  res.setHeader('cache-control', 'no-store')
  res.end(
    JSON.stringify({
      ok: true,
      method: req.method,
      node: process.version,
      hasKey: Boolean(process.env.GEMINI_API_KEY),
      demoOnly: process.env.DEMO_ONLY ?? null,
    }),
  )
}
