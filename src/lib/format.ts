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

export function money(value: number): string {
  return AUD.format(value)
}

/** Instalments only, where the cents are the quoted figure. */
export function moneyExact(value: number): string {
  return AUD_CENTS.format(value)
}

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

export function term(weeks: number): string {
  const years = weeks / 52
  if (weeks % 52 === 0) return `${years} year${years === 1 ? '' : 's'}`
  return `${weeks} weeks (about ${years.toFixed(1)} years)`
}
