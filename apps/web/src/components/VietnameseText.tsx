import type { ReactNode } from 'react'
import {
  VIETNAMESE_SOUTHERN_MERGE_NOTE,
  vietnameseBareWord,
  vietnameseToneChipShort,
  vietnameseToneClass,
  vietnameseToneLabel,
  type VietnameseToneClass,
} from '../lib/vietnameseTones'

/**
 * Vietnamese line for Solo / Conversation panes.
 * Compact: fully accented Quốc ngữ only — no tone chips, no IPA, no Chao letters.
 * Details can opt in via `showTones`, which always renders the Southern hỏi≈ngã
 * merge note alongside the chips (never optional once tones are shown).
 */
export function VietnameseText({
  text,
  className,
  placeholder,
  onActivate,
  activateLabel,
  showTones = false,
}: {
  text: string
  definition?: string
  definitions?: string[]
  className?: string
  placeholder?: ReactNode
  onActivate?: (text: string) => void
  activateLabel?: string
  /** Compact panes: false. Details can opt in. */
  showTones?: boolean
}) {
  const trimmed = text.trim()
  if (!trimmed) return placeholder ? <>{placeholder}</> : null

  const chips = showTones
    ? trimmed
        .split(/(\s+)/)
        .filter((t) => t.trim() && !/^\s+$/.test(t))
        .map((raw) => {
          const bare = vietnameseBareWord(raw)
          const kind = vietnameseToneClass(bare)
          return bare && kind ? { w: bare, kind } : null
        })
        .filter((x): x is { w: string; kind: VietnameseToneClass } => Boolean(x))
    : []

  const body = (
    <span className={`vietnamese-block${chips.length ? ' vietnamese-block--hint' : ''}`}>
      <span className={className || undefined} lang="vi">
        {trimmed}
      </span>
      {chips.length ? (
        <span className="vietnamese-tone-row" aria-label="Tone hints">
          <span className="vietnamese-tone-scheme" aria-hidden="true">
            Tone
          </span>
          <span className="vietnamese-tone-chips">
            {chips.map(({ w, kind }, i) => {
              const full = vietnameseToneLabel(kind)
              return (
                <span
                  key={`${w}-${i}`}
                  className={`vietnamese-tone-chip vietnamese-tone-chip--${kind}`}
                  title={`${w}: ${full}`}
                  aria-label={`${w}: ${full}`}
                >
                  <span className="vietnamese-tone-chip-word" lang="vi">
                    {w}
                  </span>
                  <span className="vietnamese-tone-chip-sep" aria-hidden="true">
                    ·
                  </span>
                  <span className="vietnamese-tone-chip-kind">
                    {vietnameseToneChipShort(kind)}
                  </span>
                </span>
              )
            })}
          </span>
        </span>
      ) : null}
      {chips.length ? (
        <span className="vietnamese-southern-note">{VIETNAMESE_SOUTHERN_MERGE_NOTE}</span>
      ) : null}
    </span>
  )

  if (!onActivate) return body

  return (
    <button
      type="button"
      className="vietnamese-activate"
      onClick={() => onActivate(trimmed)}
      aria-label={activateLabel || `${trimmed}. Open details.`}
    >
      {body}
    </button>
  )
}
