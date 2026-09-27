import { memo } from 'react'
import { PARTNER_MAP_VIEWBOX } from '../lib/practicePartnerMapLayout'

const VB = `0 0 ${PARTNER_MAP_VIEWBOX.w} ${PARTNER_MAP_VIEWBOX.h}`

function Range({ d, fill, ink }: { d: string; fill: string; ink: string }) {
  return (
    <g>
      <path d={d} fill={fill} />
      <path d={d} fill="none" stroke={ink} strokeWidth="1.5" strokeLinejoin="round" />
    </g>
  )
}

function Pagoda({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="#5a6a60" stroke="#24302c" strokeWidth="1">
      <path d="M-18 10 L0 -6 L18 10 Z" />
      <path d="M-13 18 L0 6 L13 18 Z" />
      <path d="M-8 26 L0 16 L8 26 Z" />
      <rect x="-2.2" y="10" width="4.4" height="18" fill="#3e4c46" stroke="none" />
    </g>
  )
}

function FarBird({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="wuxia-bird">
        <path d="M0 0 L8 -3.2 L0 -1.1 L-8 -3.2 Z" fill="#3e4c46" />
      </g>
    </g>
  )
}

/** Distant ink ridges. Same coordinate space as the scroll, translated more slowly. */
export const WuxiaFarPeaks = memo(function WuxiaFarPeaks() {
  return (
    <svg className="partner-wuxia" viewBox={VB} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="inkFarSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c5d5de" stopOpacity="0.62" />
          <stop offset="1" stopColor="#c5d5de" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect x="0" y="60" width="400" height="300" fill="url(#inkFarSky)" />
      <rect x="0" y="900" width="400" height="240" fill="url(#inkFarSky)" />
      <rect x="0" y="1660" width="400" height="260" fill="url(#inkFarSky)" />
      <rect x="0" y="2420" width="400" height="280" fill="url(#inkFarSky)" />

      <Range
        d="M-30 400 C20 250 70 150 140 230 C180 140 230 110 290 210 C340 130 380 170 430 250 L430 430 L-30 440 Z"
        fill="#b7c4b4"
        ink="#5c6b60"
      />
      <Range
        d="M-30 450 C30 320 90 250 160 330 C210 270 250 260 310 340 C360 280 400 310 430 380 L430 480 L-30 490 Z"
        fill="#8fa396"
        ink="#3e4e46"
      />
      <path d="M40 290 C90 250 130 260 170 230" fill="none" stroke="#3e4e46" strokeWidth="1.2" opacity="0.7" />
      <path d="M200 250 C250 200 290 230 340 190" fill="none" stroke="#3e4e46" strokeWidth="1.2" opacity="0.65" />
      <path d="M60 360 C120 320 160 340 210 300" fill="none" stroke="#2e3c36" strokeWidth="1" opacity="0.45" />
      <Pagoda x={292} y={188} s={1.15} />

      <Range
        d="M-20 1160 C40 1040 90 980 150 1060 C190 990 240 980 300 1070 C350 1000 390 1040 430 1100 L430 1220 L-20 1230 Z"
        fill="#a9b8ae"
        ink="#4e5e56"
      />
      <Range
        d="M-20 1210 C50 1120 120 1080 180 1160 C230 1100 280 1110 340 1180 C380 1130 410 1160 430 1200 L430 1280 L-20 1280 Z"
        fill="#7e948c"
        ink="#3a4a44"
      />
      <path d="M70 1100 C130 1060 170 1080 220 1040" fill="none" stroke="#3a4a44" strokeWidth="1.15" opacity="0.6" />

      <Range
        d="M-20 1960 C30 1820 90 1740 150 1840 C200 1720 260 1700 320 1820 C360 1740 400 1780 430 1860 L430 2020 L-20 2030 Z"
        fill="#9aaf9e"
        ink="#3e5248"
      />
      <Range
        d="M-20 2020 C40 1900 110 1860 170 1960 C220 1880 270 1890 330 1980 C370 1920 410 1960 430 2000 L430 2080 L-20 2090 Z"
        fill="#6f8b78"
        ink="#2c4036"
      />
      <path d="M50 1880 C110 1820 160 1840 210 1780" fill="none" stroke="#2c4036" strokeWidth="1.15" opacity="0.55" />
      <Pagoda x={78} y={1760} s={0.9} />
      <g className="wuxia-moon">
        <circle cx="318" cy="1748" r="26" fill="#f7f1df" opacity="0.35" />
        <circle cx="318" cy="1748" r="16" fill="#fbf6ea" stroke="#d9cbb0" strokeWidth="1" />
        <circle cx="312" cy="1742" r="2.6" fill="#e7dcc4" />
      </g>

      <Range
        d="M-20 2720 C40 2560 100 2480 170 2580 C220 2480 270 2460 330 2580 C370 2500 400 2540 430 2620 L430 2780 L-20 2790 Z"
        fill="#c5d0c8"
        ink="#5c6e66"
      />
      <Range
        d="M-20 2780 C50 2660 120 2600 190 2700 C240 2620 290 2630 350 2720 C380 2660 410 2700 430 2740 L430 2840 L-20 2850 Z"
        fill="#8aa094"
        ink="#3e524c"
      />
      <path d="M80 2620 C140 2560 190 2580 250 2520" fill="none" stroke="#3e524c" strokeWidth="1.2" opacity="0.6" />
      <path d="M40 2700 C110 2660 170 2680 240 2630" fill="none" stroke="#2e403c" strokeWidth="1" opacity="0.4" />

      <FarBird x={120} y={180} />
      <FarBird x={250} y={1040} />
      <FarBird x={300} y={1760} />
      <FarBird x={150} y={2520} />
    </svg>
  )
})

function Motif({
  x,
  y,
  d,
  fill,
  variant,
}: {
  x: number
  y: number
  d: string
  fill: string
  variant: 'a' | 'b' | 'c'
}) {
  return (
    <g transform={`translate(${x} ${y})`} className={`wuxia-petal is-${variant}`}>
      <path d={d} fill={fill} />
    </g>
  )
}

const PETAL = 'M0 0 C5 -8 9 -3 7 3 C3 5 0 2 0 0Z'
const LEAF = 'M0 2 C6 -8 14 -6 12 2 C8 6 2 6 0 2Z'

/** Foreground mist and falling leaves. Moves a little faster than the scroll. */
export const WuxiaMistVeil = memo(function WuxiaMistVeil() {
  return (
    <svg className="partner-wuxia" viewBox={VB} preserveAspectRatio="none" aria-hidden="true">
      <g className="wuxia-mist-drift" fill="#f7f1df">
        <ellipse cx="90" cy="260" rx="110" ry="22" opacity="0.16" />
        <ellipse cx="280" cy="1120" rx="120" ry="20" opacity="0.14" />
        <ellipse cx="70" cy="1880" rx="100" ry="18" opacity="0.18" />
        <ellipse cx="300" cy="2680" rx="130" ry="24" opacity="0.2" />
      </g>
      <g className="wuxia-mist-drift is-slow" fill="#f4efe4">
        <ellipse cx="240" cy="520" rx="90" ry="16" opacity="0.12" />
        <ellipse cx="60" cy="1460" rx="80" ry="14" opacity="0.14" />
        <ellipse cx="250" cy="2140" rx="110" ry="18" opacity="0.16" />
        <ellipse cx="140" cy="3000" rx="120" ry="20" opacity="0.18" />
      </g>
      <Motif x={70} y={340} d={PETAL} fill="#e7b3b8" variant="a" />
      <Motif x={300} y={680} d={PETAL} fill="#f0d0c8" variant="b" />
      <Motif x={40} y={1280} d={PETAL} fill="#e7b3b8" variant="c" />
      <Motif x={340} y={1500} d={PETAL} fill="#f3c6b0" variant="a" />
      <Motif x={50} y={1960} d={LEAF} fill="#3d8f56" variant="b" />
      <Motif x={150} y={2200} d={LEAF} fill="#2f7a48" variant="c" />
      <Motif x={320} y={2360} d={LEAF} fill="#3dba74" variant="a" />
      <Motif x={180} y={2740} d={PETAL} fill="#f0e2b8" variant="b" />
      <Motif x={80} y={2920} d={PETAL} fill="#e8c56b" variant="c" />
      <Motif x={360} y={900} d={LEAF} fill="#c4a574" variant="a" />
    </svg>
  )
})
