/**
 * Second Door — cost engine.
 *
 * Every number a user sees is computed here, deterministically, in plain
 * JavaScript. The language model reads the offer; it never does the maths.
 * If someone asks whether the AI made a figure up, the answer is no, and this
 * is the file to open.
 *
 * Pure functions only. No React, no I/O, no dates, no randomness.
 */

/** How many payments fall in a year, by the way the offer is quoted. */
export const PERIODS_PER_YEAR = {
  weekly: 52,
  fortnightly: 26,
  monthly: 12,
} as const

export type Frequency = keyof typeof PERIODS_PER_YEAR

/**
 * Upper bound for the bisection, expressed as a rate *per period*. 500% per
 * period is far beyond anything a real offer produces; it exists so the search
 * is bounded and can report "off the scale" rather than run away.
 */
export const RATE_CEILING = 5

/**
 * The highest annual rate we will put a number to: 10,000% p.a.
 *
 * A periodic rate can sit just inside RATE_CEILING and still compound to a
 * figure like 2.8e42% once annualised, which is arithmetically correct and
 * completely useless on a screen. Real rent-to-own lands between 100% and
 * 300%; the worst payday lending is under 1,000%. Anything past this bound is
 * a misread offer, not a contract, and saying "off the scale" is more honest
 * than printing the exponent.
 */
export const MAX_REPORTABLE_ANNUAL = 100

const EPSILON = 1e-12

export type RateResult =
  /** A real solved rate. `periodic` is per payment period, `annual` is compounded up. */
  | { kind: 'rate'; periodic: number; annual: number }
  /**
   * No non-negative rate exists, because the payments add up to less than the
   * cash price. That is not an error: it is what a genuine discount looks like,
   * and — more often — what an over-estimated cash price looks like.
   */
  | { kind: 'no_solution'; totalPaid: number; cashPrice: number }
  /**
   * The rate is real but past anything worth quoting — either above
   * RATE_CEILING per period, or annualising past MAX_REPORTABLE_ANNUAL.
   * Report the fact, don't invent a figure.
   */
  | { kind: 'above_ceiling'; ceiling: number }
  /** The inputs can't describe a finance contract. */
  | { kind: 'invalid'; reason: string }

/** What the offer costs you in total, before any comparison. */
export function totalPaid(payment: number, termPeriods: number): number {
  return payment * termPeriods
}

/** The gap between what you pay and what the thing is worth. */
export function extraOverCash(total: number, cashPrice: number): number {
  return total - cashPrice
}

/**
 * Present value of an ordinary annuity, per dollar of payment.
 *
 * At i = 0 the closed form is 0/0. The limit is n — n payments of a dollar are
 * worth n dollars when money has no time cost — so that branch is taken
 * explicitly rather than left to floating point.
 */
export function annuityFactor(i: number, n: number): number {
  if (Math.abs(i) < EPSILON) return n
  return (1 - Math.pow(1 + i, -n)) / i
}

/**
 * Solve for the periodic rate in PV = PMT x (1 - (1+i)^-n) / i, then compound
 * it to an annual figure.
 *
 * Bisection, deliberately, rather than Newton-Raphson: it cannot diverge, it
 * needs no derivative, and its failure modes are ones we can name. The function
 * is monotonically decreasing in i, so the bracket [0, RATE_CEILING] either
 * contains exactly one root or tells us which side of the range we fell off.
 *
 * This is an effective annual rate — an APR-equivalent that we compute
 * ourselves. It is deliberately NOT called a comparison rate or an annual cost
 * rate: both are defined terms in Australian credit law with prescribed
 * calculation methods, and this figure is neither.
 */
export function effectiveAnnualRate(
  cashPrice: number,
  payment: number,
  periodsPerYear: number,
  termPeriods: number,
): RateResult {
  const finite = [cashPrice, payment, periodsPerYear, termPeriods].every(Number.isFinite)
  if (!finite) return { kind: 'invalid', reason: 'One or more inputs is not a finite number.' }
  if (cashPrice <= 0) return { kind: 'invalid', reason: 'Cash price must be above zero.' }
  if (payment <= 0) return { kind: 'invalid', reason: 'Payment must be above zero.' }
  if (periodsPerYear <= 0)
    return { kind: 'invalid', reason: 'Payment frequency must be above zero.' }
  if (termPeriods < 1) return { kind: 'invalid', reason: 'Term must be at least one payment.' }

  const total = totalPaid(payment, termPeriods)

  // f(i) = PV(i) - cashPrice, monotonically decreasing.
  const f = (i: number) => payment * annuityFactor(i, termPeriods) - cashPrice

  // f(0) = total - cashPrice. If the payments never reach the cash price there
  // is no non-negative rate to find. A term of 1 lands here almost always: a
  // single payment can only exceed the cash price if the payment itself does.
  const atZero = f(0)
  if (atZero < -EPSILON) return { kind: 'no_solution', totalPaid: total, cashPrice }
  if (Math.abs(atZero) <= EPSILON) return { kind: 'rate', periodic: 0, annual: 0 }

  // Still above the axis at the ceiling: the true rate is higher than we search.
  if (f(RATE_CEILING) > 0) return { kind: 'above_ceiling', ceiling: RATE_CEILING }

  let lo = 0
  let hi = RATE_CEILING
  for (let step = 0; step < 200 && hi - lo > EPSILON; step += 1) {
    const mid = (lo + hi) / 2
    if (f(mid) > 0) lo = mid
    else hi = mid
  }

  const periodic = (lo + hi) / 2
  const annual = Math.pow(1 + periodic, periodsPerYear) - 1

  // Solved, but off the scale once compounded. Almost always a misread offer.
  if (!Number.isFinite(annual) || annual > MAX_REPORTABLE_ANNUAL) {
    return { kind: 'above_ceiling', ceiling: MAX_REPORTABLE_ANNUAL }
  }

  return { kind: 'rate', periodic, annual }
}

/**
 * Days in one payment period.
 *
 * Deliberately not 365.25 / periodsPerYear. A week is exactly 7 days, and
 * dividing the year instead gives 7.024 — which sounds like rounding noise
 * until it reaches the cap calculation, where 78 weeks becomes 547.9 days and
 * therefore a clean 18 whole months. The true figure is 546 days, which is
 * just under 18 months. The cap moves by $32 on that distinction.
 */
export const DAYS_PER_PERIOD: Record<Frequency, number> = {
  weekly: 7,
  fortnightly: 14,
  monthly: 365.25 / 12,
}

/** Term expressed in days, for anything that needs calendar months. */
export function termInDays(frequency: Frequency, termPeriods: number): number {
  return DAYS_PER_PERIOD[frequency] * termPeriods
}
