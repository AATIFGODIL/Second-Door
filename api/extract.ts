import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleExtract } from './_core'
import { clientIp } from './_ratelimit'

const MAX_BODY_BYTES = 6 * 1024 * 1024

type WithParsedBody = IncomingMessage & { body?: unknown }

async function readBody(req: WithParsedBody): Promise<unknown> {
  // Vercel parses JSON bodies for us; the dev server does not.
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body !== 'string') return req.body
    try {
      return JSON.parse(req.body)
    } catch {
      return null
    }
  }

  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buf = chunk as Buffer
    size += buf.length
    if (size > MAX_BODY_BYTES) return null
    chunks.push(buf)
  }
  if (chunks.length === 0) return null

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    return null
  }
}

export default async function handler(req: WithParsedBody, res: ServerResponse) {
  const send = (status: number, body: unknown, headers: Record<string, string> = {}) => {
    res.statusCode = status
    res.setHeader('content-type', 'application/json')
    res.setHeader('cache-control', 'no-store')
    for (const [name, value] of Object.entries(headers)) res.setHeader(name, value)
    res.end(JSON.stringify(body))
  }

  if (req.method !== 'POST') {
    send(405, { ok: false, code: 'no_input', message: 'POST an offer.' })
    return
  }

  try {
    const result = await handleExtract(await readBody(req), clientIp(req.headers))
    send(result.status, result.body, result.headers)
  } catch {
    send(502, {
      ok: false,
      code: 'upstream',
      message: 'The reader is unavailable. Type the numbers in instead.',
    })
  }
}
