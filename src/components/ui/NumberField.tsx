import { useState } from 'react'
import './controls.css'

export function NumberField({
  id,
  label,
  value,
  onCommit,
  flagged,
  hint,
  prefix,
  placeholder,
}: {
  id: string
  label: string
  value: number | null
  onCommit: (next: number | null) => void
  flagged?: boolean
  hint?: string
  prefix?: string
  placeholder?: string
}) {
  const [draft, setDraft] = useState(value === null ? '' : String(value))
  const [seen, setSeen] = useState(value)

  // Compare against what the draft parses to, not the previous prop: this
  // field causes most of its own prop changes, and typing "17." commits 17,
  // which a naive resync would rewrite as "17" and eat the decimal point.
  if (value !== seen) {
    setSeen(value)
    const asNumber = draft.trim() === '' ? null : Number(draft)
    if (asNumber !== value) setDraft(value === null ? '' : String(value))
  }

  return (
    <div className="field" data-flagged={flagged || undefined}>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="input-wrap" data-prefix={prefix || undefined}>
        {prefix ? <span className="input-prefix">{prefix}</span> : null}
        <input
          id={id}
          className="input"
          type="text"
          inputMode="decimal"
          placeholder={placeholder}
          value={draft}
          onChange={(event) => {
            const next = event.target.value
            setDraft(next)
            if (next.trim() === '') {
              onCommit(null)
              return
            }
            const parsed = Number(next)
            if (Number.isFinite(parsed)) onCommit(parsed)
          }}
        />
      </div>
      {flagged ? <p className="field-flag">We guessed this. Please check it</p> : null}
      {hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  )
}
