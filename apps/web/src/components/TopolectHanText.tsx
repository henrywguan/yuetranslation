import type { ReactNode } from 'react'

/**
 * Text-only Chinese topolect line — plain Han plus optional romanization
 * (Pha̍k-fa-sṳ / Peng’im / Tâi-lô). Compact: Han + romanization under the characters.
 * Per-char pedagogy lives in Details (ruby title + breakdown), not here.
 * Reuses Sichuanese layout classes (shared Han + romanization row).
 */
export function TopolectHanText({
  text,
  romanization,
  schemeLabel,
  htmlLang = 'zh',
  className,
  onActivate,
  activateLabel,
  placeholder,
  showSchemeLabel = true,
}: {
  text: string
  /** Phrase romanization (Pha̍k-fa-sṳ / Peng’im / Tâi-lô). */
  romanization?: string
  /** Caption after the romanization, e.g. "Pha̍k-fa-sṳ". */
  schemeLabel: string
  /** BCP-47 for the Han span. */
  htmlLang?: string
  className?: string
  onActivate?: (text: string) => void
  activateLabel?: string
  placeholder?: ReactNode
  /** Show a small scheme caption after the romanization. */
  showSchemeLabel?: boolean
}) {
  const trimmed = text.trim()
  const rom = romanization?.trim() || ''
  if (!trimmed) return placeholder ? <>{placeholder}</> : null

  const han = (
    <span className={className || undefined} lang={htmlLang}>
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
              {schemeLabel}
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

export function topolectSchemeLabel(lang: 'hak' | 'teo' | 'nan'): string {
  if (lang === 'hak') return 'Pha̍k-fa-sṳ'
  if (lang === 'teo') return 'Peng’im'
  return 'Tâi-lô'
}

export function topolectHtmlLang(lang: 'hak' | 'teo' | 'nan'): string {
  if (lang === 'hak') return 'hak'
  if (lang === 'teo') return 'zh-CN-teo'
  return 'nan-CN'
}
