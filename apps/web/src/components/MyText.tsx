import type { ReactNode } from 'react'

/**
 * Scaffold compact line for Burmese (`my`).
 * Cloud agent: replace with real pedagogy (readings / chips / honesty notes).
 */
export function MyText({
  text,
  className,
  placeholder,
  onActivate,
  activateLabel,
  showDetail = false,
}: {
  text: string
  className?: string
  placeholder?: ReactNode
  onActivate?: (text: string) => void
  activateLabel?: string
  showDetail?: boolean
}) {
  const trimmed = text.trim()
  if (!trimmed) return placeholder ? <>{placeholder}</> : null

  const body = (
    <span className={className || undefined} lang="my" data-scaffold-lang="my">
      {trimmed}
      {showDetail ? null : null}
    </span>
  )

  if (!onActivate) return body

  return (
    <button
      type="button"
      className="scaffold-lang-activate"
      onClick={() => onActivate(trimmed)}
      aria-label={activateLabel || `${trimmed}. Open details.`}
    >
      {body}
    </button>
  )
}
