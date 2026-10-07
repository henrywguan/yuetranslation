import type { ReactNode } from 'react'
import {
  JAVANESE_HONESTY_NOTE,
  detectJavaneseSpeechLevel,
  javaneseSpeechLevelChip,
  javaneseSpeechLevelLabel,
} from '../lib/javaneseHonesty'

/**
 * Javanese line for Solo / Conversation / Cam.
 * Compact: Latin Basa Jawa only — no chips, no IPA, no Chao, no tone digits.
 * Details (`showDetail`) add undha-usuk speech-level chips (ngoko / madya / krama).
 */
export function JvText({
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

  const level = showDetail ? detectJavaneseSpeechLevel(trimmed) : null

  const body = (
    <span className={`javanese-block${showDetail ? ' javanese-block--detail' : ''}`}>
      <span className={className || undefined} lang="jv">
        {trimmed}
      </span>
      {level ? (
        <span className="javanese-level-row" aria-label="Speech level">
          <span className="javanese-level-scheme" aria-hidden="true">
            Level
          </span>
          <span
            className={`javanese-level-chip javanese-level-chip--${level}`}
            title={javaneseSpeechLevelLabel(level)}
            aria-label={javaneseSpeechLevelLabel(level)}
          >
            {javaneseSpeechLevelChip(level)}
          </span>
        </span>
      ) : null}
      {showDetail ? <span className="javanese-honesty">{JAVANESE_HONESTY_NOTE}</span> : null}
    </span>
  )

  if (!onActivate) return body

  return (
    <button
      type="button"
      className="javanese-activate"
      onClick={() => onActivate(trimmed)}
      aria-label={activateLabel || `${trimmed}. Open details.`}
    >
      {body}
    </button>
  )
}
