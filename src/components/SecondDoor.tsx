import { useMemo, useState } from 'react'
import { Card } from './ui/Card'
import { Explain } from './Explain'
import {
  assessEligibility,
  BLANK_ANSWERS,
  coverageFor,
  INCOME_PARTNERED,
  INCOME_SINGLE,
  LOAN_CATEGORIES,
  NOT_FOR,
  SOURCE,
  type Answers,
} from '../data/eligibility'
import directory from '../data/nils-providers.json'
import { money } from '../lib/format'
import './second-door.css'

/**
 * The second door: whether NILS is likely to be open, and who to call.
 *
 * Two rules govern everything here.
 *
 * It never says "you are eligible". Providers set their own thresholds and
 * assess capacity to repay individually. Overclaiming would send someone to an
 * appointment they cannot pass, which is worse than saying nothing.
 *
 * The provider data is a dated snapshot, labelled as one, with a link to the
 * live directory beside it. Phone numbers go stale.
 */

const QUESTIONS: Array<{
  key: keyof Answers
  label: string
  hint?: string
  /** A yes here is a reason for concern rather than a qualification. */
  inverted?: boolean
}> = [
  {
    key: 'concessionCard',
    label: 'Do you have a Health Care Card or a Pensioner Concession Card?',
  },
  {
    key: 'underIncome',
    label: 'Is your income under the guideline?',
    hint: `Under ${money(INCOME_SINGLE)} before tax on your own, or under ${money(INCOME_PARTNERED)} with a partner or dependants.`,
  },
  {
    key: 'familyViolence',
    label: 'Have you experienced family or domestic violence in the last 10 years?',
    hint: 'If yes, no income test applies. You can skip this question if you would rather not answer.',
  },
  {
    key: 'essentialItem',
    label: 'Is this an essential item or service?',
    hint: `NILS does not cover ${NOT_FOR.join(', ')}.`,
  },
  {
    key: 'behindOnRepayments',
    label: 'Do you have overdue debts, or are you behind on repayments?',
    inverted: true,
  },
]

const OUTCOME_COPY = {
  looks_eligible: { title: 'You look eligible', tone: 'good' as const },
  worth_asking: { title: 'Worth asking', tone: 'warn' as const },
  probably_not: { title: 'Probably not a fit', tone: 'bad' as const },
}

export function SecondDoor({ cashPrice }: { cashPrice: number | null }) {
  const [answers, setAnswers] = useState<Answers>(BLANK_ANSWERS)
  const [category, setCategory] = useState<string>('household')
  const [where, setWhere] = useState('')

  const outcome = useMemo(() => assessEligibility(answers), [answers])
  const coverage = cashPrice !== null ? coverageFor(cashPrice, category) : null

  const providers = useMemo(() => {
    const needle = where.trim().toLowerCase()
    if (!needle) return directory.providers
    return directory.providers.filter(
      (provider) =>
        provider.suburb.toLowerCase().includes(needle) || provider.postcode.startsWith(needle),
    )
  }, [where])

  return (
    <Card className="second-door">
      <header className="sd-head">
        <h2 className="sd-title">The second door</h2>
        <p className="sd-intro">
          Five questions, answered on your device and sent nowhere. They match the criteria NILS
          publishes.
        </p>
      </header>

      <ol className="sd-questions">
        {QUESTIONS.map((question) => (
          <li className="sd-question" key={question.key}>
            <p className="sd-q-label" id={`q-${question.key}`}>
              {question.label}
            </p>
            {question.hint ? <p className="sd-q-hint">{question.hint}</p> : null}
            <div className="sd-choices" role="group" aria-labelledby={`q-${question.key}`}>
              {[true, false].map((value) => (
                <button
                  key={String(value)}
                  type="button"
                  className="sd-choice"
                  data-chosen={answers[question.key] === value || undefined}
                  aria-pressed={answers[question.key] === value}
                  onClick={() => setAnswers((prev) => ({ ...prev, [question.key]: value }))}
                >
                  {value ? 'Yes' : 'No'}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ol>

      {outcome.kind === 'incomplete' ? (
        <p className="sd-empty">
          {outcome.remaining} {outcome.remaining === 1 ? 'question' : 'questions'} to go.
        </p>
      ) : (
        <div className="sd-outcome" data-tone={OUTCOME_COPY[outcome.kind].tone}>
          <p className="sd-outcome-title">{OUTCOME_COPY[outcome.kind].title}</p>
          <ul className="sd-reasons">
            {outcome.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <p className="sd-outcome-caveat">
            This is not a decision and nobody has assessed you. Providers set their own thresholds
            and work out repayments with you. The only way to know is to ask them.
          </p>
        </div>
      )}

      <div className="sd-coverage">
        <h3 className="sd-sub">What you would borrow it for</h3>
        <div className="field">
          <label className="field-label" htmlFor="sd-category">
            Closest category
          </label>
          <select
            id="sd-category"
            className="select"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {LOAN_CATEGORIES.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        </div>
        {coverage ? (
          <p className="sd-coverage-note" data-signal={coverage.withinCap ? undefined : 'bad'}>
            {coverage.withinCap ? (
              <>
                {money(cashPrice as number)} is inside the {money(coverage.category.cap)} ceiling
                for {coverage.category.label.toLowerCase()}, repaid over up to{' '}
                {coverage.category.months} months.
              </>
            ) : (
              <>
                {money(cashPrice as number)} is {money(coverage.shortfall)} above the{' '}
                {money(coverage.category.cap)} ceiling for{' '}
                {coverage.category.label.toLowerCase()}. A provider may still have options.
              </>
            )}
          </p>
        ) : null}
      </div>

      <div className="sd-providers">
        <h3 className="sd-sub">Who to call</h3>

        <a className="sd-national" href={`tel:${directory.nationalLine.tel}`}>
          <span className="sd-national-label">{directory.nationalLine.label}</span>
          <span className="sd-national-number num">{directory.nationalLine.number}</span>
          <span className="sd-national-hours">{directory.nationalLine.hours}</span>
        </a>

        <div className="field">
          <label className="field-label" htmlFor="sd-where">
            Or find one near you
          </label>
          <input
            id="sd-where"
            className="input"
            type="text"
            placeholder="Suburb or postcode"
            value={where}
            onChange={(event) => setWhere(event.target.value)}
          />
        </div>

        {providers.length === 0 ? (
          <p className="sd-empty">
            Nothing in this snapshot matches that. Call {directory.nationalLine.number}, or use the
            live directory linked below.
          </p>
        ) : (
          <ul className="sd-list">
            {providers.map((provider) => (
              <li className="sd-provider" key={`${provider.name}-${provider.postcode}`}>
                <div className="sd-provider-main">
                  <span className="sd-provider-name">{provider.name}</span>
                  <span className="sd-provider-where">
                    {provider.suburb}, {provider.postcode}
                    {provider.inPerson ? ', visit or phone' : ', phone only'}
                  </span>
                  {provider.address ? (
                    <span className="sd-provider-address">{provider.address}</span>
                  ) : null}
                  {provider.hours ? (
                    <span className="sd-provider-address">{provider.hours}</span>
                  ) : null}
                </div>
                <a className="sd-provider-call" href={`tel:${provider.tel}`}>
                  {provider.phone}
                </a>
              </li>
            ))}
          </ul>
        )}

        <p className="sd-snapshot">
          {providers.length} of {directory.providers.length} providers within 20km of Melbourne.
          Captured from the official directory on {directory.capturedOn} and not fetched live.
          Providers close, move and change intake hours, so call before travelling.{' '}
          <a href={SOURCE.providerFinder} target="_blank" rel="noopener noreferrer">
            Check the live directory
          </a>
          .
        </p>
      </div>

      <Explain term="a no interest loan">
        <p>
          You borrow up to the ceiling for the category and pay back exactly that. No interest, no
          fees, no charges, ever.
        </p>
        <p>
          The money goes straight to the shop, not to you, and you repay fortnightly over six to
          forty eight months. It is funded by the federal government and run by community
          organisations, which is why nobody advertises it.
        </p>
        <p>
          It is slower than walking into a rental shop. You need an appointment, proof of address,
          and a conversation about repayments.
        </p>
      </Explain>
    </Card>
  )
}
