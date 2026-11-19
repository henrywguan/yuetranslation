import type { ReactNode } from 'react'
import {
  EUROPEAN_PORTUGUESE_HONESTY_NOTE,
  europeanStressChipShort,
  europeanStressChips,
  europeanStressLabel,
} from '../lib/europeanPortugueseStress'

/**
 * European Portuguese (Portugal, `ptpt`) line for Solo / Conversation / Cam — never pt-BR.
 * Lexical stress is orthographic (acute / circumflex) — not lexical tone.
 * Compact: pt-PT orthography only. Details (`showDetail`) add stress chips + vowel-reduction honesty.
 */
export function PtptText({
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

  const chips = showDetail ? europeanStressChips(trimmed) : []

  const body = (
    <span className={`european-portuguese-block${showDetail ? ' european-portuguese-block--detail' : ''}`}>
      <span className={className || undefined} lang="pt-PT">
        {trimmed}
      </span>
      {chips.length ? (
        <span className="european-portuguese-stress-row" aria-label="Stress hints">
          <span className="european-portuguese-stress-scheme" aria-hidden="true">
            Stress
          </span>
          <span className="european-portuguese-stress-chips">
            {chips.map(({ w, kind }, i) => {
              const full = europeanStressLabel(kind)
              return (
                <span
                  key={`${w}-${i}`}
                  className={`european-portuguese-stress-chip european-portuguese-stress-chip--${kind}`}
                  title={`${w}: ${full}`}
                  aria-label={`${w}: ${full}`}
                >
                  <span className="european-portuguese-stress-chip-word" lang="pt-PT">
                    {w}
                  </span>
                  <span className="european-portuguese-stress-chip-sep" aria-hidden="true">
                    ·
                  </span>
                  <span className="european-portuguese-stress-chip-kind">
                    {europeanStressChipShort(kind)}
                  </span>
                </span>
              )
            })}
          </span>
        </span>
      ) : null}
      {showDetail ? (
        <span className="european-portuguese-honesty">{EUROPEAN_PORTUGUESE_HONESTY_NOTE}</span>
      ) : null}
    </span>
  )

  if (!onActivate) return body

  return (
    <button
      type="button"
      className="european-portuguese-activate"
      onClick={() => onActivate(trimmed)}
      aria-label={activateLabel || `${trimmed}. Open details.`}
    >
      {body}
    </button>
  )
}
