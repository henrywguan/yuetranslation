import { memo, type ReactNode } from 'react'
import { PARTNER_MAP_VIEWBOX } from '../lib/practicePartnerMapLayout'
import { Crest, Cun, MistBank } from './wuxiaBrush'

const VB = `0 0 ${PARTNER_MAP_VIEWBOX.w} ${PARTNER_MAP_VIEWBOX.h}`

/** Weather stays in color. The architecture inside each chapter still wakes from ink. */
function Band({ children }: { children: ReactNode }) {
  return <g>{children}</g>
}

function GlowLantern({ x, y, s = 1, hue = '#e1062a' }: { x: number; y: number; s?: number; hue?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="wuxia-sway">
      <circle cy="1" r="16" fill={hue} opacity="0.22" className="wuxia-lantern" />
      <circle cy="1" r="8" fill="#ffd0c8" opacity="0.35" className="wuxia-lantern" />
      <path d="M0 -18 V-9" stroke="#3a2418" strokeWidth="1" />
      <path d="M-7 -9 H7" stroke="#e8c56b" strokeWidth="1.4" />
      <path d="M-6 -7 Q0 -13 6 -7 L5 8 Q0 13 -5 8 Z" fill={hue} stroke="#4a0610" strokeWidth="0.7" />
      <path d="M-3.2 -1 Q0 -5 3.2 -1 L2.6 5.4 Q0 8.2 -2.6 5.4 Z" fill="#ffb38a" className="wuxia-lantern" />
      <path d="M0 10 V17 M-2.4 13.2 H2.4" stroke={hue} strokeWidth="0.9" />
      </g>
    </g>
  )
}

function Xiangyun({ x, y, s = 1, fill, stroke }: { x: number; y: number; s?: number; fill: string; stroke: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="wuxia-mist-drift">
        <path
          d="M18 42C18 28 32 20 44 28C50 12 72 12 78 30C96 24 108 40 96 52C112 60 104 80 86 76C84 94 60 98 54 80C36 90 16 76 24 60C6 56 4 38 18 42Z"
          fill={fill}
          stroke={stroke}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      </g>
    </g>
  )
}

function SkyTemple({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-34 8 L0 -22 L34 8 Z" fill="#a12838" stroke="#e8c56b" strokeWidth="1.1" />
      <path d="M-26 20 L0 -2 L26 20 Z" fill="#8b1e2d" stroke="#f0d48a" strokeWidth="1" />
      <path d="M-16 32 L0 16 L16 32 Z" fill="#6b1a24" stroke="#e8c56b" strokeWidth="0.9" />
      <rect x="-3" y="18" width="6" height="16" fill="#f3e2c4" />
      <circle cx="0" cy="-24" r="2.2" fill="#fff6d0" className="wuxia-sun" />
    </g>
  )
}

/** Sun Wukong on a somersault cloud. The loop spends most of its time waiting offstage. */
function SunWukong() {
  return (
    <g transform="translate(20 2555)">
    <g className="wuxia-wukong">
      <g className="wuxia-wukong-cloud">
        <path
          d="M4 18C4 10 12 6 18 10C22 2 34 2 36 12C46 8 52 16 46 22C54 26 50 36 40 34C38 42 26 44 22 36C12 40 2 34 6 26C-2 24 -2 16 4 18Z"
          fill="#fff1b8"
          stroke="#e0b44a"
          strokeWidth="1.2"
        />
      </g>
      <path d="M8 14 L28 -16" stroke="#ffe38a" strokeWidth="2.1" strokeLinecap="round" />
      <circle cx="28" cy="-18" r="2.1" fill="#fff6d0" />
      <circle cx="16" cy="2" r="5.2" fill="#f0c14a" stroke="#a97820" strokeWidth="0.7" />
      <path d="M12 -1 Q16 -6 20 -1" fill="none" stroke="#a97820" strokeWidth="0.7" />
      <path d="M11 0 Q8 -4 12 -5" fill="#e7b43a" />
      <path d="M21 0 Q24 -4 20 -5" fill="#e7b43a" />
      <path d="M16 7 L16 16" stroke="#c9922a" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M16 10 L8 14 M16 10 L24 8" stroke="#e8c56b" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 16 L11 22 M16 16 L21 22" stroke="#a97820" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M14 6 C22 8 26 14 20 18" fill="none" stroke="#fff6d0" strokeWidth="1.3" className="wuxia-veil" />
    </g>
    </g>
  )
}

function Range({ d, fill }: { d: string; fill: string }) {
  return <path d={d} fill={fill} />
}

/**
 * Slowest ridges. Only the upper stretch stays in frame at rest zoom,
 * so that stretch warms from lantern-dark to terrace-gold as the road is traveled.
 */
export const WuxiaFarPeaks = memo(function WuxiaFarPeaks() {
  return (
    <svg className="partner-wuxia" viewBox={VB} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="inkFarWash" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14040a" />
          <stop offset="0.12" stopColor="#2a0812" />
          <stop offset="0.22" stopColor="#1a100c" />
          <stop offset="0.34" stopColor="#6a3e16" />
          <stop offset="0.5" stopColor="#e7c56a" />
          <stop offset="1" stopColor="#fff6d4" />
        </linearGradient>
      </defs>
      <rect x="-20" y="0" width="440" height="3200" fill="url(#inkFarWash)" />
      <Range
        d="M-40 360 C30 250 90 190 150 250 C200 180 250 200 310 260 C350 210 400 230 450 290 L450 430 L-40 450 Z"
        fill="#3a1420"
      />
      <path
        d="M20 340 C70 270 120 240 170 300 C215 255 265 270 320 320 L300 380 C220 350 120 390 40 360 Z"
        fill="#6a3040"
        opacity="0.55"
      />
      <Range
        d="M-30 420 C40 280 90 200 160 280 C210 200 260 180 320 270 C360 210 400 240 440 300 L440 520 L-30 540 Z"
        fill="#1a060c"
      />
      <path
        d="M20 390 C70 300 120 250 175 320 C220 270 270 255 325 320 C365 270 400 295 420 340 L400 430 C320 400 220 430 140 400 C70 420 30 410 20 390 Z"
        fill="#a04858"
        opacity="0.72"
      />
      <Crest
        d="M-20 410 C50 290 100 220 165 300 C215 230 265 210 325 290 C365 230 405 260 430 315"
        ink="#3a1820"
        light="#f3e2c4"
      />
      <Cun x={70} y={330} rows={4} cols={7} ink="#f3e2c4" opacity={0.42} />
      <MistBank cx={200} cy={500} rx={170} ry={22} fill="#f3e2c4" slow />
      <Range
        d="M-30 980 C50 860 120 820 190 920 C240 840 300 860 360 940 C400 880 430 910 440 960 L440 1100 L-30 1120 Z"
        fill="#120e14"
      />
      <path
        d="M10 960 C70 870 130 850 190 930 C240 860 300 880 355 950 L340 1020 C250 990 140 1030 60 990 Z"
        fill="#6a5878"
        opacity="0.7"
      />
      <Crest
        d="M-20 970 C60 860 130 830 190 910 C245 850 305 870 360 940"
        ink="#120e14"
        light="#f3e2c4"
      />
      <Cun x={80} y={900} rows={4} cols={6} ink="#f3e2c4" opacity={0.36} />
      <MistBank cx={210} cy={1080} rx={180} ry={20} fill="#e7dcc4" />
      <Range
        d="M-20 1680 C40 1540 110 1480 180 1580 C230 1500 290 1520 350 1620 C390 1540 420 1580 440 1640 L440 1760 L-20 1780 Z"
        fill="#8a6230"
      />
      <path
        d="M10 1660 C60 1560 120 1510 185 1590 C235 1520 295 1540 350 1630 L330 1700 C240 1670 120 1720 40 1680 Z"
        fill="#e7c56a"
        opacity="0.45"
      />
      <Crest
        d="M-10 1670 C50 1550 115 1490 180 1575 C230 1510 290 1530 350 1615"
        ink="#5c3a18"
        light="#fff1c2"
      />
      <Cun x={60} y={1580} rows={4} cols={7} ink="#5c3a18" opacity={0.32} />
      <MistBank cx={190} cy={1740} rx={160} ry={18} fill="#f3e2c4" slow />
      <Range
        d="M-20 2500 C50 2360 120 2300 190 2400 C240 2320 300 2340 360 2440 C400 2360 430 2400 440 2460 L440 2580 L-20 2600 Z"
        fill="#f0e2b0"
      />
      <path
        d="M15 2480 C70 2380 130 2330 195 2410 C245 2340 305 2360 360 2450 L340 2520 C250 2490 130 2540 40 2500 Z"
        fill="#fffaf0"
        opacity="0.7"
      />
      <Crest
        d="M-10 2490 C55 2370 125 2310 190 2395 C240 2330 300 2350 360 2435"
        ink="#8a7358"
        light="#fff6d4"
      />
      <Cun x={70} y={2400} rows={4} cols={6} ink="#8a7358" opacity={0.28} />
      <MistBank cx={200} cy={2560} rx={170} ry={20} fill="#fff6d4" />
    </svg>
  )
})

/** Section skies, locked close to the scroll so each weather stays with its chapter. */
export const WuxiaSectionSky = memo(function WuxiaSectionSky({
  sheet = 'wash',
}: {
  sheet?: 'wash' | 'hang'
}) {
  const wash = sheet === 'wash'
  const hang = sheet === 'hang'
  return (
    <svg className="partner-wuxia" viewBox={VB} preserveAspectRatio="none" aria-hidden="true">
      {wash ? <defs>
        <linearGradient id="skyGate" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#120208" />
          <stop offset="0.45" stopColor="#4a0c18" />
          <stop offset="0.78" stopColor="#1a060e" />
          <stop offset="1" stopColor="#1a060e" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="skyMarket" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0e0c12" stopOpacity="0" />
          <stop offset="0.18" stopColor="#141018" />
          <stop offset="0.55" stopColor="#1c140e" />
          <stop offset="0.82" stopColor="#3a2412" />
          <stop offset="1" stopColor="#3a2412" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="skyBamboo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c4893a" stopOpacity="0" />
          <stop offset="0.2" stopColor="#f0c86a" />
          <stop offset="0.48" stopColor="#fff1c2" />
          <stop offset="0.78" stopColor="#d7e7a4" />
          <stop offset="1" stopColor="#d7e7a4" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="skyTerrace" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff6d4" stopOpacity="0" />
          <stop offset="0.22" stopColor="#fff3c4" />
          <stop offset="0.62" stopColor="#fffaf0" />
          <stop offset="1" stopColor="#f3e2c4" />
        </linearGradient>
      </defs> : null}

      <Band>
        {wash ? <rect x="-20" y="0" width="440" height="1140" fill="url(#skyGate)" /> : null}
        {wash ? (
        <>
        <circle cx="300" cy="220" r="28" fill="#6e1020" opacity="0.45" className="wuxia-moon" />
        <circle cx="300" cy="220" r="16" fill="#a12838" opacity="0.35" />
        <Range
          d="M-20 560 C40 430 110 400 170 500 C220 430 280 450 340 520 C380 460 410 490 440 540 L440 700 L-20 720 Z"
          fill="#14060c"
        />
        <path
          d="M30 540 C80 460 140 450 190 510 C240 455 290 470 340 530 L320 600 C230 570 120 610 40 570 Z"
          fill="#8a3850"
          opacity="0.62"
        />
        <Crest
          d="M-10 550 C50 440 120 410 175 500 C225 440 285 460 345 520"
          ink="#14060c"
          light="#f3e2c4"
        />
        <Cun x={80} y={500} rows={3} cols={6} ink="#f3e2c4" opacity={0.4} />
        <MistBank cx={200} cy={680} rx={150} ry={18} fill="#f3e2c4" slow />
        </>
        ) : null}
        {hang ? (
        <g className="wuxia-sway is-soft">
          <path d="M16 180 H200" stroke="#2a1014" strokeWidth="1" />
          <GlowLantern x={36} y={196} s={0.7} />
          <GlowLantern x={78} y={188} s={0.85} />
          <GlowLantern x={124} y={180} />
          <GlowLantern x={168} y={192} s={0.75} hue="#9b1230" />
        </g>
        ) : null}
      </Band>

      <Band>
        {wash ? <rect x="-20" y="900" width="440" height="1100" fill="url(#skyMarket)" /> : null}
        {hang ? (
        <>
        <MistBank cx={80} cy={1180} rx={120} ry={26} fill="#cbb89a" />
        <MistBank cx={260} cy={1360} rx={150} ry={30} fill="#cbb89a" slow />
        <MistBank cx={140} cy={1580} rx={130} ry={24} fill="#d9cbb0" />
        <g className="wuxia-sway is-alt">
          <path d="M180 1080 H390" stroke="#3a2418" strokeWidth="1" />
          <GlowLantern x={200} y={1096} s={0.7} hue="#e8a04a" />
          <GlowLantern x={250} y={1088} s={0.8} />
          <GlowLantern x={310} y={1094} s={0.66} hue="#f0d48a" />
          <GlowLantern x={360} y={1102} s={0.72} hue="#a12838" />
        </g>
        </>
        ) : null}
      </Band>

      <Band>
        {wash ? <rect x="-20" y="1760" width="440" height="980" fill="url(#skyBamboo)" /> : null}
        {wash ? (
        <g className="wuxia-sun">
          <circle cx="210" cy="1960" r="46" fill="#fff8dc" opacity="0.9" />
          <circle cx="210" cy="1960" r="70" fill="#ffe08a" opacity="0.35" />
          {Array.from({ length: 8 }, (_, i) => (
            <path
              key={i}
              d={`M210 1960 L${40 + i * 48} 2240 L${70 + i * 48} 2240 Z`}
              fill="#fff1c2"
              opacity="0.28"
            />
          ))}
        </g>
        ) : null}
        {hang ? (
        <g fill="#145c32" opacity="0.55">
          <path d="M20 2140 L28 1980 L36 2140 Z" />
          <path d="M48 2160 L58 1960 L68 2160 Z" />
          <path d="M330 2120 L340 1970 L350 2120 Z" />
          <path d="M360 2150 L372 1940 L384 2150 Z" />
        </g>
        ) : null}
      </Band>

      <Band>
        {wash ? <rect x="-20" y="2500" width="440" height="700" fill="url(#skyTerrace)" /> : null}
        {hang ? (
        <>
        <Xiangyun x={30} y={2580} s={0.7} fill="#fffaf0" stroke="#e8c56b" />
        <Xiangyun x={240} y={2680} s={0.85} fill="#fff6d4" stroke="#e0b44a" />
        <Xiangyun x={120} y={2920} s={0.6} fill="#fffaf0" stroke="#e8c56b" />
        <SkyTemple x={300} y={2620} s={1.15} />
        </>
        ) : null}
      </Band>
    </svg>
  )
})

function Skewer({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 0 L22 -16" stroke="#c4a574" strokeWidth="1.2" />
      <circle cx="6" cy="-4" r="3.1" fill="#c4513a" />
      <circle cx="12" cy="-8" r="3.1" fill="#e8a04a" />
      <circle cx="18" cy="-12" r="3.1" fill="#8b1e2d" />
    </g>
  )
}

function Tanghulu({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 0 V-22" stroke="#5c4030" strokeWidth="1.1" />
      <circle cx="0" cy="-8" r="3.4" fill="#e1062a" />
      <circle cx="0" cy="-15" r="3.2" fill="#ff4a4a" />
      <circle cx="0" cy="-21" r="2.8" fill="#c41e3a" />
    </g>
  )
}

function Bowl({ x, y, fill }: { x: number; y: number; fill: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-8 0 H8 L6 7 H-6 Z" fill="#f4ead4" stroke="#5c4a32" strokeWidth="0.6" />
      <ellipse cx="0" cy="0" rx="7" ry="2.4" fill={fill} />
      <path d="M0 0 C-2 -8 2 -12 0 -16" fill="none" stroke="#f7f3ea" strokeWidth="1" className="wuxia-steam" />
    </g>
  )
}

function Fish({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="0" rx="10" ry="4" fill="#e07a3d" stroke="#8a3a20" strokeWidth="0.6" />
      <path d="M9 0 L16 -4 L16 4 Z" fill="#c4513a" />
      <circle cx="-4" cy="-1" r="0.7" fill="#1a120c" />
    </g>
  )
}

function Dumpling({ x, y }: { x: number; y: number }) {
  return (
    <path
      d={`M${x} ${y} Q${x + 6} ${y - 8} ${x + 12} ${y} Q${x + 6} ${y + 2} ${x} ${y}`}
      fill="#f7f1df"
      stroke="#c4a574"
      strokeWidth="0.6"
    />
  )
}

/** Parallax props: lantern strings, market goods, bamboo, and the terrace flight. */
export const WuxiaSectionMid = memo(function WuxiaSectionMid({
  sheet = 'silk',
}: {
  sheet?: 'silk' | 'life'
}) {
  const silk = sheet === 'silk'
  const life = sheet === 'life'
  return (
    <svg className="partner-wuxia" viewBox={VB} preserveAspectRatio="none" aria-hidden="true">
      {silk ? (
      <>
      <Band>
        <g className="wuxia-veil" fill="#9b1c38">
          <path d="M40 360 C70 420 50 560 80 680 C60 600 90 480 70 360 Z" opacity="0.45" />
          <path d="M300 400 C340 500 310 640 350 760 C320 640 360 500 330 400 Z" opacity="0.38" />
          <path d="M150 300 C170 380 140 500 168 620 C150 500 180 400 160 300 Z" opacity="0.28" />
        </g>
        <g>
          <path d="M24 640 H180" stroke="#3a181c" strokeWidth="1.1" />
          <GlowLantern x={40} y={656} s={1.05} />
          <GlowLantern x={86} y={648} s={1.15} hue="#ff2a3a" />
          <GlowLantern x={132} y={658} s={0.9} />
          <GlowLantern x={168} y={650} s={0.8} hue="#7a1024" />
        </g>
      </Band>

      <Band>
        <g className="wuxia-sway is-soft">
          <path d="M24 1040 H160" stroke="#3a2418" strokeWidth="1" />
          <GlowLantern x={40} y={1056} s={0.8} hue="#e8a04a" />
          <GlowLantern x={88} y={1048} s={0.7} />
          <GlowLantern x={132} y={1054} s={0.66} hue="#f0d48a" />
        </g>
      </Band>
      </>
      ) : null}

      {life ? (
      <>
      <Band>
        {Array.from({ length: 9 }, (_, i) => {
          const x = 16 + (i % 5) * 22
          const y = 2000 + Math.floor(i / 5) * 80 + (i % 2) * 24
          return (
            <g key={`a-${i}`} className={i % 2 ? 'wuxia-sway is-alt' : 'wuxia-sway'}>
              <path d={`M${x} ${y} L${x + 4} ${y - 78} L${x + 10} ${y}`} fill="#0e4a28" />
              <path d={`M${x + 4} ${y - 50} C${x + 18} ${y - 64} ${x + 16} ${y - 36} ${x + 4} ${y - 42}`} fill="#1f8a48" />
            </g>
          )
        })}
        {Array.from({ length: 7 }, (_, i) => {
          const x = 300 + (i % 4) * 24
          const y = 2060 + Math.floor(i / 4) * 90
          return (
            <g key={`b-${i}`} className="wuxia-sway is-soft">
              <path d={`M${x} ${y} L${x + 3} ${y - 92} L${x + 8} ${y}`} fill="#145c32" />
              <path d={`M${x + 3} ${y - 60} C${x - 10} ${y - 72} ${x - 8} ${y - 40} ${x + 3} ${y - 48}`} fill="#3dba74" />
            </g>
          )
        })}
        {Array.from({ length: 14 }, (_, i) => (
          <g key={`g-${i}`} transform={`translate(${30 + (i % 7) * 48} ${2280 + Math.floor(i / 7) * 36})`}>
          <g className="wuxia-sway">
            <path d="M0 0 C-2 -12 0 -18 1 -22 M0 0 C3 -10 7 -14 5 -20 M0 0 C-6 -8 -8 -14 -4 -16" fill="none" stroke="#1c6b34" strokeWidth="1.3" strokeLinecap="round" />
          </g>
          </g>
        ))}
      </Band>

      <Band>
        <Xiangyun x={60} y={2740} s={0.9} fill="#fffdf6" stroke="#e8c56b" />
        <Xiangyun x={180} y={2860} s={1.05} fill="#fff6d0" stroke="#e0b44a" />
        <Xiangyun x={300} y={3000} s={0.75} fill="#fffaf0" stroke="#f0d48a" />
        <SkyTemple x={70} y={2810} s={0.85} />
        <SunWukong />
      </Band>
      </>
      ) : null}
    </svg>
  )
})

/** Nearest weather: silk, fog, rain, and grass tips. Tracks just ahead of the scroll. */
export const WuxiaNearWeather = memo(function WuxiaNearWeather({
  sheet = 'goods',
}: {
  sheet?: 'goods' | 'rain'
}) {
  const goods = sheet === 'goods'
  const rainOn = sheet === 'rain'
  const rain = Array.from({ length: 18 }, (_, i) => {
    const x = 12 + ((i * 23) % 376)
    const y = 1880 + (i % 9) * 48
    return { x, y, i }
  })
  return (
    <svg className="partner-wuxia" viewBox={VB} preserveAspectRatio="none" aria-hidden="true">
      {goods ? (
      <>
      <Band>
        <g className="wuxia-veil" fill="#c41e3a">
          <path d="M8 240 C28 360 6 520 24 700 C8 540 36 380 18 240 Z" opacity="0.33" />
          <path d="M360 280 C390 420 368 600 392 740 C374 560 400 400 378 280 Z" opacity="0.3" />
        </g>
        <GlowLantern x={22} y={480} s={1.2} />
        <GlowLantern x={372} y={560} s={1.05} hue="#ff2a3a" />
      </Band>

      <Band>
        <g>
          <ellipse cx="45" cy="1358" rx="42" ry="6" fill="#1a120c" opacity="0.2" />
          <path d="M12 1288 H78 V1304 H12 Z" fill="#8b1e2d" />
          <path d="M12 1304 C28 1312 48 1298 66 1306 C72 1308 78 1304 78 1304 V1344 C60 1356 36 1340 12 1352 Z" fill="#241810" />
          <Skewer x={20} y={1336} />
          <Tanghulu x={48} y={1334} />
          <Bowl x={36} y={1320} fill="#e8c56b" />
          <Dumpling x={18} y={1324} />
          <circle cx="22" cy="1316" r="3.2" fill="#e8c9a4" />
          <path d="M16 1310 Q22 1300 28 1310" fill="none" stroke="#5c4030" strokeWidth="0.8" />
        </g>
        <g>
          <ellipse cx="352" cy="1480" rx="44" ry="6" fill="#1a120c" opacity="0.2" />
          <path d="M318 1410 H386 V1426 H318 Z" fill="#1d3d6e" />
          <path d="M318 1426 C336 1434 358 1418 376 1426 C382 1428 386 1424 386 1424 V1466 C368 1478 342 1462 318 1476 Z" fill="#1a140e" />
          <Fish x={336} y={1460} />
          <Bowl x={364} y={1452} fill="#f4ead4" />
          <Tanghulu x={324} y={1454} />
          <Skewer x={348} y={1468} />
          <circle cx="372" cy="1438" r="3.4" fill="#f3e2c4" />
          <path d="M372 1434 V1468" stroke="#5c4030" strokeWidth="1.1" />
        </g>
        <g>
          <ellipse cx="44" cy="1620" rx="36" ry="5.5" fill="#1a120c" opacity="0.18" />
          <path d="M16 1560 H72 V1574 H16 Z" fill="#2f6b3a" />
          <path d="M16 1574 C30 1582 48 1568 64 1576 C70 1578 72 1574 72 1574 V1608 C56 1618 34 1604 16 1616 Z" fill="#1a140e" />
          <circle cx="30" cy="1596" r="4.5" fill="#e07a3d" />
          <circle cx="44" cy="1600" r="3.6" fill="#3dba74" />
          <circle cx="58" cy="1594" r="4" fill="#c41e3a" />
          <Bowl x={40} y={1584} fill="#6e9aaf" />
        </g>
        <MistBank cx={120} cy={1240} rx={150} ry={28} fill="#d9cbb0" />
        <MistBank cx={280} cy={1480} rx={160} ry={26} fill="#d9cbb0" slow />
        <MistBank cx={70} cy={1660} rx={120} ry={22} fill="#e7dcc4" />
        <ellipse cx="300" cy="1760" rx="140" ry="28" fill="#d9cbb0" opacity="0.14" className="wuxia-haze" />
        <GlowLantern x={356} y={1288} s={0.8} hue="#e8a04a" />
        <GlowLantern x={18} y={1580} s={0.72} />
      </Band>
      </>
      ) : null}

      {rainOn ? (
      <>
      <Band>
        {[18, 36, 354, 374].map((x, i) => (
          <g key={x} className={i % 2 ? 'wuxia-sway is-alt' : 'wuxia-sway'}>
            <path d={`M${x} 2320 L${x + 3} ${2140 - i * 12} L${x + 8} 2320`} fill="#0e4a28" />
            <path
              d={`M${x + 3} 2200 C${x + (i % 2 ? 16 : -14)} 2176 ${x + (i % 2 ? 14 : -12)} 2224 ${x + 3} 2212`}
              fill="#1f8a48"
            />
          </g>
        ))}
        <g className="wuxia-rain" stroke="#f7fbff" strokeWidth="1.15" strokeLinecap="round" opacity="0.55">
          {rain.map((drop) => (
            <path key={drop.i} d={`M${drop.x} ${drop.y} l-5 16`} />
          ))}
        </g>
        <g className="wuxia-rain is-b" stroke="#e7f2ea" strokeWidth="1" strokeLinecap="round" opacity="0.4">
          {rain.map((drop) => (
            <path key={drop.i} d={`M${drop.x + 10} ${drop.y + 20} l-4 14`} />
          ))}
        </g>
        <g fill="#e8f4dc" opacity="0.2">
          <ellipse cx="100" cy="2100" rx="90" ry="18" className="wuxia-mist-drift" />
          <ellipse cx="260" cy="2320" rx="110" ry="16" className="wuxia-mist-drift is-slow" />
        </g>
        {Array.from({ length: 8 }, (_, i) => (
          <g key={i} transform={`translate(${20 + i * 46} ${2360 + (i % 3) * 18})`}>
            <g className="wuxia-sway">
              <path d="M0 0 C-1 -14 1 -20 0 -26 M0 0 C4 -12 8 -16 6 -24 M0 0 C-7 -10 -9 -18 -5 -20" fill="none" stroke="#146b32" strokeWidth="1.5" strokeLinecap="round" />
            </g>
          </g>
        ))}
      </Band>

      <Band>
        <Xiangyun x={200} y={2760} s={0.55} fill="#fffdf8" stroke="#f0d48a" />
        <g fill="#fff6d0" opacity="0.35" className="wuxia-mist-drift">
          <ellipse cx="80" cy="2700" rx="70" ry="14" />
          <ellipse cx="300" cy="3040" rx="80" ry="16" />
        </g>
      </Band>
      </>
      ) : null}
    </svg>
  )
})

const PETAL = 'M0 0 C5 -8 9 -3 7 3 C3 5 0 2 0 0Z'

/** A thin haze over the whole road. Repeated so the fast layer never shows an empty gap. */
export const WuxiaMistVeil = memo(function WuxiaMistVeil() {
  return (
    <svg className="partner-wuxia" viewBox={VB} preserveAspectRatio="none" aria-hidden="true">
      <MistBank cx={100} cy={400} rx={120} ry={18} fill="#f7f1df" strength={0.4} />
      <MistBank cx={260} cy={1100} rx={140} ry={16} fill="#f7f1df" slow strength={0.35} />
      <MistBank cx={80} cy={1800} rx={110} ry={16} fill="#f3e2c4" strength={0.4} />
      <MistBank cx={280} cy={2500} rx={130} ry={18} fill="#f7f1df" slow strength={0.4} />
      <g transform="translate(70 340)">
        <g className="wuxia-petal">
          <path d={PETAL} fill="#e7b3b8" />
        </g>
      </g>
      <g transform="translate(320 1500)">
        <g className="wuxia-petal is-b">
          <path d={PETAL} fill="#f0d0c8" />
        </g>
      </g>
      <g transform="translate(180 2740)">
        <g className="wuxia-petal is-c">
          <path d={PETAL} fill="#f0e2b8" />
        </g>
      </g>
    </svg>
  )
})
