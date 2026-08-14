import { useEffect, useState, type ReactNode } from 'react'
import { ensureJyutping, hasHan, toJyutpingCached } from '../lib/jyutping'

export function CantoneseText({
  text,
  className,
  jyutpingClassName = 'jyutping',
  placeholder,
  onActivate,
  activateLabel,
}: {
  text: string
  className?: string
  jyutpingClassName?: string
  placeholder?: ReactNode
  /** When set, the phrase is clickable (opens breakdown / selects variation). */
  onActivate?: (text: string) => void
  activateLabel?: string
}) {
  const trimmed = text.trim()
  const [jp, setJp] = useState(() => toJyutpingCached(trimmed))
  useEffect(() => {
    let cancelled = false
    if (!trimmed || !hasHan(trimmed)) {
      setJp('')
      return
    }
    const cached = toJyutpingCached(trimmed)
    if (cached) {
      setJp(cached)
      return
    }
    void ensureJyutping(trimmed).then((v) => {
      if (!cancelled) setJp(v)
    })
    return () => {
      cancelled = true
    }
  }, [trimmed])

  if (!trimmed) return placeholder ? <>{placeholder}</> : null

  const body = (
    <span className="cantonese-block">
      <span className={className}>{trimmed}</span>
      {jp ? <span className={jyutpingClassName}>{jp}</span> : null}
    </span>
  )

  if (!onActivate) return body

  return (
    <button
      type="button"
      className="cantonese-activate"
      onClick={() => onActivate(trimmed)}
      aria-label={activateLabel || `Open character breakdown for ${trimmed}`}
    >
      {body}
    </button>
  )
}
