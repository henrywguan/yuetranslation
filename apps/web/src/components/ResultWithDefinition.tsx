import { CantoneseText } from './CantoneseText'
import { ui } from '../lib/uiCopy'

/** English gloss above Cantonese; Jyutping via hover/tap on characters. */
export function ResultWithDefinition({
  text,
  definition,
  cantonese = true,
  className = '',
  textClassName = '',
}: {
  text: string
  definition?: string
  cantonese?: boolean
  className?: string
  textClassName?: string
}) {
  const trimmed = text.trim()
  const def = definition?.trim() || ''
  if (!trimmed && !def) return null

  return (
    <div className={`result-with-def ${className}`.trim()}>
      {def ? (
        <p className="result-with-def-gloss" aria-label={ui.definition.en}>
          {def}
        </p>
      ) : null}
      {cantonese ? (
        <CantoneseText text={trimmed} className={textClassName || 'result-text'} />
      ) : (
        <p className={textClassName || 'result-text'}>{trimmed}</p>
      )}
    </div>
  )
}
