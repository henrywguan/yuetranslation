import { useId } from 'react'
import { openLearn } from '../lib/siteLinks'
import { ui } from '../lib/uiCopy'
import './HarborQuestAccountLaunch.css'

type Props = {
  /** Close Account Hub before navigating. */
  onNavigate?: () => void
}

/** Animated Harbor Quest launcher for Account Hub (Free+ · beta). */
export function HarborQuestAccountLaunch({ onNavigate }: Props) {
  const uid = useId().replace(/:/g, '')
  const seaId = `hq-sea-${uid}`
  const jadeId = `hq-jade-${uid}`
  // Brand label stays English-only (biPlain would print "Harbor Quest Harbor Quest").
  const name = ui.harborQuestShort.en
  const beta = ui.harborQuestBeta.en
  const label = `${name} (${beta})`
  return (
    <button
      type="button"
      className="hq-account-launch"
      aria-label={label}
      title={label}
      onClick={() => {
        onNavigate?.()
        openLearn()
      }}
    >
      <span className="hq-account-launch-glyph" aria-hidden="true">
        <svg className="hq-account-launch-svg" viewBox="0 0 40 40" width={40} height={40}>
          <defs>
            <linearGradient id={seaId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1a4a5c" />
              <stop offset="100%" stopColor="#0b2a38" />
            </linearGradient>
            <linearGradient id={jadeId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#5ee0c4" />
              <stop offset="100%" stopColor="#2aa88f" />
            </linearGradient>
          </defs>
          <circle className="hq-account-launch-ring" cx="20" cy="20" r="18.5" />
          <circle cx="20" cy="20" r="16.5" fill={`url(#${seaId})`} />
          <path
            className="hq-account-launch-wave hq-account-launch-wave--a"
            d="M6 24c3-2 5-2 8 0s5 2 8 0 5-2 8 0v6H6z"
            fill="#12324a"
            opacity="0.9"
          />
          <path
            className="hq-account-launch-wave hq-account-launch-wave--b"
            d="M6 26c3-2 5-2 8 0s5 2 8 0 5-2 8 0v5H6z"
            fill="#1e5a6e"
            opacity="0.85"
          />
          <g className="hq-account-launch-boat">
            <path d="M11 22.5h18l-2.2 4.2H13.2z" fill={`url(#${jadeId})`} />
            <path d="M20 11.5v11" stroke="#e8f7f2" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M20 12.2l7.2 5.2H20z" fill="#d7f5ec" opacity="0.95" />
            <path d="M20 13.5l-5.4 4H20z" fill="#9fd6cb" opacity="0.9" />
            <circle className="hq-account-launch-lantern" cx="20" cy="10.2" r="1.35" fill="#f0c36a" />
          </g>
        </svg>
      </span>
      <span className="hq-account-launch-meta">
        <span className="hq-account-launch-beta">{beta}</span>
        <span className="hq-account-launch-name">{name}</span>
      </span>
    </button>
  )
}
