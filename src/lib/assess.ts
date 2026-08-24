import { assessLeaseCap, type CapAssessment } from './cap'
import {
  effectiveAnnualRate,
  extraOverCash,
  PERIODS_PER_YEAR,
  totalPaid,
  type RateResult,
} from './finance'
import type { ExtractedOffer } from './offer'

export type Assessment = {
  computable: boolean
  missing: string[]
  total: number | null
  cashPriceMid: number | null
  extra: number | null
  rate: RateResult | null
  /** Null unless the offer is a consumer lease. s175AA governs nothing else. */
  cap: CapAssessment | null
}

const EMPTY: Assessment = {
  computable: false,
  missing: [],
  total: null,
  cashPriceMid: null,
  extra: null,
  rate: null,
  cap: null,
}

export function assess(offer: ExtractedOffer): Assessment {
  const missing: string[] = []
  if (!(offer.payment > 0)) missing.push('the payment amount')
  if (!(offer.termPeriods >= 1)) missing.push('how many payments')

  const low = offer.cashPriceLow
  const high = offer.cashPriceHigh
  const hasPrice = typeof low === 'number' && low > 0 && typeof high === 'number' && high > 0
  if (!hasPrice) missing.push('what the item costs to buy outright')

  if (missing.length > 0) return { ...EMPTY, missing }

  // Both fields are user editable and nothing stops them being typed backwards.
  const priceLow = Math.min(low as number, high as number)
  const priceHigh = Math.max(low as number, high as number)
  const cashPriceMid = (priceLow + priceHigh) / 2

  const total = totalPaid(offer.payment, offer.termPeriods)
  const extra = extraOverCash(total, cashPriceMid)
  const rate = effectiveAnnualRate(
    cashPriceMid,
    offer.payment,
    PERIODS_PER_YEAR[offer.frequency],
    offer.termPeriods,
  )

  const cap =
    offer.contractType === 'consumer_lease'
      ? assessLeaseCap({
          totalPaid: total,
          basePriceHigh: priceHigh,
          frequency: offer.frequency,
          termPeriods: offer.termPeriods,
          // s175AA permits delivery and installation on top of the ceiling,
          // so charging them lifts the cap rather than breaching it.
          permittedFees: offer.deliveryInstallation ?? 0,
        })
      : null

  return { computable: true, missing: [], total, cashPriceMid, extra, rate, cap }
}
