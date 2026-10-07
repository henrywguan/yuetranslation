import type { ReactNode } from 'react'
import {
  brazilianStressChipShort,
  brazilianStressClass,
  brazilianStressLabel,
  portugueseBareWord,
  type BrazilianStressClass,
} from '../lib/brazilianPortugueseStress'

/**
 * Brazilian Portuguese line for Solo / Conversation panes.
 * Lexical stress is orthographic (acute / circumflex) — not lexical tone.
 * Stress-class chips stay in the details pane by default (`showStress`).
 */
export function PtText({
  text,
  className,
  placeholder,
  onActivate,
  activateLabel,
  showStress = false,
  /** @deprecated use showStress — kept for scaffold call-site compat during polish. */
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
  showStress?: boolean
  showDetail?: boolean
}) {
  const trimmed = text.trim()
  if (!trimmed) return placeholder ? <>{placeholder}</> : null

  const wantStress = showStress || showDetail
  const chips = wantStress
    ? trimmed
        .split(/(\s+)/)
        .filter((t) => t.trim() && !/^\s+$/.test(t))
        .map((raw) => {
          const bare = portugueseBareWord(raw)
          const kind = brazilianStressClass(bare)
          return bare && kind ? { w: bare, kind } : null
        })
        .filter((x): x is { w: string; kind: BrazilianStressClass } => Boolean(x))
    : []

  const body = (
    <span className={`brazilian-portuguese-block${chips.length ? ' brazilian-portuguese-block--hint' : ''}`}>
      <span className={className || undefined} lang="pt-BR">
        {trimmed}
      </span>
      {chips.length ? (
        <span className="brazilian-portuguese-stress-row" aria-label="Stress hints">
          <span className="brazilian-portuguese-stress-scheme" aria-hidden="true">
            Stress
          </span>
          <span className="brazilian-portuguese-stress-chips">
            {chips.map(({ w, kind }, i) => {
              const full = brazilianStressLabel(kind)
              return (
                <span
                  key={`${w}-${i}`}
                  className={`brazilian-portuguese-stress-chip brazilian-portuguese-stress-chip--${kind}`}
                  title={`${w}: ${full}`}
                  aria-label={`${w}: ${full}`}
                >
                  <span className="brazilian-portuguese-stress-chip-word" lang="pt-BR">
                    {w}
                  </span>
                  <span className="brazilian-portuguese-stress-chip-sep" aria-hidden="true">
                    ·
                  </span>
                  <span className="brazilian-portuguese-stress-chip-kind">
                    {brazilianStressChipShort(kind)}
                  </span>
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
      className="brazilian-portuguese-activate"
      onClick={() => onActivate(trimmed)}
      aria-label={activateLabel || `${trimmed}. Open details.`}
    >
      {body}
    </button>
  )
}
