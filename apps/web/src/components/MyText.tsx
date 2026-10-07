import type { ReactNode } from 'react'
import {
  BURMESE_TONE_HONESTY,
  analyzeBurmese,
  burmeseToneChip,
  burmeseToneLabel,
} from '../lib/burmeseMlcts'

/**
 * Standard Burmese (မြန်မာ) line. Compact shows Myanmar script plus an
 * MLCTS-style reading when syllables parse. Details add tone-name chips and
 * the honesty note. No Chao letters, no ASCII tone digits.
 */
export function MyText({
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
  /** Details pane: tone chips + MLCTS honesty. */
  showDetail?: boolean
}) {
  const trimmed = text.trim()
  if (!trimmed) return placeholder ? <>{placeholder}</> : null
  const analysis = analyzeBurmese(trimmed)

  const body = (
    <span className="burmese-block">
      <span className={className || undefined} lang="my">
        {trimmed}
      </span>
      {analysis ? (
        <span className="burmese-reading-row" aria-label="MLCTS reading">
          <span className="burmese-reading" lang="my-Latn">
            {analysis.reading}
          </span>
          <span className="burmese-reading-label" aria-hidden="true">
            MLCTS
          </span>
        </span>
      ) : null}
      {showDetail && analysis ? (
        <span className="burmese-tone-row" aria-label="Tone names">
          <span className="burmese-tone-scheme" aria-hidden="true">
            Tone
          </span>
          {analysis.syllables.map((syl, i) => (
            <span
              key={`${syl.script}-${i}`}
              className={`burmese-tone-chip burmese-tone-chip--${syl.tone}`}
              title={`${syl.script}: ${burmeseToneLabel(syl.tone)}`}
            >
              {syl.script} · {burmeseToneChip(syl.tone)}
            </span>
          ))}
        </span>
      ) : null}
      {showDetail ? <span className="burmese-honesty">{BURMESE_TONE_HONESTY}</span> : null}
    </span>
  )

  if (!onActivate) return body
  return (
    <button
      type="button"
      className="burmese-activate"
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
