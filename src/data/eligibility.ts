export const SOURCE = {
  url: 'https://nils.com.au',
  eligibilityChecker: 'https://nils.com.au/eligibility-checker',
  providerFinder: 'https://nils.com.au/find-a-provider',
  capturedOn: '2026-08-23',
}

/** Income tests are before tax, and are published as guidelines. */
export const INCOME_SINGLE = 70_000
export const INCOME_PARTNERED = 100_000

/**
 * The one question that must be answerable without answering it. "skipped"
 * counts as answered so the assessment can finish, and is never read as a
 * disclosure — only an explicit true is.
 */
export type Disclosure = boolean | 'skipped'

export type Answers = {
  concessionCard: boolean | null
  underIncome: boolean | null
  /** Family or domestic violence in the last 10 years. No income test applies. */
  familyViolence: Disclosure | null
  essentialItem: boolean | null
  /** Providers generally ask for three months at the current address. */
  threeMonthsAtAddress: boolean | null
  behindOnRepayments: boolean | null
}

export const BLANK_ANSWERS: Answers = {
  concessionCard: null,
  underIncome: null,
  familyViolence: null,
  essentialItem: null,
  threeMonthsAtAddress: null,
  behindOnRepayments: null,
}

export type Outcome =
  | { kind: 'incomplete'; remaining: number }
  | { kind: 'looks_eligible'; reasons: string[] }
  | { kind: 'worth_asking'; reasons: string[] }
  | { kind: 'probably_not'; reasons: string[] }

export function assessEligibility(answers: Answers): Outcome {
  const remaining = Object.values(answers).filter((value) => value === null).length
  if (remaining > 0) return { kind: 'incomplete', remaining }

  const reasons: string[] = []

  // Only an explicit yes is a disclosure. "skipped" is a string, and reading
  // it for truthiness would silently record something nobody said.
  const disclosed = answers.familyViolence === true

  // No income test applies where family violence is disclosed, so an income
  // answer must not be able to downgrade it.
  const meetsCriterion = disclosed || answers.concessionCard || answers.underIncome

  if (disclosed) reasons.push('No income test applies in your situation.')
  if (answers.concessionCard) reasons.push('You have a concession card.')
  if (answers.underIncome && !disclosed) {
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

  // Neither of these is a refusal on its own. Both are published as things a
  // provider weighs, and both are worth naming before someone books a visit.
  const concerns: string[] = []

  if (answers.behindOnRepayments) {
    concerns.push(
      'Being behind on repayments or having overdue debts is listed as a reason someone would not be eligible. Providers still assess individually, and a financial counsellor can help either way.',
    )
  }

  if (!answers.threeMonthsAtAddress) {
    concerns.push(
      'Providers generally ask that you have lived at your current address for at least three months. Ask anyway: some accept other proof that you can be reached and can repay.',
    )
  }

  if (concerns.length > 0) {
    return { kind: 'worth_asking', reasons: [...reasons, ...concerns] }
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

export function coverageFor(amount: number, categoryId: string) {
  const category = LOAN_CATEGORIES.find((entry) => entry.id === categoryId)
  if (!category) return null
  return {
    category,
    withinCap: amount <= category.cap,
    shortfall: Math.max(0, amount - category.cap),
  }
}
