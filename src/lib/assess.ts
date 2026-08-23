/**
 * Turn an offer the user has confirmed into the figures shown on screen.
 *
 * Thin orchestration over finance.ts and cap.ts, kept out of the components so
 * the decision that matters here is testable: *whether* the cap check runs at
 * all. Running it on a credit contract or a BNPL arrangement would compare a
 * total against a ceiling that does not govern it, and print an accusation
 * from the wrong statute.
 */

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
  /** Every figure below is null until this is true. */
  computable: boolean
  /** Plain-language names of what is still missing. */
  missing: string[]
  total: number | null
  /** Midpoint of the estimated range — what the rate is solved against. */
  cashPriceMid: number | null
  extra: number | null
  rate: RateResult | null
  /**
   * Null when the offer is not a consumer lease. s175AA governs leases only;
   * a credit contract answers to the 48% annual cost rate instead, and BNPL
   * to neither.
   */
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

  // Guard the inversion rather than trusting the two fields to be ordered —
  // they are both user-editable and nothing stops someone typing them
  // backwards.
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

  /*
   * The cap is tested against the TOP of the range, never the midpoint. A
   * higher base price permits a higher cap, so this is the reading least
   * likely to accuse a provider wrongly — the same reason the month count
   * rounds up. Every ambiguity resolves in the provider's favour.
   */
  const cap =
    offer.contractType === 'consumer_lease'
      ? assessLeaseCap({
          totalPaid: total,
          basePriceHigh: priceHigh,
          frequency: offer.frequency,
          termPeriods: offer.termPeriods,
        })
      : null

  return { computable: true, missing: [], total, cashPriceMid, extra, rate, cap }
}
