import { useReducedMotion } from '../lib/useReducedMotion'
import type { LandingPlanDemo } from './landingPlans'

/** Free card: quiet Hello ↔ 你好 flip. */
export function PriceDemoText() {
  const reduced = useReducedMotion()
  return (
    <div className={`ln-price-demo ln-price-demo--text${reduced ? ' is-static' : ''}`} aria-hidden="true">
      <span className="ln-price-demo-en">Hello</span>
      <span className="ln-price-demo-arrow">→</span>
      <span className="ln-price-demo-yue">
        <span className="ln-price-demo-han">你好</span>
        <span className="ln-price-demo-jp">nei5 hou2</span>
      </span>
    </div>
  )
}

/** Pro card: waveform that livens on card hover. */
export function PriceDemoSpeak() {
  const reduced = useReducedMotion()
  return (
    <div className={`ln-price-demo ln-price-demo--speak${reduced ? ' is-static' : ''}`} aria-hidden="true">
      <div className="ln-price-wave">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <span key={i} style={{ ['--i' as string]: i }} />
        ))}
      </div>
    </div>
  )
}

export function PriceDemo({ kind }: { kind: LandingPlanDemo }) {
  return kind === 'speak' ? <PriceDemoSpeak /> : <PriceDemoText />
}

function FeatIcon({ name }: { name: 'live' | 'text' | 'modes' | 'speak' | 'quality' }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
    className: 'ln-price-feat-icon',
  }
  switch (name) {
    case 'live':
      return (
        <svg {...common}>
          <path d="M12 3v3" />
          <path d="M12 18v3" />
          <path d="M5.6 5.6l2.1 2.1" />
          <path d="M16.3 16.3l2.1 2.1" />
          <path d="M3 12h3" />
          <path d="M18 12h3" />
          <path d="M5.6 18.4l2.1-2.1" />
          <path d="M16.3 7.7l2.1-2.1" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      )
    case 'text':
      return (
        <svg {...common}>
          <path d="M4 7h16" />
          <path d="M4 12h10" />
          <path d="M4 17h14" />
        </svg>
      )
    case 'modes':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="8" height="16" rx="2" />
          <rect x="13" y="4" width="8" height="16" rx="2" />
        </svg>
      )
    case 'speak':
      return (
        <svg {...common}>
          <path d="M11 5 6 9H3v6h3l5 4V5z" />
          <path d="M15.5 8.5a4 4 0 0 1 0 7" />
          <path d="M18.5 6a7 7 0 0 1 0 12" />
        </svg>
      )
    case 'quality':
      return (
        <svg {...common}>
          <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
        </svg>
      )
  }
}

const FREE_ICONS = ['live', 'text', 'modes'] as const
const PRO_ICONS = ['live', 'speak', 'quality'] as const

export function PriceFeatIcon({ planId, index }: { planId: 'free' | 'pro'; index: number }) {
  const name = planId === 'pro' ? PRO_ICONS[index] ?? 'live' : FREE_ICONS[index] ?? 'live'
  return <FeatIcon name={name} />
}
