type Pan = { x: number; y: number; scale: number }

const CLOUD_LAYERS = [
  { id: 'far', factor: 0.18, depth: 0.08 },
  { id: 'mid', factor: 0.42, depth: 0.14 },
  { id: 'near', factor: 0.78, depth: 0.22 },
] as const

/** Auspicious cloud (祥雲). Drawn once and stamped around the frame. */
function Xiangyun({
  x,
  y,
  scale,
  flip = false,
  stroke,
  fill,
}: {
  x: number
  y: number
  scale: number
  flip?: boolean
  stroke: string
  fill: string
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`}>
      <path
        d="M18 42C18 28 32 20 44 28C50 12 72 12 78 30C96 24 108 40 96 52C112 60 104 80 86 76C84 94 60 98 54 80C36 90 16 76 24 60C6 56 4 38 18 42Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="3.1"
        strokeLinejoin="round"
      />
      <path
        d="M40 48C46 40 58 42 58 52C52 60 40 56 40 48Z"
        fill="none"
        stroke={stroke}
        strokeWidth="1.6"
      />
      <path
        d="M62 58C70 52 80 58 76 68C68 74 60 66 62 58Z"
        fill="none"
        stroke={stroke}
        strokeWidth="1.6"
      />
    </g>
  )
}

function CloudSheet({ variant }: { variant: 'far' | 'mid' | 'near' }) {
  const stroke = variant === 'near' ? '#3a3024' : variant === 'mid' ? '#4e4234' : '#6a5b48'
  const fill = variant === 'near' ? '#fbf6ea' : variant === 'mid' ? '#f7f1e4' : '#f3ead8'
  const stamps =
    variant === 'far'
      ? [
          [70, 40, 1.35, false],
          [250, 10, 1.1, true],
          [460, 50, 1.5, false],
          [680, 20, 1.2, true],
          [40, 280, 1.15, true],
          [700, 320, 1.25, false],
          [30, 620, 1.3, false],
          [720, 680, 1.2, true],
          [90, 980, 1.4, false],
          [360, 1040, 1.55, true],
          [640, 1000, 1.2, false],
        ]
      : variant === 'mid'
        ? [
            [140, 80, 0.9, true],
            [400, 30, 1.05, false],
            [620, 90, 0.85, true],
            [20, 160, 0.8, false],
            [760, 180, 0.95, true],
            [50, 480, 1, false],
            [740, 500, 0.9, true],
            [80, 860, 0.95, true],
            [500, 960, 1.1, false],
            [300, 1100, 0.85, true],
          ]
        : [
            [30, 20, 1.05, false],
            [200, 60, 0.92, true],
            [520, 16, 1.02, false],
            [760, 70, 0.96, true],
            [8, 220, 0.98, true],
            [790, 260, 1.05, false],
            [16, 540, 0.94, false],
            [800, 600, 1.08, true],
            [40, 900, 1.02, true],
            [280, 1080, 0.96, false],
            [560, 1040, 1.1, true],
            [780, 920, 0.9, false],
          ]

  return (
    <svg className="partner-map-cloud-svg" viewBox="0 0 860 1140" preserveAspectRatio="xMidYMid slice">
      {stamps.map(([x, y, scale, flip], index) => (
        <Xiangyun
          key={`${variant}-${index}`}
          x={x as number}
          y={y as number}
          scale={scale as number}
          flip={Boolean(flip)}
          stroke={stroke}
          fill={fill}
        />
      ))}
    </svg>
  )
}

/** Screen-space cloud frame. Each layer drifts, and lags the scroll by a different amount. */
export function WuxiaCloudFrame({ pan }: { pan: Pan }) {
  return (
    <div className="partner-map-clouds" aria-hidden="true">
      {CLOUD_LAYERS.map((layer) => {
        const grow = 1 + (pan.scale - 1) * layer.depth
        return (
        <div
          key={layer.id}
          className={`partner-map-cloud is-${layer.id}`}
          style={{
            width: `${128 * grow}%`,
            height: `${128 * grow}%`,
            left: `${-14 - (128 * (grow - 1)) / 2}%`,
            top: `${-14 - (128 * (grow - 1)) / 2}%`,
            transform: `translate(${pan.x * layer.factor}px, ${pan.y * layer.factor}px)`,
          }}
        >
          <div className={`partner-map-cloud-drift is-${layer.id}`}>
            <CloudSheet variant={layer.id} />
          </div>
        </div>
        )
      })}
    </div>
  )
}
