import { useEffect, useState, type ReactNode } from 'react'
import { ensureJyutping, hasHan, toJyutpingCached } from '../lib/jyutping'
import { useJpPopup } from '../lib/useJpPopup'
import { JpPop } from './JpPop'

/** Cantonese translation line with compact Jyutping underneath; tone letters on hover/tap. */
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
  const { tipId, show, bind } = useJpPopup(Boolean(jp))

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
        <span {...bind} className="jyutping jyutping--hint" lang="en">
          {jp}
          <JpPop show={show} id={tipId} text={jp} />
        </span>
      ) : null}
    </span>
  )
}
