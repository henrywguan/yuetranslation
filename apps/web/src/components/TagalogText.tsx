import type { ReactNode } from 'react'
import { tagalogStressClass, tagalogStressLabel } from '../lib/tagalogPronunciation'

/**
 * Tagalog line with stress/glottal hint (dictionary diacritics → learner chip).
 * No tones — Tagalog marks stress + final glottal, not contour tones.
 */
export function TagalogText({
  text,
  className,
  placeholder,
  onActivate,
  activateLabel,
}: {
  text: string
  definition?: string
  definitions?: string[]
  className?: string
  placeholder?: ReactNode
  onActivate?: (text: string) => void
  activateLabel?: string
}) {
  const trimmed = text.trim()
  if (!trimmed) return placeholder ? <>{placeholder}</> : null

  // Only surface a chip when dictionary diacritics mark non-default stress/glottal.
  const words = trimmed.split(/\s+/).filter(Boolean)
  const marked = words
    .map((w) => ({ w, kind: tagalogStressClass(w) }))
    .find((x) => x.kind && x.kind !== 'malumay')
  const kind = marked?.kind ?? null
  const label = kind ? tagalogStressLabel(kind) : null

  const body = (
    <span className={`tagalog-block${label ? ' tagalog-block--hint' : ''}`}>
      <span className={className || undefined} lang="tl">
        {trimmed}
      </span>
      {label ? (
        <span className="tagalog-stress-chip" title={`Pronunciation: ${label}`}>
          {label}
        </span>
      ) : null}
    </span>
  )

  if (!onActivate) return body

  return (
    <button
      type="button"
      className="tagalog-activate"
      onClick={() => onActivate(trimmed)}
      aria-label={activateLabel || `${trimmed}. Open details.`}
    >
      {body}
    </button>
  )
}
