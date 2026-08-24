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

const PROMISES = [
  'No account creation.',
  'No tracking.',
  'Your money details are never saved.',
]

/**
 * Hold the three promises on screen and type them in, one per beat of scroll.
 *
 * The beats are empty spacers stacked behind the pinned panel: whichever one
 * is crossing the middle of the viewport decides how many lines are typed.
 * Nothing is latched, so the lines type and untype with the scroll, and the
 * count resets once the section is behind you: arriving here a second time
 * plays the whole thing again rather than showing three finished lines.
 */
function usePromiseSteps(count: number) {
  const [shown, setShown] = useState(-1)
  const [held, setHeld] = useState(false)
  const refs = useRef<(HTMLElement | null)[]>([])
  const section = useRef<HTMLElement>(null)

  useEffect(() => {
    const nodes = refs.current.filter((node): node is HTMLElement => node !== null)
    if (nodes.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const index = nodes.indexOf(entry.target as HTMLElement)
          if (index !== -1) setShown(index)
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    )

    for (const node of nodes) observer.observe(node)
    return () => observer.disconnect()
  }, [count])

  // The scrim is only alive while the section owns the screen. Outside that
  // band it is switched off entirely rather than left at zero opacity: a
  // live backdrop-filter over the whole viewport costs a composite on every
  // frame, whether or not you can see it.
  useEffect(() => {
    const el = section.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        setHeld(entry.isIntersecting)
        // Rewind on the way out, so the next arrival types from nothing.
        if (!entry.isIntersecting) setShown(-1)
      },
      { rootMargin: '-30% 0px -30% 0px', threshold: 0 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { shown, held, refs, section }
}

function Promise() {
  const { shown, held, refs, section } = usePromiseSteps(PROMISES.length)

  return (
    <section className="promise" ref={section} data-held={held || undefined}>
      <div className="promise-track" aria-hidden="true">
        {PROMISES.map((line, index) => (
          <div
            key={line}
            className="promise-beat"
            ref={(node) => {
              refs.current[index] = node
            }}
          />
        ))}
      </div>

      <div className="promise-pin">
        <div className="promise-scrim" aria-hidden="true" />
        {PROMISES.map((line, index) => (
          <p className="promise-line" key={line} data-shown={index <= shown || undefined}>
            <span>{line}</span>
          </p>
        ))}
      </div>
    </section>
  )
}

export function Landing({ onStart }: { onStart: () => void }) {
  useRevealOnScroll()
  const { active, refs } = useActiveStep(STEPS.length)
  const current = STEPS[active]

  return (
    <div className="landing" id="how">
      <Promise />

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
          NILS earns nobody a margin, so nobody advertises it. That is why most people who qualify
          have never heard of it.
        </p>
      </section>

      <section className="prose-section reveal-on-scroll" aria-labelledby="who-title">
        <h2 className="section-title" id="who-title">
          Built for people who do not speak bank
        </h2>
        <p className="section-lead">
          Plenty of people can get a financial product and still not be able to read it well enough
          to use it safely.
        </p>
        <div className="persona">
          <p className="persona-name">Sarah, 34. Two kids. Casual shifts.</p>
          <ul className="facts tight">
            <li>Her washing machine died on a Tuesday.</li>
            <li>No savings, no credit card.</li>
            <li>A card was declined last year, so she stopped asking.</li>
            <li>The window says $20 a week, and she can do $20 a week.</li>
          </ul>
        </div>
        <p className="section-highlight">
          Nobody hides the total from Sarah. It is in the contract. It is just never the number on
          the sign. Second Door works it out in the thirty seconds before she signs.
        </p>
        <ul className="facts">
          <li>
            <strong>The total comes first.</strong> The biggest thing on the screen is what you
            will actually pay.
          </li>
          <li>
            <strong>Point a camera at it.</strong> No typing, no account, no app.
          </li>
          <li>
            <strong>Affordability, not just price.</strong> An offer can be fair value and still
            take everything you had spare.
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
        <p className="section-note">
          Every lease you check here is tested against its own cap.
        </p>
      </section>

      <section className="prose-section reveal-on-scroll" aria-labelledby="how-title">
        <h2 className="section-title" id="how-title">
          How this works
        </h2>
        <ul className="facts">
          <li>
            <strong>The AI only reads.</strong> It lifts the numbers off your photo. Every total
            and rate is worked out in tested code.
          </li>
          <li>
            <strong>Nothing is stored.</strong> No account, no database, no tracking.
          </li>
          <li>
            <strong>It never touches your money.</strong> No credit, no payments, no balance. The
            only thing that leaves your device is the offer you choose to have read.
          </li>
        </ul>
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
