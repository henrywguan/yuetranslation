import { useEffect, useState, type ReactNode } from 'react'
import {
  ensureJyutping,
  ensureJyutpingSegs,
  hasHan,
  isValidDefinition,
  toJyutpingCached,
  type JyutSeg,
} from '../lib/jyutping'
import { charSense } from '../lib/charSense'
import { useJpPopup } from '../lib/useJpPopup'
import { CharDetailSheet, type CharDetail } from './CharDetailSheet'
import { JpPop } from './JpPop'

/** Cantonese line: compact Jyutping under Han; tap a character to open details when a definition exists. */
export function CantoneseText({
  text,
  definition = '',
  className,
  placeholder,
}: {
  text: string
  definition?: string
  className?: string
  placeholder?: ReactNode
}) {
  const trimmed = text.trim()
  const [jp, setJp] = useState(() => toJyutpingCached(trimmed))
  const [segs, setSegs] = useState<JyutSeg[]>([])
  const [detail, setDetail] = useState<CharDetail | null>(null)
  const { tipId, show, bind } = useJpPopup(Boolean(jp))
  const phraseDef = isValidDefinition(definition) ? definition.trim() : ''

  useEffect(() => {
    let cancelled = false
    if (!trimmed || !hasHan(trimmed)) {
      setJp('')
      setSegs([])
      return
    }
    const cached = toJyutpingCached(trimmed)
    if (cached) setJp(cached)
    void Promise.all([ensureJyutping(trimmed), ensureJyutpingSegs(trimmed)]).then(([nextJp, nextSegs]) => {
      if (cancelled) return
      setJp(nextJp)
      setSegs(nextSegs)
    })
    return () => {
      cancelled = true
    }
  }, [trimmed])

  if (!trimmed) return placeholder ? <>{placeholder}</> : null

  function openSeg(seg: JyutSeg) {
    const own = charSense(seg.char)
    if (!phraseDef && !own) return
    setDetail({ ...seg, phrase: trimmed, definition: phraseDef })
  }

  return (
    <span className="cantonese-block">
      <span className={className}>
        {segs.length
          ? segs.map((seg, i) => {
              const canDrill = Boolean(seg.jp) && Boolean(phraseDef || charSense(seg.char))
              if (!canDrill) {
                return <span key={`${seg.char}-${i}`}>{seg.char}</span>
              }
              return (
                <button
                  key={`${seg.char}-${i}`}
                  type="button"
                  className="han-drill"
                  aria-haspopup="dialog"
                  onClick={(e) => {
                    e.stopPropagation()
                    openSeg(seg)
                  }}
                >
                  {seg.char}
                </button>
              )
            })
          : trimmed}
      </span>
      {jp ? (
        <span {...bind} className="jyutping jyutping--hint" lang="en">
          {jp}
          <JpPop show={show} id={tipId} text={jp} />
        </span>
      ) : null}
      <CharDetailSheet detail={detail} onClose={() => setDetail(null)} />
    </span>
  )
}
