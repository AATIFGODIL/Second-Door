import { describe, expect, it } from 'vitest'
import { assessAffordability, toWeekly } from './afford'

const input = (patch: Partial<Parameters<typeof assessAffordability>[0]> = {}) =>
  assessAffordability({
    payment: 17.64,
    frequency: 'weekly',
    income: 450,
    incomeFrequency: 'weekly',
    essentials: null,
    essentialsFrequency: 'weekly',
    ...patch,
  })

describe('normalising to a week', () => {
  it('leaves weekly alone', () => {
    expect(toWeekly(100, 'weekly')).toBe(100)
  })

  it('halves a fortnightly figure', () => {
    expect(toWeekly(100, 'fortnightly')).toBe(50)
  })

  it('uses 12/52 for monthly, not 1/4', () => {
    // A month is not four weeks. Treating it as four overstates the weekly
    // figure by about 8%, which is enough to move a band.
    expect(toWeekly(100, 'monthly')).toBeCloseTo(23.0769, 4)
  })
})

describe('it refuses to guess', () => {
  it('needs an income', () => {
    expect(input({ income: null }).kind).toBe('need_income')
  })

  it('needs a payment', () => {
    expect(input({ payment: 0 }).kind).toBe('need_income')
  })

  it('treats a zero income as missing rather than dividing by it', () => {
    expect(input({ income: 0 }).kind).toBe('need_income')
  })
})

describe('measuring against income when essentials are unknown', () => {
  it('reports the share of income', () => {
    const result = input({ payment: 135, income: 450 })
    expect(result).toMatchObject({ measuredAgainst: 'income', band: 'risky' })
    if (result.kind === 'assessed') expect(result.share).toBeCloseTo(0.3, 6)
  })

  it('calls a small share comfortable', () => {
    const result = input({ payment: 20, income: 450 })
    if (result.kind === 'assessed') expect(result.band).toBe('comfortable')
  })

  it('treats the band boundaries as inclusive of the safer side', () => {
    // Exactly 10% is comfortable, exactly 20% is tight. Stated as a test so a
    // later change to the thresholds has to decide this on purpose.
    const atComfortable = input({ payment: 45, income: 450 })
    const atTight = input({ payment: 90, income: 450 })
    if (atComfortable.kind === 'assessed') expect(atComfortable.band).toBe('comfortable')
    if (atTight.kind === 'assessed') expect(atTight.share).toBeCloseTo(0.2, 6)
  })
})

describe('measuring against surplus when essentials are known', () => {
  it('prefers the surplus, because it is the honest denominator', () => {
    // $115/wk against $450 income is 26% and sounds survivable. Against the
    // $130 actually spare it is 88%, which is the number that predicts a
    // missed payment.
    const result = input({ payment: 115, income: 450, essentials: 320 })
    expect(result).toMatchObject({ measuredAgainst: 'surplus', band: 'risky' })
    if (result.kind === 'assessed') {
      expect(result.weeklySurplus).toBeCloseTo(130, 6)
      expect(result.share).toBeCloseTo(0.8846, 3)
      expect(result.leftOver).toBeCloseTo(15, 6)
    }
  })

  it('bands a third of the surplus as tight, not comfortable', () => {
    const result = input({ payment: 50, income: 450, essentials: 320 })
    if (result.kind === 'assessed') expect(result.band).toBe('tight')
  })

  it('handles essentials that swallow the whole income', () => {
    const result = input({ payment: 50, income: 400, essentials: 400 })
    expect(result).toMatchObject({ band: 'risky', share: Number.POSITIVE_INFINITY })
    // The dangerous bug here is a negative surplus producing a small negative
    // share that reads as a reassuring percentage.
    if (result.kind === 'assessed') expect(result.leftOver).toBeLessThan(0)
  })

  it('handles essentials above income', () => {
    const result = input({ payment: 50, income: 300, essentials: 400 })
    if (result.kind === 'assessed') {
      expect(result.weeklySurplus).toBeCloseTo(-100, 6)
      expect(result.band).toBe('risky')
    }
  })
})

describe('mixed frequencies', () => {
  it('compares a fortnightly repayment against a monthly income correctly', () => {
    // $200/fortnight is $100/wk. $2,600/month is $600/wk. 100/600 = 16.7%.
    const result = assessAffordability({
      payment: 200,
      frequency: 'fortnightly',
      income: 2600,
      incomeFrequency: 'monthly',
      essentials: null,
      essentialsFrequency: 'weekly',
    })
    if (result.kind === 'assessed') {
      expect(result.weeklyRepayment).toBeCloseTo(100, 6)
      expect(result.weeklyIncome).toBeCloseTo(600, 6)
      expect(result.share).toBeCloseTo(0.1667, 3)
      expect(result.band).toBe('tight')
    }
  })
})
