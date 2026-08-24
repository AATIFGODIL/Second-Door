import { useMemo, useState, type ReactNode } from 'react'
import { Card } from './ui/Card'
import { Explain } from './Explain'
import {
  assessEligibility,
  BLANK_ANSWERS,
  type Disclosure,
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
 * The second door: whether the No Interest Loan Scheme is likely to be open, and who to call.
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

const YES_NO: Disclosure[] = [true, false]
/** Only this question offers a way out of answering it. */
const YES_NO_SKIP: Disclosure[] = [true, false, 'skipped']

function choiceLabel(value: Disclosure) {
  if (value === true) return 'Yes'
  if (value === false) return 'No'
  return 'Rather not say'
}

const QUESTIONS: Array<{
  key: keyof Answers
  label: string
  hint?: ReactNode
  choices?: Disclosure[]
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
    hint: (
      <>
        Before tax: under <strong>{money(INCOME_SINGLE)}</strong> on your own, or{' '}
        <strong>{money(INCOME_PARTNERED)}</strong> with a partner or kids.
      </>
    ),
  },
  {
    key: 'familyViolence',
    label: 'Have you experienced family or domestic violence in the last 10 years?',
    choices: YES_NO_SKIP,
    hint: (
      <>
        A yes means <strong>no income test applies</strong>. You can skip this question if you
        would rather not answer.
      </>
    ),
  },
  {
    key: 'essentialItem',
    label: 'Is this an essential item or service?',
    hint: `Not for ${NOT_FOR.join(', ')}.`,
  },
  {
    key: 'threeMonthsAtAddress',
    label: 'Have you lived at your current address for at least three months?',
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

  // Nineteen providers listed by default is a wall to read, and the one you
  // want is the one near you. Nothing lists until you say where or who.
  const needle = where.trim().toLowerCase()
  const providers = useMemo(() => {
    if (!needle) return []
    return directory.providers.filter(
      (provider) =>
        provider.name.toLowerCase().includes(needle) ||
        provider.suburb.toLowerCase().includes(needle) ||
        provider.postcode.startsWith(needle),
    )
  }, [needle])

  return (
    <Card className="second-door">
      <header className="sd-head">
        <h2 className="sd-title">The Second Door: No Interest Loan Scheme (NILS)</h2>
        <p className="sd-intro">
          <strong>0% interest. No fees. Ever.</strong> A government-backed, community-run loan for
          essential things. Six questions, answered on your device, nothing sent anywhere.
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
              {(question.choices ?? YES_NO).map((value) => (
                <button
                  key={String(value)}
                  type="button"
                  className="sd-choice"
                  data-chosen={answers[question.key] === value || undefined}
                  aria-pressed={answers[question.key] === value}
                  onClick={() =>
                    setAnswers((prev) => ({ ...prev, [question.key]: value }) as Answers)
                  }
                >
                  {choiceLabel(value)}
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
            <strong>This is not a decision.</strong> Providers set their own rules. The only way to
            know is to ask one.
          </p>
        </div>
      )}

      <div className="sd-coverage">
        <h3 className="sd-sub">What you would borrow it for</h3>
        <div className="field sd-category">
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
                <strong>{money(cashPrice as number)}</strong> fits inside the{' '}
                <strong>{money(coverage.category.cap)}</strong> ceiling for{' '}
                {coverage.category.label.toLowerCase()}, over up to {coverage.category.months}{' '}
                months.
              </>
            ) : (
              <>
                <strong>{money(cashPrice as number)}</strong> is{' '}
                <strong>{money(coverage.shortfall)}</strong> above the{' '}
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
          <span className="sd-national-label">Call the national line</span>
          <span className="sd-national-number num">{directory.nationalLine.number}</span>
          <span className="sd-national-hours">
            {directory.nationalLine.hours}. They pass you on to a provider near you, so this one
            number is enough.
          </span>
        </a>

        <p className="sd-or">Or find a provider yourself</p>

        <div className="field sd-search">
          <label className="field-label" htmlFor="sd-where">
            Search by suburb, postcode or name
          </label>
          <input
            id="sd-where"
            className="input"
            type="search"
            placeholder="Suburb, postcode or name"
            value={where}
            onChange={(event) => setWhere(event.target.value)}
          />
        </div>

        {!needle ? (
          <p className="sd-empty">
            Type above to see the providers near you.
          </p>
        ) : providers.length === 0 ? (
          <p className="sd-empty">
            Nothing here matches that. Call <strong>{directory.nationalLine.number}</strong>, or
            use the live directory below.
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
          {needle ? providers.length : directory.providers.length} of{' '}
          {directory.providers.length} within 20km, captured{' '}
          {directory.capturedOn}, not fetched live. Call before you travel.{' '}
          <a href={SOURCE.providerFinder} target="_blank" rel="noopener noreferrer">
            Check the live directory
          </a>
          .
        </p>
      </div>

      <Explain term="a No Interest Loan Scheme (NILS) loan">
        <p>
          <strong>Pay back only what you borrow.</strong> 0% interest, $0 fees, zero charges—ever.
        </p>
        <p>
          <strong>Paid directly to the seller.</strong> Payment goes straight to the vendor for essential household items, repairs, bond, or medical care, repaid fortnightly over 6 to 48 months.
        </p>
        <p>
          <strong>Government-backed & community-run.</strong> It takes a brief appointment with a local provider to check eligibility and set up an affordable repayment plan.
        </p>
      </Explain>
    </Card>
  )
}
