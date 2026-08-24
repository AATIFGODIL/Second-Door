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

      <Card className="miss" as="section">
        <h2 className="miss-title">What happens if I miss a payment?</h2>
        <div className="miss-grid">
          <div className="miss-item">
            <h3 className="miss-kind">Consumer lease</h3>
            <p className="miss-body">
              You do not own this yet. Miss enough payments and you can lose the item, even after
              paying most of what it cost. They must give you 30 days notice first, and they cannot
              enter your home without a court order.
            </p>
          </div>
          <div className="miss-item">
            <h3 className="miss-kind">Credit contract</h3>
            <p className="miss-body">
              You own it. Nobody can take it unless you put it up as security. You get 30 days
              notice before any action. If secured goods are sold for less than you owe, you still
              owe the rest.
            </p>
          </div>
          <div className="miss-item">
            <h3 className="miss-kind">Buy now, pay later</h3>
            <p className="miss-body">
              One missed payment can cost you twice: a late fee from them and a dishonour fee from
              your bank on the same day. Since June 2025 it can also show on your credit file.
            </p>
          </div>
          <div className="miss-item">
            <h3 className="miss-kind">All three</h3>
            <p className="miss-body">
              Ask before you miss it. You can ask for a hardship variation: smaller payments, a
              pause, or more time. It is free, and asking early goes better than going quiet. Free
              help: National Debt Helpline, 1800 007 007.
            </p>
          </div>
        </div>
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
            AFCA and ASIC take complaints about consumer leases.
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
    </>
  )
}
