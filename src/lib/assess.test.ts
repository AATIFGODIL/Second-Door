import { describe, expect, it } from 'vitest'
import { assess } from './assess'
import type { ExtractedOffer } from './offer'

const base: ExtractedOffer = {
  item: 'Washing machine',
  payment: 17.64,
  frequency: 'weekly',
  termPeriods: 78,
  contractType: 'consumer_lease',
  cashPriceLow: 800,
  cashPriceHigh: 800,
  advertisedTotal: null,
  fees: [],
  confidence: 'high',
  unreadable: [],
}

const offer = (patch: Partial<ExtractedOffer> = {}): ExtractedOffer => ({ ...base, ...patch })

describe('completeness', () => {
  it('will not compute without a payment', () => {
    const result = assess(offer({ payment: 0 }))
    expect(result.computable).toBe(false)
    expect(result.missing).toContain('the payment amount')
    expect(result.total).toBeNull()
  })

  it('will not compute without a term', () => {
    expect(assess(offer({ termPeriods: 0 })).missing).toContain('how many payments')
  })

  it('will not compute without a cash price', () => {
    expect(assess(offer({ cashPriceLow: null, cashPriceHigh: null })).missing).toContain(
      'what the item costs to buy outright',
    )
  })

  it('lists every missing field at once rather than one at a time', () => {
    expect(assess(offer({ payment: 0, termPeriods: 0 })).missing).toHaveLength(2)
  })
})

describe('the cap check only runs where the statute applies', () => {
  it('assesses a consumer lease', () => {
    expect(assess(offer()).cap).not.toBeNull()
  })

  it.each(['credit_contract', 'bnpl', 'unknown'] as const)('does not assess %s', (contractType) => {
    expect(assess(offer({ contractType })).cap).toBeNull()
  })
})

describe('price range handling', () => {
  it('solves the rate against the midpoint of the range', () => {
    const result = assess(offer({ cashPriceLow: 700, cashPriceHigh: 900 }))
    expect(result.cashPriceMid).toBe(800)
  })

  it('tests the cap against the top of the range, which is the higher cap', () => {
    // 78 weeks rounds up to 18 months. Against the $900 top: 900 + 900*0.04*18
    // = $1,548. Against the $700 bottom it would be $1,204 — and this offer's
    // $1,375.92 total would read as over the cap. The generous reading is the
    // required one.
    const result = assess(offer({ cashPriceLow: 700, cashPriceHigh: 900 }))
    expect(result.cap?.kind).toBe('within')
    if (result.cap?.kind === 'within') expect(result.cap.cap).toBeCloseTo(1548, 6)
  })

  it('tolerates a range typed in backwards', () => {
    const forwards = assess(offer({ cashPriceLow: 700, cashPriceHigh: 900 }))
    const backwards = assess(offer({ cashPriceLow: 900, cashPriceHigh: 700 }))
    expect(backwards.cashPriceMid).toBe(forwards.cashPriceMid)
    expect(backwards.cap).toEqual(forwards.cap)
  })
})

describe('the worked example', () => {
  it('reproduces the README figures', () => {
    const result = assess(offer())
    expect(result.total).toBeCloseTo(1375.92, 6)
    expect(result.extra).toBeCloseTo(575.92, 6)
    expect(result.rate?.kind).toBe('rate')
    if (result.rate?.kind === 'rate') {
      expect(result.rate.annual * 100).toBeCloseTo(120.3, 0)
    }
  })

  it('trips the over-cap branch on the pre-correction $20/week figure', () => {
    const result = assess(offer({ payment: 20 }))
    expect(result.cap?.kind).toBe('appears_over')
    if (result.cap?.kind === 'appears_over') {
      expect(result.cap.cap).toBeCloseTo(1376, 6)
      expect(result.cap.excess).toBeCloseTo(184, 6)
    }
  })

  it('reports a genuine 0% rather than a tiny positive rate', () => {
    const result = assess(
      offer({
        payment: 224.75,
        frequency: 'fortnightly',
        termPeriods: 4,
        contractType: 'bnpl',
        cashPriceLow: 899,
        cashPriceHigh: 899,
      }),
    )
    expect(result.extra).toBe(0)
    expect(result.rate).toEqual({ kind: 'rate', periodic: 0, annual: 0 })
  })
})
