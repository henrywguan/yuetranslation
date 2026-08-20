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
import { JyutRuby } from './JyutRuby'

/** Cantonese line: ruby Jyutping above Han, or popup-on-hint for tight cards. */
export function CantoneseText({
  text,
  definition = '',
  definitions,
  className,
  placeholder,
  onActivate,
  activateLabel,
  jpMode = 'inline',
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
  /**
   * `inline` — ruby Jyutping above each Han character (Solo / Conversation / Text).
   * `popup` — hide the line; dotted underline + hover/tap reveals Jyutping (History).
   */
  jpMode?: 'inline' | 'popup'
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
  const popupJp = jpMode === 'popup' && Boolean(jp)
  const phraseActivate = Boolean(onActivate) && !popupJp && (hasMultiDef || !drillable)
  const allowCharDrill = drillable && !hasMultiDef && !popupJp

  const hanClass = [
    className || '',
    hasMultiDef ? 'cantonese-multi-def' : '',
    popupJp ? 'cantonese-jp-hint' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const renderChar =
    allowCharDrill && segs.length
      ? (seg: JyutSeg, _i: number) => {
          const canDrill = Boolean(seg.jp) && Boolean(phraseDef || charSense(seg.char))
          if (!canDrill) return seg.char
          return (
            <button
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
        }
      : undefined

  const popupHan = popupJp ? (
    <span
      {...bind}
      className={hanClass}
      lang="zh-HK"
      aria-label={`Jyutping for ${trimmed}`}
    >
      {segs.length
        ? segs.map((seg, i) => (
            <span key={`${seg.char}-${i}`}>{seg.char}</span>
          ))
        : trimmed}
      <JpPop show={show} id={tipId} han={trimmed} anchorRef={wrapRef} />
    </span>
  ) : null

  const inlineHan =
    jp && !popupJp ? (
      <span {...(phraseActivate ? {} : bind)} className={hanClass || undefined}>
        <JyutRuby
          han={trimmed}
          segs={segs}
          size="lg"
          className={phraseActivate || hasMultiDef ? 'jyut-ruby--phrase' : 'jyut-ruby--hint'}
          renderChar={renderChar}
        />
        {!phraseActivate ? (
          <JpPop show={show} id={tipId} han={trimmed} anchorRef={wrapRef} />
        ) : null}
      </span>
    ) : (
      <span className={hanClass || undefined}>{trimmed}</span>
    )

  const body = (
    <span
      className={`cantonese-block${hasMultiDef ? ' cantonese-block--multi-def' : ''}${popupJp ? ' cantonese-block--jp-popup' : ''}${jp && !popupJp ? ' cantonese-block--ruby' : ''}`}
    >
      {popupJp ? popupHan : inlineHan}
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
