import type { ReactNode } from 'react'
import type { PathCategory, PracticePartnerPathState } from '../lib/practicePartnerPath'
import { practicePartnerChapterReveal } from '../lib/practicePartnerMapLayout'

type Reveals = Record<PathCategory, number>

function veilFilter(reveal: number) {
  if (reveal >= 0.995) return undefined
  const grey = 1 - reveal
  const bright = 0.78 + reveal * 0.22
  return `grayscale(${grey}) brightness(${bright})`
}

function Chapter({
  reveal,
  y,
  height,
  children,
}: {
  reveal: number
  y: number
  height: number
  children: ReactNode
}) {
  return (
    <g className="wuxia-chapter" style={{ filter: veilFilter(reveal) }}>
      {children}
      <rect
        className="wuxia-mist"
        x="0"
        y={y}
        width="400"
        height={height}
        fill="url(#wuxiaVeil)"
        opacity={(1 - reveal) * 0.62}
      />
    </g>
  )
}

function Peak({ x, y, w, h, snow = true }: { x: number; y: number; w: number; h: number; snow?: boolean }) {
  const mid = x + w / 2
  return (
    <g>
      <polygon points={`${x},${y + h} ${mid},${y} ${x + w},${y + h}`} fill="#7d8a6e" stroke="#4e4638" strokeWidth="0.8" />
      <polygon points={`${x + w * 0.18},${y + h} ${mid},${y + h * 0.42} ${x + w * 0.55},${y + h}`} fill="#5f6b52" opacity="0.55" />
      {snow ? (
        <polygon points={`${mid - w * 0.12},${y + h * 0.22} ${mid},${y} ${mid + w * 0.12},${y + h * 0.22}`} fill="#f7f3ea" />
      ) : null}
    </g>
  )
}

function Pines({ points }: { points: Array<[number, number, number?]> }) {
  return (
    <g>
      {points.map(([x, y, s = 1], i) => (
        <g key={`${x}-${y}-${i}`} transform={`translate(${x} ${y}) scale(${s})`}>
          <polygon points="0,-16 7,2 -7,2" fill="#2d6a3c" />
          <polygon points="0,-9 6,6 -6,6" fill="#3f8c4e" />
          <rect x="-1.1" y="6" width="2.2" height="5" fill="#5a4030" />
        </g>
      ))}
    </g>
  )
}

function Roofs({ x, y, colors }: { x: number; y: number; colors: string[] }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {colors.map((fill, i) => (
        <g key={i} transform={`translate(${i * 18} ${i % 2 === 0 ? 0 : 4})`}>
          <rect x="3" y="9" width="12" height="8" fill="#f4ead4" stroke="#5c4a32" strokeWidth="0.6" />
          <path d="M0 9 L9 0 L18 9 Z" fill={fill} stroke="#4a3828" strokeWidth="0.55" />
        </g>
      ))}
    </g>
  )
}

function Dots({ d }: { d: string }) {
  return (
    <path d={d} fill="none" stroke="#5c4a32" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="0.4 4.2" />
  )
}

/**
 * Original practice atlas on parchment.
 * Unfinished chapters stay ink-grey. Cleared lessons bring the watercolor back.
 */
export function WuxiaJourneyArt({
  progress,
  mastery,
}: {
  progress: PracticePartnerPathState
  mastery: number
}) {
  const reveal: Reveals = {
    common: practicePartnerChapterReveal(progress, 'common'),
    foods: practicePartnerChapterReveal(progress, 'foods'),
    animals: practicePartnerChapterReveal(progress, 'animals'),
    expert: practicePartnerChapterReveal(progress, 'expert'),
  }
  const gild = mastery / 31

  return (
    <svg className="partner-wuxia" viewBox="0 0 400 1000" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
      <defs>
        <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f7edd6" />
          <stop offset="0.45" stopColor="#f3e2c4" />
          <stop offset="1" stopColor="#e4cfa6" />
        </linearGradient>
        <linearGradient id="roller" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6a3a1c" />
          <stop offset="0.45" stopColor="#d4a06a" />
          <stop offset="1" stopColor="#4a2814" />
        </linearGradient>
        <linearGradient id="wuxiaVeil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e7dcc4" stopOpacity="0.05" />
          <stop offset="0.5" stopColor="#d5cbb6" stopOpacity="0.72" />
          <stop offset="1" stopColor="#e7dcc4" stopOpacity="0.08" />
        </linearGradient>
        <pattern id="paperFiber" width="3" height="3" patternUnits="userSpaceOnUse">
          <path d="M0 1.6 H3" stroke="#b08958" strokeWidth="0.08" />
          <path d="M1.2 0 V3" stroke="#8d6a3e" strokeWidth="0.06" opacity="0.7" />
        </pattern>
      </defs>

      <rect width="400" height="1000" fill="url(#paper)" />
      <rect width="400" height="1000" fill="url(#paperFiber)" opacity="0.55" />
      <rect x="10" y="28" width="380" height="944" fill="none" stroke="#c4a574" strokeWidth="1.2" opacity="0.7" />

      <path d="M0 250C90 230 180 280 400 248L400 330C220 350 90 300 0 320Z" fill="#d5e3d6" opacity="0.72" />
      <path d="M0 500C120 470 240 530 400 490L400 560C250 590 120 530 0 560Z" fill="#d7e4ea" opacity="0.55" />
      <path d="M0 760C100 730 260 800 400 740L400 820C240 850 80 790 0 820Z" fill="#e7e0cf" opacity="0.8" />

      <Chapter reveal={reveal.common} y={40} height={230}>
        <path
          d="M48 230C70 168 108 150 150 162C168 112 214 96 250 140C286 92 340 124 352 196C330 236 120 252 48 230Z"
          fill="#e4d2a4"
          stroke="#6b5a40"
          strokeWidth="1.3"
        />
        <Peak x={70} y={78} w={54} h={70} />
        <Peak x={118} y={62} w={70} h={86} />
        <Peak x={176} y={70} w={48} h={64} />
        <Peak x={250} y={88} w={62} h={72} snow={false} />
        <Pines
          points={[
            [86, 168, 0.85],
            [104, 176, 1],
            [230, 160, 0.9],
            [248, 172, 0.75],
            [300, 168, 0.8],
          ]}
        />
        <path d="M132 148L168 118L204 148L196 154L168 132L140 154Z" fill="#8b1e2d" stroke="#4a3828" strokeWidth="0.6" />
        <rect x="156" y="148" width="8" height="28" fill="#efe6d2" stroke="#5c4a32" strokeWidth="0.5" />
        <rect x="176" y="148" width="8" height="28" fill="#efe6d2" stroke="#5c4a32" strokeWidth="0.5" />
        <path d="M150 196L190 196L204 220L136 220Z" fill="#cbb892" stroke="#6b5a40" strokeWidth="0.6" />
        <Dots d="M170 220C168 236 176 244 184 250" />
      </Chapter>

      <Chapter reveal={reveal.foods} y={280} height={230}>
        <path
          d="M36 470C60 360 120 340 180 356C210 328 260 332 300 360C340 330 380 360 392 430C360 490 80 500 36 470Z"
          fill="#e7c98a"
          stroke="#6b5a40"
          strokeWidth="1.3"
        />
        <path d="M70 400C120 390 160 420 210 404C250 392 300 410 340 398" fill="none" stroke="#7ea4b8" strokeWidth="7" strokeLinecap="round" />
        <path d="M70 400C120 390 160 420 210 404C250 392 300 410 340 398" fill="none" stroke="#d5ebf2" strokeWidth="3" strokeLinecap="round" />
        <path d="M186 386L186 418" stroke="#5c4030" strokeWidth="3" />
        <path d="M176 392L196 392L196 400L176 400Z" fill="#8b3a2a" />
        <Roofs x={78} y={368} colors={['#8b1e2d', '#1d3d6e', '#8b1e2d']} />
        <Roofs x={248} y={360} colors={['#1d3d6e', '#a12838']} />
        <path d="M96 392C100 376 112 372 108 358" fill="none" stroke="#efe6d6" strokeWidth="1.4" className="wuxia-steam" />
        <path d="M132 388C128 370 142 366 136 352" fill="none" stroke="#efe6d6" strokeWidth="1.4" className="wuxia-steam" />
        <Pines points={[[300, 430, 0.7], [318, 436, 0.65], [60, 430, 0.7]]} />
        <Dots d="M184 250C170 300 200 330 186 360" />
      </Chapter>

      <Chapter reveal={reveal.animals} y={520} height={250}>
        <path
          d="M28 740C50 560 110 540 170 566C200 530 250 528 290 560C340 524 390 560 398 680C360 760 70 770 28 740Z"
          fill="#7ea86a"
          stroke="#3d5a34"
          strokeWidth="1.3"
        />
        <path
          d="M40 700C90 660 140 710 200 676C250 650 310 700 370 668"
          fill="none"
          stroke="#2f6b3a"
          strokeWidth="10"
          strokeLinecap="round"
          opacity="0.45"
        />
        <Peak x={150} y={548} w={46} h={48} snow={false} />
        <Peak x={188} y={536} w={36} h={42} snow={false} />
        {Array.from({ length: 7 }, (_, i) => {
          const x = 64 + i * 42
          return (
            <g key={x}>
              <rect x={x} y={600 + (i % 3) * 8} width="5" height="78" rx="2" fill={i % 2 ? '#1f6b42' : '#145233'} />
              <ellipse cx={x + 2} cy={608 + (i % 3) * 8} rx="12" ry="4" fill="#3dba74" />
            </g>
          )
        })}
        <path d="M90 690C140 676 180 710 240 692C280 678 320 700 350 688" fill="none" stroke="#d5ebf2" strokeWidth="4" strokeLinecap="round" />
        <g transform="translate(300 640)">
          <path d="M0 0C12 -16 28 -22 42 -12" stroke="#f7f3ea" strokeWidth="1.8" fill="none" />
          <circle cx="44" cy="-14" r="2.6" fill="#f7f3ea" />
          <path d="M42 -11L48 -9" stroke="#c4513a" strokeWidth="1.2" />
          <ellipse cx="8" cy="6" rx="12" ry="5" fill="#f7f3ea" />
          <path d="M-4 4Q-20 8 -26 -6" stroke="#f7f3ea" strokeWidth="2" fill="none" />
        </g>
        <Dots d="M186 470C160 520 210 540 176 590" />
      </Chapter>

      <Chapter reveal={reveal.expert} y={760} height={210}>
        <path
          d="M50 940C80 820 130 800 190 824C214 786 260 778 300 820C340 790 380 820 386 900C350 960 90 970 50 940Z"
          fill="#c9d3b4"
          stroke="#5c6848"
          strokeWidth="1.3"
        />
        <Peak x={120} y={790} w={58} h={78} />
        <Peak x={168} y={772} w={74} h={96} />
        <Peak x={236} y={786} w={52} h={74} />
        <ellipse cx="150" cy="900" rx="46" ry="10" fill="#f7f1e4" opacity="0.9" />
        <ellipse cx="230" cy="912" rx="58" ry="12" fill="#f4efe4" />
        <ellipse cx="300" cy="896" rx="36" ry="9" fill="#e7e0cf" />
        <path d="M168 848L210 820L252 848L240 856L210 834L180 856Z" fill="#8b1e2d" stroke="#4a3828" strokeWidth="0.6" />
        <rect x="190" y="856" width="7" height="28" fill="#efe6d2" stroke="#5c4a32" strokeWidth="0.5" />
        <rect x="222" y="856" width="7" height="28" fill="#efe6d2" stroke="#5c4a32" strokeWidth="0.5" />
        <path d="M176 884L244 884L252 896L168 896Z" fill="#6b5344" />
        <Pines points={[[96, 888, 0.7], [112, 894, 0.6], [300, 880, 0.65]]} />
        <Dots d="M176 700C160 760 200 790 210 820" />
      </Chapter>

      <path
        d="M184 248C170 300 200 340 186 400C168 470 210 520 176 600C150 690 200 760 210 830C214 880 200 930 196 960"
        fill="none"
        stroke="#6b5a40"
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.35"
      />
      {(
        [
          ['M184 248C170 300 186 360', reveal.common],
          ['M186 360C186 400 168 450 176 500', reveal.foods],
          ['M176 500C210 540 160 640 176 710', reveal.animals],
          ['M176 710C200 780 210 860 196 960', reveal.expert],
        ] as const
      ).map(([d, amount]) => (
        <path
          key={d}
          d={d}
          fill="none"
          stroke="#8b1e2d"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeDasharray="1.2 5"
          opacity={0.15 + amount * 0.85}
        />
      ))}

      <g opacity={0.25 + gild * 0.75} style={{ filter: gild > 0 ? undefined : 'grayscale(1)' }}>
        <path d="M176 968L214 968L220 984L170 984Z" fill="#e8c56b" />
        <path d="M166 984L224 984L232 998L158 998Z" fill="#f0e2b8" />
      </g>

      <rect x="14" y="8" width="372" height="16" rx="8" fill="url(#roller)" />
      <rect x="14" y="976" width="372" height="16" rx="8" fill="url(#roller)" />
      <circle cx="22" cy="16" r="7" fill="#4a2814" />
      <circle cx="378" cy="16" r="7" fill="#4a2814" />
      <circle cx="22" cy="984" r="7" fill="#4a2814" />
      <circle cx="378" cy="984" r="7" fill="#4a2814" />

      <g>
        <rect x="148" y="36" width="104" height="34" rx="2" fill="#f7edd6" stroke="#6b5a40" strokeWidth="1" />
        <text x="200" y="52" textAnchor="middle" fill="#3a2418" fontSize="13" fontFamily="Noto Sans HK, Noto Sans TC, sans-serif">
          墨途
        </text>
        <text x="200" y="64" textAnchor="middle" fill="#6b5a40" fontSize="6.5" letterSpacing="1.4" fontFamily="sans-serif">
          THE INK ROAD
        </text>
      </g>
    </svg>
  )
}
