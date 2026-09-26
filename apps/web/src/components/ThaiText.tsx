import type { ReactNode } from 'react'
import {
  THAI_TONE_HONESTY,
  analyzeThai,
  thaiToneChip,
  thaiToneLabel,
} from '../lib/thaiTones'

/**
 * Central Thai line. Compact always shows script plus a tone-marked reading
 * when the class rules parse — the written mark alone is not the pitch.
 * Details add tone-name chips and the class-rule note. No Chao letters, no RTGS.
 */
export function ThaiText({
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
  /** Details pane: tone chips + why the mark is not the tone. */
  showDetail?: boolean
}) {
  const trimmed = text.trim()
  if (!trimmed) return placeholder ? <>{placeholder}</> : null
  const analysis = analyzeThai(trimmed)

  const body = (
    <span className="thai-lao-block">
      <span className={className || undefined} lang="th">
        {trimmed}
      </span>
      {analysis ? (
        <span className="thai-lao-reading-row" aria-label="Tone reading">
          <span className="thai-lao-reading" lang="th-Latn">
            {analysis.reading}
          </span>
          <span className="thai-lao-reading-label" aria-hidden="true">
            Tones
          </span>
        </span>
      ) : null}
      {showDetail && analysis ? (
        <span className="thai-lao-tone-row" aria-label="Tone names">
          <span className="thai-lao-tone-scheme" aria-hidden="true">
            Tone
          </span>
          {analysis.syllables.map((syl, i) => (
            <span
              key={`${syl.script}-${i}`}
              className={`thai-lao-tone-chip thai-lao-tone-chip--${syl.tone}`}
              title={`${syl.script}: ${thaiToneLabel(syl.tone)}`}
            >
              {syl.script} · {thaiToneChip(syl.tone)}
            </span>
          ))}
        </span>
      ) : null}
      {showDetail ? <span className="thai-lao-honesty">{THAI_TONE_HONESTY}</span> : null}
    </span>
  )

  if (!onActivate) return body
  return (
    <button
      type="button"
      className="thai-lao-activate"
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
