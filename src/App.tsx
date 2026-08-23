import { useEffect, useMemo, useState } from 'react'
import { Card } from './components/ui/Card'
import { Intake } from './components/Intake'
import { Landing } from './components/Landing'
import { OfferEditor } from './components/OfferEditor'
import { Results } from './components/Results'
import { assess } from './lib/assess'
import { BLANK_OFFER } from './lib/blank-offer'
import type { ExtractedOffer } from './lib/offer'
import { HOME, isUnknownPath, navigate, useRoute } from './lib/router'
import './components/ui/controls.css'
import './app.css'

// prefers-reduced-motion kills CSS scroll-behavior but not a scripted smooth scroll.
function scrollToTool() {
  const target = document.getElementById('tool')
  if (!target) return
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  target.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' })
}

export default function App() {
  const route = useRoute()
  const [offer, setOffer] = useState<ExtractedOffer>(BLANK_OFFER)
  const [demo, setDemo] = useState(false)

  const result = useMemo(() => assess(offer), [offer])

  // The offer lives in memory, so /offer means nothing on a cold load. Not
  // encoded in the URL: the affordability figures are the user's own income
  // and expenses and do not belong in an address bar or a referrer header.
  const hasOffer = offer.payment > 0 || offer.item.trim() !== ''
  useEffect(() => {
    if (isUnknownPath()) {
      navigate(HOME, { replace: true })
    } else if (route === '/offer' && !hasOffer) {
      navigate(HOME, { replace: true })
    }
  }, [route, hasOffer])

  function start(next: ExtractedOffer, isDemo: boolean) {
    setOffer(next)
    setDemo(isDemo)
    navigate('/offer')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function restart() {
    setOffer(BLANK_OFFER)
    setDemo(false)
    navigate(HOME)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>

      <header className="masthead">
        <div className="masthead-inner">
          <span className="wordmark">Second Door</span>
          <div className="scroll-progress" aria-hidden="true" />
          {route === '/offer' ? (
            <button
              type="button"
              className="button masthead-cta"
              data-variant="quiet"
              onClick={restart}
            >
              Start again
            </button>
          ) : (
            <button
              type="button"
              className="button masthead-cta"
              data-variant="primary"
              data-size="compact"
              onClick={scrollToTool}
            >
              Try it now
            </button>
          )}
        </div>
      </header>

      <div className="shell">
        <main className="main" id="main">
          {route === HOME ? (
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
              <OfferEditor offer={offer} onChange={setOffer} demo={demo} />

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
