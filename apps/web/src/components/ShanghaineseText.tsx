import type { ReactNode } from 'react'

/**
 * Shanghainese (沪语) line — plain Han plus optional Wugniu romanization.
 * Do not use Mandarin pinyin ruby or Cantonese Jyutping tone digits here:
 * Wu tone sandhi is left-dominant, so compact UI stays sandhi-honest.
 */
export function ShanghaineseText({
  text,
  romanization,
  className,
  onActivate,
  activateLabel,
  placeholder,
  showSchemeLabel = true,
}: {
  text: string
  /** Wugniu (吴语学堂) romanization for the phrase. */
  romanization?: string
  className?: string
  onActivate?: (text: string) => void
  activateLabel?: string
  placeholder?: ReactNode
  /** Show a small “Wugniu” caption beside the romanization line. */
  showSchemeLabel?: boolean
}) {
  const trimmed = text.trim()
  const rom = romanization?.trim() || ''
  if (!trimmed) return placeholder ? <>{placeholder}</> : null

  const han = (
    <span className={className || undefined} lang="wuu-CN">
      {trimmed}
    </span>
  )

  const body = (
    <span className="shanghainese-block">
      {han}
      {rom ? (
        <span className="shanghainese-wugniu-row">
          {showSchemeLabel ? (
            <span className="shanghainese-wugniu-label" aria-hidden="true">
              Wugniu
            </span>
          ) : null}
          <span className="shanghainese-wugniu" lang="en">
            {rom}
          </span>
        </span>
      ) : null}
    </span>
  )

  if (onActivate) {
    return (
      <button
        type="button"
        className="shanghainese-activate spoken-line-text--action"
        onClick={() => onActivate(trimmed)}
        aria-label={
          activateLabel ||
          (rom ? `Open details for ${trimmed} (${rom})` : `Open details for ${trimmed}`)
        }
      >
        {body}
      </button>
    )
  }

  return body
}
