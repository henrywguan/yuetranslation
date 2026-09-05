import type { ReactNode } from 'react'
import {
  tagalogBareWord,
  tagalogStressClass,
  tagalogStressLabel,
  type TagalogStressClass,
} from '../lib/tagalogPronunciation'

/** Compact chip text — full label stays on title/aria. */
function chipShort(kind: TagalogStressClass): string {
  switch (kind) {
    case 'malumay':
      return 'Penult'
    case 'mabilis':
      return 'Final'
    case 'malumi':
      return 'Penult + ʔ'
    case 'maragsa':
      return 'Final + ʔ'
  }
}

/**
 * Tagalog line for Solo / Conversation panes.
 * Stress / glottal chips stay in the details pane by default (`showStress`).
 */
export function TagalogText({
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
          const bare = tagalogBareWord(raw)
          const kind = tagalogStressClass(bare)
          return bare && kind ? { w: bare, kind } : null
        })
        .filter((x): x is { w: string; kind: TagalogStressClass } => Boolean(x))
    : []

  const body = (
    <span className={`tagalog-block${chips.length ? ' tagalog-block--hint' : ''}`}>
      <span className={className || undefined} lang="tl">
        {trimmed}
      </span>
      {chips.length ? (
        <span className="tagalog-stress-row" aria-label="Stress and glottal hints">
          <span className="tagalog-stress-scheme" aria-hidden="true">
            Stress
          </span>
          <span className="tagalog-stress-chips">
            {chips.map(({ w, kind }, i) => {
              const full = tagalogStressLabel(kind)
              return (
                <span
                  key={`${w}-${i}`}
                  className={`tagalog-stress-chip tagalog-stress-chip--${kind}`}
                  title={`${w}: ${full}`}
                  aria-label={`${w}: ${full}`}
                >
                  <span className="tagalog-stress-chip-word" lang="tl">
                    {w}
                  </span>
                  <span className="tagalog-stress-chip-sep" aria-hidden="true">
                    ·
                  </span>
                  <span className="tagalog-stress-chip-kind">{chipShort(kind)}</span>
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
      className="tagalog-activate"
      onClick={() => onActivate(trimmed)}
      aria-label={activateLabel || `${trimmed}. Open details.`}
    >
      {body}
    </button>
  )
}
