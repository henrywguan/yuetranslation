import { useId } from 'react'
import { openPracticePartner } from '../lib/siteLinks'
import { biPlain, ui } from '../lib/uiCopy'
import './HarborQuestAccountLaunch.css'

type Props = {
  /** Close Account Hub before navigating. */
  onNavigate?: () => void
}

/** Animated Practice Partner launcher for Account Hub (signed-in · beta). */
export function PracticePartnerAccountLaunch({ onNavigate }: Props) {
  const uid = useId().replace(/:/g, '')
  const seaId = `pp-sea-${uid}`
  const jadeId = `pp-jade-${uid}`
  const glowId = `pp-glow-${uid}`
  const label = `${biPlain(ui.practicePartnerLaunch)} (${biPlain(ui.harborQuestBeta)})`
  return (
    <button
      type="button"
      className="hq-account-launch pp-account-launch"
      aria-label={label}
      title={label}
      onClick={() => {
        onNavigate?.()
        openPracticePartner()
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
              <stop offset="0%" stopColor="#7ef0d4" />
              <stop offset="100%" stopColor="#2aa88f" />
            </linearGradient>
            <radialGradient id={glowId} cx="50%" cy="42%" r="55%">
              <stop offset="0%" stopColor="#c8fff0" stopOpacity="0.95" />
              <stop offset="55%" stopColor="#3dcfb6" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#0b2a38" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle className="hq-account-launch-ring" cx="20" cy="20" r="18.5" />
          <circle cx="20" cy="20" r="16.5" fill={`url(#${seaId})`} />
          <circle className="pp-account-launch-orb" cx="20" cy="19" r="9.2" fill={`url(#${glowId})`} />
          <ellipse
            className="pp-account-launch-orbit"
            cx="20"
            cy="20"
            rx="11.5"
            ry="4.6"
            fill="none"
            stroke={`url(#${jadeId})`}
            strokeWidth="1.15"
            opacity="0.85"
          />
          <circle className="pp-account-launch-spark" cx="29.2" cy="17.4" r="1.15" fill="#f0c36a" />
          <path
            d="M14.2 24.6c1.8-1.4 3.5-1.4 5.8 0s4 1.4 5.8 0"
            fill="none"
            stroke="#d7f5ec"
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity="0.88"
          />
        </svg>
      </span>
      <span className="hq-account-launch-meta">
        <span className="hq-account-launch-beta">{biPlain(ui.harborQuestBeta)}</span>
        <span className="hq-account-launch-name">{biPlain(ui.practicePartnerShort)}</span>
      </span>
    </button>
  )
}
