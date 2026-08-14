import { useEffect, useState, type ReactNode } from 'react'
import { ensureJyutping, hasHan, toJyutpingCached } from '../lib/jyutping'

/** Cantonese translation line with Jyutping always shown underneath. */
export function CantoneseText({
  text,
  className,
  placeholder,
}: {
  text: string
  className?: string
  placeholder?: ReactNode
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

  return (
    <span className="cantonese-block">
      <span className={className}>{trimmed}</span>
      {jp ? (
        <span className="jyutping" lang="en">
          {jp}
        </span>
      ) : null}
    </span>
  )
}
