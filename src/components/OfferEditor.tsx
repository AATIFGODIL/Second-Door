import { useEffect, useState } from 'react'
import { Card } from './ui/Card'
import type { ExtractedOffer } from '../lib/offer'
import './ui/controls.css'
import './editor.css'

type Props = {
  offer: ExtractedOffer
  onChange: (offer: ExtractedOffer) => void
  /** The offer came from the bundled examples, not from a live read. */
  demo: boolean
}

/**
 * A number the user can clear.
 *
 * Holding the raw string rather than the parsed number matters more than it
 * looks: binding a number straight to the input means backspacing the last
 * digit snaps the field to 0, and the recompute below fires on a value the
 * user never typed. The draft is local, the parsed value goes up.
 */
function NumberField({
  id,
  label,
  value,
  onCommit,
  flagged,
  hint,
  prefix,
}: {
  id: string
  label: string
  value: number | null
  onCommit: (next: number | null) => void
  flagged?: boolean
  hint?: string
  prefix?: string
}) {
  const [draft, setDraft] = useState(value === null ? '' : String(value))

  // Re-sync when the value changes from outside (a new extraction, a reset).
  useEffect(() => {
    setDraft(value === null ? '' : String(value))
  }, [value])

  return (
    <div className="field" data-flagged={flagged || undefined}>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="input-wrap" data-prefix={prefix || undefined}>
        {prefix ? <span className="input-prefix">{prefix}</span> : null}
        <input
          id={id}
          className="input"
          type="text"
          inputMode="decimal"
          value={draft}
          onChange={(event) => {
            const next = event.target.value
            setDraft(next)
            if (next.trim() === '') {
              onCommit(null)
              return
            }
            const parsed = Number(next)
            if (Number.isFinite(parsed)) onCommit(parsed)
          }}
        />
      </div>
      {flagged ? <p className="field-flag">We guessed this — please check it</p> : null}
      {hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  )
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
        <div className="editor-badges">
          {demo ? <span className="badge" data-kind="info">Example — no offer was read</span> : null}
          <span className="badge" data-kind={offer.confidence === 'high' ? 'ok' : 'warn'}>
            {offer.confidence} confidence
          </span>
        </div>
      </header>

      <p className="editor-intro">
        Nothing is calculated until these are right. Correct anything that looks wrong — every
        figure below updates as you type.
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
            <option value="credit_contract">Credit contract — you own it</option>
            <option value="bnpl">Buy now, pay later</option>
            <option value="unknown">Not sure</option>
          </select>
          <p className="field-hint">
            Only a consumer lease is checked against the s175AA cap. If you are not sure, the ad
            usually says lease, rent or rental.
          </p>
        </div>
      </div>

      <div className="estimate">
        <h3 className="estimate-title">What it costs to just buy it</h3>
        <p className="estimate-note">
          This is an <strong>estimate</strong>, not a quote — the single biggest source of error
          here, and it drives the headline. If you know the real price, put it in.
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

      {offer.fees.length > 0 ? (
        <div className="fees">
          <h3 className="fees-title">Fees the ad mentions</h3>
          <ul className="fees-list">
            {offer.fees.map((fee) => (
              <li key={fee}>{fee}</li>
            ))}
          </ul>
          <p className="field-hint">
            These are not in the figures below. They are what the ad admits to charging on top.
          </p>
        </div>
      ) : null}
    </Card>
  )
}
