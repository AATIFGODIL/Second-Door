// Separate from offer.ts so the browser never imports that module at runtime
// and zod stays out of the client bundle.
import type { ExtractedOffer } from './offer.ts'

export const BLANK_OFFER: ExtractedOffer = {
  item: '',
  payment: 0,
  frequency: 'weekly',
  termPeriods: 0,
  contractType: 'unknown',
  cashPriceLow: null,
  cashPriceHigh: null,
  deliveryInstallation: null,
  advertisedTotal: null,
  fees: [],
  confidence: 'low',
  unreadable: [],
}
