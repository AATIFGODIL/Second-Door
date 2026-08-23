import type { CSSProperties, ElementType, ReactNode } from 'react'
import './glass.css'

export type Tone = 'neutral' | 'ember' | 'mint'

type SurfaceProps = {
  children?: ReactNode
  /** How far forward the pane sits. Drives blur, fill and rim together. */
  depth?: 1 | 2 | 3
  /** Which door this belongs to. Cascades to descendants via --tone-*. */
  tone?: Tone
  /** Recessed rather than raised — for inputs and editable fields. */
  inset?: boolean
  as?: ElementType
  className?: string
  style?: CSSProperties
} & Record<string, unknown>

export function Surface({
  children,
  depth = 1,
  tone = 'neutral',
  inset = false,
  as: Tag = 'div',
  className = '',
  style,
  ...rest
}: SurfaceProps) {
  return (
    <Tag
      className={`surface ${className}`.trim()}
      data-depth={depth}
      data-tone={tone}
      data-inset={inset || undefined}
      style={style}
      {...rest}
    >
      {children}
    </Tag>
  )
}

type GlowProps = {
  tone?: Tone
  /** Diameter, any CSS length. */
  size?: string
  className?: string
  style?: CSSProperties
}

/** A soft pool of coloured light. Give glass something to refract. */
export function Glow({ tone = 'ember', size = '420px', className = '', style }: GlowProps) {
  return (
    <div
      aria-hidden="true"
      className={`glow ${className}`.trim()}
      data-tone={tone}
      style={{ width: size, height: size, ...style }}
    />
  )
}
