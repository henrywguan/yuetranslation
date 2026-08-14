import { BiText } from './BiText'
import { CantoneseText } from './CantoneseText'
import { ui } from '../lib/uiCopy'

/**
 * Cantonese (or English) result on the left; short English definition on the right.
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
      <div className="result-with-def-main">
        {cantonese ? (
          <CantoneseText
            text={trimmed}
            className={textClassName || 'result-text'}
            jyutpingClassName={jyutpingClassName}
          />
        ) : (
          <p className={textClassName || 'result-text'}>{trimmed}</p>
        )}
      </div>
      {def ? (
        <aside className="result-with-def-side" aria-label={ui.definition.en}>
          <p className="result-with-def-label">
            <BiText copy={ui.definition} size="sm" />
          </p>
          <p className="result-with-def-body">{def}</p>
        </aside>
      ) : null}
    </div>
  )
}
