/**
 * Statutory ceilings. Two apply, and confusing them is the easiest way to say
 * something false:
 *
 *   Consumer lease   s175AA National Credit Code. Base price, plus 4% of it
 *                    per whole month to a maximum of 48, plus permitted fees.
 *   Credit contract  the 48% annual cost rate ceiling, inclusive of fees.
 *
 * This module only ever says "appears to exceed". It computes arithmetic on an
 * estimated retail price and does not determine legality.
 */

import { termInDays, type Frequency } from './finance'

export const CAP_MONTHLY_RATE = 0.04
export const CAP_MAX_MONTHS = 48
export const CREDIT_CONTRACT_ANNUAL_CEILING = 0.48

const AVG_MONTH_DAYS = 365.25 / 12

/**
 * Rounded up, so every ambiguity favours the provider. 78 weeks is 17.94
 * months: strictly 17 and a $1,344 cap, rounded up 18 and $1,376.
 */
export function wholeMonthsForCap(frequency: Frequency, termPeriods: number): number {
  return Math.min(CAP_MAX_MONTHS, Math.ceil(termInDays(frequency, termPeriods) / AVG_MONTH_DAYS))
}

/** The strict reading, so the UI can disclose when the two disagree. */
export function wholeMonthsStrict(frequency: Frequency, termPeriods: number): number {
  return Math.min(CAP_MAX_MONTHS, Math.floor(termInDays(frequency, termPeriods) / AVG_MONTH_DAYS))
}

export function permittedCap(basePrice: number, months: number, permittedFees = 0): number {
  const cappedMonths = Math.min(CAP_MAX_MONTHS, Math.max(0, months))
  return basePrice + basePrice * CAP_MONTHLY_RATE * cappedMonths + permittedFees
}

export type CapAssessment =
  | { kind: 'within'; cap: number; headroom: number; months: number; monthsAmbiguous: boolean }
  | { kind: 'appears_over'; cap: number; excess: number; months: number; monthsAmbiguous: boolean }
  | { kind: 'not_assessable'; reason: string }

type LeaseInput = {
  totalPaid: number
  /** The top of the estimated range, never the midpoint: a higher base permits a higher cap. */
  basePriceHigh: number
  frequency: Frequency
  termPeriods: number
  permittedFees?: number
}

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

/** Our rate is not the prescribed annual cost rate, so treat anything near the line as inconclusive. */
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
