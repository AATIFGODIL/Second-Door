/**
 * A per-IP request limiter, and an honest account of what it is worth.
 *
 * This is a speed bump, not a control. Serverless instances do not share
 * memory and cold-start constantly, so a determined caller spread across
 * instances gets a multiple of the nominal limit, and every deploy resets the
 * table. Making it real needs a shared store (Vercel KV, Upstash), which is a
 * dependency and an account we have not taken on.
 *
 * What actually protects the key is the spend cap set in the Google AI Studio
 * console, using a Flash-Lite model for extraction, a small output cap, and
 * the DEMO_ONLY flag that removes the upstream call entirely. This stops casual
 * looping. It does not stop anyone who is trying.
 */

const WINDOW_MS = 60 * 60 * 1000
const MAX_PER_WINDOW = 10

/** Timestamps of recent calls, per IP. Lives only as long as this instance. */
const hits = new Map<string, number[]>()

export type RateVerdict = { allowed: true } | { allowed: false; retryAfterSeconds: number }

export function checkRate(ip: string, now = Date.now()): RateVerdict {
  const cutoff = now - WINDOW_MS
  const recent = (hits.get(ip) ?? []).filter((at) => at > cutoff)

  if (recent.length >= MAX_PER_WINDOW) {
    const oldest = recent[0]
    hits.set(ip, recent)
    return { allowed: false, retryAfterSeconds: Math.ceil((oldest + WINDOW_MS - now) / 1000) }
  }

  recent.push(now)
  hits.set(ip, recent)

  // Cheap sweep so a long-lived instance does not accumulate dead keys.
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (times.every((at) => at <= cutoff)) hits.delete(key)
    }
  }

  return { allowed: true }
}

/** Best available client address behind Vercel's proxy. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return headers.get('x-real-ip') ?? 'unknown'
}
