import type { ReactNode } from 'react'

/**
 * Ink marks for the scroll. Softness comes from stacked shapes,
 * so the road stays a sharp vector while it moves.
 */

export function Cun({
  x,
  y,
  rows,
  cols,
  ink,
  gapX = 13,
  gapY = 15,
  opacity = 0.34,
}: {
  x: number
  y: number
  rows: number
  cols: number
  ink: string
  gapX?: number
  gapY?: number
  opacity?: number
}) {
  const marks: ReactNode[] = []
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const lean = ((r * 5 + c * 3) % 13) - 6
      const len = 18 + ((r * 2 + c) % 5) * 4
      const sx = x + c * gapX + (r % 2) * 6
      const sy = y + r * gapY + (c % 3)
      marks.push(
        <path key={`${r}-${c}`} d={`M${sx} ${sy} q${lean} ${len * 0.4} ${lean * 0.7} ${len}`} />,
      )
    }
  }
  return (
    <g className="wuxia-cun" fill="none" stroke={ink} strokeWidth="1.15" strokeLinecap="round" opacity={opacity}>
      {marks}
    </g>
  )
}

/** A bank of mist: three washes, one drift. */
export function MistBank({
  cx,
  cy,
  rx,
  ry = 16,
  fill = '#f7f1df',
  slow = false,
  strength = 1,
}: {
  cx: number
  cy: number
  rx: number
  ry?: number
  fill?: string
  slow?: boolean
  strength?: number
}) {
  return (
    <g className={`wuxia-mist-drift${slow ? ' is-slow' : ''}`} fill={fill} opacity={strength}>
      <ellipse cx={cx - rx * 0.34} cy={cy + ry * 0.15} rx={rx * 0.42} ry={ry} opacity="0.2" />
      <ellipse cx={cx} cy={cy - ry * 0.2} rx={rx * 0.5} ry={ry * 1.2} opacity="0.16" />
      <ellipse cx={cx + rx * 0.36} cy={cy + ry * 0.05} rx={rx * 0.38} ry={ry * 0.85} opacity="0.18" />
      <ellipse cx={cx + rx * 0.08} cy={cy + ry * 0.55} rx={rx * 0.28} ry={ry * 0.45} opacity="0.1" />
    </g>
  )
}

/** Dry-brush ridge: a wide ink under a thin light. */
export function Crest({ d, ink, light }: { d: string; ink: string; light: string }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={ink} strokeWidth="8" opacity="0.35" />
      <path d={d} stroke={light} strokeWidth="2.1" opacity="0.88" />
    </g>
  )
}
