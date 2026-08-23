import { useRef, useState, type DragEvent } from 'react'
import { Card } from './ui/Card'
import { EXAMPLES } from '../data/examples'
import { fileToImagePayload, readOffer } from '../lib/extract'
import type { ExtractedOffer } from '../lib/offer'
import './ui/controls.css'
import './intake.css'

type Props = {
  onRead: (offer: ExtractedOffer, source: 'read' | 'example' | 'manual', demo: boolean) => void
  onManual: () => void
}

export function Intake({ onRead, onManual }: Props) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [filename, setFilename] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  async function submit(input: { text?: string; file?: File }) {
    setBusy(true)
    setError(null)

    const image = input.file ? await fileToImagePayload(input.file) : undefined
    const result = await readOffer({ text: input.text, image })

    setBusy(false)
    if (result.ok) {
      onRead(result.offer, 'read', result.demo)
    } else {
      setError(result.message)
    }
  }

  function handleFile(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('That is not an image. Paste the text of the offer instead.')
      return
    }
    setFilename(file.name)
    void submit({ file, text: text.trim() || undefined })
  }

  function onDrop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    handleFile(event.dataTransfer.files[0])
  }

  return (
    <div className="intake" id="tool">
      <Card className="intake-card">
        <div className="field">
          <label className="field-label" htmlFor="offer-text">
            Paste the offer
          </label>
          <textarea
            id="offer-text"
            className="textarea"
            placeholder={'Washing machine\n$20 per week\n78 weeks'}
            value={text}
            onChange={(event) => setText(event.target.value)}
            disabled={busy}
          />
        </div>

        <div
          className="dropzone"
          data-dragging={dragging || undefined}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <p className="dropzone-text">
            {filename ? `Reading ${filename}` : 'Or drop a photo of the offer here'}
          </p>
          <button
            type="button"
            className="button"
            data-variant="secondary"
            onClick={() => fileInput.current?.click()}
            disabled={busy}
          >
            Choose a photo
          </button>
          <input
            ref={fileInput}
            className="visually-hidden"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
        </div>

        <div className="intake-actions">
          <button
            type="button"
            className="button"
            data-variant="primary"
            disabled={busy || !text.trim()}
            onClick={() => void submit({ text: text.trim() })}
          >
            {busy ? 'Reading…' : 'Read this offer'}
          </button>
          <button type="button" className="button" data-variant="quiet" onClick={onManual}>
            Type the numbers in instead
          </button>
        </div>

        {error ? (
          <p className="intake-error" role="alert">
            {error} You can still{' '}
            <button type="button" className="linkish" onClick={onManual}>
              type the numbers in
            </button>
            .
          </p>
        ) : null}
      </Card>

      <section className="examples" aria-labelledby="examples-title">
        <h2 className="examples-title" id="examples-title">
          Or try one
        </h2>
        <div className="examples-row">
          {EXAMPLES.map((example) => (
            <button
              key={example.id}
              type="button"
              className="example"
              disabled={busy}
              onClick={() => onRead(example.offer, 'example', false)}
            >
              <span className="example-label">{example.label}</span>
              <span className="example-teaches">{example.teaches}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
