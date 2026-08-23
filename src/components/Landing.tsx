import { useEffect, useRef, useState } from 'react'
import { Card } from './ui/Card'
import './landing.css'

/**
 * The explainer, told as a scroll.
 *
 * The arithmetic section pins one figure and steps it as the text beside it
 * scrolls. That is the whole argument of the product, so it gets the only
 * choreographed motion on the page. An IntersectionObserver drives it rather
 * than a scroll handler: no per-frame work, and it degrades to the last step
 * being visible if observation never fires.
 */

type Step = {
  id: string
  lead: string
  body: string
  figure: string
  caption: string
  signal?: 'bad' | 'good'
}

const STEPS: Step[] = [
  {
    id: 'weekly',
    lead: 'The sign gives you one number.',
    body: 'A washing machine, $17.64 a week. It sounds manageable, because it is designed to.',
    figure: '$17.64',
    caption: 'per week',
  },
  {
    id: 'term',
    lead: 'The term is in the fine print.',
    body: 'Seventy eight weekly payments. That is a year and a half of them.',
    figure: '× 78',
    caption: 'weekly payments',
  },
  {
    id: 'total',
    lead: 'Nobody does this multiplication for you.',
    body: 'Not the sign, not the salesperson, not the contract summary.',
    figure: '$1,376',
    caption: 'total paid',
    signal: 'bad',
  },
  {
    id: 'cash',
    lead: 'The machine costs $800.',
    body: 'That is the shelf price at any major retailer, paid once.',
    figure: '$800',
    caption: 'cash price',
  },
  {
    id: 'gap',
    lead: 'So the credit costs $576.',
    body: 'On an $800 machine, over 18 months. As an annual rate, that is 120.3%.',
    figure: '$576',
    caption: 'extra, at 120.3% a year',
    signal: 'bad',
  },
]

/**
 * Reveal each marked section once it enters the viewport.
 *
 * Deliberately not a scroll-driven CSS animation: a view() range degenerates
 * on elements taller than the viewport and pins them at opacity 0. An
 * observer is indifferent to element height, and if it never fires the CSS
 * default leaves everything visible.
 */
function useRevealOnScroll() {
  useEffect(() => {
    const targets = document.querySelectorAll<HTMLElement>('.reveal-on-scroll')
    if (targets.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.setAttribute('data-revealed', 'true')
          observer.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 },
    )

    for (const target of targets) observer.observe(target)
    return () => observer.disconnect()
  }, [])
}

function useActiveStep(count: number) {
  const [active, setActive] = useState(0)
  const refs = useRef<(HTMLElement | null)[]>([])

  useEffect(() => {
    const nodes = refs.current.filter((node): node is HTMLElement => node !== null)
    if (nodes.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const index = nodes.indexOf(entry.target as HTMLElement)
          if (index !== -1) setActive(index)
        }
      },
      // A band across the middle of the viewport. A step becomes active when
      // it reaches the same height as the pinned figure, not when it enters.
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    )

    for (const node of nodes) observer.observe(node)
    return () => observer.disconnect()
  }, [count])

  return { active, refs }
}

export function Landing({ onStart }: { onStart: () => void }) {
  useRevealOnScroll()
  const { active, refs } = useActiveStep(STEPS.length)
  const current = STEPS[active]

  return (
    <div className="landing">
      <section className="stack" aria-labelledby="stack-title">
        <h2 className="section-title" id="stack-title">
          Do the multiplication
        </h2>

        <div className="stack-body">
          <div className="stack-steps">
            {STEPS.map((step, index) => (
              <div
                key={step.id}
                ref={(node) => {
                  refs.current[index] = node
                }}
                className="step"
                data-active={index === active || undefined}
              >
                <p className="step-lead">{step.lead}</p>
                <p className="step-body">{step.body}</p>
              </div>
            ))}
          </div>

          <div className="stack-pin">
            <div className="pin" aria-live="polite">
              <span className="pin-figure num" data-signal={current.signal}>
                {current.figure}
              </span>
              <span className="pin-caption">{current.caption}</span>
              <ol className="pin-dots" aria-hidden="true">
                {STEPS.map((step, index) => (
                  <li key={step.id} data-on={index <= active || undefined} />
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section className="doors-story" aria-labelledby="doors-title">
        <h2 className="section-title" id="doors-title">
          Two doors
        </h2>
        <p className="section-lead">
          Both of these buy the same washing machine. Only one of them was ever shown to you.
        </p>
        <div className="doors">
          <Card className="door reveal-on-scroll">
            <h3 className="door-title">The offer in front of you</h3>
            <p className="door-body">
              A consumer lease. Fast, no credit check, and the provider owns the machine until the
              contract says otherwise.
            </p>
            <span className="door-figure num" data-signal="bad">
              $1,376
            </span>
          </Card>
          <Card className="door reveal-on-scroll">
            <h3 className="door-title">The one nobody advertises</h3>
            <p className="door-body">
              The No Interest Loan Scheme. Government backed, run by community providers, genuinely
              0%. It takes an appointment and a few days.
            </p>
            <span className="door-figure num" data-signal="good">
              $800
            </span>
          </Card>
        </div>
        <p className="section-note">
          Nobody advertises NILS because it earns no margin. That is the entire reason most people
          who qualify have never heard of it.
        </p>
      </section>

      <section className="prose-section reveal-on-scroll" aria-labelledby="who-title">
        <h2 className="section-title" id="who-title">
          Built for people who do not speak bank
        </h2>
        <p className="section-lead">
          Financial exclusion is not only about not having an account. Sometimes people have access
          to a financial product and cannot read it well enough to use it safely.
        </p>
        <div className="persona">
          <p className="persona-name">Sarah, 34. Two kids. Casual shifts.</p>
          <ul className="facts tight">
            <li>Her washing machine died on a Tuesday.</li>
            <li>She has no savings and no credit card.</li>
            <li>A card was declined last year, so she stopped asking.</li>
            <li>The shop window says $20 a week and she can do $20 a week.</li>
          </ul>
        </div>
        <p className="section-highlight">
          Nobody hides the total from Sarah. It is in the contract. It is just never the number on
          the sign, and working it out needs a calculator, the term length, and knowing to look.
          Second Door does that in the thirty seconds before she signs.
        </p>
        <ul className="facts">

          <li>
            <strong>The total comes first.</strong> The biggest thing on the screen is what you
            will actually pay, not a rate.
          </li>
          <li>
            <strong>Point a camera at it.</strong> No typing required, no account, no app to
            install.
          </li>
          <li>
            <strong>Affordability, not just price.</strong> An offer can be fair value and still
            take everything you had spare. We show both.
          </li>
        </ul>
      </section>

      <section className="prose-section reveal-on-scroll" aria-labelledby="cap-title">
        <h2 className="section-title" id="cap-title">
          The ceiling most people do not know exists
        </h2>
        <p className="section-lead">
          Section 175AA of the National Credit Code caps what a consumer lease can charge.
        </p>
        <Card className="formula-card">
          <code className="formula">base price + (4% of base price × whole months, max 48)</code>
          <p className="formula-note">
            On an $800 machine over 18 months, the most that can lawfully be charged is $1,376.
          </p>
        </Card>
        <ul className="facts">
          <li>
            <strong>Our first example was illegal.</strong> We started with $20 a week over 78
            weeks, which totals $1,560. That is $184 above the cap.
          </li>
          <li>
            <strong>We corrected it to $17.64.</strong> The weaker headline is the one that
            describes a contract that can actually exist.
          </li>
          <li>
            <strong>Then we made it a feature.</strong> Every lease is now checked against its own
            cap, and an offer above it gets a third result state.
          </li>
        </ul>
        <p className="section-note">
          We always say <em>appears to exceed</em>, never <em>is illegal</em>. Two guards make sure
          of it: the cap is computed against the top of the price range, and part months round up.
          Both resolve in the provider's favour.
        </p>
      </section>

      <section className="prose-section reveal-on-scroll" aria-labelledby="maths-title">
        <h2 className="section-title" id="maths-title">
          Tested math, not AI guesses
        </h2>
        <p className="section-lead">
          AI reads the contract image, but all figures come from exact code.
        </p>
        <Card className="formula-card">
          <code className="formula">PV = PMT × (1 − (1 + i)⁻ⁿ) / i</code>
          <p className="formula-note">
            Standard present-value formula used to calculate exact annual interest rates.
          </p>
        </Card>
        <ul className="facts">
          <li>
            <strong>Exact calculations.</strong> Rates and totals are computed using deterministic financial algorithms for precise results every time.
          </li>
          <li>
            <strong>Clear edge cases.</strong> Invalid terms or zero-interest offers are handled gracefully with plain explanations.
          </li>
        </ul>
      </section>

      <section className="prose-section reveal-on-scroll" aria-labelledby="money-title">
        <h2 className="section-title" id="money-title">
          It never touches your money
        </h2>
        <ul className="facts tight">
          <li>No credit is originated and no loan is brokered.</li>
          <li>No payment is processed and no balance is held.</li>
          <li>No accounts, no database, no analytics, nothing stored.</li>
          <li>The only thing that leaves your device is an offer you choose to have read.</li>
        </ul>
        <p className="section-note">
          This is a design decision, not a missing feature. It keeps the project outside credit
          licensing, and it means there is nothing here that can mis-sell anyone anything.
        </p>
      </section>


      <section className="closer reveal-on-scroll">
        <h2 className="closer-title">Show us an offer</h2>
        <p className="closer-body">Paste it, photograph it, or try one of ours.</p>
        <button type="button" className="button" data-variant="primary" onClick={onStart}>
          Back to the top
        </button>
      </section>
    </div>
  )
}
