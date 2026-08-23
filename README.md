# Second Door

[![tests](https://github.com/AATIFGODIL/second-door/actions/workflows/test.yml/badge.svg)](https://github.com/AATIFGODIL/second-door/actions/workflows/test.yml)

**Melbourne Hack 2026 — Track 3, Financial Inclusion**

A rent-to-own offer says *$20 a week*. It does not say *$1,376*.

Second Door reads the offer, does the arithmetic, and puts the real number next to
what the same purchase costs at a genuine 0% through the No Interest Loan Scheme.

---

## The problem

Australians who can't access mainstream credit are routed into consumer leases and
rent-to-own contracts priced in weekly instalments that conceal the total, commonly
costing well over the cash price for the same goods. The No Interest Loan Scheme
offers the same essential purchase at 0%, but much of the target cohort has never
heard of it, because nobody advertises a product that earns no margin. Second Door
intercepts the moment of decision — offer in, both doors out.

## The two numbers

For an $800 washing machine on a 78-week consumer lease, priced at the maximum the
law allows:

|                        |                          |
| ---------------------- | ------------------------ |
| Cash price             | $800                     |
| Total paid on the lease | **$1,376**              |
| Extra paid             | **$576**                 |
| Effective annual rate  | **≈120.4% p.a.**         |
| Same purchase via NILS | $800, repaid at 0%       |

The $1,376 is not a figure we picked because it looked bad. It is the most a lessor
is *lawfully allowed* to charge — see below.

## The cap finding

The example this project started from was $20/week over 78 weeks on an $800 base:
$1,560 total, $760 extra, 171.9% p.a. Bigger, more dramatic, and describing a
contract that cannot legally exist.

Section 175AA of the National Credit Code caps a consumer lease at the base price,
plus 4% of the base price for each whole month of the term, to a ceiling of 48
months, plus permitted delivery and installation fees. It was introduced by the
Financial Sector Reform Act 2022 and commenced in 2023.

```
800 + (800 × 0.04 × 18) = $1,376
```

$1,560 is $184 over the permitted maximum. The fixture was corrected to $17.64/week
before it reached the repository, and the old figure is kept as a regression test
asserting it trips the over-cap branch. The weaker headline is the stronger claim.

That correction then became a feature. Second Door assesses every consumer lease
against its own cap, and an offer whose total exceeds it gets a third state on door
one: **this offer appears to exceed the legal cap**, with the AFCA and ASIC
complaint paths. ASIC took action against Walker Stores in May 2025 over inflated
base prices used to sidestep this same ceiling.

Two guards on that check, because a wrong accusation is far worse than a missed one.
Both resolve every ambiguity in the provider's favour:

- The cap is computed against the **top** of the estimated retail range, never the
  midpoint. A higher base price permits a higher cap.
- The statute counts whole months; offers are quoted in weeks, and they don't divide
  evenly. 78 weeks is 546 days — 17.94 months, so 17 whole months read strictly, and
  a $1,344 cap. We round **up** to 18 months and $1,376, and the interface discloses
  when the two readings disagree.

The wording is always *appears to exceed*. Never *is illegal*.

## How the rate is actually calculated

The language model reads the offer. It never computes anything you see. Every figure
comes from [`src/lib/finance.ts`](src/lib/finance.ts) — pure functions, no React, no
network, no randomness — and the CI badge above runs that suite on every push.

We solve for the periodic rate `i` in the ordinary-annuity present value:

```
PV = PMT × (1 − (1 + i)^−n) / i
```

by **bisection** over `[0, 5]`, then compound to an annual figure with
`(1 + i)^periodsPerYear − 1`. Bisection rather than Newton-Raphson deliberately: it
cannot diverge, it needs no derivative, and its failure modes can be named rather
than caught. The function is monotonically decreasing in `i`, so the bracket either
contains exactly one root or tells us which side we fell off.

Three of those failure modes are real, and are returned as typed results rather than
thrown:

- At `i = 0` the closed form is `0/0`. The limit is `n`, and that branch is taken
  explicitly rather than left to floating point.
- The annuity factor can never exceed `n`, so whenever the cash price is at or above
  the total paid there is **no non-negative rate at all**. A term of 1 is this case,
  not merely an edge case. Buy-now-pay-later sits exactly on the boundary and solves
  to a true 0%.
- A periodic rate just inside the ceiling can annualise to `2.8e42%` — correct, and
  useless on a screen. Past 10,000% p.a. we say *off the scale* rather than print an
  exponent.

**On terminology.** We call this an *effective annual rate*, an APR-equivalent we
compute ourselves. It is deliberately never called a *comparison rate* or an *annual
cost rate*. Both are defined terms in Australian credit law with prescribed
calculation methods, and this figure is neither.

## Why we never touch money

Second Door is a calculator and a directory. It never originates credit, never
brokers a loan, never processes a payment, and never holds a balance.

That is a design decision rather than a missing feature. It keeps the project
entirely outside credit licensing, and it means there is nothing here that can
mis-sell anyone anything. The most Second Door can do is show you arithmetic and a
phone number.

Nothing is stored. No accounts, no database, no server-side user state, no analytics.
The only thing that leaves your device is the offer text or image you explicitly
choose to have read, and the key for that never ships to the browser.

## Known limitations

Read this section. It is the honest account of where the numbers are soft.

**The cash price is an estimate.** It is the single largest source of error in the
product, and it drives the headline. Retail prices are estimated from the item
description against model training data with a knowledge cutoff, so they can be
stale, regionally wrong, or wrong about the specific model. The estimate is shown as
a range rather than a point, it is always labelled, it is user-editable, and every
downstream figure recomputes live when you change it. If the estimate is wrong, the
*extra paid* figure is wrong by the same amount.

**Eligibility is indicative, never a decision.** NILS providers set their own
thresholds, assess capacity to repay individually, and are not bound by the
guideline figures we check against. Second Door will say *you look eligible — here's
how to check*. It will never say *you are eligible*. Overclaiming here would be the
one thing that makes this product actively harmful.

**The provider list is a dated snapshot.** It is real public data from the Good
Shepherd directory, captured on a date shown in the interface, and not fetched live.
Providers close, move, and change intake hours. Call before travelling.

**The cap check is arithmetic, not a legal finding.** It compares a total against a
statutory formula using an estimated base price. It does not know about permitted
fees we can't see on an advertisement, whether the contract is genuinely a consumer
lease or a credit contract, or any exemption that may apply. It says *appears to
exceed* for that reason.

**Extraction can misread an offer.** Fine print, unusual layouts and poor photos all
degrade it. Every extracted field is shown and is editable before any figure is
computed, and there is a manual-entry path that skips extraction entirely.

**This is not financial advice.** It is a calculator and a directory. It cannot know
your circumstances, and it is not a substitute for a financial counsellor — the
National Debt Helpline (1800 007 007) is free and independent.

## Running it

```bash
npm install
npm run dev
```

Tests — the cost engine and the cap check:

```bash
npm test
```

## Build status

| Block | | |
| --- | --- | --- |
| 1 | Scaffold, design tokens, glass primitives | done |
| 2 | Finance engine + s175AA cap check, 45 tests | done |
| 3 | Serverless proxy for the API key | next |
| 4 | Extraction from image and text | |
| 5 | Two-door result screen and the cost reveal | |
| 6 | Plain-language trap cards | |
| 7 | NILS eligibility and provider lookup | |
| 8 | Read-aloud and accessibility pass | |
| 9 | Demo mode and failure fallbacks | |
| 10 | Deploy | |

## Stack

Vite, React, TypeScript. One serverless function holds the Anthropic API key. No
state library, no backend, no database. Extraction uses Claude with vision, so there
is no separate OCR dependency.
