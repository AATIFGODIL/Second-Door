/**
 * An empty offer: the manual path that skips extraction, and the reset between
 * reads.
 *
 * In its own module, importing only the type, so that nothing in the browser
 * imports offer.ts at runtime. That module defines the zod schema, and zod is
 * needed only by the serverless function which validates the model's response.
 * Pulling it into the client bundle added 18kB gzipped of a library the browser
 * never executes, on a product aimed at people who may be on metered data.
 */

import type { ExtractedOffer } from './offer.ts'

export const BLANK_OFFER: ExtractedOffer = {
  item: '',
  payment: 0,
  frequency: 'weekly',
  termPeriods: 0,
  contractType: 'unknown',
  cashPriceLow: null,
  cashPriceHigh: null,
  advertisedTotal: null,
  fees: [],
  confidence: 'low',
  unreadable: [],
}
