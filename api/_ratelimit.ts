import type { IncomingHttpHeaders } from 'node:http'

// Best effort only. Serverless instances do not share memory and cold start
// constantly, so this stops casual looping and nothing more. The spend cap,
// the cheap model and DEMO_ONLY are what actually protect the key.

const WINDOW_MS = 60 * 60 * 1000
const MAX_PER_WINDOW = 10

const hits = new Map<string, number[]>()

export type RateVerdict = { allowed: true } | { allowed: false; retryAfterSeconds: number }

export function checkRate(ip: string, now = Date.now()): RateVerdict {
  const cutoff = now - WINDOW_MS
  const recent = (hits.get(ip) ?? []).filter((at) => at > cutoff)

  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent)
    return { allowed: false, retryAfterSeconds: Math.ceil((recent[0] + WINDOW_MS - now) / 1000) }
  }

  recent.push(now)
  hits.set(ip, recent)

  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (times.every((at) => at <= cutoff)) hits.delete(key)
    }
  }

  return { allowed: true }
}

export function clientIp(headers: IncomingHttpHeaders): string {
  const first = (value: string | string[] | undefined) =>
    (Array.isArray(value) ? value[0] : value)?.split(',')[0].trim()
  return first(headers['x-forwarded-for']) ?? first(headers['x-real-ip']) ?? 'unknown'
}
