import { lazy, Suspense } from 'react'
import { scrollToId } from '../lib/scroll'
import './hero.css'

// three + postprocessing is ~130KB gzipped, more than the rest of the app put
// together. Split it out so the headline and buttons paint immediately; the
// field arrives when it arrives, and the hero works without it.
const PixelBlast = lazy(() => import('./vendor/PixelBlast'))

export function Hero() {
  return (
    <section className="hero-full">
      <div className="hero-canvas">
        <Suspense fallback={null}>
          <PixelBlast
            variant="square"
            pixelSize={4}
            color="#FF3B30"
            patternScale={2}
            patternDensity={1}
            pixelSizeJitter={0}
            enableRipples
            rippleSpeed={0.4}
            rippleThickness={0.12}
            rippleIntensityScale={1.5}
            liquid={false}
            liquidStrength={0.12}
            liquidRadius={1.2}
            liquidWobbleSpeed={5}
            speed={0.3}
            edgeFade={0.25}
            transparent
          />
        </Suspense>
      </div>

      <div className="hero-content">
        <h1 className="hero-headline">
          <span>Don't understand the loan?</span>
          <span className="hero-headline-answer">We will explain it.</span>
        </h1>

        <div className="hero-actions">
          <button
            type="button"
            className="hero-button"
            data-variant="primary"
            onClick={() => scrollToId('tool')}
          >
            Get started
          </button>
          <button
            type="button"
            className="hero-button"
            data-variant="ghost"
            onClick={() => scrollToId('how')}
          >
            How it works
          </button>
        </div>
      </div>

      <span className="hero-cue" aria-hidden="true" />
    </section>
  )
}
