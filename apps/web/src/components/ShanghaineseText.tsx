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
}: {
  text: string
  romanization?: string
  className?: string
  onActivate?: (text: string) => void
  activateLabel?: string
  placeholder?: ReactNode
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
        <span className="shanghainese-wugniu" lang="en">
          {rom}
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
        aria-label={activateLabel || `Open details for ${trimmed}`}
      >
        {body}
      </button>
    )
  }

  return body
}
