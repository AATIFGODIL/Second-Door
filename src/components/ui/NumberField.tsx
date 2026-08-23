import { useState } from 'react'
import './controls.css'

/**
 * A number the user can clear, and can type a decimal point into.
 *
 * Holding the raw string rather than the parsed number matters more than it
 * looks. Binding a number straight to the input means backspacing the last
 * digit snaps the field to 0, and anything recomputing downstream fires on a
 * value the user never typed.
 */
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

  /*
   * Re-sync when the value changes from outside: a new extraction, or a reset.
   *
   * The comparison is against what the draft *parses to*, not against the
   * previous prop, because this field causes most of its own prop changes.
   * Typing "17." commits 17, which is a changed prop, and a naive resync would
   * rewrite the draft as "17" and eat the decimal point the moment it was
   * typed. Number("17.") is 17, so the parsed draft already matches and the
   * draft is left alone.
   */
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
