import './explain.css'

/**
 * A term, and what it means in words nobody needs a finance background to read.
 *
 * A <details> element rather than a scripted disclosure: it opens without
 * JavaScript, it is keyboard operable and announced correctly by screen
 * readers for free, and browser find-in-page can reach the closed content.
 */
export function Explain({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <details className="explain">
      <summary className="explain-summary">
        <span className="explain-q">What does {term} mean?</span>
      </summary>
      <div className="explain-body">{children}</div>
    </details>
  )
}
