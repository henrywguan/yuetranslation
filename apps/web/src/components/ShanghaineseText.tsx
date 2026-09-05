import type { ReactNode } from 'react'

/**
 * Shanghainese (沪语) line — plain Han plus optional Wugniu romanization.
 * Do not use Mandarin pinyin ruby or Cantonese Jyutping tone digits here:
 * Wu tone sandhi is left-dominant, so compact UI stays sandhi-honest.
 *
 * Compact: Han + Wugniu under the characters (romanization left-aligned).
 * Sandhi / IPA: details pane only (`showSandhiHint`).
 */
export function ShanghaineseText({
  text,
  romanization,
  sandhiHint,
  className,
  onActivate,
  activateLabel,
  placeholder,
  showSchemeLabel = true,
  showSandhiHint = false,
}: {
  text: string
  /** Wugniu (吴语学堂) romanization for the phrase. */
  romanization?: string
  /** Sandhi-domain hint — shown only when `showSandhiHint` (details). */
  sandhiHint?: string
  className?: string
  onActivate?: (text: string) => void
  activateLabel?: string
  placeholder?: ReactNode
  /** Show a small “Wugniu” caption after the romanization. */
  showSchemeLabel?: boolean
  /** Opt-in sandhi row (details pane). Compact results stay Han + Wugniu only. */
  showSandhiHint?: boolean
}) {
  const trimmed = text.trim()
  const rom = romanization?.trim() || ''
  const sandhi = showSandhiHint ? sandhiHint?.trim() || '' : ''
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
          <span className="shanghainese-wugniu" lang="en">
            {rom}
          </span>
          {showSchemeLabel ? (
            <span className="shanghainese-wugniu-label" aria-hidden="true">
              Wugniu
            </span>
          ) : null}
        </span>
      ) : null}
      {sandhi ? (
        <span className="shanghainese-sandhi-row">
          <span className="shanghainese-sandhi" lang="en">
            {sandhi}
          </span>
          <span className="shanghainese-sandhi-label" aria-hidden="true">
            Sandhi
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
          (rom
            ? `Open details for ${trimmed} (${rom}${sandhi ? `; ${sandhi}` : ''})`
            : `Open details for ${trimmed}`)
        }
      >
        {body}
      </button>
    )
  }

  return body
}
