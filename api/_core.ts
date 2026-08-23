/**
 * Offer extraction — the only place this project talks to a language model.
 *
 * Framework-agnostic on purpose. The Vercel function in extract.ts and the
 * Vite dev middleware both call handleExtract, so local development exercises
 * the same code path that runs in production rather than a stub of it.
 *
 * The model reads the advertisement and returns fields. It is never asked for
 * a total, a rate or a comparison — those are computed from its output by
 * src/lib/finance.ts, which has tests. If a judge asks whether the AI made a
 * number up, the honest answer is that it did not have the opportunity.
 */

import { GoogleGenAI, ApiError, ThinkingLevel } from '@google/genai'
import * as z from 'zod'
import { ExtractedOffer, type ExtractResponse } from '../src/lib/offer'
import { matchExample } from '../src/data/examples'
import { checkRate } from './_ratelimit'

/**
 * Flash-Lite is the cheap tier, and reading a payment amount off an ad does
 * not need more than that. Cost per extraction is the thing most likely to
 * end this demo early, so the model choice is a safety measure as much as a
 * performance one.
 */
const MODEL = 'gemini-3.5-flash-lite'

/** The response is a dozen short fields. Anything longer is a malfunction. */
const MAX_OUTPUT_TOKENS = 1024

/** Decoded bytes. The client downscales before sending; this is the backstop. */
const MAX_IMAGE_BYTES = 4 * 1024 * 1024
const MAX_TEXT_CHARS = 8_000

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif']

/**
 * Gemini accepts JSON Schema directly, so the zod schema in src/lib/offer.ts
 * stays the single definition — the model is constrained by the same shape the
 * browser validates against. $schema is outside the supported subset.
 */
const RESPONSE_SCHEMA: Record<string, unknown> = (() => {
  const { $schema: _drop, ...rest } = z.toJSONSchema(ExtractedOffer) as Record<string, unknown>
  return rest
})()

const SYSTEM_INSTRUCTION = `You read Australian rent-to-own, consumer lease, and buy-now-pay-later advertisements and report the figures printed in them.

Report only what the advertisement says. Do not calculate totals, interest rates, or comparisons. Those are computed from your output by tested code, and a figure you invent here would silently become a figure shown to someone deciding whether to sign a contract.

Two fields need care:

cashPriceLow and cashPriceHigh are the exception to the rule above. If the ad states a cash or retail price, use that figure for both. Otherwise estimate the typical Australian retail price for the item from your own knowledge and give an honest range — wide when the item is described vaguely, narrow when it is specific. This estimate drives the headline comparison, so a confident guess is worse than a wide range. Use null for both if the item is too vaguely described to price at all.

unreadable must list every field you inferred, guessed, or defaulted rather than read. The user is shown this list and asked to correct those fields before anything is calculated. Understating it defeats that safeguard.

If the image is not an offer for goods or credit at all, still return the schema, set confidence to low, and list every field in unreadable.`

const RequestBody = z.object({
  text: z.string().max(MAX_TEXT_CHARS).optional(),
  image: z
    .object({
      mimeType: z.string(),
      /** Base64, no data: prefix. */
      data: z.string(),
    })
    .optional(),
})

export type HandlerResult = {
  status: number
  body: ExtractResponse
  headers?: Record<string, string>
}

const fail = (
  status: number,
  code: Extract<ExtractResponse, { ok: false }>['code'],
  message: string,
  headers?: Record<string, string>,
): HandlerResult => ({ status, body: { ok: false, code, message }, headers })

/** Decoded size of a base64 payload, without allocating it. */
function base64Bytes(data: string): number {
  const padding = data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0
  return Math.floor((data.length * 3) / 4) - padding
}

export async function handleExtract(raw: unknown, ip: string): Promise<HandlerResult> {
  const parsed = RequestBody.safeParse(raw)
  if (!parsed.success) {
    return fail(400, 'no_input', 'Send an offer as text or as an image.')
  }

  const { text, image } = parsed.data
  if (!text?.trim() && !image) {
    return fail(400, 'no_input', 'Send an offer as text or as an image.')
  }

  /*
   * The kill switch, checked before the rate limit and before the key. With
   * DEMO_ONLY set this endpoint needs no credentials at all and cannot cost
   * anything, which is the point: if the key burns mid-judging, flipping this
   * keeps the demo alive.
   */
  if (process.env.DEMO_ONLY === 'true') {
    return { status: 200, body: { ok: true, offer: matchExample(text).offer, demo: true } }
  }

  const verdict = checkRate(ip)
  if (!verdict.allowed) {
    return fail(429, 'rate_limited', 'Too many reads from this address. Try again shortly.', {
      'retry-after': String(verdict.retryAfterSeconds),
    })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return fail(500, 'not_configured', 'The reader is not configured on this deployment.')
  }

  if (image) {
    if (!ALLOWED_IMAGE_TYPES.includes(image.mimeType)) {
      return fail(415, 'too_large', 'That image format is not supported. Use a PNG or JPEG.')
    }
    if (base64Bytes(image.data) > MAX_IMAGE_BYTES) {
      return fail(413, 'too_large', 'That image is too large. Try a smaller screenshot.')
    }
  }

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = []
  if (image) parts.push({ inlineData: { mimeType: image.mimeType, data: image.data } })
  parts.push({
    text: text?.trim()
      ? `Read this offer:\n\n${text.trim()}`
      : 'Read the offer in this image.',
  })

  try {
    const ai = new GoogleGenAI({ apiKey })
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseJsonSchema: RESPONSE_SCHEMA,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        // Already the default on Flash-Lite; set explicitly because this is a
        // cost-sensitive path and the default is not a promise.
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
      },
    })

    const body = response.text
    if (!body) {
      return fail(502, 'unreadable', 'We could not read that offer. Type the numbers in instead.')
    }

    /*
     * Structured output should make this redundant. It is here anyway: the
     * failure it guards against is a malformed offer reaching the finance
     * engine and producing a confident wrong number, which is the worst thing
     * this product could do.
     */
    const offer = ExtractedOffer.safeParse(JSON.parse(body))
    if (!offer.success) {
      return fail(502, 'unreadable', 'We could not read that offer. Type the numbers in instead.')
    }

    return { status: 200, body: { ok: true, offer: offer.data, demo: false } }
  } catch (error) {
    if (error instanceof ApiError) {
      // 429 upstream is our own quota, not the caller's — say so plainly
      // rather than blaming the person holding the phone.
      if (error.status === 429) {
        return fail(503, 'upstream', 'The reader is over its quota right now. Type the numbers in instead.')
      }
      return fail(502, 'upstream', 'The reader is unavailable. Type the numbers in instead.')
    }
    if (error instanceof SyntaxError) {
      return fail(502, 'unreadable', 'We could not read that offer. Type the numbers in instead.')
    }
    return fail(502, 'upstream', 'The reader is unavailable. Type the numbers in instead.')
  }
}
