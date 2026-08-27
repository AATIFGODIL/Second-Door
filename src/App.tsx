import { useEffect, useMemo, useRef, useState } from 'react'
import { Card } from './components/ui/Card'
import { Hero } from './components/Hero'
import { Intake } from './components/Intake'
import { Landing } from './components/Landing'
import { OfferEditor } from './components/OfferEditor'
import { Results } from './components/Results'
import { assess } from './lib/assess'
import { BLANK_OFFER } from './lib/blank-offer'
import type { ExtractedOffer } from './lib/offer'
import { HOME, isUnknownPath, navigate, useRoute } from './lib/router'
import { scrollToId } from './lib/scroll'
import './components/ui/controls.css'
import './app.css'

function getInitialTheme(): 'light' | 'dark' {
  const saved = localStorage.getItem('sd_theme')
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function App() {
  const route = useRoute()
  const [offer, setOffer] = useState<ExtractedOffer>(BLANK_OFFER)
  const [demo, setDemo] = useState(false)
  const [picture, setPicture] = useState<string | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('sd_theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  const result = useMemo(() => assess(offer), [offer])

  /*
   * Publish the masthead's real height so the hero can size itself to one
   * exact screen. Not the padding sum: the action buttons contribute their
   * own height, and a hardcoded guess left the page below peeking under
   * the fold.
   */
  const masthead = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = masthead.current
    if (!el) return
    const publish = () =>
      document.documentElement.style.setProperty(
        '--masthead-h',
        `${Math.round(el.getBoundingClientRect().height)}px`,
      )
    publish()
    const observer = new ResizeObserver(publish)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
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

  /** Object URLs are the browser's to free, so release the old one. */
  function showPicture(next: string | null) {
    setPicture((old) => {
      if (old?.startsWith('blob:')) URL.revokeObjectURL(old)
      return next
    })
  }

  function start(next: ExtractedOffer, isDemo: boolean, nextPicture?: string) {
    setOffer(next)
    setDemo(isDemo)
    showPicture(nextPicture ?? null)
    navigate('/offer')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function restart() {
    setOffer(BLANK_OFFER)
    setDemo(false)
    showPicture(null)
    navigate(HOME)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>

      <header className="masthead" ref={masthead}>
        <div className="masthead-inner">
          <div className="brand">
            <img src="/favicon.svg" alt="Second Door Logo" className="brand-logo" width="32" height="32" />
            <span className="wordmark">Second Door</span>
          </div>
          <div className="scroll-progress" aria-hidden="true" />
          <div className="masthead-actions">
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
                onClick={() => scrollToId('tool')}
              >
                Try it now
              </button>
            )}
            <button
              type="button"
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {route === HOME ? <Hero /> : null}

      <div className="shell">
        <main className="main" id="main">
          {route === HOME ? (
            <>
              <p className="tool-intro">
                Show us a rent-to-own or lease offer. We work out what it really costs, and what
                the same thing costs at a genuine 0%.
              </p>

              <Intake
                onRead={(next, _source, demo, pic) => start(next, demo, pic)}
                onManual={() => start(BLANK_OFFER, false)}
              />

              <Landing onStart={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
            </>
          ) : (
            <>
              <OfferEditor offer={offer} onChange={setOffer} demo={demo} picture={picture} />

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
          <div className="colophon-text">
            <p>
              <strong>Second Door never touches money.</strong> It originates no credit, brokers no
              loans, and processes no payments. Nothing is stored, there are no accounts, and the
              only thing that leaves your device is an offer you explicitly choose to have read.
            </p>
            <p>
              Not financial advice. The National Debt Helpline is free and independent on{' '}
              <a href="tel:1800007007">1800 007 007</a>.
            </p>
          </div>
          <p className="colophon-byline">
            <span className="colophon-byline-lead">A project by</span>
            <span className="colophon-brand">WANDERERS</span>
          </p>
        </footer>
      </div>
    </>
  )
}
