# Second Door

**Melbourne Hack 2026 — Track 3, Financial Inclusion**

A rent-to-own offer says "$20 a week." It does not say $1,560. Second Door reads the
offer, does the arithmetic, and puts the real number next to what the same purchase
costs through the No Interest Loan Scheme.

## The problem, in three sentences

Australians who can't access mainstream credit are routed into consumer leases and
rent-to-own contracts that commonly cost close to double the cash price, priced in
weekly instalments that hide the total. The No Interest Loan Scheme offers the same
essential purchase at a genuine 0%, but almost nobody in the target cohort has heard
of it, because no one advertises a product that earns no margin. Second Door
intercepts the moment of decision — offer in, both doors out.

## Status

Under active build. This README grows with the project.

## Running it

```bash
npm install
npm run dev
```

Tests:

```bash
npm test
```

## What this is not

Second Door never touches money and never originates credit. It is a calculator and
a directory. That is a deliberate design decision, not a limitation — it keeps the
project entirely outside credit licensing, and it means there is nothing here that
can mis-sell anyone anything.

Nothing is stored. There are no accounts, no database, and no server-side user
state of any kind.
