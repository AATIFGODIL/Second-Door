/**
 * NILS eligibility, as published.
 *
 * Criteria, loan caps and exclusions captured from nils.com.au on 2026-08-23.
 * The four questions map directly onto the published criteria rather than onto
 * anything we invented.
 *
 * This never returns a yes. Providers set their own thresholds, assess capacity
 * to repay individually, and are not bound by the guideline figures below. The
 * strongest thing this file will say is "you look eligible, here is how to
 * check", which is why the outcomes are named the way they are.
 */

export const SOURCE = {
  url: 'https://nils.com.au',
  eligibilityChecker: 'https://nils.com.au/eligibility-checker',
  providerFinder: 'https://nils.com.au/find-a-provider',
  capturedOn: '2026-08-23',
}

/** Income tests are before tax, and are published as guidelines. */
export const INCOME_SINGLE = 70_000
export const INCOME_PARTNERED = 100_000

export type Answers = {
  /** Health Care Card or Pensioner Concession Card. */
  concessionCard: boolean | null
  /** Under the published income guideline for their household. */
  underIncome: boolean | null
  /** Family or domestic violence in the last 10 years. No income test applies. */
  familyViolence: boolean | null
  /** An essential item or service, rather than an excluded purpose. */
  essentialItem: boolean | null
  /** Overdue debts or behind on existing repayments. A published exclusion. */
  behindOnRepayments: boolean | null
}

export const BLANK_ANSWERS: Answers = {
  concessionCard: null,
  underIncome: null,
  familyViolence: null,
  essentialItem: null,
  behindOnRepayments: null,
}

export type Outcome =
  | { kind: 'incomplete'; remaining: number }
  /** Meets a published criterion and the purpose fits. Still not a decision. */
  | { kind: 'looks_eligible'; reasons: string[] }
  /** Might qualify. Published guidance is explicit that providers vary. */
  | { kind: 'worth_asking'; reasons: string[] }
  /** A published exclusion applies, or no criterion is met. */
  | { kind: 'probably_not'; reasons: string[] }

export function assessEligibility(answers: Answers): Outcome {
  const remaining = Object.values(answers).filter((value) => value === null).length
  if (remaining > 0) return { kind: 'incomplete', remaining }

  const reasons: string[] = []

  /*
   * Family violence is checked first and on its own. The published criteria
   * apply no income test in that case, so an income answer must not be able to
   * downgrade it.
   */
  const meetsCriterion =
    answers.familyViolence || answers.concessionCard || answers.underIncome

  if (answers.familyViolence) reasons.push('No income test applies in your situation.')
  if (answers.concessionCard) reasons.push('You have a concession card.')
  if (answers.underIncome && !answers.familyViolence) {
    reasons.push('Your income is within the published guideline.')
  }

  if (!answers.essentialItem) {
    return {
      kind: 'probably_not',
      reasons: [
        'NILS is for essential items and services. It is not available for cash, debts, rent, bills, groceries, petrol, holidays, rates or fines.',
      ],
    }
  }

  if (answers.behindOnRepayments) {
    return {
      kind: 'worth_asking',
      reasons: [
        ...reasons,
        'Being behind on repayments or having overdue debts is listed as a reason someone would not be eligible. Providers still assess individually, and a financial counsellor can help either way.',
      ],
    }
  }

  if (!meetsCriterion) {
    return {
      kind: 'worth_asking',
      reasons: [
        'You did not match any of the published criteria, but providers set their own thresholds and assess each person individually.',
      ],
    }
  }

  return { kind: 'looks_eligible', reasons }
}

/**
 * What NILS will lend for, and the published ceiling on each.
 *
 * Used to tell someone whether the thing in front of them is even covered, and
 * for how much, before they go to the trouble of applying.
 */
export const LOAN_CATEGORIES = [
  { id: 'household', label: 'Household essentials', cap: 2000, months: 24 },
  { id: 'furniture', label: 'Furniture and homewares', cap: 2000, months: 24 },
  { id: 'health', label: 'Health and wellbeing', cap: 2000, months: 24 },
  { id: 'education', label: 'Education and employment', cap: 2000, months: 24 },
  { id: 'repairs', label: 'Vehicle and home repairs', cap: 2000, months: 24 },
  { id: 'pet', label: 'Pet care', cap: 2000, months: 24 },
  { id: 'phone', label: 'Phones and tablets', cap: 1000, months: 24 },
  { id: 'bond', label: 'Rental bond', cap: 3000, months: 24 },
  { id: 'vehicle', label: 'A vehicle', cap: 5000, months: 48 },
  { id: 'disaster', label: 'Disaster recovery', cap: 3000, months: 24 },
] as const

/** Published exclusions, quoted rather than paraphrased. */
export const NOT_FOR = [
  'cash',
  'debts',
  'rent',
  'bills',
  'groceries',
  'petrol',
  'holidays',
  'rates',
  'fines',
]

/** Which category covers an amount, and whether it fits under the cap. */
export function coverageFor(amount: number, categoryId: string) {
  const category = LOAN_CATEGORIES.find((entry) => entry.id === categoryId)
  if (!category) return null
  return {
    category,
    withinCap: amount <= category.cap,
    shortfall: Math.max(0, amount - category.cap),
  }
}
