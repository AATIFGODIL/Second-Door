import { describe, expect, it } from 'vitest'
import { assessEligibility, BLANK_ANSWERS, coverageFor, type Answers } from './eligibility'

const answers = (patch: Partial<Answers> = {}): Answers => ({
  concessionCard: false,
  underIncome: false,
  familyViolence: false,
  essentialItem: true,
  behindOnRepayments: false,
  ...patch,
})

describe('it will not guess', () => {
  it('reports how many questions are left', () => {
    expect(assessEligibility(BLANK_ANSWERS)).toEqual({ kind: 'incomplete', remaining: 5 })
  })

  it('stays incomplete until every question is answered', () => {
    const result = assessEligibility({ ...BLANK_ANSWERS, concessionCard: true })
    expect(result).toEqual({ kind: 'incomplete', remaining: 4 })
  })
})

describe('it never returns a yes', () => {
  it('says "looks eligible", which is the strongest outcome available', () => {
    const kinds = [
      assessEligibility(answers({ concessionCard: true })).kind,
      assessEligibility(answers({ underIncome: true })).kind,
      assessEligibility(answers({ familyViolence: true })).kind,
    ]
    expect(kinds).toEqual(['looks_eligible', 'looks_eligible', 'looks_eligible'])
    // There is no outcome that asserts eligibility outright.
    expect(kinds).not.toContain('eligible')
  })
})

describe('published criteria', () => {
  it('a concession card alone is enough', () => {
    expect(assessEligibility(answers({ concessionCard: true })).kind).toBe('looks_eligible')
  })

  it('income alone is enough', () => {
    expect(assessEligibility(answers({ underIncome: true })).kind).toBe('looks_eligible')
  })

  it('applies no income test where family violence is disclosed', () => {
    // The published criteria are explicit that no income test applies. A "no"
    // on income must not be able to downgrade this.
    const result = assessEligibility(answers({ familyViolence: true, underIncome: false }))
    expect(result.kind).toBe('looks_eligible')
    if (result.kind === 'looks_eligible') {
      expect(result.reasons.join(' ')).toContain('No income test applies')
    }
  })

  it('matching nothing is worth asking, not a refusal', () => {
    expect(assessEligibility(answers()).kind).toBe('worth_asking')
  })
})

describe('published exclusions', () => {
  it('a non-essential purpose rules it out regardless of every other answer', () => {
    const result = assessEligibility(
      answers({ concessionCard: true, underIncome: true, familyViolence: true, essentialItem: false }),
    )
    expect(result.kind).toBe('probably_not')
    if (result.kind === 'probably_not') expect(result.reasons[0]).toContain('essential')
  })

  it('being behind on repayments downgrades but does not refuse', () => {
    // Published as a reason someone would not be eligible, but providers still
    // assess individually, so this must not become a hard no.
    const result = assessEligibility(answers({ concessionCard: true, behindOnRepayments: true }))
    expect(result.kind).toBe('worth_asking')
  })
})

describe('loan caps', () => {
  it('knows a phone is capped lower than household goods', () => {
    expect(coverageFor(1500, 'phone')).toMatchObject({ withinCap: false, shortfall: 500 })
    expect(coverageFor(1500, 'household')).toMatchObject({ withinCap: true, shortfall: 0 })
  })

  it('an $800 washing machine fits comfortably', () => {
    expect(coverageFor(800, 'household')?.withinCap).toBe(true)
  })

  it('returns null for a category it does not know', () => {
    expect(coverageFor(800, 'yacht')).toBeNull()
  })
})
