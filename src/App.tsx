import { useMemo, useState } from 'react'
import { Card, Figure } from './components/ui/Card'
import { Intake } from './components/Intake'
import { Affordability } from './components/Affordability'
import { Explain } from './components/Explain'
import { Landing } from './components/Landing'
import { OfferEditor } from './components/OfferEditor'
import { assess } from './lib/assess'
import { money, moneyExact, rate, term } from './lib/format'
import { BLANK_OFFER } from './lib/blank-offer'
import type { ExtractedOffer } from './lib/offer'
import './components/ui/controls.css'
import './app.css'

type Stage = { name: 'intake' } | { name: 'reviewing'; demo: boolean }

export default function App() {
  const [stage, setStage] = useState<Stage>({ name: 'intake' })
  const [offer, setOffer] = useState<ExtractedOffer>(BLANK_OFFER)

  // Every figure on the screen comes from here, recomputed on each edit.
  const result = useMemo(() => assess(offer), [offer])

  function start(next: ExtractedOffer, demo: boolean) {
    setOffer(next)
    setStage({ name: 'reviewing', demo })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>

      <header className="masthead">
        <div className="masthead-inner">
          <span className="wordmark">Second Door</span>
          <span className="masthead-note">A calculator and a directory</span>
          <div className="scroll-progress" aria-hidden="true" />
          {stage.name === 'reviewing' ? (
            <button
              type="button"
              className="button masthead-reset"
              data-variant="quiet"
              onClick={() => {
                setOffer(BLANK_OFFER)
                setStage({ name: 'intake' })
              }}
            >
              Start again
            </button>
          ) : null}
        </div>
      </header>

      <div className="shell">
        <main className="main" id="main">
          {stage.name === 'intake' ? (
            <>
              <section className="hero">
                <h1 className="hero-title">
                  It says <em>$20 a week</em>. It does not say what that adds up to.
                </h1>
                <p className="hero-sub">
                  Show us a rent-to-own or lease offer. We work out what it really costs, and what
                  the same thing costs at a genuine 0%.
                </p>
              </section>

              <Intake
                onRead={(next, _source, demo) => start(next, demo)}
                onManual={() => start(BLANK_OFFER, false)}
              />

              <Landing onStart={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
            </>
          ) : (
            <>
              <OfferEditor offer={offer} onChange={setOffer} demo={stage.demo} />

              {result.computable ? (
                <Results offer={offer} result={result} />
              ) : (
                <Card className="notice">
                  <h2 className="notice-title">Nearly there</h2>
                  <p className="notice-body">
                    Add {result.missing.join(', ')} above and the figures will appear here.
                  </p>
                </Card>
              )}
            </>
          )}
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

function Results({
  offer,
  result,
}: {
  offer: ExtractedOffer
  result: ReturnType<typeof assess>
}) {
  const total = result.total as number
  const cash = result.cashPriceMid as number
  const extra = result.extra as number
  const { cap } = result

  return (
    <>
      <Card className="reveal" elevation={2} pad={false}>
        <div className="reveal-main">
          <Figure
            scale="display"
            signal={extra > 0 ? 'bad' : 'none'}
            label={`Total paid over ${offer.termPeriods} payments`}
            value={money(total)}
          />
        </div>
        <dl className="reveal-breakdown">
          <div className="breakdown-row">
            <dt>{offer.item.trim() || 'The item'}, estimated cash price</dt>
            <dd className="num">{money(cash)}</dd>
          </div>
          <div className="breakdown-row">
            <dt>Extra paid over the cash price</dt>
            <dd className="num" data-signal={extra > 0 ? 'bad' : undefined}>
              {extra > 0 ? money(extra) : 'Nothing'}
            </dd>
          </div>
          <div className="breakdown-row">
            <dt>Effective annual rate</dt>
            <dd className="num" data-signal={extra > 0 ? 'bad' : undefined}>
              {result.rate ? rate(result.rate) : 'Not available'}
            </dd>
          </div>
          <div className="breakdown-row">
            <dt>Each payment</dt>
            <dd className="num">
              {moneyExact(offer.payment)} {offer.frequency}
            </dd>
          </div>
          {offer.frequency === 'weekly' ? (
            <div className="breakdown-row">
              <dt>Term</dt>
              <dd className="num">{term(offer.termPeriods)}</dd>
            </div>
          ) : null}
        </dl>
      </Card>

      <Explain term="the annual rate">
        <p>
          It is what this credit costs you over a year, written as a percentage, so offers of
          different lengths can be compared with each other.
        </p>
        <p>
          You do not need the formula. For this offer, the number that matters is that you pay{' '}
          <strong>{money(extra)}</strong> more than the item is worth.
        </p>
        <p>
          A credit card charges roughly 20% a year. A personal loan is usually under 15%. NILS
          charges nothing at all.
        </p>
      </Explain>

      <section className="doors" aria-label="The two options side by side">
        <Card className="door">
          <h2 className="door-title">The offer you were shown</h2>
          <p className="door-body">
            {moneyExact(offer.payment)} {offer.frequency}, {offer.termPeriods} times.
            {offer.contractType === 'consumer_lease'
              ? ' A consumer lease. The provider owns it until the contract says otherwise.'
              : ''}
          </p>
          <Figure label="You pay" value={money(total)} signal={extra > 0 ? 'bad' : 'none'} />
        </Card>

        <Card className="door">
          <h2 className="door-title">The one nobody advertises</h2>
          <p className="door-body">
            The No Interest Loan Scheme. The same purchase, repaid at 0% through a community
            provider. No interest, no fees, no charges. It takes an appointment and a few days.
          </p>
          <Figure label="You pay" value={money(cash)} signal="good" />
        </Card>
      </section>

      <Affordability payment={offer.payment} frequency={offer.frequency} />

      {cap?.kind === 'appears_over' ? (
        <Card className="notice" data-kind="warn">
          <h2 className="notice-title">This offer appears to exceed the legal cap</h2>
          <p className="notice-body">
            Section 175AA of the National Credit Code caps a consumer lease at the base price plus
            4% of the base price for each whole month of the term. Over {cap.months} months that is{' '}
            {money(cap.cap)}. This offer totals {money(total)}, which is {money(cap.excess)} above it.
          </p>
          <p className="notice-foot">
            This is arithmetic on an estimated price, not a legal finding. AFCA and ASIC both take
            complaints about consumer leases.
          </p>
        </Card>
      ) : null}

      {cap?.kind === 'within' ? (
        <Card className="notice">
          <h2 className="notice-title">Within the legal cap</h2>
          <p className="notice-body">
            Section 175AA permits up to {money(cap.cap)} on this price and term, and this offer
            totals {money(total)}. Lawful and expensive are not the same thing.
          </p>
        </Card>
      ) : null}

      {offer.contractType !== 'consumer_lease' ? (
        <Card className="notice">
          <h2 className="notice-title">Not checked against the lease cap</h2>
          <p className="notice-body">
            The s175AA cap governs consumer leases. This offer is set to{' '}
            {offer.contractType === 'bnpl'
              ? 'buy now, pay later'
              : offer.contractType === 'credit_contract'
                ? 'a credit contract'
                : 'an unknown contract type'}
            , so that ceiling does not apply and we have not tested it against one.
          </p>
        </Card>
      ) : null}

      <Explain term="a consumer lease">
        <p>
          You rent the item and pay weekly. The shop keeps ownership of it. In most of these
          contracts you do not own the item at the end, even after paying more than it is worth.
        </p>
        <p>
          Miss enough payments and they can take it back. You do not get back what you have already
          paid.
        </p>
        <p>
          A credit contract is different: you own the item from the start and owe the money
          instead.
        </p>
      </Explain>

      <section className="upcoming" aria-labelledby="upcoming-title">
        <h2 className="upcoming-title" id="upcoming-title">
          Not built yet
        </h2>
        <ul className="upcoming-list">
          <li>NILS eligibility check and provider lookup</li>
          <li>Read-aloud</li>
        </ul>
      </section>
    </>
  )
}
