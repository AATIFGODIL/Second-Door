import { Card, Figure } from './ui/Card'
import { Affordability } from './Affordability'
import { Explain } from './Explain'
import { SecondDoor } from './SecondDoor'
import type { Assessment } from '../lib/assess'
import { money, moneyExact, rate, term } from '../lib/format'
import type { ExtractedOffer } from '../lib/offer'

export function Results({ offer, result }: { offer: ExtractedOffer; result: Assessment }) {
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

      <SecondDoor cashPrice={cash} />

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
          <li>Read-aloud</li>
        </ul>
      </section>
    </>
  )
}
