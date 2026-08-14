import { useEffect, useState, type ReactNode } from 'react'
import {
  ensureJyutpingList,
  hasHan,
  toJyutpingListCached,
  type JyutpingPair,
} from '../lib/jyutping'

/**
 * Renders text with Jyutping under every Chinese character (HTML ruby).
 * Non-Han characters render as plain text with no reading.
 */
export function CantoneseText({
  text,
  className,
  jyutpingClassName = 'jyutping',
  placeholder,
}: {
  text: string
  className?: string
  jyutpingClassName?: string
  placeholder?: ReactNode
}) {
  const trimmed = text.trim()
  const [pairs, setPairs] = useState<JyutpingPair[] | null>(() =>
    trimmed ? toJyutpingListCached(trimmed) : [],
  )

  useEffect(() => {
    let cancelled = false
    if (!trimmed) {
      setPairs([])
      return
    }
    if (!hasHan(trimmed)) {
      setPairs(trimmed.split('').map((c) => [c, null] as JyutpingPair))
      return
    }
    const cached = toJyutpingListCached(trimmed)
    if (cached) {
      setPairs(cached)
      return
    }
    setPairs(null)
    void ensureJyutpingList(trimmed).then((list) => {
      if (!cancelled) setPairs(list)
    })
    return () => {
      cancelled = true
    }
  }, [trimmed])

  if (!trimmed) return placeholder ? <>{placeholder}</> : null

  // Show characters immediately; fill ruby as soon as readings load.
  const display: JyutpingPair[] =
    pairs ?? (trimmed.split('').map((c) => [c, null] as JyutpingPair))

  return (
    <span className={['cantonese-block', className].filter(Boolean).join(' ')}>
      {display.map(([char, jp], i) =>
        jp ? (
          <ruby key={`${i}-${char}`} className="cantonese-ruby">
            {char}
            <rt className={jyutpingClassName}>{jp}</rt>
          </ruby>
        ) : (
          <span key={`${i}-${char}`} className="cantonese-plain">
            {char}
          </span>
        ),
      )}
    </span>
  )
}
