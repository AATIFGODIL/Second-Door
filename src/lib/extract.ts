/**
 * Client side of extraction: get an offer to the endpoint, get fields back.
 *
 * Images are downscaled here rather than sent whole. A modern phone photo is
 * 3–5 MB and carries no more readable text than a 1568px version, so
 * downscaling cuts the upload, the token count and the bill without costing
 * accuracy. The server enforces its own limit regardless — this is a courtesy,
 * not a control.
 */

import type { ExtractResponse } from './offer'

/** Anthropic and Google both stop gaining accuracy past roughly this size. */
const MAX_EDGE_PX = 1568
const JPEG_QUALITY = 0.85

export type ImagePayload = { mimeType: string; data: string }

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read that file.'))
    reader.readAsDataURL(file)
  })
}

function base64FromDataUrl(dataUrl: string): string {
  return dataUrl.slice(dataUrl.indexOf(',') + 1)
}

/**
 * Downscale to MAX_EDGE_PX and re-encode as JPEG.
 *
 * Falls back to the original bytes when the browser cannot decode the format —
 * HEIC off an iPhone decodes in Safari and not much else, and the endpoint
 * accepts HEIC, so passing it through unmodified is better than refusing it.
 */
export async function fileToImagePayload(file: File): Promise<ImagePayload> {
  const original = async (): Promise<ImagePayload> => ({
    mimeType: file.type || 'image/jpeg',
    data: base64FromDataUrl(await readAsDataUrl(file)),
  })

  if (typeof createImageBitmap !== 'function') return original()

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height))

    if (scale === 1 && file.size < 1_500_000) {
      bitmap.close()
      return original()
    }

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)

    const context = canvas.getContext('2d')
    if (!context) {
      bitmap.close()
      return original()
    }

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()

    return {
      mimeType: 'image/jpeg',
      data: base64FromDataUrl(canvas.toDataURL('image/jpeg', JPEG_QUALITY)),
    }
  } catch {
    return original()
  }
}

/**
 * Send an offer to be read.
 *
 * Never throws. Every failure — network, server, malformed response — comes
 * back as a typed ExtractResponse so the interface always has something
 * specific to say and can always offer the manual path.
 */
export async function readOffer(input: {
  text?: string
  image?: ImagePayload
}): Promise<ExtractResponse> {
  try {
    const response = await fetch('/api/extract', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })

    const body: unknown = await response.json().catch(() => null)

    if (body && typeof body === 'object' && 'ok' in body) {
      return body as ExtractResponse
    }

    return {
      ok: false,
      code: 'upstream',
      message: 'The reader is unavailable. Type the numbers in instead.',
    }
  } catch {
    return {
      ok: false,
      code: 'upstream',
      message: 'No connection to the reader. Type the numbers in instead.',
    }
  }
}
