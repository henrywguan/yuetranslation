import type { ReactNode } from 'react'
import { romanizeKorean } from '../lib/koreanRomanization'
import {
  KOREAN_HONESTY_NOTE,
  detectKoreanSpeechLevel,
  koreanSpeechLevelChip,
  koreanSpeechLevelLabel,
} from '../lib/koreanSpeechLevel'

/**
 * Korean line for Solo / Conversation / Cam.
 * Compact: Hangul only — no RR, IPA, or Chao.
 * Details (`showDetail`): RR reading + speech-level chip + honesty note.
 */
export function KoreanText({
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
  /** Details pane: RR + speech level + honesty. */
  showDetail?: boolean
}) {
  const trimmed = text.trim()
  if (!trimmed) return placeholder ? <>{placeholder}</> : null

  const reading = showDetail ? romanizeKorean(trimmed) : null
  const level = showDetail ? detectKoreanSpeechLevel(trimmed) : null

  const body = (
    <span className={`korean-block${showDetail ? ' korean-block--detail' : ''}`}>
      <span className={className || undefined} lang="ko">
        {trimmed}
      </span>
      {reading ? (
        <span className="korean-reading-row" aria-label="Revised Romanization">
          <span className="korean-reading" lang="ko-Latn">
            {reading}
          </span>
          <span className="korean-reading-label" aria-hidden="true">
            RR
          </span>
        </span>
      ) : null}
      {level ? (
        <span className="korean-level-row" aria-label="Speech level">
          <span className="korean-level-scheme" aria-hidden="true">
            Level
          </span>
          <span
            className={`korean-level-chip korean-level-chip--${level}`}
            title={koreanSpeechLevelLabel(level)}
          >
            {koreanSpeechLevelChip(level)}
          </span>
        </span>
      ) : null}
      {showDetail ? <span className="korean-honesty">{KOREAN_HONESTY_NOTE}</span> : null}
    </span>
  )

  if (!onActivate) return body

  return (
    <button
      type="button"
      className="korean-activate"
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
