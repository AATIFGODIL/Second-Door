# Second Door

[![tests](https://github.com/AATIFGODIL/second-door/actions/workflows/test.yml/badge.svg)](https://github.com/AATIFGODIL/second-door/actions/workflows/test.yml)

**Melbourne Hack 2026, Track 3, Financial Inclusion**

A rent-to-own offer says $17.64 a week. It does not say $1,376.

Second Door reads the offer, does the arithmetic, and puts the real number next to
what the same purchase costs at 0% through the No Interest Loan Scheme.

## The problem

Australians who cannot access mainstream credit are routed into consumer leases and
rent-to-own contracts. These are priced in weekly instalments that hide the total,
and they commonly cost well over the cash price for the same goods. The No Interest
Loan Scheme offers the same essential purchase at 0%, but much of the target group
has never heard of it, because nobody advertises a product that earns no margin.

Second Door intercepts the moment of decision. Offer in, both doors out.

## The two numbers

An $800 washing machine on a 78 week consumer lease, priced at the maximum the law
allows:

| | |
| --- | --- |
| Cash price | $800 |
| Total paid on the lease | **$1,376** |
| Extra paid | **$576** |
| Effective annual rate | **120.3% p.a.** |
| Same purchase via NILS | $800, repaid at 0% |

## The cap finding

The example this project started from was $20/week over 78 weeks on an $800 base.
That is $1,560 total and $760 extra. Bigger, more dramatic, and describing a
contract that cannot legally exist.

Section 175AA of the National Credit Code caps a consumer lease at the base price,
plus 4% of the base price for each whole month of the term, to a ceiling of 48
months, plus permitted delivery and installation fees. It was introduced by the
Financial Sector Reform Act 2022 and commenced in 2023.

```
800 + (800 × 0.04 × 18) = $1,376
```

$1,560 is $184 over the permitted maximum. The fixture was corrected to $17.64/week
before it reached the repository. The old figure is kept as a regression test
asserting that it trips the over-cap branch.

That correction became a feature. Second Door now assesses every consumer lease
against its own cap. An offer whose total exceeds it gets a third result state:
**this offer appears to exceed the legal cap**, with the AFCA and ASIC complaint
paths. ASIC took action against Walker Stores in May 2025 over inflated base prices
used to sidestep this same ceiling.

Two guards sit on that check, because a wrong accusation is far worse than a missed
one. Both resolve every ambiguity in the provider's favour.

1. The cap is computed against the **top** of the estimated retail range, never the
   midpoint. A higher base price permits a higher cap.
2. The statute counts whole months. Offers are quoted in weeks, and they do not
   divide evenly. 78 weeks is 546 days, or 17.94 months, so 17 whole months read
   strictly, and a $1,344 cap. We round up to 18 months and $1,376.

The wording is always *appears to exceed*, never *is illegal*.

The cap governs consumer leases only. A credit contract answers to the 48% annual
cost rate ceiling instead, and a buy-now-pay-later plan to neither. Running the
lease cap against those would print an accusation from the wrong statute, so
`assess()` checks the contract type first and has tests covering each case.

## How the rate is calculated

The language model reads the offer. It never computes anything you see. Every figure
comes from [`src/lib/finance.ts`](src/lib/finance.ts), which is pure functions with
no React, no network and no randomness. The CI badge above runs that suite on every
push.

We solve for the periodic rate `i` in the ordinary annuity present value:

```
PV = PMT × (1 − (1 + i)^−n) / i
```

by bisection over `[0, 5]`, then compound to an annual figure with
`(1 + i)^periodsPerYear − 1`.

Bisection rather than Newton-Raphson is deliberate. It cannot diverge, it needs no
derivative, and its failure modes can be named rather than caught. The function is
monotonically decreasing in `i`, so the bracket either contains exactly one root or
tells us which side we fell off.

Three failure modes are real, and are returned as typed results rather than thrown.

- At `i = 0` the closed form is `0/0`. The limit is `n`, and that branch is taken
  explicitly rather than left to floating point.
- The annuity factor can never exceed `n`, so whenever the cash price is at or above
  the total paid there is no non-negative rate at all. A term of 1 is this case, not
  merely an edge case. Buy-now-pay-later sits exactly on the boundary and solves to
  a true 0%.
- A periodic rate just inside the ceiling can annualise to `2.8e42%`. That is
  correct and useless on a screen. Past 10,000% p.a. we say *off the scale* rather
  than print an exponent.

**On terminology.** We call this an *effective annual rate*, an APR equivalent that
we compute ourselves. It is deliberately never called a *comparison rate* or an
*annual cost rate*. Both are defined terms in Australian credit law with prescribed
calculation methods, and this figure is neither.

## Can they actually repay it?

Being a bad deal and being unaffordable are different problems, and the second one
decides whether someone defaults and loses the goods. So the results screen asks for
what the person brings in, and optionally what the essentials cost.

The denominator is the whole point. $115 a week against $450 income is 26% and sounds
survivable. Against the $130 actually left after rent and bills it is 88%, which is
the figure that predicts a missed payment. When essentials are known we always measure
against the surplus, and a zero or negative surplus is handled explicitly rather than
producing a small negative percentage that reads as reassuring.

This never returns a decision. It reports a share of income and a band, and says so in
the interface. Second Door does not assess anyone, and nothing entered here leaves the
device or is stored. A tool that told someone they were approved or declined would be
the most harmful thing this project could ship.

## Plain language

Financial exclusion is not only about lacking an account. Sometimes a person has access
to a product and cannot read it well enough to use it safely.

Every financial term on the results screen carries an explanation in ordinary words:
the annual rate, the affordability percentage, and what a consumer lease means for who
owns the item. They are `<details>` elements, so they open with no JavaScript, are
keyboard operable and announced correctly for free, and find-in-page reaches closed
content.

## Why we never touch money

Second Door is a calculator and a directory. It originates no credit, brokers no
loan, processes no payment, and holds no balance.

That is a design decision rather than a missing feature. It keeps the project
outside credit licensing, and it means there is nothing here that can mis-sell
anyone anything. The most Second Door can do is show you arithmetic and a phone
number.

Nothing is stored. No accounts, no database, no server-side user state, no
analytics. The only thing that leaves your device is the offer text or image you
explicitly choose to have read, and the key for that never ships to the browser.

## Known limitations

Read this section. It is the honest account of where the numbers are soft.

**The cash price is an estimate.** It is the single largest source of error in the
product, and it drives the headline. Retail prices are estimated from the item
description against model training data with a knowledge cutoff, so they can be
stale, regionally wrong, or wrong about the specific model. The estimate is shown as
a range rather than a point, it is always labelled, it is user editable, and every
downstream figure recomputes live when you change it. If the estimate is wrong, the
*extra paid* figure is wrong by the same amount.

**Eligibility is indicative, never a decision.** NILS providers set their own
thresholds, assess capacity to repay individually, and are not bound by the
guideline figures we check against. Second Door will say *you look eligible, here is
how to check*. It will never say *you are eligible*.

**The provider list is not built yet.** When it lands it will be a dated snapshot of
public data from the Good Shepherd directory, labelled with its capture date and not
fetched live. Providers close, move, and change intake hours.

**The cap check is arithmetic, not a legal finding.** It compares a total against a
statutory formula using an estimated base price. It does not know about permitted
fees that are not visible on an advertisement, whether the contract is genuinely a
consumer lease, or any exemption that may apply.

**Extraction can misread an offer.** Fine print, unusual layouts and poor photos all
degrade it. Every extracted field is shown and is editable before any figure is
computed. Fields the model guessed at are flagged in the interface. There is a
manual entry path that skips extraction entirely, and every error state leads to it.

**The IP rate limit is a speed bump.** Serverless instances do not share memory, so
a caller spread across instances gets a multiple of the nominal limit. What actually
protects the key is the spend cap, the cheap model, and the `DEMO_ONLY` flag.

**The affordability bands are rough guides.** They are arithmetic on figures the user
types, not a serviceability model. A lender assessing someone would look at far more
than this, and there is no fixed line between safe and unsafe.

**This is not financial advice.** It is a calculator and a directory. It cannot know
your circumstances, and it is not a substitute for a financial counsellor. The
National Debt Helpline (1800 007 007) is free and independent.

## Running it

```bash
npm install
```

Copy `.env.example` to `.env` and add a Gemini API key. Set a low spend cap on that
key first. Without a key, set `DEMO_ONLY=true` and everything works against the
bundled examples with no upstream call.

```bash
npm run dev
```

The cost engine, the cap check and the assessment layer:

```bash
npm test
```

## Build status

| Block | | |
| --- | --- | --- |
| 1 | Scaffold, design tokens, interface primitives | done |
| 2 | Finance engine and s175AA cap check | done |
| 3 | Serverless proxy holding the API key | done |
| 4 | Extraction from image and text, editable fields | done |
| 5 | Scrolling explainer and two-door result screen | done |
| 6 | Plain-language explanations of every term | done |
| 6b | Affordability against income and essentials | done |
| 7 | NILS eligibility and provider lookup | next |
| 8 | Read-aloud and accessibility pass | |
| 9 | Demo mode and failure fallbacks | partial |
| 10 | Deploy | done |

73 tests currently pass.

## Stack

Vite, React, TypeScript. One serverless function holds the Gemini API key.
Extraction uses `gemini-3.5-flash-lite` with vision, so there is no separate OCR
dependency, and reading a payment amount off an advertisement does not need a
frontier model. No state library, no backend, no database.

The model is constrained by JSON Schema generated from the zod schema in
[`src/lib/offer.ts`](src/lib/offer.ts), so one definition constrains the model,
validates the response on the server, and types the browser.
