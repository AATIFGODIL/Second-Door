import './hero-background.css'

/*
 * Scattered financial iconography behind the hero.
 *
 * Red marks the door you were shown: price tags, contracts, cards, falling
 * value. Green marks the one nobody advertises. Positions are fixed rather
 * than random so the composition stays clear of the headline and does not
 * reshuffle on every render.
 */

const ICONS: Record<string, string[]> = {
  dollar: ['M12 1v22', 'M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6'],
  card: ['M2 5h20v14H2z', 'M2 10h20'],
  percent: ['M19 5 5 19', 'M7.5 5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z', 'M16.5 14a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z'],
  down: ['M23 18l-9.5-9.5-5 5L1 6', 'M17 18h6v-6'],
  up: ['M23 6l-9.5 9.5-5-5L1 18', 'M17 6h6v6'],
  tag: ['M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8Z', 'M7 7h.01'],
  bag: ['M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z', 'M3 6h18', 'M16 10a4 4 0 0 1-8 0'],
  bars: ['M12 20V10', 'M18 20V4', 'M6 20v-4'],
  clock: ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z', 'M12 6v6l4 2'],
  contract: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M8 13h8', 'M8 17h5'],
  pie: ['M21.2 15.9A10 10 0 1 1 8 2.8', 'M22 12A10 10 0 0 0 12 2v10z'],
  coins: ['M12 2a5 3 0 1 0 0 6 5 3 0 0 0 0-6Z', 'M7 5v6c0 1.7 2.2 3 5 3s5-1.3 5-3V5', 'M7 11v6c0 1.7 2.2 3 5 3s5-1.3 5-3v-6'],
}

type Placed = {
  icon: keyof typeof ICONS
  x: number
  y: number
  size: number
  rotate: number
  tone: 'red' | 'green'
  delay: number
}

// Eight only, close in around the headline rather than pushed to the
// edges. Red is the door you were shown, green the one nobody advertises.
const LAYOUT: Placed[] = [
  { icon: 'tag', x: 15, y: 27, size: 92, rotate: -14, tone: 'red', delay: 0 },
  { icon: 'contract', x: 8, y: 56, size: 76, rotate: 8, tone: 'red', delay: 2.4 },
  { icon: 'percent', x: 27, y: 76, size: 66, rotate: 11, tone: 'red', delay: 4.1 },
  { icon: 'down', x: 31, y: 16, size: 62, rotate: -5, tone: 'red', delay: 1.3 },

  { icon: 'coins', x: 85, y: 28, size: 92, rotate: 12, tone: 'green', delay: 0.7 },
  { icon: 'up', x: 92, y: 58, size: 74, rotate: 0, tone: 'green', delay: 3.2 },
  { icon: 'dollar', x: 73, y: 78, size: 68, rotate: -9, tone: 'green', delay: 1.8 },
  { icon: 'pie', x: 69, y: 17, size: 60, rotate: 6, tone: 'green', delay: 5 },
]

export function HeroBackground() {
  return (
    <div className="hero-bg" aria-hidden="true">
      <span className="hero-tint" />
      {LAYOUT.map((item, index) => (
        <svg
          key={`${item.icon}-${index}`}
          className="hero-icon"
          data-tone={item.tone}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            left: `${item.x}%`,
            top: `${item.y}%`,
            width: item.size,
            height: item.size,
            ['--rotate' as string]: `${item.rotate}deg`,
            animationDelay: `${item.delay}s`,
          }}
        >
          {ICONS[item.icon].map((d) => (
            <path key={d} d={d} />
          ))}
        </svg>
      ))}
    </div>
  )
}
