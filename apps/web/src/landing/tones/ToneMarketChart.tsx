import { useId, useMemo } from 'react'

type Side = 'buy' | 'sell'

type Props = {
  side: Side
  reduce?: boolean
}

/** Build a polyline through [0,1]×[0,1] (y grows downward in SVG). */
function buildPath(side: Side, seed: number): { line: string; area: string; candles: Candle[] } {
  const pts: { x: number; y: number }[] = []
  const n = 28
  let y = side === 'buy' ? 0.78 : 0.22
  for (let i = 0; i < n; i += 1) {
    const t = i / (n - 1)
    const wave = Math.sin((t * 9 + seed) * Math.PI) * 0.045
    const noise = Math.sin((t * 17 + seed * 2.1) * Math.PI) * 0.02
    const trend = side === 'buy' ? -0.55 * t : 0.55 * t
    y = Math.min(0.9, Math.max(0.1, (side === 'buy' ? 0.78 : 0.22) + trend + wave + noise))
    pts.push({ x: t, y })
  }

  const to = (p: { x: number; y: number }) => `${(p.x * 100).toFixed(2)},${(p.y * 100).toFixed(2)}`
  const line = pts.map(to).join(' ')
  const area = `0,100 ${line} 100,100`
  const candles: Candle[] = []
  for (let i = 2; i < pts.length - 1; i += 3) {
    const a = pts[i - 1]!
    const b = pts[i]!
    const open = a.y
    const close = b.y
    const high = Math.min(open, close) - 0.025
    const low = Math.max(open, close) + 0.025
    candles.push({
      x: b.x * 100,
      open: open * 100,
      close: close * 100,
      high: high * 100,
      low: low * 100,
      up: close < open,
    })
  }
  return { line, area, candles }
}

type Candle = {
  x: number
  open: number
  close: number
  high: number
  low: number
  up: boolean
}

/**
 * Full-bleed stock-market chart ambient for the buy/sell tone story.
 * Buy = ascending jade chart; Sell = descending red chart.
 */
export function ToneMarketChart({ side, reduce = false }: Props) {
  const uid = useId().replace(/:/g, '')
  const gradId = `mkt-fill-${uid}`
  const glowId = `mkt-glow-${uid}`

  const { line, area, candles } = useMemo(
    () => buildPath(side, side === 'buy' ? 0.3 : 1.7),
    [side],
  )

  return (
    <div className={`tones-mkt tones-mkt--${side}${reduce ? ' is-static' : ''}`} aria-hidden="true">
      <div className="tones-mkt-wash" />
      <svg className="tones-mkt-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={side === 'buy' ? 'var(--jade)' : '#e07070'}
              stopOpacity="0.35"
            />
            <stop
              offset="100%"
              stopColor={side === 'buy' ? 'var(--jade)' : '#e07070'}
              stopOpacity="0"
            />
          </linearGradient>
          <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid */}
        {[20, 40, 60, 80].map((y) => (
          <line
            key={`h${y}`}
            className="tones-mkt-grid"
            x1="0"
            y1={y}
            x2="100"
            y2={y}
          />
        ))}
        {[20, 40, 60, 80].map((x) => (
          <line
            key={`v${x}`}
            className="tones-mkt-grid"
            x1={x}
            y1="0"
            x2={x}
            y2="100"
          />
        ))}

        <polygon className="tones-mkt-area" points={area} fill={`url(#${gradId})`} />

        {candles.map((c, i) => {
          const bodyTop = Math.min(c.open, c.close)
          const bodyH = Math.max(0.8, Math.abs(c.close - c.open))
          const bull = side === 'buy' ? c.up : !c.up
          return (
            <g key={i} className={`tones-mkt-candle${bull ? ' is-up' : ' is-down'}`}>
              <line x1={c.x} y1={c.high} x2={c.x} y2={c.low} />
              <rect x={c.x - 0.9} y={bodyTop} width="1.8" height={bodyH} rx="0.2" />
            </g>
          )
        })}

        <polyline
          className="tones-mkt-line"
          points={line}
          fill="none"
          filter={`url(#${glowId})`}
        />

        {!reduce ? (
          <circle className="tones-mkt-tip" r="1.1">
            <animateMotion
              dur="7s"
              repeatCount="indefinite"
              path={`M ${line.trim().replace(/ /g, ' L ')}`}
            />
          </circle>
        ) : null}
      </svg>

      <div className="tones-mkt-ticker">
        {(side === 'buy'
          ? ['+1.2%', '+0.8%', '▲ HSI', '+2.4%', '買']
          : ['−1.6%', '−0.9%', '▼ HSI', '−2.1%', '賣']
        ).map((t, i) => (
          <span key={`${side}-${i}`} style={{ ['--i' as string]: i }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}
