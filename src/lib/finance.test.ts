import { describe, expect, it } from 'vitest'
import {
  annuityFactor,
  effectiveAnnualRate,
  extraOverCash,
  MAX_REPORTABLE_ANNUAL,
  PERIODS_PER_YEAR,
  termInDays,
  totalPaid,
} from './finance'

/**
 * Every expected figure below was hand-checked before it was written down.
 * Where a number came from the solver, it is verified two ways: the annual
 * rate is asserted, and the solved periodic rate is fed back through the
 * annuity formula to confirm it reproduces the cash price.
 */

const WEEKLY = PERIODS_PER_YEAR.weekly

describe('totalPaid / extraOverCash', () => {
  it('multiplies payment by term', () => {
    expect(totalPaid(17.64, 78)).toBeCloseTo(1375.92, 2)
  })

  it('reports the gap against the cash price', () => {
    expect(extraOverCash(1375.92, 800)).toBeCloseTo(575.92, 2)
  })

  it('reports a negative gap when the total is below the cash price', () => {
    expect(extraOverCash(800, 900)).toBeCloseTo(-100, 6)
  })
})

describe('annuityFactor', () => {
  // The closed form is 0/0 at i = 0. The limit is n, and we take that branch
  // explicitly rather than letting floating point decide.
  it('returns n at a rate of exactly zero', () => {
    expect(annuityFactor(0, 78)).toBe(78)
    expect(annuityFactor(0, 1)).toBe(1)
  })

  it('matches a hand-computed factor', () => {
    // (1 - 1.01^-12) / 0.01 = 11.255077...
    expect(annuityFactor(0.01, 12)).toBeCloseTo(11.255077, 5)
  })

  it('can never exceed n, which is why long-shot rates have no solution', () => {
    expect(annuityFactor(0.05, 10)).toBeLessThan(10)
  })
})

describe('effectiveAnnualRate — the canonical fixture', () => {
  /**
   * $800 base over 78 weeks. The permitted maximum under s175AA is $1,376,
   * so the payment at the legal ceiling is 1376 / 78 = $17.6410...
   *
   * This is the number the demo uses. It is not a figure we chose to make the
   * point look good — it is the most a lessor is lawfully allowed to charge.
   */
  const CASH = 800
  const PAYMENT_AT_CAP = 1376 / 78

  it('totals to exactly the permitted cap', () => {
    expect(totalPaid(PAYMENT_AT_CAP, 78)).toBeCloseTo(1376, 6)
    expect(extraOverCash(1376, CASH)).toBeCloseTo(576, 6)
  })

  it('solves to roughly 120.36% a year', () => {
    const r = effectiveAnnualRate(CASH, PAYMENT_AT_CAP, WEEKLY, 78)
    expect(r.kind).toBe('rate')
    if (r.kind !== 'rate') return
    expect(r.periodic).toBeCloseTo(0.01531014, 7)
    expect(r.annual).toBeCloseTo(1.203605, 5)
  })

  it('the rounded $17.64/week figure lands in the same place', () => {
    const r = effectiveAnnualRate(CASH, 17.64, WEEKLY, 78)
    expect(r.kind).toBe('rate')
    if (r.kind !== 'rate') return
    expect(r.annual).toBeCloseTo(1.20340, 4)
  })

  it('the solved rate reproduces the cash price when fed back through', () => {
    const r = effectiveAnnualRate(CASH, PAYMENT_AT_CAP, WEEKLY, 78)
    if (r.kind !== 'rate') throw new Error('expected a solved rate')
    expect(PAYMENT_AT_CAP * annuityFactor(r.periodic, 78)).toBeCloseTo(CASH, 6)
  })
})

describe('effectiveAnnualRate — regression on the pre-cap fixture', () => {
  /**
   * The original brief used $20/week x 78 on an $800 base. The arithmetic is
   * sound — it really is $1,560 and 171.95% — but the contract it describes
   * exceeds the s175AA permitted cap of $1,376 by $184 and therefore cannot
   * lawfully exist. Kept as a regression so the figure can never quietly
   * return, and asserted against the cap branch in cap.test.ts.
   */
  it('still computes correctly, for the record', () => {
    expect(totalPaid(20, 78)).toBe(1560)
    expect(extraOverCash(1560, 800)).toBe(760)

    const r = effectiveAnnualRate(800, 20, WEEKLY, 78)
    expect(r.kind).toBe('rate')
    if (r.kind !== 'rate') return
    expect(r.annual).toBeCloseTo(1.719461, 5)
  })
})

describe('effectiveAnnualRate — zero-cost finance', () => {
  it('returns exactly zero when the payments add up to the cash price', () => {
    const r = effectiveAnnualRate(800, 100, PERIODS_PER_YEAR.monthly, 8)
    expect(r).toEqual({ kind: 'rate', periodic: 0, annual: 0 })
  })

  /**
   * Buy-now-pay-later is the shape a judge is most likely to find in the room.
   * Afterpay on an $800 item is 4 x $200 at a genuine 0%.
   *
   * Worth being precise about what happens here, because it is easy to assume
   * this trips the no-solution branch: it does not. total === cashPrice puts
   * f(0) exactly on the axis, so the rate is zero, and the sentinel is never
   * reached. no_solution only fires when the total is strictly BELOW the cash
   * price — which for BNPL means our retail estimate came in too high, not
   * that the offer is odd. The UI detects BNPL by shape, not by this result.
   */
  it('handles the Afterpay shape as 0%, not as no_solution', () => {
    const r = effectiveAnnualRate(800, 200, PERIODS_PER_YEAR.fortnightly, 4)
    expect(r.kind).toBe('rate')
    if (r.kind !== 'rate') return
    expect(r.annual).toBe(0)
  })
})

describe('effectiveAnnualRate — degenerate and off-scale inputs', () => {
  // A single payment can only reach the cash price if the payment itself does,
  // so a term of 1 is a no-solution case, not merely a "don't crash" case.
  it('reports no_solution for a term of one', () => {
    const r = effectiveAnnualRate(800, 20, WEEKLY, 1)
    expect(r.kind).toBe('no_solution')
  })

  it('does not throw for a term of one', () => {
    expect(() => effectiveAnnualRate(800, 20, WEEKLY, 1)).not.toThrow()
  })

  it('reports no_solution when the total is below the cash price', () => {
    const r = effectiveAnnualRate(900, 20, WEEKLY, 40)
    expect(r).toMatchObject({ kind: 'no_solution', totalPaid: 800, cashPrice: 900 })
  })

  it('refuses to quote a figure that annualises off the scale', () => {
    const r = effectiveAnnualRate(100, 500, WEEKLY, 4)
    expect(r).toEqual({ kind: 'above_ceiling', ceiling: MAX_REPORTABLE_ANNUAL })
  })

  it.each([
    ['zero cash price', 0, 20, WEEKLY, 78],
    ['negative cash price', -800, 20, WEEKLY, 78],
    ['zero payment', 800, 0, WEEKLY, 78],
    ['negative payment', 800, -20, WEEKLY, 78],
    ['zero frequency', 800, 20, 0, 78],
    ['term below one', 800, 20, WEEKLY, 0],
    ['NaN payment', 800, Number.NaN, WEEKLY, 78],
    ['infinite cash price', Number.POSITIVE_INFINITY, 20, WEEKLY, 78],
  ])('rejects %s without throwing', (_label, cash, pmt, ppy, n) => {
    const r = effectiveAnnualRate(cash, pmt, ppy, n)
    expect(r.kind).toBe('invalid')
  })
})

describe('termInDays', () => {
  // 78 x 7. Not 78 x (365.25 / 52), which would give 547.875 and quietly turn
  // a 17.9-month term into a clean 18 months in the cap calculation.
  it('converts 78 weeks to exactly 546 days', () => {
    expect(termInDays('weekly', 78)).toBe(546)
  })

  it('converts 26 fortnights to 364 days', () => {
    expect(termInDays('fortnightly', 26)).toBe(364)
  })

  it('treats a month as a twelfth of a Julian year', () => {
    expect(termInDays('monthly', 12)).toBeCloseTo(365.25, 6)
  })

  it('confirms 78 weeks falls just short of 18 whole months', () => {
    expect(termInDays('weekly', 78) / (365.25 / 12)).toBeLessThan(18)
    expect(termInDays('weekly', 78) / (365.25 / 12)).toBeGreaterThan(17.9)
  })
})
