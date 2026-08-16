import { CantoneseText } from './CantoneseText'
import { SpeakButton } from './SpeakButton'
import { ui } from '../lib/uiCopy'
import type { Lang } from '../lib/types'

/** Cantonese (with Jyutping under) on the left; English gloss on the right. */
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
  if (!trimmed && !def) return null

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
          ) : onActivate ? (
            <button
              type="button"
              className={`${textClassName || 'result-text'} spoken-line-text--action`}
              onClick={() => onActivate(trimmed)}
              aria-label="Open translation details"
            >
              {trimmed}
            </button>
          ) : (
            <p className={textClassName || 'result-text'}>{trimmed}</p>
          )}
          {speakLang && trimmed ? <SpeakButton text={trimmed} lang={speakLang} /> : null}
        </div>
      </div>
      {def ? (
        <p className="result-with-def-gloss ink-in" aria-label={ui.definition.en}>
          {def}
        </p>
      ) : null}
    </div>
  )
}
