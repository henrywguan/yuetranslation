import { memo, type ReactNode } from 'react'
import type { PathCategory, PracticePartnerPathState } from '../lib/practicePartnerPath'
import { PARTNER_MAP_VIEWBOX, practicePartnerChapterReveal } from '../lib/practicePartnerMapLayout'
import { Crest, Cun, MistBank } from './wuxiaBrush'

const VB = `0 0 ${PARTNER_MAP_VIEWBOX.w} ${PARTNER_MAP_VIEWBOX.h}`

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
  veil = true,
}: {
  reveal: number
  y: number
  height: number
  children: ReactNode
  veil?: boolean
}) {
  return (
    <g className={`wuxia-chapter${reveal < 0.02 ? ' is-ink' : ''}`} style={{ filter: veilFilter(reveal) }}>
      {children}
      {veil ? (
        <rect
          className="wuxia-mist"
          x="0"
          y={y}
          width={PARTNER_MAP_VIEWBOX.w}
          height={height}
          fill="url(#inkVeil)"
          opacity={(1 - reveal) * 0.28}
        />
      ) : null}
    </g>
  )
}

function Pines({ points }: { points: Array<[number, number, number]> }) {
  return (
    <g>
      {points.map(([x, base, s], i) => (
        <use key={`${x}-${base}-${i}`} href="#inkPine" x={x - 16 * s} y={base - 58 * s} width={32 * s} height={58 * s} />
      ))}
    </g>
  )
}

function Grove({
  points,
  className,
}: {
  points: Array<[number, number, number]>
  className: string
}) {
  return (
    <g className={className}>
      {points.map(([x, base, s], i) => (
        <use
          key={`${x}-${base}-${i}`}
          href="#inkBamboo"
          x={x - 18 * s}
          y={base - 100 * s}
          width={36 * s}
          height={100 * s}
        />
      ))}
    </g>
  )
}

function Hatch({ x, y, n = 6, step = 16 }: { x: number; y: number; n?: number; step?: number }) {
  return (
    <g fill="none" stroke="#2c241c" strokeWidth="1.05" opacity="0.32" strokeLinecap="round">
      {Array.from({ length: n }, (_, i) => (
        <path key={i} d={`M${x + i * step} ${y + (i % 2) * 7} l12 -18`} />
      ))}
    </g>
  )
}

function TileRoof({
  x,
  y,
  w,
  h,
  fill,
}: {
  x: number
  y: number
  w: number
  h: number
  fill: string
}) {
  const mid = x + w / 2
  const eave = y + h * 0.62
  const tiles = Math.max(7, Math.round(w / 11))
  return (
    <g>
      <path
        d={`M${x} ${eave - h * 0.05} Q${x + w * 0.06} ${eave - h * 0.32} ${x + w * 0.16} ${eave} Q${mid} ${y} ${x + w * 0.84} ${eave} Q${x + w * 0.94} ${eave - h * 0.32} ${x + w} ${eave - h * 0.05} L${x + w * 0.9} ${eave + h * 0.16} Q${mid} ${y + h * 0.36} ${x + w * 0.1} ${eave + h * 0.16} Z`}
        fill={fill}
        stroke="#3a2418"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path
        d={`M${x + w * 0.12} ${eave + h * 0.12} Q${mid} ${y + h * 0.34} ${x + w * 0.88} ${eave + h * 0.12} L${x + w * 0.82} ${eave + h * 0.3} Q${mid} ${y + h * 0.48} ${x + w * 0.18} ${eave + h * 0.3} Z`}
        fill="#cbb892"
        stroke="#6b5a40"
        strokeWidth="0.8"
      />
      {Array.from({ length: tiles }, (_, i) => {
        const tx = x + (w * (i + 0.5)) / tiles
        return (
          <path
            key={i}
            d={`M${tx} ${y + h * 0.4} L${tx + 1.4} ${eave + h * 0.02}`}
            stroke="#f4e2c4"
            strokeWidth="0.9"
            opacity="0.7"
          />
        )
      })}
      <path
        d={`M${mid - w * 0.06} ${y + h * 0.18} H${mid + w * 0.06}`}
        stroke="#e8c56b"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx={mid - w * 0.08} cy={y + h * 0.2} r="2.1" fill="#e8c56b" stroke="#6b5a40" strokeWidth="0.5" />
      <circle cx={mid + w * 0.08} cy={y + h * 0.2} r="2.1" fill="#e8c56b" stroke="#6b5a40" strokeWidth="0.5" />
    </g>
  )
}

function Pillar({ x, y, h }: { x: number; y: number; h: number }) {
  return (
    <g>
      <path d={`M${x - 1} ${y + 6} H${x + 17} L${x + 15} ${y} H${x + 1} Z`} fill="#8d7b64" stroke="#4e4638" strokeWidth="0.7" />
      <path d={`M${x} ${y + 4} H${x + 16} L${x + 14} ${y + h} H${x + 2} Z`} fill="#e7dcc4" stroke="#5c4e3c" strokeWidth="1" />
      <path
        d={`M${x + 2} ${y + h * 0.22} H${x + 14} M${x + 2} ${y + h * 0.42} H${x + 14} M${x + 2} ${y + h * 0.62} H${x + 14} M${x + 2} ${y + h * 0.82} H${x + 14}`}
        stroke="#8a7358"
        strokeWidth="1"
      />
    </g>
  )
}

function Lantern({ x, y, s = 1, hue = '#c23a2e' }: { x: number; y: number; s?: number; hue?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle cy="0" r="13" fill={hue} opacity="0.22" className="wuxia-lantern" />
      <path d="M0 -16 V-8" stroke="#5c4030" strokeWidth="1.1" />
      <path d="M-6.5 -8 H6.5" stroke="#e8c56b" strokeWidth="1.5" />
      <path d="M-5.5 -6 Q0 -12 5.5 -6 L4.6 7 Q0 12 -4.6 7 Z" fill={hue} stroke="#4a1218" strokeWidth="0.8" />
      <path d="M-3.4 -1.5 Q0 -5 3.4 -1.5 L2.8 5.2 Q0 8 -2.8 5.2 Z" fill="#e8c56b" className="wuxia-lantern" />
      <path d="M-5.5 7 H5.5" stroke="#e8c56b" strokeWidth="1.3" />
      <path d="M0 9 V16 M-2.6 12.5 H2.6" stroke={hue} strokeWidth="1" />
    </g>
  )
}

function Stall({ x, y, awning, sign }: { x: number; y: number; awning: string; sign?: string }) {
  return (
    <g>
      <ellipse cx={x + 34} cy={y + 74} rx="36" ry="5.5" fill="#1a120c" opacity="0.2" />
      <TileRoof x={x} y={y} w={64} h={30} fill={awning} />
      <path
        d={`M${x + 8} ${y + 38} C${x + 22} ${y + 46} ${x + 40} ${y + 34} ${x + 62} ${y + 42} L${x + 58} ${y + 70} C${x + 44} ${y + 62} ${x + 30} ${y + 76} ${x + 16} ${y + 66} C${x + 10} ${y + 74} ${x + 8} ${y + 60} ${x + 8} ${y + 52} Z`}
        fill="#f4ead4"
        stroke="#5c4a32"
        strokeWidth="1.05"
      />
      <path
        d={`M${x + 16} ${y + 48} C${x + 30} ${y + 42} ${x + 44} ${y + 54} ${x + 52} ${y + 46} L${x + 50} ${y + 64} C${x + 36} ${y + 70} ${x + 24} ${y + 58} ${x + 16} ${y + 66} Z`}
        fill={awning}
        opacity="0.16"
      />
      <path d={`M${x + 14} ${y + 46} H${x + 30} V${y + 56} H${x + 14} Z`} fill="#e7c98a" stroke="#8a6230" strokeWidth="0.7" />
      <circle cx={x + 19} cy={y + 51} r="2.1" fill="#f7f1df" />
      <circle cx={x + 25} cy={y + 51} r="2.1" fill="#f7f1df" />
      <ellipse cx={x + 42} cy={y + 52} rx="6.5" ry="3.2" fill="#f7f1df" stroke="#8b1e2d" strokeWidth="0.8" />
      <path
        d={`M${x + 24} ${y + 36} C${x + 20} ${y + 16} ${x + 34} ${y + 12} ${x + 28} ${y - 2}`}
        fill="none"
        stroke="#f7f3ea"
        strokeWidth="1.7"
        strokeLinecap="round"
        className="wuxia-steam"
      />
      {sign ? (
        <g>
          <rect x={x + 48} y={y + 18} width="14" height="22" rx="1" fill="#8b1e2d" stroke="#3a2418" strokeWidth="0.7" />
          <text
            x={x + 55}
            y={y + 34}
            textAnchor="middle"
            fill="#f7f1df"
            fontSize="11"
            fontFamily="Noto Sans HK, Noto Sans TC, sans-serif"
          >
            {sign}
          </text>
        </g>
      ) : null}
    </g>
  )
}

function Willow({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="none" strokeLinecap="round">
      <path d="M0 0 C2 -40 6 -90 0 -130" stroke="#5a4030" strokeWidth="2.4" />
      <path d="M0 -78 C22 -66 34 -20 18 18" stroke="#246b3c" strokeWidth="1.6" />
      <path d="M0 -96 C-24 -80 -36 -24 -16 16" stroke="#1e5a34" strokeWidth="1.5" />
      <path d="M-1 -110 C14 -100 28 -60 12 -8" stroke="#3d8f56" strokeWidth="1.35" />
      <path d="M1 -60 C-10 -40 -8 8 0 16" stroke="#145233" strokeWidth="1.2" />
      <path d="M0 -88 C8 -70 16 -40 6 4" stroke="#2f7a48" strokeWidth="1.15" />
    </g>
  )
}

function Blossom({ x, y, fill = '#e7b3b8' }: { x: number; y: number; fill?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx="0" cy="-3.2" r="2.3" fill={fill} />
      <circle cx="3.1" cy="0.4" r="2.3" fill={fill} />
      <circle cx="-3.1" cy="0.4" r="2.3" fill={fill} />
      <circle cx="0" cy="3.4" r="2.3" fill={fill} />
      <circle r="1.35" fill="#e8c56b" />
    </g>
  )
}

function Rocks({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 18 C4 6 18 2 24 14 C30 4 46 8 40 20 Z" fill="#8a7d6b" stroke="#3e3428" strokeWidth="1" />
      <path d="M8 16 C14 8 28 8 32 16" fill="#d9c7a2" />
      <path d="M6 12 H16 M24 11 H34" stroke="#5c5146" strokeWidth="0.9" />
    </g>
  )
}

function ArchBridge({ x, y }: { x: number; y: number }) {
  const w = 86
  return (
    <g>
      <path
        d={`M${x} ${y} Q${x + w / 2} ${y - 38} ${x + w} ${y} L${x + w - 2} ${y + 12} Q${x + w / 2} ${y - 18} ${x + 2} ${y + 12} Z`}
        fill="#d9c7a2"
        stroke="#5c4e3c"
        strokeWidth="1.3"
      />
      <path
        d={`M${x + 12} ${y + 4} Q${x + w / 2} ${y - 20} ${x + w - 12} ${y + 4}`}
        fill="#7ea4b8"
        opacity="0.35"
      />
      {Array.from({ length: 7 }, (_, i) => {
        const px = x + 8 + i * 12
        const lift = Math.sin(((i + 0.5) / 7) * Math.PI) * 20
        return (
          <path key={i} d={`M${px} ${y - lift} v-12`} stroke="#4e4638" strokeWidth="1.7" strokeLinecap="round" />
        )
      })}
      <path
        d={`M${x + 2} ${y - 6} Q${x + w / 2} ${y - 46} ${x + w - 2} ${y - 6}`}
        fill="none"
        stroke="#4e4638"
        strokeWidth="1.6"
      />
    </g>
  )
}

const GATE_PINES: Array<[number, number, number]> = [
  [18, 560, 0.85],
  [36, 600, 1.15],
  [54, 530, 0.7],
  [72, 640, 1],
  [96, 580, 0.8],
  [20, 720, 0.95],
  [44, 760, 1.2],
  [148, 500, 0.62],
  [332, 540, 0.78],
  [350, 590, 1.05],
  [368, 520, 0.7],
  [386, 610, 0.88],
  [340, 680, 0.75],
  [372, 720, 0.95],
]

const MARKET_PINES: Array<[number, number, number]> = [
  [16, 1280, 0.7],
  [36, 1340, 0.85],
  [360, 1240, 0.65],
  [382, 1300, 0.8],
]

const BAMBOO_A: Array<[number, number, number]> = [
  [24, 1980, 0.92],
  [52, 1960, 1.05],
  [88, 1990, 0.8],
  [24, 2080, 1],
  [46, 2140, 0.86],
  [64, 2060, 1.08],
  [84, 2160, 0.78],
  [104, 2090, 0.94],
  [28, 2240, 0.9],
  [52, 2280, 1.12],
  [78, 2220, 0.84],
  [108, 2260, 0.96],
  [130, 2180, 0.72],
]

const BAMBOO_B: Array<[number, number, number]> = [
  [36, 2120, 0.92],
  [70, 2200, 1.05],
  [96, 2130, 0.8],
  [18, 2300, 0.88],
  [60, 2320, 1],
  [92, 2290, 0.76],
  [124, 2240, 0.9],
  [344, 2140, 0.7],
  [366, 2200, 0.82],
  [384, 2160, 0.66],
]

/**
 * Original practice atlas. Each band is its own wuxia country:
 * stone gate, night market, bamboo wilds, cloud terrace.
 * Unfinished bands stay ink-grey. Cleared lessons bring the color back.
 * The viewBox matches the scroll aspect, so zoom stays a sharp vector.
 */
export const WuxiaJourneyArt = memo(function WuxiaJourneyArt({
  progress,
  mastery,
  band = 'place',
}: {
  progress: PracticePartnerPathState
  mastery: number
  /** place stays with the stops. grove and air slide on their own. */
  band?: 'place' | 'grove' | 'air'
}) {
  const reveal: Reveals = {
    common: practicePartnerChapterReveal(progress, 'common'),
    foods: practicePartnerChapterReveal(progress, 'foods'),
    animals: practicePartnerChapterReveal(progress, 'animals'),
    expert: practicePartnerChapterReveal(progress, 'expert'),
  }
  const gild = mastery / 31

  return (
    <svg className="partner-wuxia" viewBox={VB} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="inkRoller" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6a3a1c" />
          <stop offset="0.45" stopColor="#d4a06a" />
          <stop offset="1" stopColor="#4a2814" />
        </linearGradient>
        <linearGradient id="inkVeil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e7dcc4" stopOpacity="0.02" />
          <stop offset="0.45" stopColor="#d5cbb6" stopOpacity="0.55" />
          <stop offset="1" stopColor="#e7dcc4" stopOpacity="0.04" />
        </linearGradient>
        <radialGradient id="inkWarm" cx="0.5" cy="0.5" r="0.72">
          <stop offset="0" stopColor="#f3e2c4" stopOpacity="0" />
          <stop offset="0.72" stopColor="#f3e2c4" stopOpacity="0" />
          <stop offset="1" stopColor="#c4a574" stopOpacity="0.28" />
        </radialGradient>
        <symbol id="inkPine" viewBox="0 0 32 58">
          <path d="M14.5 56 C15 44 17 42 16.2 58 H13.2 Z" fill="#5a4030" />
          <path d="M16 3 L27 22 L22 22 L30 35 L20 35 L26 50 L6 50 L12 35 L2 35 L10 22 L5 22 Z" fill="#1b5230" stroke="#102e1c" strokeWidth="0.8" />
          <path d="M16 10 L24 24 L8 24 Z" fill="#246b3c" />
          <path d="M16 20 L26 38 L6 38 Z" fill="#2f7a48" />
          <path d="M16 32 L22 48 L10 48 Z" fill="#3d8f56" />
          <path d="M8 26 L3 18 M24 26 L29 18 M7 40 L3 34 M25 40 L29 34 M11 50 L7 56 M21 50 L25 56" stroke="#143c22" strokeWidth="1" fill="none" />
        </symbol>
        <symbol id="inkBamboo" viewBox="0 0 36 100">
          <path d="M14 98 L12 6" stroke="#145233" strokeWidth="5" strokeLinecap="round" />
          <path d="M22 94 L24 16" stroke="#1a5c38" strokeWidth="3.4" strokeLinecap="round" />
          <path d="M8 78 H20 M9 58 H19 M10 38 H18 M11 18 H17" stroke="#0c3020" strokeWidth="1.5" />
          <path d="M14 28 C28 12 42 20 36 36 C24 30 16 32 14 28Z" fill="#2f8a52" />
          <path d="M13 46 C0 30 -10 40 -4 56 C8 50 12 50 13 46Z" fill="#1f6b42" />
          <path d="M23 38 C36 24 48 34 40 50 C28 44 22 44 23 38Z" fill="#3dba74" />
          <path d="M12 14 C24 0 36 8 30 22 C18 14 12 16 12 14Z" fill="#3d8f56" />
          <path d="M22 64 C34 52 44 62 36 74 C26 66 22 68 22 64Z" fill="#246b3c" />
        </symbol>
        <symbol id="inkTuft" viewBox="0 0 18 14">
          <path d="M2 14 C2 6 5 2 3 0 M9 14 C9 4 7 1 9 0 M15 14 C14 6 17 2 16 0" fill="none" stroke="#2f6b3a" strokeWidth="1.3" strokeLinecap="round" />
        </symbol>
        <symbol id="inkRipple" viewBox="0 0 28 10">
          <path d="M1 7 Q8 1 14 7 Q20 1 27 7" fill="none" stroke="#f7f3ea" strokeWidth="1.3" />
        </symbol>
      </defs>

      {band === 'place' ? (
      <>
      <rect x="16" y="40" width="368" height="3120" fill="url(#inkWarm)" />
      <rect x="16" y="40" width="368" height="3120" fill="none" stroke="#c4a574" strokeWidth="2" />
      <rect x="22" y="46" width="356" height="3108" fill="none" stroke="#6b5a40" strokeWidth="0.9" opacity="0.55" />

      <Chapter reveal={reveal.common} y={430} height={550}>
        <path
          d="M-20 540 C70 400 150 370 220 470 C280 390 340 420 430 500 L430 640 L-20 660 Z"
          fill="#4a1828"
          opacity="0.4"
        />
        <path
          d="M-10 620 C40 470 100 420 170 510 C210 450 260 440 320 520 C360 460 400 490 420 550 L420 700 L-10 710 Z"
          fill="#2a1018"
          stroke="#14080c"
          strokeWidth="1.4"
        />
        <path
          d="M-10 700 C50 560 120 520 180 600 C230 540 280 550 340 620 C380 560 410 590 420 640 L420 780 L-10 790 Z"
          fill="#14080e"
          stroke="#2a1014"
          strokeWidth="1.4"
        />
        <path d="M50 360 C100 310 140 330 180 290" fill="none" stroke="#2c4030" strokeWidth="1.3" opacity="0.7" />
        <path d="M200 340 C250 280 290 310 350 270" fill="none" stroke="#243628" strokeWidth="1.2" opacity="0.6" />
        <path d="M40 480 C110 430 160 450 220 400" fill="none" stroke="#1e3224" strokeWidth="1.15" opacity="0.45" />
        <Hatch x={48} y={400} n={7} />
        <Hatch x={220} y={360} n={6} />
        <path
          d="M-10 900 L-10 640 C30 580 90 560 150 630 C200 570 260 590 330 640 C370 590 400 610 420 660 L420 900 Z"
          fill="#1a0c10"
          stroke="#3a1820"
          strokeWidth="1.2"
        />
        <path
          d="M-10 900 L-10 760 C40 700 110 730 180 800 C250 740 320 760 420 700 L420 900 Z"
          fill="#4a1020"
          opacity="0.55"
        />
        <path
          d="M40 560 C90 500 140 520 190 470 C230 510 270 490 320 540 L300 620 C220 590 120 630 50 600 Z"
          fill="#a05060"
          opacity="0.55"
        />
        <Crest
          d="M-10 620 C40 470 100 420 170 510 C210 450 260 440 320 520"
          ink="#2a1014"
          light="#f3e2c4"
        />
        <Cun x={48} y={560} rows={4} cols={6} ink="#f3e2c4" opacity={0.4} />
        <Cun x={230} y={520} rows={3} cols={5} ink="#f3e2c4" opacity={0.32} />
        <g className="wuxia-sway is-soft">
          <path d="M36 468 Q100 450 168 472" fill="none" stroke="#5c4030" strokeWidth="1.2" />
          <Lantern x={48} y={478} s={0.95} hue="#e1062a" />
          <Lantern x={78} y={470} s={1.05} hue="#ff2a3a" />
          <Lantern x={108} y={466} hue="#c41e3a" />
          <Lantern x={138} y={474} s={0.9} hue="#9b1230" />
          <Lantern x={164} y={482} s={0.85} hue="#e1062a" />
        </g>
        <TileRoof x={34} y={500} w={150} h={52} fill="#8b1e2d" />
        <Pillar x={62} y={575} h={108} />
        <Pillar x={126} y={575} h={108} />
        <path d="M58 612 H146 V668 Q102 628 58 668 Z" fill="#1a120c" opacity="0.72" />
        <g transform="translate(102 624)" className="wuxia-veil">
          <path d="M0 10 C-8 28 -6 52 0 58 C6 52 8 28 0 10 Z" fill="#4a0814" />
          <path d="M-14 2 Q0 -16 14 2 Q10 36 0 48 Q-10 36 -14 2 Z" fill="#8b1e2d" opacity="0.9" />
          <path d="M-16 0 Q0 22 16 0" fill="none" stroke="#e1062a" strokeWidth="1.3" opacity="0.75" />
        </g>
        <path d="M70 650 Q102 612 134 650" fill="none" stroke="#e8c56b" strokeWidth="1.2" />
        <rect x="86" y="548" width="46" height="18" rx="1" fill="#6b1a24" stroke="#e8c56b" strokeWidth="0.8" />
        <text x="109" y="561" textAnchor="middle" fill="#f7f1df" fontSize="11" fontFamily="Noto Sans HK, Noto Sans TC, sans-serif">
          山門
        </text>
        {Array.from({ length: 7 }, (_, i) => {
          const inset = i * 4
          const sy = 690 + i * 16
          return (
            <path
              key={i}
              d={`M${52 + inset} ${sy} H${164 - inset} L${158 - inset} ${sy + 11} H${58 + inset} Z`}
              fill={i % 2 ? '#e7dcc4' : '#d2c09a'}
              stroke="#6b5a40"
              strokeWidth="0.8"
            />
          )
        })}
        <Rocks x={18} y={800} />
        <Rocks x={150} y={830} />
        <use href="#inkTuft" x={188} y={760} width="18" height="14" />
        <use href="#inkTuft" x={250} y={700} width="16" height="12" />
        <use href="#inkTuft" x={300} y={820} width="18" height="14" />
        <path
          d="M86 800 C80 860 92 920 84 980"
          fill="none"
          stroke="#9ec4d4"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M86 800 C80 860 92 920 84 980"
          fill="none"
          stroke="#f7f3ea"
          strokeWidth="2.4"
          className="wuxia-river"
        />
        <Lantern x={70} y={760} s={0.7} />
        <Lantern x={118} y={790} s={0.66} hue="#1d3d6e" />
      </Chapter>

      <Chapter reveal={reveal.foods} y={1220} height={480}>
        <path
          d="M-10 1680 L-10 1280 C50 1200 110 1188 170 1260 C220 1190 280 1200 340 1280 C380 1220 410 1240 420 1300 L420 1680 Z"
          fill="#16110e"
          stroke="#3a2a1c"
          strokeWidth="1.2"
        />
        <path
          d="M-10 1680 L-10 1460 C60 1400 120 1480 190 1420 C260 1360 320 1440 420 1380 L420 1680 Z"
          fill="#3a2412"
          opacity="0.55"
        />
        <path
          d="M30 1320 C90 1240 160 1260 220 1320 C270 1260 330 1280 400 1360 L380 1440 C280 1400 160 1460 50 1400 Z"
          fill="#a07848"
          opacity="0.5"
        />
        <Crest
          d="M-10 1280 C50 1200 110 1188 170 1260 C220 1190 280 1200 340 1280"
          ink="#2a1c12"
          light="#f3e2c4"
        />
        <Cun x={40} y={1320} rows={4} cols={6} ink="#f3e2c4" opacity={0.38} />
        <Cun x={240} y={1360} rows={3} cols={5} ink="#f3e2c4" opacity={0.3} />
        <path
          d="M-16 1505 C70 1460 130 1540 210 1488 C280 1440 340 1510 420 1468 L420 1565 C330 1605 250 1520 170 1588 C90 1640 20 1560 -16 1600 Z"
          fill="#6e9aaf"
          stroke="#3d6274"
          strokeWidth="1.2"
        />
        <path
          d="M-10 1524 C80 1488 140 1548 220 1504 C290 1468 350 1520 420 1484"
          fill="none"
          stroke="#d5ebf2"
          strokeWidth="3"
          className="wuxia-river"
        />
        <use href="#inkRipple" x={40} y={1536} width="28" height="10" />
        <use href="#inkRipple" x={150} y={1508} width="26" height="9" />
        <use href="#inkRipple" x={260} y={1544} width="30" height="10" />
        <use href="#inkRipple" x={330} y={1496} width="24" height="8" />
        <g transform="translate(250 1546)">
          <path d="M-18 2 Q0 12 20 2 L15 7 Q0 16 -14 7 Z" fill="#6b5344" stroke="#3e3428" strokeWidth="0.7" />
          <path d="M2 2 V-18" stroke="#5c4030" strokeWidth="1.3" />
          <path d="M2 -16 L16 -4" stroke="#f4ead4" strokeWidth="1.2" />
        </g>
        <ArchBridge x={124} y={1492} />
        <TileRoof x={236} y={1160} w={120} h={40} fill="#1d3d6e" />
        <path d="M258 1224 H338 V1288 H258 Z" fill="#f4ead4" stroke="#5c4a32" strokeWidth="1" />
        <path d="M268 1236 H292 V1264 H268 Z" fill="#1a120c" opacity="0.35" />
        <path d="M280 1236 V1264 M268 1250 H292" stroke="#e8c56b" strokeWidth="0.8" />
        <path d="M306 1236 H328 V1264 H306 Z" fill="#1a120c" opacity="0.35" />
        <path d="M317 1236 V1264 M306 1250 H328" stroke="#e8c56b" strokeWidth="0.8" />
        <Stall x={248} y={1268} awning="#8b1e2d" sign="茶" />
        <Stall x={318} y={1244} awning="#1d3d6e" sign="麵" />
        <Stall x={20} y={1220} awning="#a12838" />
        <g className="wuxia-sway is-soft">
          <path d="M230 1188 Q300 1168 380 1196" fill="none" stroke="#5c4030" strokeWidth="1.15" />
          <Lantern x={248} y={1198} s={0.8} />
          <Lantern x={286} y={1186} s={0.95} hue="#e8c56b" />
          <Lantern x={324} y={1192} s={0.85} />
          <Lantern x={360} y={1204} s={0.75} hue="#a12838" />
        </g>
        <Rocks x={200} y={1580} />
        <use href="#inkTuft" x={96} y={1360} width="16" height="12" />
        <use href="#inkTuft" x={210} y={1320} width="16" height="12" />
        <path
          d="M-10 1640 C70 1700 140 1660 210 1740 C280 1800 340 1740 420 1820 L420 1680 L-10 1680 Z"
          fill="#2a1c12"
          stroke="#4a3018"
          strokeWidth="1"
        />
        <Rocks x={160} y={1720} />
        <use href="#inkTuft" x={120} y={1660} width="16" height="12" />
        <use href="#inkTuft" x={230} y={1704} width="16" height="12" />
      </Chapter>

      <Chapter reveal={reveal.animals} y={2020} height={460}>
        <path
          d="M-10 2460 L-10 2080 C50 2000 120 1988 180 2080 C230 2010 290 2020 350 2100 C380 2040 410 2070 420 2120 L420 2460 Z"
          fill="#f3e2c4"
          stroke="#6a8a48"
          strokeWidth="1.3"
        />
        <path
          d="M-10 2140 C80 2060 160 2120 240 2060 C320 2000 380 2080 430 2020 L430 2200 C340 2260 240 2160 140 2240 C60 2300 -10 2220 -10 2140 Z"
          fill="#ffe08a"
          opacity="0.35"
        />
        <path
          d="M-10 2460 L-10 2140 C50 2060 120 2120 190 2060 C250 2000 320 2080 420 2020 L420 2460 Z"
          fill="#5f9a62"
          opacity="0.38"
        />
        <Crest
          d="M-10 2080 C50 2000 120 1988 180 2080 C230 2010 290 2020 350 2100"
          ink="#3d6840"
          light="#f3e2c4"
        />
        <Cun x={36} y={2140} rows={4} cols={5} ink="#2f6b3a" opacity={0.28} gapY={18} />
        <Cun x={250} y={2180} rows={3} cols={4} ink="#3d6840" opacity={0.22} />
        <path
          d="M8 2040 C40 2100 30 2180 70 2240 C110 2300 90 2360 130 2420"
          fill="none"
          stroke="#7ea4b8"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d="M8 2040 C40 2100 30 2180 70 2240 C110 2300 90 2360 130 2420"
          fill="none"
          stroke="#e7f4f8"
          strokeWidth="2.2"
          className="wuxia-river"
        />
        <use href="#inkRipple" x={24} y={2120} width="22" height="8" />
        <use href="#inkRipple" x={48} y={2248} width="22" height="8" />
        <use href="#inkRipple" x={78} y={2340} width="22" height="8" />
        <g transform="translate(40 2288)">
          <TileRoof x={0} y={0} w={52} h={22} fill="#6b3a2a" />
          <Pillar x={8} y={28} h={36} />
          <Pillar x={30} y={28} h={36} />
          <path d="M4 66 H50 L54 74 H0 Z" fill="#8a7d6b" stroke="#4e4638" strokeWidth="0.7" />
          <path
            d="M26 20 C24 6 32 2 28 -8"
            fill="none"
            stroke="#f7f3ea"
            strokeWidth="1.4"
            className="wuxia-steam"
          />
        </g>
        <Rocks x={150} y={2360} />
        <use href="#inkTuft" x={168} y={2300} width="16" height="12" />
        <use href="#inkTuft" x={210} y={2140} width="16" height="12" />
        <circle cx="70" cy="2088" r="1.3" fill="#e8c56b" className="wuxia-lantern" />
        <circle cx="140" cy="2204" r="1.1" fill="#f0e2b8" className="wuxia-lantern" />
        <circle cx="48" cy="2210" r="1.2" fill="#e8c56b" className="wuxia-lantern" />
      </Chapter>

      <Chapter reveal={reveal.expert} y={2720} height={440}>
        <path
          d="M200 3120 L210 2860 C230 2760 260 2700 300 2760 C340 2680 380 2720 420 2800 L420 3160 L200 3160 Z"
          fill="#d9cbb0"
          stroke="#5c5144"
          strokeWidth="1.4"
        />
        <path
          d="M230 2840 C270 2780 320 2760 370 2820 L350 2900 C300 2860 250 2900 220 2860 Z"
          fill="#fff6d4"
          opacity="0.45"
        />
        <Crest
          d="M210 2860 C230 2760 260 2700 300 2760 C340 2680 380 2720 420 2800"
          ink="#8a7358"
          light="#fff6d4"
        />
        <Cun x={240} y={2860} rows={4} cols={5} ink="#6e6254" opacity={0.3} />
        <path d="M230 2920 C280 2890 330 2940 400 2890" fill="none" stroke="#6e6254" strokeWidth="1.35" />
        <path d="M220 3000 C280 2970 340 3020 410 2975" fill="none" stroke="#5c5144" strokeWidth="1.2" />
        <path d="M236 2820 C290 2790 340 2830 390 2788" fill="none" stroke="#7a6e60" strokeWidth="1.1" opacity="0.8" />
        <Hatch x={250} y={2860} n={5} step={18} />
        <path
          d="M-10 3140 L-10 2860 C50 2760 130 2740 200 2840 C250 2760 310 2780 420 2860 L420 3140 Z"
          fill="#f3e2c4"
          stroke="#5c6848"
          strokeWidth="1.2"
        />
        <g fill="#f7f1e4" stroke="#8a7b68" strokeWidth="1.15">
          <path d="M20 2920 C20 2896 48 2884 70 2898 C80 2876 112 2878 118 2904 C140 2892 156 2914 140 2932 C156 2944 146 2968 122 2964 C118 2986 84 2990 74 2970 C48 2982 24 2964 34 2942 C16 2934 14 2908 20 2920Z" />
          <path d="M120 3040 C120 3020 146 3010 166 3022 C176 3004 206 3006 210 3028 C230 3018 244 3036 230 3052 C244 3062 236 3082 214 3078 C210 3096 180 3100 172 3084 C148 3094 126 3078 136 3060 C120 3052 118 3030 120 3040Z" />
          <path d="M250 3088 C250 3070 274 3060 294 3072 C304 3056 332 3058 336 3078 C354 3068 366 3084 354 3098 C366 3108 358 3126 338 3122 C334 3138 306 3142 298 3128 C276 3136 256 3122 266 3106 C250 3098 248 3078 250 3088Z" />
        </g>
        <TileRoof x={248} y={2688} w={124} h={44} fill="#8b1e2d" />
        <TileRoof x={264} y={2752} w={92} h={30} fill="#a12838" />
        <Pillar x={276} y={2796} h={70} />
        <Pillar x={336} y={2796} h={70} />
        <path d="M268 2848 H356" stroke="#5c4e3c" strokeWidth="1.6" />
        <path d="M274 2848 V2868 M310 2848 V2868 M346 2848 V2868" stroke="#5c4e3c" strokeWidth="1.2" />
        <rect x="292" y="2810" width="18" height="24" fill="#1a120c" opacity="0.4" />
        <path d="M301 2810 V2834 M292 2822 H310" stroke="#e8c56b" strokeWidth="0.8" />
        <rect x="286" y="2724" width="40" height="14" fill="#6b1a24" stroke="#e8c56b" strokeWidth="0.7" />
        <text x="306" y="2735" textAnchor="middle" fill="#f7f1df" fontSize="9" fontFamily="Noto Sans HK, Noto Sans TC, sans-serif">
          雲臺
        </text>
        <Lantern x={270} y={2770} s={0.7} />
        <Lantern x={352} y={2770} s={0.7} hue="#e8c56b" />
        {Array.from({ length: 8 }, (_, i) => {
          const inset = i * 3
          const sy = 2920 + i * 14
          return (
            <path
              key={i}
              d={`M${300 + inset} ${sy} H${392 - inset} L${386 - inset} ${sy + 10} H${306 + inset} Z`}
              fill={i % 2 ? '#e7dcc4' : '#cfc3a4'}
              stroke="#6b5a40"
              strokeWidth="0.75"
            />
          )
        })}
        <g
          opacity={0.18 + gild * 0.82}
          className={gild > 0.02 ? 'wuxia-gild' : undefined}
          style={{ filter: gild > 0.02 ? undefined : 'grayscale(1)' }}
        >
          {Array.from({ length: 8 }, (_, i) => {
            const inset = i * 3
            const sy = 2920 + i * 14
            return (
              <path
                key={i}
                d={`M${300 + inset} ${sy} H${392 - inset} L${386 - inset} ${sy + 10} H${306 + inset} Z`}
                fill={i % 2 ? '#f0e2b8' : '#e8c56b'}
              />
            )
          })}
        </g>
      </Chapter>

      <rect x="18" y="14" width="364" height="22" rx="11" fill="url(#inkRoller)" />
      <rect x="18" y="3164" width="364" height="22" rx="11" fill="url(#inkRoller)" />
      <circle cx="28" cy="25" r="9" fill="#4a2814" />
      <circle cx="372" cy="25" r="9" fill="#4a2814" />
      <circle cx="28" cy="3175" r="9" fill="#4a2814" />
      <circle cx="372" cy="3175" r="9" fill="#4a2814" />

      <g>
        <rect x="146" y="58" width="108" height="40" rx="2" fill="#f7edd6" stroke="#6b5a40" strokeWidth="1.2" />
        <path d="M152 64 H248 M152 92 H248" stroke="#c4a574" strokeWidth="0.7" />
        <text x="200" y="78" textAnchor="middle" fill="#3a2418" fontSize="14" fontFamily="Noto Sans HK, Noto Sans TC, sans-serif">
          墨途
        </text>
        <text x="200" y="90" textAnchor="middle" fill="#6b5a40" fontSize="6.5" letterSpacing="1.6" fontFamily="sans-serif">
          THE INK ROAD
        </text>
      </g>
      </>
      ) : null}
      {band === 'grove' ? (
        <>
          <Chapter reveal={reveal.common} y={430} height={550} veil={false}>
            <g className="wuxia-sway" style={{ filter: 'brightness(0.45) saturate(0.55)' }}>
              <Pines points={GATE_PINES} />
            </g>
          </Chapter>
          <Chapter reveal={reveal.foods} y={1220} height={480} veil={false}>
            <g className="wuxia-sway is-soft">
              <Pines points={MARKET_PINES} />
              <Willow x={28} y={1360} s={0.85} />
              <Willow x={372} y={1320} s={0.72} />
              <Pines
                points={[
                  [24, 1760, 0.72],
                  [48, 1820, 0.84],
                  [352, 1750, 0.66],
                  [374, 1810, 0.78],
                ]}
              />
              <Willow x={300} y={1780} s={0.55} />
            </g>
          </Chapter>
          <Chapter reveal={reveal.animals} y={2020} height={460} veil={false}>
            <Grove points={BAMBOO_A} className="wuxia-sway" />
            <Grove points={BAMBOO_B} className="wuxia-sway is-alt" />
          </Chapter>
          <Chapter reveal={reveal.expert} y={2720} height={440} veil={false}>
            <g className="wuxia-sway is-soft">
              <Pines
                points={[
                  [236, 2780, 0.55],
                  [252, 2810, 0.48],
                  [360, 2760, 0.5],
                  [18, 2860, 0.6],
                  [40, 2920, 0.5],
                ]}
              />
            </g>
          </Chapter>
        </>
      ) : null}
      {band === 'air' ? (
        <>
          <Chapter reveal={reveal.common} y={430} height={550} veil={false}>
            <MistBank cx={200} cy={860} rx={160} ry={22} fill="#f3e2c4" slow strength={0.85} />
            <g className="wuxia-veil" fill="#9b1c38">
              <path d="M48 520 C70 560 40 640 62 700 C48 640 78 580 58 520 Z" opacity="0.42" />
              <path d="M150 530 C176 580 148 660 172 720 C156 650 184 590 162 530 Z" opacity="0.36" />
            </g>
            <g className="wuxia-bob">
              <Blossom x={28} y={690} />
              <Blossom x={176} y={640} fill="#f3c6d0" />
              <Blossom x={360} y={650} />
            </g>
          </Chapter>
          <Chapter reveal={reveal.foods} y={1220} height={480} veil={false}>
            <MistBank cx={180} cy={1588} rx={170} ry={20} fill="#f3e2c4" strength={0.7} />
            <g transform="translate(300 1510)">
              <g className="wuxia-koi">
                <ellipse cx="0" cy="0" rx="7" ry="3.2" fill="#e07a3d" />
                <path d="M7 0 L13 -3 L13 3 Z" fill="#c4513a" />
                <circle cx="-3" cy="-0.6" r="0.7" fill="#1a120c" />
              </g>
            </g>
            <Blossom x={200} y={1360} />
            <Blossom x={40} y={1400} fill="#f3c6d0" />
          </Chapter>
          <Chapter reveal={reveal.animals} y={2020} height={460} veil={false}>
            <MistBank cx={80} cy={2160} rx={70} ry={16} fill="#f7f1df" strength={0.9} />
            <MistBank cx={120} cy={2300} rx={60} ry={12} fill="#f3e2c4" slow strength={0.8} />
            <g transform="translate(96 2140)">
              <g className="wuxia-bird">
                <ellipse cx="0" cy="4" rx="18" ry="6" fill="#f7f3ea" stroke="#5c4e3c" strokeWidth="0.7" />
                <path d="M12 2 C22 -14 28 -26 24 -36" fill="none" stroke="#f7f3ea" strokeWidth="2.4" />
                <circle cx="24" cy="-38" r="3.4" fill="#f7f3ea" stroke="#5c4e3c" strokeWidth="0.6" />
                <path d="M26 -37 L33 -35.5" stroke="#c4513a" strokeWidth="1.2" />
                <path d="M20 -40 L16 -48 L23 -39" fill="#f7f3ea" stroke="#5c4e3c" strokeWidth="0.5" />
                <path d="M-2 0 C2 -16 16 -18 18 -6 C8 -8 2 -4 -2 0Z" fill="#efe6d4" stroke="#5c4e3c" strokeWidth="0.55" className="wuxia-wing" />
                <path d="M-16 4 C-32 0 -42 -12 -38 -20" fill="none" stroke="#f7f3ea" strokeWidth="1.7" />
                <path d="M-14 7 C-30 10 -40 2 -36 -8" fill="none" stroke="#e7e0d4" strokeWidth="1.2" />
                <path d="M-2 10 L0 22 M6 10 L9 22" stroke="#c4513a" strokeWidth="0.9" />
              </g>
            </g>
            <Blossom x={160} y={2080} fill="#f7f1df" />
          </Chapter>
          <Chapter reveal={reveal.expert} y={2720} height={440} veil={false}>
            <MistBank cx={80} cy={2860} rx={54} ry={14} fill="#fbf6ea" strength={0.85} />
            <MistBank cx={160} cy={3004} rx={48} ry={12} fill="#f3e2c4" slow strength={0.8} />
            <MistBank cx={300} cy={2948} rx={60} ry={14} fill="#fff6d4" strength={0.75} />
          </Chapter>
        </>
      ) : null}
    </svg>
  )
})
