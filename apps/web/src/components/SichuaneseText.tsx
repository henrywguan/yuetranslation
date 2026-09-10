import type { ReactNode } from 'react'

/**
 * Sichuanese (四川话 / Chengdu) line — plain Han plus optional 四川话拼音.
 * Compact: Han + romanization under the characters (left-aligned).
 * Per-char pedagogy lives in Details (ruby title + breakdown), not here.
 */
export function SichuaneseText({
  text,
  romanization,
  className,
  onActivate,
  activateLabel,
  placeholder,
  showSchemeLabel = true,
}: {
  text: string
  /** Sichuanese Pinyin (四川话拼音) for the phrase. */
  romanization?: string
  className?: string
  onActivate?: (text: string) => void
  activateLabel?: string
  placeholder?: ReactNode
  /** Show a small “Sichuanese” caption after the romanization. */
  showSchemeLabel?: boolean
}) {
  const trimmed = text.trim()
  const rom = romanization?.trim() || ''
  if (!trimmed) return placeholder ? <>{placeholder}</> : null

  const han = (
    <span className={className || undefined} lang="zh-CN-sichuan">
      {trimmed}
    </span>
  )

  const body = (
    <span className="sichuanese-block">
      {han}
      {rom ? (
        <span className="sichuanese-rom-row">
          <span className="sichuanese-rom" lang="en">
            {rom}
          </span>
          {showSchemeLabel ? (
            <span className="sichuanese-rom-label" aria-hidden="true">
              Sichuanese
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  )

  if (onActivate) {
    return (
      <button
        type="button"
        className="sichuanese-activate spoken-line-text--action"
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
