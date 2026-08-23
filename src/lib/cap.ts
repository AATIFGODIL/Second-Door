/**
 * Second Door — statutory cost ceilings.
 *
 * Two different ceilings apply depending on how an offer is structured, and
 * getting the two confused would be the easiest way to say something false:
 *
 *   Consumer lease — the provider still owns the goods at the end. Capped by
 *   s175AA of the National Credit Code: the base price, plus 4% of the base
 *   price for each whole month of the term, to a maximum of 48 months, plus
 *   permitted delivery and installation fees. Introduced by the Financial
 *   Sector Reform Act 2022 and commenced in 2023.
 *
 *   Credit contract — title passes to the buyer. Capped instead by the 48%
 *   annual cost rate ceiling, inclusive of fees.
 *
 * This module only ever says "appears to exceed". We compute arithmetic on an
 * estimated retail price; we do not determine legality, and the wording must
 * never suggest we have.
 */

import { termInDays, type Frequency } from './finance'

export const CAP_MONTHLY_RATE = 0.04
export const CAP_MAX_MONTHS = 48
export const CREDIT_CONTRACT_ANNUAL_CEILING = 0.48

const AVG_MONTH_DAYS = 365.25 / 12

/**
 * Whole months in the term, counted in the lessor's favour.
 *
 * The statute counts whole months; offers are quoted in weeks. Those do not
 * divide evenly, and the gap is not academic — 78 weeks is 546 days, which is
 * 17.94 months. Counted strictly that is 17 whole months and a cap of $1,344
 * on an $800 base; rounded up it is 18 months and $1,376.
 *
 * We round up. Every ambiguity in this calculation resolves toward a larger
 * permitted cap, for the same reason we test against the top of the retail
 * price range: the arithmetic should be generous to the provider every single
 * time it is about to suggest something may be unlawful.
 */
export function wholeMonthsForCap(frequency: Frequency, termPeriods: number): number {
  const months = termInDays(frequency, termPeriods) / AVG_MONTH_DAYS
  return Math.min(CAP_MAX_MONTHS, Math.ceil(months))
}

/** The same count read strictly, so the UI can disclose when the two differ. */
export function wholeMonthsStrict(frequency: Frequency, termPeriods: number): number {
  const months = termInDays(frequency, termPeriods) / AVG_MONTH_DAYS
  return Math.min(CAP_MAX_MONTHS, Math.floor(months))
}

/** basePrice + 4% of basePrice per whole month, to 48 months, + permitted fees. */
export function permittedCap(basePrice: number, months: number, permittedFees = 0): number {
  const cappedMonths = Math.min(CAP_MAX_MONTHS, Math.max(0, months))
  return basePrice + basePrice * CAP_MONTHLY_RATE * cappedMonths + permittedFees
}

export type CapAssessment =
  | {
      kind: 'within'
      cap: number
      headroom: number
      months: number
      monthsAmbiguous: boolean
    }
  | {
      kind: 'appears_over'
      cap: number
      excess: number
      months: number
      monthsAmbiguous: boolean
    }
  | { kind: 'not_assessable'; reason: string }

type LeaseInput = {
  totalPaid: number
  /**
   * The TOP of our estimated retail range, not the midpoint. The cap scales
   * with base price, so the highest plausible retail price yields the highest
   * plausible cap — the reading least likely to accuse a provider wrongly.
   */
  basePriceHigh: number
  frequency: Frequency
  termPeriods: number
  permittedFees?: number
}

/**
 * Assess a consumer lease against the s175AA permitted cap.
 *
 * Only ever called for offers classified as consumer leases. A credit contract
 * or a BNPL arrangement is not assessable here and says so rather than
 * returning a misleading "within".
 */
export function assessLeaseCap({
  totalPaid,
  basePriceHigh,
  frequency,
  termPeriods,
  permittedFees = 0,
}: LeaseInput): CapAssessment {
  if (!Number.isFinite(totalPaid) || !Number.isFinite(basePriceHigh) || basePriceHigh <= 0) {
    return { kind: 'not_assessable', reason: 'We need a base price to work out the cap.' }
  }

  const months = wholeMonthsForCap(frequency, termPeriods)
  const monthsAmbiguous = wholeMonthsStrict(frequency, termPeriods) !== months
  const cap = permittedCap(basePriceHigh, months, permittedFees)

  if (totalPaid > cap) {
    return { kind: 'appears_over', cap, excess: totalPaid - cap, months, monthsAmbiguous }
  }
  return { kind: 'within', cap, headroom: cap - totalPaid, months, monthsAmbiguous }
}

export type CreditCeilingAssessment =
  | { kind: 'within'; ceiling: number; annualRate: number }
  | { kind: 'appears_over'; ceiling: number; annualRate: number; excess: number }
  | { kind: 'not_assessable'; reason: string }

/**
 * Assess a credit-contract-shaped offer against the 48% annual ceiling.
 *
 * Our effective annual rate is not the prescribed annual cost rate, and the
 * prescribed method folds in fees we may not be able to see on an ad. Treat a
 * result near the line as inconclusive rather than as a finding.
 */
export function assessCreditCeiling(annualRate: number | null): CreditCeilingAssessment {
  if (annualRate === null || !Number.isFinite(annualRate)) {
    return { kind: 'not_assessable', reason: 'We could not work out a rate for this offer.' }
  }
  if (annualRate > CREDIT_CONTRACT_ANNUAL_CEILING) {
    return {
      kind: 'appears_over',
      ceiling: CREDIT_CONTRACT_ANNUAL_CEILING,
      annualRate,
      excess: annualRate - CREDIT_CONTRACT_ANNUAL_CEILING,
    }
  }
  return { kind: 'within', ceiling: CREDIT_CONTRACT_ANNUAL_CEILING, annualRate }
}
