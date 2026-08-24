import { Card } from './ui/Card'
import { NumberField } from './ui/NumberField'
import type { ExtractedOffer } from '../lib/offer'
import './ui/controls.css'
import './editor.css'

type Props = {
  offer: ExtractedOffer
  onChange: (offer: ExtractedOffer) => void
  /** The offer came from the bundled examples, not from a live read. */
  demo: boolean
}

export function OfferEditor({ offer, onChange, demo }: Props) {
  const set = <K extends keyof ExtractedOffer>(key: K, value: ExtractedOffer[K]) =>
    onChange({ ...offer, [key]: value })

  const flagged = (name: string) =>
    offer.unreadable.some((entry) => entry.toLowerCase().includes(name.toLowerCase()))

  return (
    <Card className="editor">
      <header className="editor-head">
        <h2 className="editor-title">Check what we read</h2>
        {demo ? (
          <div className="editor-badges">
            <span className="badge" data-kind="info">Example, no offer was read</span>
          </div>
        ) : null}
      </header>

      <p className="editor-intro">
        Correct anything that looks wrong. The figures below update as you type.
      </p>

      <div className="editor-grid">
        <div className="field editor-wide" data-flagged={flagged('item') || undefined}>
          <label className="field-label" htmlFor="f-item">
            What it is
          </label>
          <input
            id="f-item"
            className="input"
            type="text"
            value={offer.item}
            placeholder="8kg washing machine"
            onChange={(event) => set('item', event.target.value)}
          />
        </div>

        <NumberField
          id="f-payment"
          label="Each payment"
          prefix="$"
          value={offer.payment || null}
          flagged={flagged('payment')}
          onCommit={(next) => set('payment', next ?? 0)}
        />

        <div className="field" data-flagged={flagged('frequency') || undefined}>
          <label className="field-label" htmlFor="f-frequency">
            How often
          </label>
          <select
            id="f-frequency"
            className="select"
            value={offer.frequency}
            onChange={(event) =>
              set('frequency', event.target.value as ExtractedOffer['frequency'])
            }
          >
            <option value="weekly">Weekly</option>
            <option value="fortnightly">Fortnightly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <NumberField
          id="f-term"
          label="Number of payments"
          value={offer.termPeriods || null}
          flagged={flagged('term')}
          onCommit={(next) => set('termPeriods', Math.round(next ?? 0))}
        />

        <div className="field" data-flagged={flagged('contract') || undefined}>
          <label className="field-label" htmlFor="f-type">
            Kind of contract
          </label>
          <select
            id="f-type"
            className="select"
            value={offer.contractType}
            onChange={(event) =>
              set('contractType', event.target.value as ExtractedOffer['contractType'])
            }
          >
            <option value="consumer_lease">Consumer lease or rent-to-own</option>
            <option value="credit_contract">Credit contract, you own it</option>
            <option value="bnpl">Buy now, pay later</option>
            <option value="unknown">Not sure</option>
          </select>
          <p className="field-hint">
            Not sure? The ad usually says lease, rent or rental.
          </p>
        </div>
      </div>

      <div className="estimate">
        <h3 className="estimate-title">What it costs to just buy it</h3>
        <p className="estimate-note">
          An estimate, not a quote. If you know the real price, put it in.
        </p>
        <div className="estimate-fields">
          <NumberField
            id="f-cash-low"
            label="From"
            prefix="$"
            value={offer.cashPriceLow}
            flagged={flagged('cashprice') || flagged('cash price')}
            onCommit={(next) => set('cashPriceLow', next)}
          />
          <NumberField
            id="f-cash-high"
            label="To"
            prefix="$"
            value={offer.cashPriceHigh}
            onCommit={(next) => set('cashPriceHigh', next)}
          />
        </div>
      </div>

      <div className="estimate">
        <h3 className="estimate-title">Delivery and installation</h3>
        <p className="estimate-note">
          Only if they charge it on top. A lease is allowed to add it, so it raises the legal
          ceiling. Leave it empty if delivery is free.
        </p>
        <div className="estimate-fields">
          <NumberField
            id="f-delivery"
            label="Charged on top"
            prefix="$"
            value={offer.deliveryInstallation}
            flagged={flagged('delivery')}
            onCommit={(next) => set('deliveryInstallation', next)}
          />
        </div>
      </div>

      {offer.fees.length > 0 ? (
        <div className="fees">
          <h3 className="fees-title">Fees the ad mentions</h3>
          <ul className="fees-list">
            {offer.fees.map((fee) => (
              <li key={fee}>{fee}</li>
            ))}
          </ul>
          <p className="field-hint">These are charged on top and are not in the figures below.</p>
        </div>
      ) : null}
    </Card>
  )
}
