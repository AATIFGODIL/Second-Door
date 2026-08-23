/**
 * Three offers to demonstrate on, and the pre-extracted result for each.
 *
 * These do double duty. In the interface they are the "try an example" path,
 * so a judge with no ad to hand can still see the product work. In the
 * serverless function they are the DEMO_ONLY payload: with that flag set the
 * function returns the matching offer and makes no upstream call at all, so a
 * burned or rate-limited key cannot take the demo down.
 *
 * The advertisements are written for this project. The providers are invented
 * — the offer structures and the pricing are typical of the real market, but
 * naming an actual retailer beside an over-cap total would be an accusation we
 * have no basis to make.
 */

import type { ExtractedOffer } from '../lib/offer.ts'

export type Example = {
  id: string
  /** Shown on the button. */
  label: string
  /** One line on what this example demonstrates. */
  teaches: string
  /** The ad as the user would paste it. */
  text: string
  offer: ExtractedOffer
}

export const EXAMPLES: Example[] = [
  {
    id: 'washing-machine',
    label: 'Washing machine',
    teaches: 'Lawful, and still costs 72% more than the machine',
    text: `EASYHOME RENTALS — NO CREDIT CHECKS!
8kg front loader washing machine
ONLY $17.64 PER WEEK
78 week term. Free delivery.
Approval in 15 minutes. Centrelink customers welcome.
Dishonour fee $9.90 applies to missed payments.`,
    offer: {
      item: '8kg front-load washing machine',
      payment: 17.64,
      frequency: 'weekly',
      termPeriods: 78,
      contractType: 'consumer_lease',
      cashPriceLow: 700,
      cashPriceHigh: 800,
      advertisedTotal: null,
      fees: ['$9.90 dishonour fee'],
      confidence: 'high',
      unreadable: [],
    },
  },
  {
    id: 'laptop',
    label: 'Laptop',
    teaches: 'Total lands above the s175AA cap',
    text: `RENT-2-OWN TECH
Student laptop bundle — 15" laptop, case and mouse
$32 a week for 2 years
No deposit. No credit check. Own it at the end of the term.
Establishment fee $99. Late payment fee $12.`,
    offer: {
      item: '15-inch student laptop with case and mouse',
      payment: 32,
      frequency: 'weekly',
      termPeriods: 104,
      contractType: 'consumer_lease',
      cashPriceLow: 900,
      cashPriceHigh: 1200,
      advertisedTotal: null,
      fees: ['$99 establishment fee', '$12 late payment fee'],
      confidence: 'high',
      unreadable: [],
    },
  },
  {
    id: 'phone-bnpl',
    label: 'Phone on buy-now-pay-later',
    teaches: 'A genuine 0% — the comparison has to be able to say so',
    text: `Pay in 4 with SplitPay
Smartphone, 128GB
4 fortnightly payments of $224.75
Total $899. No interest, ever.
Late fee $10 per missed payment, capped at $40.`,
    offer: {
      item: 'Smartphone, 128GB',
      payment: 224.75,
      frequency: 'fortnightly',
      termPeriods: 4,
      contractType: 'bnpl',
      cashPriceLow: 899,
      cashPriceHigh: 899,
      advertisedTotal: 899,
      fees: ['$10 late fee per missed payment, capped at $40'],
      confidence: 'high',
      unreadable: [],
    },
  },
]

export const DEFAULT_EXAMPLE = EXAMPLES[0]

/**
 * Pick the example that best matches some text. Used only by DEMO_ONLY, so a
 * demo running without the API still responds to what was actually pasted
 * instead of always returning the washing machine.
 */
export function matchExample(text: string | undefined): Example {
  if (!text) return DEFAULT_EXAMPLE
  const haystack = text.toLowerCase()
  const hit = EXAMPLES.find((example) =>
    example.id
      .split('-')
      .concat(example.label.toLowerCase().split(' '))
      .some((word) => word.length > 3 && haystack.includes(word)),
  )
  return hit ?? DEFAULT_EXAMPLE
}
