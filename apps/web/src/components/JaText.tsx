import type { ReactNode } from 'react'
import { detailReadingJapanese } from '../lib/japaneseReading'
import {
  JAPANESE_HONESTY_NOTE,
  detectJapanesePoliteness,
  japanesePolitenessChip,
  japanesePolitenessLabel,
} from '../lib/japanesePoliteness'

/**
 * Japanese line for Solo / Conversation / Cam.
 * Compact: natural Japanese orthography only (kanji + kana) — no romaji dump.
 * Details (`showDetail`): optional Hepburn reading when available, politeness chip, honesty note.
 * No Chao, no Cantonese ASCII tone digits, no IPA on compact.
 */
export function JaText({
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
  /** Details pane: reading help + politeness + honesty. */
  showDetail?: boolean
}) {
  const trimmed = text.trim()
  if (!trimmed) return placeholder ? <>{placeholder}</> : null

  const reading = showDetail ? detailReadingJapanese(trimmed) : null
  const level = showDetail ? detectJapanesePoliteness(trimmed) : null

  const body = (
    <span className={`japanese-block${showDetail ? ' japanese-block--detail' : ''}`}>
      <span className={className || undefined} lang="ja">
        {trimmed}
      </span>
      {reading ? (
        <span className="japanese-reading-row" aria-label="Hepburn romanization">
          <span className="japanese-reading" lang="ja-Latn">
            {reading}
          </span>
          <span className="japanese-reading-label" aria-hidden="true">
            Romaji
          </span>
        </span>
      ) : null}
      {level ? (
        <span className="japanese-level-row" aria-label="Speech level">
          <span className="japanese-level-scheme" aria-hidden="true">
            Level
          </span>
          <span
            className={`japanese-level-chip japanese-level-chip--${level}`}
            title={japanesePolitenessLabel(level)}
          >
            {japanesePolitenessChip(level)}
          </span>
        </span>
      ) : null}
      {showDetail ? <span className="japanese-honesty">{JAPANESE_HONESTY_NOTE}</span> : null}
    </span>
  )

  if (!onActivate) return body

  return (
    <button
      type="button"
      className="japanese-activate"
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
