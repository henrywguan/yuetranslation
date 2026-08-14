import { CantoneseText } from './CantoneseText'
import { ui } from '../lib/uiCopy'

/**
 * Minimal result: Chinese (Jyutping on hover/tap), quiet English gloss below.
 */
export function ResultWithDefinition({
  text,
  definition,
  cantonese = true,
  className = '',
  textClassName = '',
  jyutpingClassName,
}: {
  text: string
  definition?: string
  cantonese?: boolean
  className?: string
  textClassName?: string
  jyutpingClassName?: string
}) {
  const trimmed = text.trim()
  const def = definition?.trim() || ''
  if (!trimmed && !def) return null

  return (
    <div className={`result-with-def ${className}`.trim()}>
      {cantonese ? (
        <CantoneseText
          text={trimmed}
          className={textClassName || 'result-text'}
          jyutpingClassName={jyutpingClassName}
        />
      ) : (
        <p className={textClassName || 'result-text'}>{trimmed}</p>
      )}
      {def ? (
        <p className="result-with-def-gloss" aria-label={ui.definition.en}>
          {def}
        </p>
      ) : null}
    </div>
  )
}
