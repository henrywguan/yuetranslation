import type { ReactNode } from 'react'
import {
  mexicanStressChipShort,
  mexicanStressClass,
  mexicanStressLabel,
  spanishBareWord,
  type MexicanStressClass,
} from '../lib/mexicanSpanishStress'

/**
 * Peninsular / Castilian Spanish (Spain, `eses`) line for Solo / Conversation panes.
 * Lexical stress is orthographic (tilde) — RAE accentuation is shared with Mexican
 * Spanish, so stress classification reuses `mexicanSpanishStress.ts`.
 * Stress-class chips stay in the details pane by default (`showStress`).
 */
export function PeninsularSpanishText({
  text,
  className,
  placeholder,
  onActivate,
  activateLabel,
  showStress = false,
}: {
  text: string
  definition?: string
  definitions?: string[]
  className?: string
  placeholder?: ReactNode
  onActivate?: (text: string) => void
  activateLabel?: string
  /** Compact panes: false. Details can opt in. */
  showStress?: boolean
}) {
  const trimmed = text.trim()
  if (!trimmed) return placeholder ? <>{placeholder}</> : null

  const chips = showStress
    ? trimmed
        .split(/(\s+)/)
        .filter((t) => t.trim() && !/^\s+$/.test(t))
        .map((raw) => {
          const bare = spanishBareWord(raw)
          const kind = mexicanStressClass(bare)
          return bare && kind ? { w: bare, kind } : null
        })
        .filter((x): x is { w: string; kind: MexicanStressClass } => Boolean(x))
    : []

  const body = (
    <span className={`eses-block${chips.length ? ' eses-block--hint' : ''}`}>
      <span className={className || undefined} lang="es-ES">
        {trimmed}
      </span>
      {chips.length ? (
        <span className="eses-stress-row" aria-label="Stress hints">
          <span className="eses-stress-scheme" aria-hidden="true">
            Stress
          </span>
          <span className="eses-stress-chips">
            {chips.map(({ w, kind }, i) => {
              const full = mexicanStressLabel(kind)
              return (
                <span
                  key={`${w}-${i}`}
                  className={`eses-stress-chip eses-stress-chip--${kind}`}
                  title={`${w}: ${full}`}
                  aria-label={`${w}: ${full}`}
                >
                  <span className="eses-stress-chip-word" lang="es-ES">
                    {w}
                  </span>
                  <span className="eses-stress-chip-sep" aria-hidden="true">
                    ·
                  </span>
                  <span className="eses-stress-chip-kind">{mexicanStressChipShort(kind)}</span>
                </span>
              )
            })}
          </span>
        </span>
      ) : null}
    </span>
  )

  if (!onActivate) return body

  return (
    <button
      type="button"
      className="eses-activate"
      onClick={() => onActivate(trimmed)}
      aria-label={activateLabel || `${trimmed}. Open details.`}
    >
      {body}
    </button>
  )
}
