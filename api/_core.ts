import { GoogleGenAI, ApiError, ThinkingLevel } from '@google/genai'
import * as z from 'zod'
import { ExtractedOffer, type ExtractResponse } from '../src/lib/offer'
import { matchExample } from '../src/data/examples'
import { checkRate } from './_ratelimit'

const MODEL = 'gemini-3.5-flash-lite'

const MAX_OUTPUT_TOKENS = 1024

/** Decoded bytes. The client downscales first; this is the backstop. */
const MAX_IMAGE_BYTES = 4 * 1024 * 1024
const MAX_TEXT_CHARS = 8_000

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif']

// Built on first use, not at module load. A throw at module scope takes the
// whole function down before the handler can return anything readable, and
// FUNCTION_INVOCATION_FAILED tells the caller nothing.
let responseSchema: Record<string, unknown> | undefined

function schema(): Record<string, unknown> {
  if (!responseSchema) {
    // $schema is outside the subset Gemini accepts.
    const { $schema: _drop, ...rest } = z.toJSONSchema(ExtractedOffer) as Record<string, unknown>
    responseSchema = rest
  }
  return responseSchema
}

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

  // Checked before the rate limit and the key: with DEMO_ONLY set this needs
  // no credentials and cannot cost anything.
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
        responseJsonSchema: schema(),
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        // Already the Flash-Lite default; pinned because this path is cost sensitive.
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
      },
    })

    const body = response.text
    if (!body) {
      return fail(502, 'unreadable', 'We could not read that offer. Type the numbers in instead.')
    }

    // Structured output should make this redundant. The failure it guards is a
    // malformed offer reaching the finance engine and producing a confident
    // wrong number.
    const offer = ExtractedOffer.safeParse(JSON.parse(body))
    if (!offer.success) {
      return fail(502, 'unreadable', 'We could not read that offer. Type the numbers in instead.')
    }

    return { status: 200, body: { ok: true, offer: offer.data, demo: false } }
  } catch (error) {
    if (error instanceof ApiError) {
      // Upstream 429 is our quota, not the caller's.
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
