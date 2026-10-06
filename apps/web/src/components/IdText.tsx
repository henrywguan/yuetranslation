import type { ReactNode } from 'react'
import {
  INDONESIAN_HONESTY_NOTE,
  detectIndonesianRegisterCue,
  indonesianParticleHints,
  indonesianRegisterCueChip,
  indonesianRegisterCueLabel,
} from '../lib/indonesianHonesty'

/**
 * Indonesian line for Solo / Conversation / Cam.
 * Compact: Bahasa Indonesia Latin only — no chips, no IPA, no Chao, no tone digits.
 * Details (`showDetail`) add lean register/particle honesty (like Tagalog stress chips).
 */
export function IdText({
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

  const cue = showDetail ? detectIndonesianRegisterCue(trimmed) : null
  const particles = showDetail ? indonesianParticleHints(trimmed) : []

  const body = (
    <span className={`indonesian-block${showDetail ? ' indonesian-block--detail' : ''}`}>
      <span className={className || undefined} lang="id">
        {trimmed}
      </span>
      {cue ? (
        <span className="indonesian-register-row" aria-label="Register">
          <span className="indonesian-register-scheme" aria-hidden="true">
            Register
          </span>
          <span
            className={`indonesian-register-chip indonesian-register-chip--${cue}`}
            title={indonesianRegisterCueLabel(cue)}
            aria-label={indonesianRegisterCueLabel(cue)}
          >
            {indonesianRegisterCueChip(cue)}
          </span>
        </span>
      ) : null}
      {particles.length ? (
        <span className="indonesian-particle-row" aria-label="Casual particles">
          <span className="indonesian-particle-scheme" aria-hidden="true">
            Particles
          </span>
          <span className="indonesian-particle-chips">
            {particles.map((p) => (
              <span
                key={p}
                className="indonesian-particle-chip"
                title={`${p}: casual discourse particle`}
                aria-label={`${p}: casual discourse particle`}
                lang="id"
              >
                {p}
              </span>
            ))}
          </span>
        </span>
      ) : null}
      {showDetail ? <span className="indonesian-honesty">{INDONESIAN_HONESTY_NOTE}</span> : null}
    </span>
  )

  if (!onActivate) return body

  return (
    <button
      type="button"
      className="indonesian-activate"
      onClick={() => onActivate(trimmed)}
      aria-label={activateLabel || `${trimmed}. Open details.`}
    >
      {body}
    </button>
  )
}
