import { Card, Figure } from './components/ui/Card'
import { assessLeaseCap } from './lib/cap'
import { effectiveAnnualRate, extraOverCash, PERIODS_PER_YEAR, totalPaid } from './lib/finance'
import { money, moneyExact, rate, term } from './lib/format'
import './app.css'

/*
 * The worked example from the README, computed live rather than typed in.
 * Nothing on this screen is a hardcoded figure: change a field here and every
 * number below moves, including the cap assessment.
 */
const OFFER = {
  item: 'Washing machine',
  cashPrice: 800,
  payment: 17.64,
  frequency: 'weekly',
  termWeeks: 78,
} as const

const total = totalPaid(OFFER.payment, OFFER.termWeeks)
const extra = extraOverCash(total, OFFER.cashPrice)
const annual = effectiveAnnualRate(
  OFFER.cashPrice,
  OFFER.payment,
  PERIODS_PER_YEAR[OFFER.frequency],
  OFFER.termWeeks,
)
const cap = assessLeaseCap({
  totalPaid: total,
  basePriceHigh: OFFER.cashPrice,
  frequency: OFFER.frequency,
  termPeriods: OFFER.termWeeks,
})

export default function App() {
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>

      <header className="masthead">
        <div className="masthead-inner">
          <span className="wordmark">Second Door</span>
          <span className="masthead-note">A calculator and a directory</span>
        </div>
      </header>

      <div className="shell">
        <main className="main" id="main">
          <section className="hero">
            <p className="eyebrow">Worked example</p>
            <h1 className="hero-title">
              The offer says {moneyExact(OFFER.payment)} a week. It does not say what that adds
              up to.
            </h1>

            <Card className="reveal" elevation={2} pad={false}>
              <div className="reveal-main">
                <Figure
                  scale="display"
                  signal="bad"
                  label={`Total paid over ${OFFER.termWeeks} weeks`}
                  value={money(total)}
                />
              </div>
              <dl className="reveal-breakdown">
                <div className="breakdown-row">
                  <dt>{OFFER.item}, cash price</dt>
                  <dd className="num">{money(OFFER.cashPrice)}</dd>
                </div>
                <div className="breakdown-row">
                  <dt>Extra paid over the cash price</dt>
                  <dd className="num" data-signal="bad">
                    {money(extra)}
                  </dd>
                </div>
                <div className="breakdown-row">
                  <dt>Effective annual rate</dt>
                  <dd className="num" data-signal="bad">
                    {rate(annual)}
                  </dd>
                </div>
                <div className="breakdown-row">
                  <dt>Term</dt>
                  <dd className="num">{term(OFFER.termWeeks)}</dd>
                </div>
              </dl>
            </Card>
          </section>

          <section className="doors" aria-label="The two options side by side">
            <Card className="door">
              <h2 className="door-title">The offer you were shown</h2>
              <p className="door-body">
                A consumer lease. You pay {moneyExact(OFFER.payment)} a week for{' '}
                {OFFER.termWeeks} weeks. At the end of it the provider still owns the machine
                unless the contract says otherwise.
              </p>
              <Figure label="You pay" value={money(total)} signal="bad" />
            </Card>

            <Card className="door">
              <h2 className="door-title">The one nobody advertises</h2>
              <p className="door-body">
                The No Interest Loan Scheme. The same {money(OFFER.cashPrice)} purchase, repaid
                at 0%, through a community provider. No fees, no interest, no charges.
              </p>
              <Figure label="You pay" value={money(OFFER.cashPrice)} signal="good" />
            </Card>
          </section>

          {cap.kind === 'appears_over' ? (
            <Card className="notice" data-kind="warn">
              <h2 className="notice-title">This offer appears to exceed the legal cap</h2>
              <p className="notice-body">
                Section 175AA of the National Credit Code caps a consumer lease at the base
                price plus 4% of the base price for each whole month of the term. On{' '}
                {money(OFFER.cashPrice)} over {cap.months} months that is {money(cap.cap)}. This
                offer totals {money(total)} — {money(cap.excess)} above it.
              </p>
              <p className="notice-foot">
                Arithmetic on an estimated retail price, not a legal finding. If this looks
                right to you, AFCA and ASIC both take complaints.
              </p>
            </Card>
          ) : (
            <Card className="notice">
              <h2 className="notice-title">Within the legal cap</h2>
              <p className="notice-body">
                Section 175AA permits up to {money(cap.kind === 'within' ? cap.cap : 0)} on this
                base price and term. This offer totals {money(total)}, which is inside it.
                Lawful and expensive are not the same thing.
              </p>
            </Card>
          )}

          <section className="upcoming" aria-labelledby="upcoming-title">
            <h2 className="upcoming-title" id="upcoming-title">
              Not built yet
            </h2>
            <ul className="upcoming-list">
              <li>Reading an offer from a photo or pasted text</li>
              <li>Editing the estimated cash price, with every figure recomputing</li>
              <li>Plain-language explanations of the terms in the contract</li>
              <li>NILS eligibility check and provider lookup</li>
              <li>Read-aloud</li>
            </ul>
          </section>
        </main>

        <footer className="colophon">
          <p>
            <strong>Second Door never touches money.</strong> It originates no credit, brokers no
            loans, and processes no payments. Nothing is stored, there are no accounts, and the
            only thing that leaves your device is an offer you explicitly choose to have read.
          </p>
          <p>
            Not financial advice. The National Debt Helpline is free and independent on{' '}
            <a href="tel:1800007007">1800 007 007</a>.
          </p>
        </footer>
      </div>
    </>
  )
}
