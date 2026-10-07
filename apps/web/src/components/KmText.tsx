import type { ReactNode } from 'react'
import {
  KHMER_READING_HONESTY,
  analyzeKhmer,
} from '../lib/khmerReading'

/**
 * Cambodian Khmer line. Compact shows Khmer script plus a UNGEGN-style reading
 * when the orthography parses. Details add the honesty note (not a tone language).
 * No Chao letters, no ASCII tone digits.
 */
export function KmText({
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
  /** Details pane: honesty note (reading already shows on compact). */
  showDetail?: boolean
}) {
  const trimmed = text.trim()
  if (!trimmed) return placeholder ? <>{placeholder}</> : null
  const analysis = analyzeKhmer(trimmed)

  const body = (
    <span className={`khmer-block${showDetail ? ' khmer-block--detail' : ''}`}>
      <span className={className || undefined} lang="km">
        {trimmed}
      </span>
      {analysis ? (
        <span className="khmer-reading-row" aria-label="Khmer reading">
          <span className="khmer-reading" lang="km-Latn">
            {analysis.reading}
          </span>
          <span className="khmer-reading-label" aria-hidden="true">
            Reading
          </span>
        </span>
      ) : null}
      {showDetail ? <span className="khmer-honesty">{KHMER_READING_HONESTY}</span> : null}
    </span>
  )

  if (!onActivate) return body
  return (
    <button
      type="button"
      className="khmer-activate"
      onClick={() => onActivate(trimmed)}
      aria-label={
        activateLabel ||
        (analysis ? `${trimmed}. ${analysis.reading}. Open details.` : `${trimmed}. Open details.`)
      }
    >
      {body}
    </button>
  )
}
