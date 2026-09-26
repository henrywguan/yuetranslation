import type { ReactNode } from 'react'
import { LAO_TONE_HONESTY, analyzeLao, laoToneChip, laoToneLabel } from '../lib/laoTones'

/**
 * Vientiane Lao line. Compact shows script plus a five-tone reading.
 * Details add tone-name chips and the five-vs-six / class-rule note.
 */
export function LaoText({
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
  showDetail?: boolean
}) {
  const trimmed = text.trim()
  if (!trimmed) return placeholder ? <>{placeholder}</> : null
  const analysis = analyzeLao(trimmed)

  const body = (
    <span className="thai-lao-block">
      <span className={className || undefined} lang="lo">
        {trimmed}
      </span>
      {analysis ? (
        <span className="thai-lao-reading-row" aria-label="Tone reading">
          <span className="thai-lao-reading" lang="lo-Latn">
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
              title={`${syl.script}: ${laoToneLabel(syl.tone)}`}
            >
              {syl.script} · {laoToneChip(syl.tone)}
            </span>
          ))}
        </span>
      ) : null}
      {showDetail ? <span className="thai-lao-honesty">{LAO_TONE_HONESTY}</span> : null}
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
