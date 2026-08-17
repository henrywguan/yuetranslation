import { useEffect, useState, type ReactNode } from 'react'
import {
  ensureJyutpingSegs,
  hasHan,
  isValidDefinition,
  toJyutpingCached,
  type JyutSeg,
} from '../lib/jyutping'
import { charSense } from '../lib/charGloss'
import { useJpPopup } from '../lib/useJpPopup'
import { CharDetailSheet, type CharDetail } from './CharDetailSheet'
import { JpPop } from './JpPop'

/** Cantonese line: compact Jyutping under Han; multi-def phrases get a dotted underline. */
export function CantoneseText({
  text,
  definition = '',
  definitions,
  className,
  placeholder,
  onActivate,
  activateLabel,
}: {
  text: string
  definition?: string
  /** When 2+ English senses exist, Han gets a dotted underline + tap opens details. */
  definitions?: string[]
  className?: string
  placeholder?: ReactNode
  /**
   * When set without character drills available, the whole phrase is clickable
   * (opens breakdown / selects variation). Character taps still win when drills exist.
   */
  onActivate?: (text: string) => void
  activateLabel?: string
}) {
  const trimmed = text.trim()
  const [jp, setJp] = useState(() => toJyutpingCached(trimmed))
  const [segs, setSegs] = useState<JyutSeg[]>([])
  const [detail, setDetail] = useState<CharDetail | null>(null)
  const { tipId, show, bind, wrapRef } = useJpPopup(Boolean(jp))
  const phraseDef = isValidDefinition(definition) ? definition.trim() : ''
  const multiDefs = (definitions || []).map((d) => d.trim()).filter(Boolean)
  const hasMultiDef = multiDefs.length > 1

  useEffect(() => {
    let cancelled = false
    if (!trimmed || !hasHan(trimmed)) {
      setJp('')
      setSegs([])
      return
    }
    const cached = toJyutpingCached(trimmed)
    if (cached) setJp(cached)
    void ensureJyutpingSegs(trimmed).then((nextSegs) => {
      if (cancelled) return
      setSegs(nextSegs)
      setJp(toJyutpingCached(trimmed))
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

  const drillable = segs.some((seg) => Boolean(seg.jp) && Boolean(phraseDef || charSense(seg.char)))
  // Multi-def phrases open the details pane as a whole (char drills live inside that pane).
  const phraseActivate = Boolean(onActivate) && (hasMultiDef || !drillable)
  const allowCharDrill = drillable && !hasMultiDef

  const hanClass = `${className || ''}${hasMultiDef ? ' cantonese-multi-def' : ''}`.trim()

  const body = (
    <span className={`cantonese-block${hasMultiDef ? ' cantonese-block--multi-def' : ''}`}>
      <span className={hanClass}>
        {segs.length
          ? segs.map((seg, i) => {
              const canDrill =
                allowCharDrill && Boolean(seg.jp) && Boolean(phraseDef || charSense(seg.char))
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
        onActivate && (drillable || hasMultiDef) && !phraseActivate ? (
          <button
            type="button"
            className={`jyutping jyutping--hint jyutping--activate ink-in${hasMultiDef ? ' jyutping--multi-def' : ''}`}
            lang="en"
            onClick={() => onActivate(trimmed)}
            aria-label={
              activateLabel ||
              (hasMultiDef
                ? `Open definitions for ${trimmed}`
                : `Open character breakdown for ${trimmed}`)
            }
          >
            {jp}
          </button>
        ) : (
          <span
            {...(phraseActivate ? {} : bind)}
            className={`jyutping jyutping--hint ink-in${hasMultiDef ? ' jyutping--multi-def' : ''}`}
            lang="en"
          >
            {jp}
            {!phraseActivate ? (
              <JpPop show={show} id={tipId} text={jp} han={trimmed} anchorRef={wrapRef} />
            ) : null}
          </span>
        )
      ) : null}
      <CharDetailSheet detail={detail} onClose={() => setDetail(null)} />
    </span>
  )

  if (!phraseActivate) return body

  return (
    <button
      type="button"
      className={`cantonese-activate${hasMultiDef ? ' cantonese-activate--multi-def' : ''}`}
      onClick={() => onActivate?.(trimmed)}
      aria-label={
        activateLabel ||
        (hasMultiDef ? `Open definitions for ${trimmed}` : `Open character breakdown for ${trimmed}`)
      }
    >
      {body}
    </button>
  )
}
