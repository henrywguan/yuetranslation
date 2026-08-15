import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { BiText } from './BiText'
import {
  expandJyutping,
  ensureIpa,
  isEnteringTone,
  isValidDefinition,
  toneNumber,
  type JyutSeg,
} from '../lib/jyutping'
import { charSense } from '../lib/charSense'
import { translateText } from '../lib/api'
import { biPlain, ui, type Bi } from '../lib/uiCopy'

const TONE_NAME: Record<string, Bi> = {
  '1': ui.tone1,
  '2': ui.tone2,
  '3': ui.tone3,
  '4': ui.tone4,
  '5': ui.tone5,
  '6': ui.tone6,
}

const TONE_CUE: Record<string, Bi> = {
  '1': ui.toneCue1,
  '2': ui.toneCue2,
  '3': ui.toneCue3,
  '4': ui.toneCue4,
  '5': ui.toneCue5,
  '6': ui.toneCue6,
}

export type CharDetail = JyutSeg & {
  phrase: string
  definition: string
}

export function CharDetailSheet({
  detail,
  onClose,
}: {
  detail: CharDetail | null
  onClose: () => void
}) {
  const reduce = useReducedMotion()
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const [ipa, setIpa] = useState('')
  const [charDef, setCharDef] = useState('')

  useEffect(() => {
    if (!detail) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [detail, onClose])

  useEffect(() => {
    if (!detail?.jp) {
      setIpa('')
      return
    }
    let cancelled = false
    void ensureIpa(detail.jp).then((v) => {
      if (!cancelled) setIpa(v)
    })
    return () => {
      cancelled = true
    }
  }, [detail?.jp])

  useEffect(() => {
    if (!detail) {
      setCharDef('')
      return
    }
    const local = charSense(detail.char)
    setCharDef(local)
    if (local) return
    let cancelled = false
    void translateText(detail.char, 'yue', 'en').then((res) => {
      if (cancelled) return
      const sense = isValidDefinition(res.definition)
        ? res.definition || ''
        : isValidDefinition(res.text)
          ? res.text
          : ''
      if (sense && sense !== detail.char) setCharDef(sense)
    })
    return () => {
      cancelled = true
    }
  }, [detail])

  const tone = detail ? toneNumber(detail.jp) : ''
  const entering = detail ? isEnteringTone(detail.jp) : false

  return createPortal(
    <AnimatePresence>
      {detail ? (
        <motion.div
          className="char-sheet-scrim"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? undefined : { opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="char-sheet"
            initial={reduce ? false : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: 16 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="char-sheet-bar">
              <p id={titleId} className="char-sheet-kicker">
                <BiText copy={ui.charDetail} size="sm" layout="inline" hideJp />
              </p>
              <button
                ref={closeRef}
                type="button"
                className="char-sheet-close"
                onClick={onClose}
                aria-label={biPlain(ui.close)}
              >
                <BiText copy={ui.close} size="sm" layout="inline" hideJp />
              </button>
            </div>

            <p className="char-sheet-glyph" lang="zh-HK">
              {detail.char}
            </p>
            {detail.jp ? (
              <p className="char-sheet-jp" lang="en">
                {expandJyutping(detail.jp)}
                {ipa ? <span className="char-sheet-ipa">[{ipa}]</span> : null}
              </p>
            ) : null}

            {tone && TONE_NAME[tone] ? (
              <section className="char-sheet-block">
                <h3>
                  <BiText copy={ui.tone} size="sm" layout="inline" hideJp /> {tone}
                </h3>
                <p>
                  <BiText copy={TONE_NAME[tone]} size="sm" layout="inline" hideJp />
                  <span className="char-sheet-sep"> · </span>
                  <BiText copy={TONE_CUE[tone]} size="sm" layout="inline" hideJp />
                </p>
                {entering ? (
                  <p className="char-sheet-note">
                    <BiText copy={ui.enteringTone} size="sm" layout="inline" hideJp />
                  </p>
                ) : null}
              </section>
            ) : null}

            {charDef ? (
              <section className="char-sheet-block">
                <h3>
                  <BiText copy={ui.thisCharacter} size="sm" layout="inline" hideJp />
                </h3>
                <p>{charDef}</p>
              </section>
            ) : null}

            {isValidDefinition(detail.definition) ? (
              <section className="char-sheet-block">
                <h3>
                  <BiText copy={ui.inThisPhrase} size="sm" layout="inline" hideJp />
                </h3>
                <p lang="zh-HK">{detail.phrase}</p>
                <p className="char-sheet-gloss">{detail.definition}</p>
              </section>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
