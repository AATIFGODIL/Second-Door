/**
 * Display formatting. Every figure the user reads passes through here, so
 * rounding happens in exactly one place and never inside a component.
 */

import type { RateResult } from './finance'

const AUD = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  maximumFractionDigits: 0,
})

const AUD_CENTS = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Whole dollars. Totals, cash prices, gaps — anything above ~$100. */
export function money(value: number): string {
  return AUD.format(value)
}

/** Cents shown. Instalments only, where the cents are the quoted figure. */
export function moneyExact(value: number): string {
  return AUD_CENTS.format(value)
}

/**
 * A rate, or an honest statement about why there isn't one. The union is
 * rendered here rather than in the view so no component can accidentally
 * print "NaN%" or silently treat an unsolvable offer as 0%.
 */
export function rate(result: RateResult): string {
  switch (result.kind) {
    case 'rate':
      return `${(result.annual * 100).toFixed(1)}% p.a.`
    case 'above_ceiling':
      return 'Off the scale'
    case 'no_solution':
      return 'No rate. This offer costs less than the cash price'
    case 'invalid':
      return 'Not calculable'
  }
}

/** Weeks as a plain-language term, because "78 periods" means nothing. */
export function term(weeks: number): string {
  const years = weeks / 52
  if (weeks % 52 === 0) return `${years} year${years === 1 ? '' : 's'}`
  return `${weeks} weeks (about ${years.toFixed(1)} years)`
}
