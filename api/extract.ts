import { handleExtract } from './_core'
import { clientIp } from './_ratelimit'

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return Response.json({ ok: false, code: 'no_input', message: 'POST an offer.' }, { status: 405 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    payload = null
  }

  const result = await handleExtract(payload, clientIp(request.headers))

  return Response.json(result.body, {
    status: result.status,
    headers: { 'cache-control': 'no-store', ...result.headers },
  })
}
