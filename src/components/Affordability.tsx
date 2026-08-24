import { useMemo, useState } from 'react'
import { Card } from './ui/Card'
import { NumberField } from './ui/NumberField'
import { Explain } from './Explain'
import { assessAffordability } from '../lib/afford'
import { money, moneyExact } from '../lib/format'
import type { Frequency } from '../lib/finance'
import './afford.css'

/**
 * "Can I actually make these payments?"
 *
 * Deliberately separate from the cost comparison. An offer can be good value
 * and still be unaffordable, and it is the repayment rather than the total that
 * decides whether someone defaults and loses the goods.
 *
 * The numbers never leave the device. They are React state, not persisted, not
 * sent to the endpoint, not stored anywhere.
 */

const BAND_COPY = {
  comfortable: {
    title: 'This looks manageable',
    tone: 'good' as const,
  },
  tight: {
    title: 'This would be tight',
    tone: 'warn' as const,
  },
  risky: {
    title: 'This looks risky',
    tone: 'bad' as const,
  },
}

function FrequencySelect({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: Frequency
  onChange: (next: Frequency) => void
}) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="select"
        value={value}
        onChange={(event) => onChange(event.target.value as Frequency)}
      >
        <option value="weekly">a week</option>
        <option value="fortnightly">a fortnight</option>
        <option value="monthly">a month</option>
      </select>
    </div>
  )
}

export function Affordability({
  payment,
  frequency,
}: {
  payment: number
  frequency: Frequency
}) {
  const [income, setIncome] = useState<number | null>(null)
  const [incomeFrequency, setIncomeFrequency] = useState<Frequency>('weekly')
  const [essentials, setEssentials] = useState<number | null>(null)
  const [essentialsFrequency, setEssentialsFrequency] = useState<Frequency>('weekly')

  const result = useMemo(
    () =>
      assessAffordability({
        payment,
        frequency,
        income,
        incomeFrequency,
        essentials,
        essentialsFrequency,
      }),
    [payment, frequency, income, incomeFrequency, essentials, essentialsFrequency],
  )

  return (
    <Card className="afford">
      <header className="afford-head">
        <h2 className="afford-title">Could you make the payments?</h2>
        <p className="afford-intro">
          A deal can be fair and still cost more than you can pay. Rough figures are fine.
        </p>
      </header>

      <div className="afford-inputs">
        <div className="afford-pair">
          <NumberField
            id="a-income"
            label="What you usually bring in"
            prefix="$"
            placeholder="450"
            value={income}
            onCommit={setIncome}
          />
          <FrequencySelect
            id="a-income-freq"
            label="How often"
            value={incomeFrequency}
            onChange={setIncomeFrequency}
          />
        </div>

        <div className="afford-pair">
          <NumberField
            id="a-essentials"
            label="Rent, food, bills, transport"
            prefix="$"
            placeholder="320"
            value={essentials}
            onCommit={setEssentials}
          />
          <FrequencySelect
            id="a-essentials-freq"
            label="How often"
            value={essentialsFrequency}
            onChange={setEssentialsFrequency}
          />
        </div>
      </div>

      {result.kind === 'need_income' ? (
        <p className="afford-empty">
          Put in what you usually earn and we will work out what this offer would take out of your
          week.
        </p>
      ) : (
        <div className="afford-result" data-tone={BAND_COPY[result.band].tone}>
          <p className="afford-band">{BAND_COPY[result.band].title}</p>

          <dl className="afford-rows">
            <div className="afford-row">
              <dt>The repayment, per week</dt>
              <dd className="num">{moneyExact(result.weeklyRepayment)}</dd>
            </div>
            <div className="afford-row">
              <dt>What you bring in, per week</dt>
              <dd className="num">{money(result.weeklyIncome)}</dd>
            </div>
            {result.weeklySurplus !== null ? (
              <div className="afford-row">
                <dt>Left after the essentials you listed</dt>
                <dd className="num" data-signal={result.weeklySurplus <= 0 ? 'bad' : undefined}>
                  {money(result.weeklySurplus)}
                </dd>
              </div>
            ) : null}
            <div className="afford-row">
              <dt>
                The repayment takes this much of{' '}
                {result.measuredAgainst === 'surplus' ? 'what is spare' : 'what you earn'}
              </dt>
              <dd className="num">
                {Number.isFinite(result.share) ? `${Math.round(result.share * 100)}%` : 'All of it'}
              </dd>
            </div>
            {result.leftOver !== null ? (
              <div className="afford-row">
                <dt>Left over each week after paying it</dt>
                <dd className="num" data-signal={result.leftOver < 0 ? 'bad' : undefined}>
                  {money(result.leftOver)}
                </dd>
              </div>
            ) : null}
          </dl>

          <p className="afford-caveat">
            Nothing you type here is saved or sent anywhere.
          </p>
        </div>
      )}

      <Explain term="this percentage">
        <p>
          It is the repayment set against your own money, so you can see what it actually takes out
          of a week.
        </p>
        <p>
          If you told us your essentials, we measure against what is left after them, because that
          is the money the repayment really comes from. <strong>$115 a week</strong> out of{' '}
          <strong>$450</strong> earned sounds like a quarter of your income. If $320 goes on rent
          and bills, the same $115 is almost everything you had spare.
        </p>
        <p>
          There is no fixed line between safe and unsafe. A lender assessing you would look at far
          more than this.
        </p>
      </Explain>
    </Card>
  )
}
