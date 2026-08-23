import { Surface } from './components/glass/Surface'
import './app.css'

export default function App() {
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>

      <div className="shell">
        <header className="masthead">
          <div className="wordmark">
            Second <span className="door-two">Door</span>
          </div>
          <p className="masthead-note">A calculator and a directory. Not credit, not advice.</p>
        </header>

        <main className="main" id="main">
          <h1 className="lede">
            It says <em>$20 a week</em>. It does not say what that adds up to.
          </h1>

          <p className="sub">
            Paste the offer, drop in a screenshot, or pick one of the examples. We do the
            arithmetic and show you what the same purchase costs at 0%.
          </p>

          <Surface depth={2} className="slot" tone="neutral">
            <p className="slot-label">Intake — block 4</p>
          </Surface>

          <Surface depth={2} className="slot" tone="ember">
            <p className="slot-label">Door one — the offer you were shown</p>
          </Surface>

          <Surface depth={2} className="slot" tone="mint">
            <p className="slot-label">Door two — the one nobody advertises</p>
          </Surface>
        </main>

        <footer className="colophon">
          <p>
            <strong>Second Door never touches money.</strong> Nothing is stored, there are no
            accounts, and no information you enter leaves your device except the offer text or
            image you choose to have read.
          </p>
        </footer>
      </div>
    </>
  )
}
