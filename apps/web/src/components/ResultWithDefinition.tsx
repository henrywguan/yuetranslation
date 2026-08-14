import { CantoneseText } from './CantoneseText'
import { ui } from '../lib/uiCopy'

/** Cantonese (with Jyutping under) on the left; English gloss on the right. */
export function ResultWithDefinition({
  text,
  definition,
  cantonese = true,
  className = '',
  textClassName = '',
  onActivate,
}: {
  text: string
  definition?: string
  cantonese?: boolean
  className?: string
  textClassName?: string
  onActivate?: (text: string) => void
}) {
  const trimmed = text.trim()
  const def = definition?.trim() || ''
  if (!trimmed && !def) return null

  return (
    <div className={`result-with-def ${className}`.trim()}>
      <div className="result-with-def-main">
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
      </div>
      {def ? (
        <p className="result-with-def-gloss ink-in" aria-label={ui.definition.en}>
          {def}
        </p>
      ) : null}
    </div>
  )
}
