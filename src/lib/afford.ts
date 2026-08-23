/**
 * Can this person actually make the repayments?
 *
 * A separate question from whether the offer is expensive, and the one that
 * decides whether someone ends up in default. The cost engine answers "is this
 * a bad deal". This answers "what would it take out of your week".
 *
 * Deterministic arithmetic on figures the user types. No model, no scoring, no
 * data leaving the device. Nothing here is stored: the numbers live in React
 * state for as long as the tab is open and are never sent anywhere.
 *
 * IMPORTANT: this never returns a decision. It returns a share of income and a
 * band, with wording that hands the judgement back to the person. Second Door
 * does not decide whether anyone can have credit, and a tool that told someone
 * they were "approved" or "declined" would be the single most harmful thing
 * this project could ship.
 */

import { PERIODS_PER_YEAR, type Frequency } from './finance'

/** Everything is compared weekly, because that is how these offers are sold. */
export function toWeekly(amount: number, frequency: Frequency): number {
  return (amount * PERIODS_PER_YEAR[frequency]) / 52
}

export type Band = 'comfortable' | 'tight' | 'risky'

export type Affordability =
  | { kind: 'need_income' }
  | {
      kind: 'assessed'
      /** The offer's repayment, normalised to a week. */
      weeklyRepayment: number
      weeklyIncome: number
      /** Income less essentials, or null when essentials were not given. */
      weeklySurplus: number | null
      /** Repayment as a share of whatever we could measure against. */
      share: number
      /** Which figure `share` is a share of. */
      measuredAgainst: 'surplus' | 'income'
      band: Band
      /** What is left each week after the repayment, when known. */
      leftOver: number | null
    }

/*
 * Thresholds.
 *
 * Two sets, because a share of gross income and a share of what is actually
 * spare mean very different things. $115 a week against $450 income is 26% and
 * sounds survivable. The same $115 against the $130 left after essentials is
 * 88%, which is the honest number and the one that predicts a missed payment.
 *
 * When essentials are known we always measure against the surplus. These bands
 * are rough guides for a person reading their own figures, not a serviceability
 * model, and the interface says so.
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

  // No surplus at all: the repayment cannot come from anywhere. Reporting a
  // share here would divide by zero or, worse, go negative and read as a small
  // reassuring percentage.
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
  const denominator = weeklySurplus !== null ? weeklySurplus : weeklyIncome
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
