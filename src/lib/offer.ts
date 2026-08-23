/**
 * The shape of an offer once it has been read.
 *
 * This schema is the contract between the extraction model and everything
 * downstream. It is shared by the serverless function (which hands it to the
 * API as a structured-output format, so the model is constrained to it rather
 * than asked politely for JSON) and by the browser (which re-validates the
 * response before any of it reaches a calculation).
 *
 * The field descriptions are load-bearing — they are compiled into the JSON
 * schema and are the only instructions the model gets about each field.
 */

import * as z from 'zod'
import type { Frequency } from './finance.ts'

export const ExtractedOffer = z.object({
  item: z
    .string()
    .describe('What is being financed, as specifically as the ad allows. "8kg front-load washing machine", not "appliance".'),

  payment: z
    .number()
    .describe('The recurring instalment in dollars, exactly as advertised. 17.64, not "17.64 per week".'),

  frequency: z
    .enum(['weekly', 'fortnightly', 'monthly'])
    .describe('How often the instalment falls due.'),

  termPeriods: z
    .number()
    .int()
    .describe(
      'The number of instalments, counted in the same unit as frequency. 78 weekly payments is 78. If the ad states the term in months or years, convert it to a count of instalments.',
    ),

  contractType: z
    .enum(['consumer_lease', 'credit_contract', 'bnpl', 'unknown'])
    .describe(
      'consumer_lease when the provider keeps ownership, or the ad says lease, rent, rent-to-own or rental. credit_contract when title passes to the buyer. bnpl for short-term interest-free instalments. unknown when the ad does not make it clear — do not guess.',
    ),

  cashPriceLow: z
    .number()
    .nullable()
    .describe(
      'Low end of the typical Australian retail price for this item, in dollars, from your own knowledge of what the item costs — NOT from the ad. If the ad states a cash price, use that figure for both ends. Null if the item is described too vaguely to price.',
    ),

  cashPriceHigh: z
    .number()
    .nullable()
    .describe('High end of the same estimate. Equal to cashPriceLow when the ad states a cash price.'),

  advertisedTotal: z
    .number()
    .nullable()
    .describe('The total cost, only if the ad states one outright. Null otherwise — never compute it.'),

  fees: z
    .array(z.string())
    .describe(
      'Fees and charges the ad mentions, each in a few words. "$9.90 dishonour fee", "establishment fee $99". Empty array if none are stated.',
    ),

  confidence: z
    .enum(['high', 'medium', 'low'])
    .describe(
      'high when every figure was printed plainly. medium when something was inferred from context. low when the image is unclear or a key number was guessed.',
    ),

  unreadable: z
    .array(z.string())
    .describe(
      'Field names you could not read and had to infer or default. Empty array if everything was legible. Be honest here — these are shown to the user for correction.',
    ),
})

export type ExtractedOffer = z.infer<typeof ExtractedOffer>

/** The extraction enum and the finance engine's Frequency must not drift apart. */
const _frequencyMatches: Frequency = 'weekly' satisfies ExtractedOffer['frequency']
void _frequencyMatches

export type ExtractFailure = {
  ok: false
  /** Machine-readable, so the interface can choose its own words. */
  code: 'no_input' | 'too_large' | 'rate_limited' | 'unreadable' | 'upstream' | 'not_configured'
  message: string
}

export type ExtractSuccess = {
  ok: true
  offer: ExtractedOffer
  /** True when the response came from the bundled examples, not the API. */
  demo: boolean
}

export type ExtractResponse = ExtractSuccess | ExtractFailure
