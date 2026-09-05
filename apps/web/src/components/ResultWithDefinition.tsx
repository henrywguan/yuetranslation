import { CantoneseText } from './CantoneseText'
import { ResultActions } from './ResultActions'
import { CopyButton } from './CopyButton'
import { SpeakButton } from './SpeakButton'
import { normalizeEnglishApostrophes } from '../lib/typography'
import type { Lang } from '../lib/types'

/** Translation line only — gloss definitions stay out of the pane (details/drill-down only). */
export function ResultWithDefinition({
  text,
  definition,
  definitions,
  cantonese = true,
  className = '',
  textClassName = '',
  onActivate,
  speakLang,
  showCopy = true,
}: {
  text: string
  /** Kept for character-detail drill-down; not rendered in the pane. */
  definition?: string
  /** Multiple English senses — triggers dotted underline + details open. */
  definitions?: string[]
  cantonese?: boolean
  className?: string
  textClassName?: string
  onActivate?: (text: string) => void
  /** When set, show a tap-to-speak control for this line. */
  speakLang?: Lang
  /** Show copy beside speak (Cantonese only). */
  showCopy?: boolean
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
              definitions={definitions}
              className={textClassName || 'result-text'}
              onActivate={onActivate}
            />
          ) : (
            <p className={textClassName || 'result-text'}>{normalizeEnglishApostrophes(trimmed)}</p>
          )}
          {speakLang && trimmed ? (
            speakLang === 'yue' ? (
              <ResultActions text={trimmed} lang={speakLang} showCopy={showCopy} />
            ) : (
              <SpeakButton text={trimmed} lang={speakLang} />
            )
          ) : showCopy && cantonese && trimmed ? (
            <CopyButton text={trimmed} lang="yue" />
          ) : null}
        </div>
      </div>
    </div>
  )
}
