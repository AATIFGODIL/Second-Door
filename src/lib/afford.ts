import { PERIODS_PER_YEAR, type Frequency } from './finance'

export function toWeekly(amount: number, frequency: Frequency): number {
  return (amount * PERIODS_PER_YEAR[frequency]) / 52
}

export type Band = 'comfortable' | 'tight' | 'risky'

export type Affordability =
  | { kind: 'need_income' }
  | {
      kind: 'assessed'
      weeklyRepayment: number
      weeklyIncome: number
      weeklySurplus: number | null
      share: number
      measuredAgainst: 'surplus' | 'income'
      band: Band
      leftOver: number | null
    }

/**
 * Two sets, because a share of gross income and a share of what is spare mean
 * different things. $115 against $450 income is 26% and sounds survivable;
 * against the $130 left after essentials it is 88%. Rough guides for someone
 * reading their own figures, not a serviceability model.
 */
const SURPLUS_BANDS = { comfortable: 0.3, tight: 0.7 }
const INCOME_BANDS = { comfortable: 0.1, tight: 0.2 }

function bandFor(share: number, against: 'surplus' | 'income'): Band {
  const bands = against === 'surplus' ? SURPLUS_BANDS : INCOME_BANDS
  if (share <= bands.comfortable) return 'comfortable'
  if (share <= bands.tight) return 'tight'
  return 'risky'
}

export function assessAffordability(input: {
  payment: number
  frequency: Frequency
  income: number | null
  incomeFrequency: Frequency
  essentials: number | null
  essentialsFrequency: Frequency
}): Affordability {
  const { payment, frequency, income, incomeFrequency, essentials, essentialsFrequency } = input

  if (income === null || !(income > 0) || !(payment > 0)) return { kind: 'need_income' }

  const weeklyRepayment = toWeekly(payment, frequency)
  const weeklyIncome = toWeekly(income, incomeFrequency)
  const weeklySurplus =
    essentials !== null && essentials >= 0
      ? weeklyIncome - toWeekly(essentials, essentialsFrequency)
      : null

  // A negative surplus would otherwise produce a small negative share that
  // reads as a reassuring percentage.
  if (weeklySurplus !== null && weeklySurplus <= 0) {
    return {
      kind: 'assessed',
      weeklyRepayment,
      weeklyIncome,
      weeklySurplus,
      share: Number.POSITIVE_INFINITY,
      measuredAgainst: 'surplus',
      band: 'risky',
      leftOver: weeklySurplus - weeklyRepayment,
    }
  }

  const measuredAgainst = weeklySurplus !== null ? 'surplus' : 'income'
  const denominator = weeklySurplus ?? weeklyIncome
  const share = weeklyRepayment / denominator

  return {
    kind: 'assessed',
    weeklyRepayment,
    weeklyIncome,
    weeklySurplus,
    share,
    measuredAgainst,
    band: bandFor(share, measuredAgainst),
    leftOver: weeklySurplus !== null ? weeklySurplus - weeklyRepayment : null,
  }
}
