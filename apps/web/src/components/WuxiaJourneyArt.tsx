import type { ReactNode } from 'react'
import type { PathCategory, PracticePartnerPathState } from '../lib/practicePartnerPath'
import { practicePartnerChapterReveal } from '../lib/practicePartnerMapLayout'

type Reveals = Record<PathCategory, number>

function veilFilter(reveal: number) {
  const grey = 1 - reveal
  const bright = 0.72 + reveal * 0.28
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
        width="360"
        height={height}
        fill="url(#wuxiaVeil)"
        opacity={(1 - reveal) * 0.72}
      />
    </g>
  )
}

function Beacon({
  x,
  y,
  reveal,
  delay,
}: {
  x: number
  y: number
  reveal: number
  delay: string
}) {
  return (
    <g
      className="wuxia-beacon"
      style={{ opacity: 0.48 + reveal * 0.52, animationDelay: delay }}
      transform={`translate(${x} ${y})`}
    >
      <ellipse cx="0" cy="8" rx="12" ry="14" fill="#ffb25a" opacity="0.35" />
      <line x1="0" y1="-16" x2="0" y2="-2" stroke="#5c3b22" strokeWidth="1.2" />
      <path d="M-8 0 L8 0 L6 16 L-6 16 Z" fill="#e4572e" />
      <path d="M-4 3 L4 3 L3 13 L-3 13 Z" fill="#ffd27a" />
      <path d="M-6 16 L0 22 L6 16 Z" fill="#c23b22" />
    </g>
  )
}

/**
 * Original practice scroll. Four chapters down one road.
 * A chapter stays grey until its lessons are cleared, then the ink takes color.
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
    <svg
      className="partner-wuxia"
      viewBox="0 0 360 1000"
      preserveAspectRatio="xMidYMin slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="wuxiaSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b2744" />
          <stop offset="0.22" stopColor="#3a2a38" />
          <stop offset="0.48" stopColor="#141824" />
          <stop offset="0.72" stopColor="#10241c" />
          <stop offset="1" stopColor="#1a2438" />
        </linearGradient>
        <linearGradient id="wuxiaVeil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9d0c0" stopOpacity="0.2" />
          <stop offset="0.45" stopColor="#efe6d4" stopOpacity="0.78" />
          <stop offset="1" stopColor="#c9c0b0" stopOpacity="0.28" />
        </linearGradient>
        <linearGradient id="wuxiaRoof" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a12838" />
          <stop offset="1" stopColor="#6e1824" />
        </linearGradient>
      </defs>

      <rect width="360" height="1000" fill="url(#wuxiaSky)" />

      <Chapter reveal={reveal.common} y={0} height={270}>
        <circle cx="286" cy="52" r="20" fill="#f6e7c1" />
        <circle cx="294" cy="48" r="16" fill="#2a3148" opacity="0.28" />
        <path d="M0 150 L48 78 L96 128 L150 52 L198 118 L248 64 L310 124 L360 70 L360 210 L0 210 Z" fill="#2c3c52" />
        <path d="M0 176 L78 112 L140 164 L210 100 L270 158 L340 108 L360 150 L360 230 L0 230 Z" fill="#1c2838" />
        <path d="M78 128 L180 86 L282 128 L258 140 L180 108 L102 140 Z" fill="url(#wuxiaRoof)" />
        <path d="M64 132 Q180 168 296 132" fill="none" stroke="#e8c56b" strokeWidth="2.2" />
        <rect x="108" y="128" width="144" height="10" fill="#3a2418" />
        <rect x="122" y="138" width="14" height="78" rx="1" fill="#7a7268" />
        <rect x="224" y="138" width="14" height="78" rx="1" fill="#6a6258" />
        <rect x="118" y="168" width="124" height="36" fill="#1a120c" opacity="0.35" />
        <path d="M148 228 L212 228 L232 262 L128 262 Z" fill="#6a645c" />
        <path d="M132 262 L228 262 L256 292 L104 292 Z" fill="#524c46" />
        {[40, 86, 274, 318].map((x, i) => (
          <g key={x} transform={`translate(${x} 118)`}>
            <line x1="0" y1="0" x2="0" y2="10" stroke="#5c3b22" strokeWidth="1" />
            <rect x="-5" y="10" width="10" height="14" rx="2" fill={i % 2 ? '#e4572e' : '#c23b22'} />
          </g>
        ))}
      </Chapter>

      <Chapter reveal={reveal.foods} y={250} height={270}>
        <rect x="0" y="286" width="360" height="230" fill="#121624" />
        {[
          { x: 36, roof: '#8b1e2d' },
          { x: 138, roof: '#1d3d6e' },
          { x: 246, roof: '#8b1e2d' },
        ].map((stall) => (
          <g key={stall.x}>
            <path d={`M${stall.x} 392 L${stall.x + 36} 348 L${stall.x + 72} 392 Z`} fill={stall.roof} />
            <rect x={stall.x + 6} y="392" width="60" height="7" fill="#3a2418" />
            <rect x={stall.x + 4} y="408" width="64" height="6" fill="#5c4030" />
            <rect x={stall.x + 10} y="422" width="52" height="22" rx="2" fill="#2a2118" />
            <ellipse cx={stall.x + 26} cy="432" rx="8" ry="3.5" fill="#f3e2c2" />
            <ellipse cx={stall.x + 44} cy="434" rx="7" ry="3" fill="#c45a3a" />
          </g>
        ))}
        <path className="wuxia-steam" d="M92 400 C 86 382, 100 374, 90 356" stroke="#efe6d6" strokeWidth="2" fill="none" />
        <path className="wuxia-steam" d="M196 396 C 190 376, 206 368, 194 348" stroke="#efe6d6" strokeWidth="2" fill="none" />
        <path d="M0 500 L360 500 L360 530 L0 530 Z" fill="#10141c" />
      </Chapter>

      <Chapter reveal={reveal.animals} y={500} height={270}>
        <rect x="0" y="500" width="360" height="270" fill="#0e1c16" />
        <circle cx="292" cy="548" r="14" fill="#f6e7c1" opacity="0.85" />
        {Array.from({ length: 8 }, (_, i) => {
          const x = 22 + i * 42
          const top = 528 + (i % 3) * 18
          return (
            <g key={x}>
              <rect x={x} y={top} width="8" height={760 - top} rx="3" fill={i % 2 ? '#1c6b42' : '#145233'} />
              <ellipse cx={x + 4} cy={top + 8} rx="18" ry="7" fill="#2f9a62" opacity="0.9" />
              <ellipse cx={x - 6} cy={top + 28} rx="12" ry="5" fill="#3dba74" opacity="0.75" />
              <ellipse cx={x + 14} cy={top + 46} rx="11" ry="4" fill="#21784a" opacity="0.8" />
            </g>
          )
        })}
        <path d="M0 700 C 80 680, 140 720, 220 690 C 280 668, 320 710, 360 688 L360 760 L0 760 Z" fill="#0c241c" opacity="0.85" />
        <g transform="translate(250 640)">
          <path d="M0 0 C 12 -18, 28 -26, 44 -16" stroke="#f7f3ea" strokeWidth="2" fill="none" />
          <circle cx="46" cy="-18" r="3.2" fill="#f7f3ea" />
          <path d="M44 -14 L52 -12" stroke="#e4572e" strokeWidth="1.4" />
          <ellipse cx="6" cy="6" rx="15" ry="6.5" fill="#f7f3ea" />
          <path d="M-6 4 Q -26 10 -34 -8" stroke="#f7f3ea" strokeWidth="2.4" fill="none" />
          <path d="M2 12 L0 28 M12 12 L14 28" stroke="#1a120c" strokeWidth="1.2" />
        </g>
      </Chapter>

      <Chapter reveal={reveal.expert} y={740} height={260}>
        <rect x="0" y="740" width="360" height="260" fill="#162033" />
        <ellipse cx="70" cy="900" rx="88" ry="20" fill="#efe6d4" opacity="0.8" />
        <ellipse cx="190" cy="918" rx="120" ry="24" fill="#f7f1e4" />
        <ellipse cx="300" cy="896" rx="78" ry="18" fill="#e4dccb" />
        <path d="M20 860 L90 800 L140 848 L190 790 L230 850 L230 1000 L20 1000 Z" fill="#24303a" />
        <path d="M128 812 L230 770 L332 812 L304 826 L230 792 L156 826 Z" fill="url(#wuxiaRoof)" />
        <path d="M118 816 Q230 858 342 816" fill="none" stroke="#e8c56b" strokeWidth="2" />
        <rect x="176" y="826" width="10" height="52" fill="#4a3424" />
        <rect x="274" y="826" width="10" height="52" fill="#4a3424" />
        <rect x="160" y="874" width="140" height="8" rx="1" fill="#3a2418" />
        <path d="M200 882 L250 882 L262 918 L188 918 Z" fill="#6a645c" />
      </Chapter>

      <path
        d="M180 200 C 168 250, 156 280, 188 340 C 230 400, 210 450, 176 500 C 130 560, 200 620, 156 700 C 130 760, 200 820, 188 900 C 180 940, 176 970, 180 990"
        fill="none"
        stroke="#2a241c"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path
        d="M180 200 C 168 250, 156 280, 188 340 C 230 400, 210 450, 176 500 C 130 560, 200 620, 156 700 C 130 760, 200 820, 188 900 C 180 940, 176 970, 180 990"
        fill="none"
        stroke="#8d8478"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {(
        [
          ['M180 200 C 168 250, 156 280, 188 330', reveal.common],
          ['M188 330 C 230 400, 210 450, 176 500', reveal.foods],
          ['M176 500 C 130 560, 200 620, 156 700', reveal.animals],
          ['M156 700 C 130 760, 200 820, 188 980', reveal.expert],
        ] as const
      ).map(([d, amount]) => (
        <path
          key={d}
          d={d}
          fill="none"
          stroke="#e8c56b"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="2 8"
          opacity={0.15 + amount * 0.85}
        />
      ))}

      <Beacon x={64} y={150} reveal={reveal.common} delay="0s" />
      <Beacon x={300} y={360} reveal={reveal.foods} delay="0.6s" />
      <Beacon x={48} y={640} reveal={reveal.animals} delay="1.1s" />
      <Beacon x={248} y={800} reveal={reveal.expert} delay="1.6s" />

      <g opacity={0.2 + gild * 0.8} style={{ filter: gild > 0 ? undefined : 'grayscale(1)' }}>
        <path d="M166 968 L194 968 L200 984 L160 984 Z" fill="#f0e2b8" />
        <path d="M156 984 L204 984 L212 1000 L148 1000 Z" fill="#e8c56b" />
      </g>

      <g>
        <rect x="118" y="18" width="124" height="40" rx="3" fill="#1a120c" stroke="#e8d4a8" strokeWidth="1" />
        <text
          x="180"
          y="36"
          textAnchor="middle"
          fill="#f3e2c2"
          fontSize="14"
          fontFamily="Noto Sans HK, Noto Sans TC, sans-serif"
        >
          墨途
        </text>
        <text
          x="180"
          y="50"
          textAnchor="middle"
          fill="#e8d4a8"
          fontSize="7.5"
          letterSpacing="1.6"
          fontFamily="var(--font-display), sans-serif"
        >
          THE INK ROAD
        </text>
      </g>
    </svg>
  )
}
