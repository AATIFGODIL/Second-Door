import type { CSSProperties, ElementType, ReactNode } from 'react'
import './card.css'

type CardProps = {
  children?: ReactNode
  /** Raised off the page (default) or set into it, for editable fields. */
  variant?: 'raised' | 'sunken'
  elevation?: 1 | 2
  /** Apply the standard internal padding. Off when the card lays out its own. */
  pad?: boolean
  as?: ElementType
  className?: string
  style?: CSSProperties
}

export function Card({
  children,
  variant = 'raised',
  elevation = 1,
  pad = true,
  as: Tag = 'div',
  className = '',
  style,
}: CardProps) {
  return (
    <Tag
      className={`card ${className}`.trim()}
      data-variant={variant}
      data-elevation={elevation}
      data-pad={pad || undefined}
      style={style}
    >
      {children}
    </Tag>
  )
}

type FigureProps = {
  label: string
  value: string
  note?: ReactNode
  /** How loud. `display` is reserved for the one number a screen is about. */
  scale?: 'display' | 'default' | 'small'
  /** Colours the value only — never the container. */
  signal?: 'bad' | 'good' | 'none'
  className?: string
}

export function Figure({
  label,
  value,
  note,
  scale = 'default',
  signal = 'none',
  className = '',
}: FigureProps) {
  return (
    <div className={`figure ${className}`.trim()} data-scale={scale} data-signal={signal}>
      <span className="figure-label">{label}</span>
      <span className="figure-value num">{value}</span>
      {note ? <span className="figure-note">{note}</span> : null}
    </div>
  )
}
