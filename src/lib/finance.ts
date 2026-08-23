export const PERIODS_PER_YEAR = {
  weekly: 52,
  fortnightly: 26,
  monthly: 12,
} as const

export type Frequency = keyof typeof PERIODS_PER_YEAR

export const RATE_CEILING = 5

/** Past this, a rate is a misread offer rather than a contract. */
export const MAX_REPORTABLE_ANNUAL = 100

const EPSILON = 1e-12

export type RateResult =
  | { kind: 'rate'; periodic: number; annual: number }
  | { kind: 'no_solution'; totalPaid: number; cashPrice: number }
  | { kind: 'above_ceiling'; ceiling: number }
  | { kind: 'invalid'; reason: string }

export function totalPaid(payment: number, termPeriods: number): number {
  return payment * termPeriods
}

export function extraOverCash(total: number, cashPrice: number): number {
  return total - cashPrice
}

/** Present value of an ordinary annuity per dollar of payment. At i = 0 the closed form is 0/0; the limit is n. */
export function annuityFactor(i: number, n: number): number {
  if (Math.abs(i) < EPSILON) return n
  return (1 - Math.pow(1 + i, -n)) / i
}

/**
 * Solves PV = PMT x (1 - (1+i)^-n) / i for i, then compounds to a year.
 *
 * Bisection rather than Newton-Raphson: it cannot diverge and needs no
 * derivative. f is monotonically decreasing in i, so [0, RATE_CEILING] either
 * contains one root or tells us which side we fell off.
 *
 * Not a "comparison rate" or an "annual cost rate". Both are defined terms in
 * Australian credit law with prescribed methods, and this is neither.
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
  const f = (i: number) => payment * annuityFactor(i, termPeriods) - cashPrice

  const atZero = f(0)
  if (atZero < -EPSILON) return { kind: 'no_solution', totalPaid: total, cashPrice }
  if (Math.abs(atZero) <= EPSILON) return { kind: 'rate', periodic: 0, annual: 0 }
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

  if (!Number.isFinite(annual) || annual > MAX_REPORTABLE_ANNUAL) {
    return { kind: 'above_ceiling', ceiling: MAX_REPORTABLE_ANNUAL }
  }

  return { kind: 'rate', periodic, annual }
}

/**
 * A week is exactly 7 days. Dividing the year instead gives 7.024, which turns
 * 78 weeks into 18 whole months rather than the true 17.94 and moves the
 * s175AA cap by $32.
 */
export const DAYS_PER_PERIOD: Record<Frequency, number> = {
  weekly: 7,
  fortnightly: 14,
  monthly: 365.25 / 12,
}

export function termInDays(frequency: Frequency, termPeriods: number): number {
  return DAYS_PER_PERIOD[frequency] * termPeriods
}
