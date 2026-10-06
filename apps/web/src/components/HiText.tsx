import type { ReactNode } from 'react'
import { romanizeHindiIast } from '../lib/hindiRomanization'
import {
  HINDI_HONESTY_NOTE,
  detectHindiFormality,
  hindiFormalityChip,
  hindiFormalityLabel,
} from '../lib/hindiFormality'

/**
 * Hindi line for Solo / Conversation / Cam.
 * Compact: Devanagari only (no IAST / Hinglish Latin dump on every line).
 * Details (`showDetail`): optional IAST reading + address/formality chip + honesty.
 * No Chao tone letters, no Cantonese ASCII tones.
 */
export function HiText({
  text,
  className,
  placeholder,
  onActivate,
  activateLabel,
  showDetail = false,
}: {
  text: string
  className?: string
  placeholder?: ReactNode
  onActivate?: (text: string) => void
  activateLabel?: string
  /** Details pane: IAST + formality + honesty (compact stays Devanagari-only). */
  showDetail?: boolean
}) {
  const trimmed = text.trim()
  if (!trimmed) return placeholder ? <>{placeholder}</> : null

  const reading = showDetail ? romanizeHindiIast(trimmed) : null
  const level = showDetail ? detectHindiFormality(trimmed) : null

  const body = (
    <span className={`hindi-block${showDetail ? ' hindi-block--detail' : ''}`}>
      <span className={className || undefined} lang="hi">
        {trimmed}
      </span>
      {reading ? (
        <span className="hindi-reading-row" aria-label="IAST romanization">
          <span className="hindi-reading" lang="hi-Latn">
            {reading}
          </span>
          <span className="hindi-reading-label" aria-hidden="true">
            IAST
          </span>
        </span>
      ) : null}
      {level ? (
        <span className="hindi-level-row" aria-label="Address form">
          <span className="hindi-level-scheme" aria-hidden="true">
            Form
          </span>
          <span
            className={`hindi-level-chip hindi-level-chip--${level}`}
            title={hindiFormalityLabel(level)}
          >
            {hindiFormalityChip(level)}
          </span>
        </span>
      ) : null}
      {showDetail ? <span className="hindi-honesty">{HINDI_HONESTY_NOTE}</span> : null}
    </span>
  )

  if (!onActivate) return body

  return (
    <button
      type="button"
      className="hindi-activate"
      onClick={() => onActivate(trimmed)}
      aria-label={
        activateLabel ||
        (reading ? `${trimmed}. ${reading}. Open details.` : `${trimmed}. Open details.`)
      }
    >
      {body}
    </button>
  )
}
