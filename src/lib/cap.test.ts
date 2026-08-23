import { describe, expect, it } from 'vitest'
import {
  assessCreditCeiling,
  assessLeaseCap,
  CAP_MAX_MONTHS,
  CREDIT_CONTRACT_ANNUAL_CEILING,
  permittedCap,
  wholeMonthsForCap,
  wholeMonthsStrict,
} from './cap'
import { effectiveAnnualRate, PERIODS_PER_YEAR, totalPaid } from './finance'

describe('permittedCap', () => {
  it('matches the worked s175AA example: $800 over 18 months', () => {
    // 800 + (800 x 0.04 x 18) = 800 + 576 = 1376
    expect(permittedCap(800, 18)).toBe(1376)
  })

  it('is $32 lower on the strict 17-month reading', () => {
    expect(permittedCap(800, 17)).toBe(1344)
    expect(permittedCap(800, 18) - permittedCap(800, 17)).toBe(32)
  })

  it('stops accruing at 48 months', () => {
    expect(permittedCap(800, 60)).toBe(permittedCap(800, CAP_MAX_MONTHS))
    expect(permittedCap(800, CAP_MAX_MONTHS)).toBe(800 + 800 * 0.04 * 48)
  })

  it('adds permitted delivery and installation fees on top', () => {
    expect(permittedCap(800, 18, 75)).toBe(1451)
  })
})

describe('wholeMonthsForCap', () => {
  // 78 weeks is 546 days, or 17.94 months. Strictly that is 17 whole months;
  // we round up to 18 so the permitted cap comes out at its most generous.
  it('rounds 78 weeks up to 18 months', () => {
    expect(wholeMonthsForCap('weekly', 78)).toBe(18)
    expect(wholeMonthsStrict('weekly', 78)).toBe(17)
  })

  it('agrees with itself when the term divides evenly', () => {
    expect(wholeMonthsForCap('monthly', 24)).toBe(24)
    expect(wholeMonthsStrict('monthly', 24)).toBe(24)
  })

  it('never exceeds the 48-month statutory maximum', () => {
    expect(wholeMonthsForCap('weekly', 400)).toBe(CAP_MAX_MONTHS)
  })
})

describe('assessLeaseCap', () => {
  const LEASE = { basePriceHigh: 800, frequency: 'weekly' as const, termPeriods: 78 }

  /**
   * The regression that matters. The original demo fixture was $20/week over
   * 78 weeks on an $800 base — $1,560, against a permitted cap of $1,376. It
   * exceeds the cap by $184 and describes a contract that cannot lawfully
   * exist. This asserts the over-cap branch catches it.
   */
  it('flags the pre-cap fixture of $20/week as appearing over the cap', () => {
    const result = assessLeaseCap({ ...LEASE, totalPaid: totalPaid(20, 78) })
    expect(result.kind).toBe('appears_over')
    if (result.kind !== 'appears_over') return
    expect(result.cap).toBe(1376)
    expect(result.excess).toBe(184)
  })

  it('accepts the corrected fixture of $17.64/week as within the cap', () => {
    const result = assessLeaseCap({ ...LEASE, totalPaid: totalPaid(17.64, 78) })
    expect(result.kind).toBe('within')
    if (result.kind !== 'within') return
    expect(result.headroom).toBeCloseTo(0.08, 2)
  })

  it('reports the month count as ambiguous for a term quoted in weeks', () => {
    const result = assessLeaseCap({ ...LEASE, totalPaid: 1300 })
    if (result.kind === 'not_assessable') throw new Error('expected an assessment')
    expect(result.monthsAmbiguous).toBe(true)
    expect(result.months).toBe(18)
  })

  /**
   * The honesty guard. We test against the TOP of the retail range, so an
   * offer that would look over-cap against a low estimate is not flagged when
   * a higher — and equally plausible — retail price would permit it.
   */
  it('does not flag an offer that the top of the retail range permits', () => {
    const total = totalPaid(20, 78) // $1,560
    expect(assessLeaseCap({ ...LEASE, basePriceHigh: 800, totalPaid: total }).kind).toBe(
      'appears_over',
    )
    // At a $950 base the cap is $1,634 and the same offer is within it.
    expect(assessLeaseCap({ ...LEASE, basePriceHigh: 950, totalPaid: total }).kind).toBe('within')
  })

  it('declines to assess without a base price', () => {
    const result = assessLeaseCap({ ...LEASE, basePriceHigh: 0, totalPaid: 1560 })
    expect(result.kind).toBe('not_assessable')
  })
})

describe('assessCreditCeiling', () => {
  it('flags a rent-to-own-shaped rate as over the 48% ceiling', () => {
    const r = effectiveAnnualRate(800, 1376 / 78, PERIODS_PER_YEAR.weekly, 78)
    if (r.kind !== 'rate') throw new Error('expected a solved rate')
    const result = assessCreditCeiling(r.annual)
    expect(result.kind).toBe('appears_over')
  })

  it('accepts an ordinary consumer loan rate', () => {
    expect(assessCreditCeiling(0.14).kind).toBe('within')
  })

  it('treats the ceiling itself as within', () => {
    expect(assessCreditCeiling(CREDIT_CONTRACT_ANNUAL_CEILING).kind).toBe('within')
  })

  it('declines to assess when no rate could be solved', () => {
    expect(assessCreditCeiling(null).kind).toBe('not_assessable')
  })
})
