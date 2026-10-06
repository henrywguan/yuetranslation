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
 * Compact always shows Hangul plus pronunciation-based Revised Romanization
 * when the phrase parses — learners should not need Details just to see RR.
 * Details (`showDetail`) add speech-level chips and the honesty note.
 * No IPA, Chao, or tone digits.
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
  /** Details pane: speech level + honesty (RR already shows on compact). */
  showDetail?: boolean
}) {
  const trimmed = text.trim()
  if (!trimmed) return placeholder ? <>{placeholder}</> : null

  const reading = romanizeKorean(trimmed)
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
