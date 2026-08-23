import './explain.css'

// <details> so it opens without JS and is announced correctly for free.
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
