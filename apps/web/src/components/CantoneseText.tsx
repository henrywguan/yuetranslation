import { useEffect, useState, type ReactNode } from 'react'
import { ensureJyutping, hasHan, toJyutpingCached } from '../lib/jyutping'
import { useJpPopup } from '../lib/useJpPopup'
import { JpPop } from './JpPop'

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

  const canJp = Boolean(jp)
  const { tipId, show, bind } = useJpPopup(canJp)

  if (!trimmed) return placeholder ? <>{placeholder}</> : null

  return (
    <span {...bind} className={`cantonese-block${canJp ? ' cantonese-block--hint' : ''}`}>
      <span className={className}>{trimmed}</span>
      {canJp ? <JpPop show={show} id={tipId} text={jp} /> : null}
    </span>
  )
}
