import { CantoneseText } from './CantoneseText'
import { SpeakButton } from './SpeakButton'
import type { Lang } from '../lib/types'

/** Translation line only — gloss definitions stay out of the pane (details/drill-down only). */
export function ResultWithDefinition({
  text,
  definition,
  cantonese = true,
  className = '',
  textClassName = '',
  onActivate,
  speakLang,
}: {
  text: string
  /** Kept for character-detail drill-down; not rendered in the pane. */
  definition?: string
  cantonese?: boolean
  className?: string
  textClassName?: string
  onActivate?: (text: string) => void
  /** When set, show a tap-to-speak control for this line. */
  speakLang?: Lang
}) {
  const trimmed = text.trim()
  const def = definition?.trim() || ''
  if (!trimmed) return null

  return (
    <div className={`result-with-def ${className}`.trim()}>
      <div className="result-with-def-main">
        <div className="result-with-def-line">
          {cantonese ? (
            <CantoneseText
              text={trimmed}
              definition={def}
              className={textClassName || 'result-text'}
              onActivate={onActivate}
            />
          ) : (
            <p className={textClassName || 'result-text'}>{trimmed}</p>
          )}
          {speakLang && trimmed ? <SpeakButton text={trimmed} lang={speakLang} /> : null}
        </div>
      </div>
    </div>
  )
}
