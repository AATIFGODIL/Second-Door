import { HeroBackground } from './HeroBackground'
import { scrollToId } from '../lib/scroll'
import './hero.css'

export function Hero() {
  return (
    <section className="hero-full">
      <HeroBackground />

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
