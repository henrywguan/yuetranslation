import type { ReactNode } from 'react'
import {
  MALAY_HONESTY_NOTE,
  detectMalayRegisterCue,
  malayParticleHints,
  malayRegisterCueChip,
  malayRegisterCueLabel,
} from '../lib/malayHonesty'

/**
 * Malay line for Solo / Conversation / Cam.
 * Compact: Bahasa Melayu Latin only — no chips, no IPA, no Chao, no tone digits.
 * Details (`showDetail`) add lean register/particle honesty (like Tagalog / Indonesian).
 */
export function MsText({
  text,
  className,
  placeholder,
  onActivate,
  activateLabel,
  showDetail = false,
}: {
  text: string
  definition?: string
  definitions?: string[]
  className?: string
  placeholder?: ReactNode
  onActivate?: (text: string) => void
  activateLabel?: string
  /** Compact panes: false. Details can opt in. */
  showDetail?: boolean
}) {
  const trimmed = text.trim()
  if (!trimmed) return placeholder ? <>{placeholder}</> : null

  const cue = showDetail ? detectMalayRegisterCue(trimmed) : null
  const particles = showDetail ? malayParticleHints(trimmed) : []

  const body = (
    <span className={`malay-block${showDetail ? ' malay-block--detail' : ''}`}>
      <span className={className || undefined} lang="ms">
        {trimmed}
      </span>
      {cue ? (
        <span className="malay-register-row" aria-label="Register">
          <span className="malay-register-scheme" aria-hidden="true">
            Register
          </span>
          <span
            className={`malay-register-chip malay-register-chip--${cue}`}
            title={malayRegisterCueLabel(cue)}
            aria-label={malayRegisterCueLabel(cue)}
          >
            {malayRegisterCueChip(cue)}
          </span>
        </span>
      ) : null}
      {particles.length ? (
        <span className="malay-particle-row" aria-label="Casual particles">
          <span className="malay-particle-scheme" aria-hidden="true">
            Particles
          </span>
          <span className="malay-particle-chips">
            {particles.map((p) => (
              <span
                key={p}
                className="malay-particle-chip"
                title={`${p}: casual discourse particle`}
                aria-label={`${p}: casual discourse particle`}
                lang="ms"
              >
                {p}
              </span>
            ))}
          </span>
        </span>
      ) : null}
      {showDetail ? <span className="malay-honesty">{MALAY_HONESTY_NOTE}</span> : null}
    </span>
  )

  if (!onActivate) return body

  return (
    <button
      type="button"
      className="malay-activate"
      onClick={() => onActivate(trimmed)}
      aria-label={activateLabel || `${trimmed}. Open details.`}
    >
      {body}
    </button>
  )
}
