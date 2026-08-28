import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { BiText } from './BiText'
import { ResultWithDefinition } from './ResultWithDefinition'
import { SpeakButton } from './SpeakButton'
import { TranslateThinking } from './TranslateThinking'
import { TranslationAlternatives } from './TranslationAlternatives'
import { useYueStore } from '../lib/store'
import { biPlain, ui } from '../lib/uiCopy'
import type { Lang } from '../lib/types'

const AUTO_TRANSLATE_MS = 2000

function isWorthAutoTranslate(value: string, from: Lang): boolean {
  const t = value.trim()
  if (!t) return false
  if (from === 'yue') {
    return /[\u4e00-\u9fff]/.test(t) || t.length >= 2
  }
  const letters = t.replace(/[^\p{L}\p{N}]+/gu, '')
  return letters.length >= 3 || t.split(/\s+/).filter(Boolean).length >= 2
}

export function SoloView() {
  const enInterim = useYueStore((s) => s.enInterim)
  const yueInterim = useYueStore((s) => s.yueInterim)
  const enTranslation = useYueStore((s) => s.enTranslation)
  const yueTranslation = useYueStore((s) => s.yueTranslation)
  const yueDefinition = useYueStore((s) => s.yueDefinition)
  const yueDefinitions = useYueStore((s) => s.yueDefinitions)
  const yueAlternatives = useYueStore((s) => s.yueAlternatives)
  const altsLoading = useYueStore((s) => s.altsLoading)
  const openBreakdown = useYueStore((s) => s.openBreakdown)
  const selectYueVariation = useYueStore((s) => s.selectYueVariation)
  const setSpeakDirection = useYueStore((s) => s.setSpeakDirection)
  const setSoloShowAutoHint = useYueStore((s) => s.setSoloShowAutoHint)
  const translateTyped = useYueStore((s) => s.translateTyped)
  const live = useYueStore((s) => s.live)
  const status = useYueStore((s) => s.status)
  const history = useYueStore((s) => s.history)
  const translating = useYueStore((s) => s.translating)
  const translatingTo = useYueStore((s) => s.translatingTo)

  const [enDraft, setEnDraft] = useState('')
  const [yueDraft, setYueDraft] = useState('')
  const [yueEditing, setYueEditing] = useState(false)
  const [typedBusy, setTypedBusy] = useState(false)
  const editingRef = useRef<'en' | 'yue' | null>(null)
  const yueInputRef = useRef<HTMLTextAreaElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reqId = useRef(0)
  const translateRef = useRef(translateTyped)
  const historyRef = useRef(history)
  translateRef.current = translateTyped
  historyRef.current = history

  const latest = history[0]
  const turnActive = live || translating || Boolean(enInterim) || Boolean(yueInterim)
  const storeEn =
    enInterim ||
    enTranslation ||
    (!turnActive && latest
      ? latest.from === 'en'
        ? latest.source
        : latest.translation
      : '')
  const storeYue =
    yueInterim ||
    yueTranslation ||
    (!turnActive && latest
      ? latest.from === 'yue'
        ? latest.source
        : latest.translation
      : '')
  const yueDef = turnActive
    ? yueDefinition
    : yueDefinition || latest?.definition || ''
  const yueDefs = turnActive
    ? yueDefinitions
    : yueDefinitions.length
      ? yueDefinitions
      : latest?.definitions || []
  const alts = turnActive
    ? yueAlternatives
    : yueAlternatives.length
      ? yueAlternatives
      : latest?.to === 'yue'
        ? latest.alternatives || []
        : []

  // Mirror speech / translate results into the panes the user is not editing.
  useEffect(() => {
    if (editingRef.current !== 'en') setEnDraft(storeEn)
  }, [storeEn])

  useEffect(() => {
    if (editingRef.current !== 'yue') setYueDraft(storeYue)
  }, [storeYue])

  const runTranslate = (value: string, from: Lang, delay: number, force = false) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    const next = value.trim()
    if (!next) {
      setTypedBusy(false)
      return
    }
    if (!force && !isWorthAutoTranslate(next, from)) {
      setTypedBusy(false)
      return
    }
    const top = historyRef.current[0]
    if (top && top.from === from && top.source === next) {
      setTypedBusy(false)
      return
    }
    const id = ++reqId.current
    const start = () => {
      timerRef.current = null
      setTypedBusy(true)
      void translateRef.current(next, from).finally(() => {
        if (reqId.current === id) setTypedBusy(false)
      })
    }
    if (delay <= 0) {
      start()
      return
    }
    setTypedBusy(false)
    timerRef.current = setTimeout(start, delay)
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const onEnChange = (value: string) => {
    editingRef.current = 'en'
    setEnDraft(value)
    runTranslate(value, 'en', AUTO_TRANSLATE_MS)
  }

  const onYueChange = (value: string) => {
    editingRef.current = 'yue'
    setYueDraft(value)
    runTranslate(value, 'yue', AUTO_TRANSLATE_MS)
  }

  const openDetails = () => {
    const yue = (yueDraft || storeYue).trim()
    const en = (enDraft || storeEn).trim()
    if (!yue && !en) return
    openBreakdown(yue || en, {
      translation: en || undefined,
      definition: yueDef || undefined,
      definitions: yueDefs,
      alternatives: alts,
    })
  }

  const enThinking = (translating && translatingTo === 'en') || (typedBusy && editingRef.current === 'yue')
  const yueThinking = (translating && translatingTo === 'yue') || (typedBusy && editingRef.current === 'en')
  const showHint = !live && !translating && !typedBusy && !enDraft.trim() && !yueDraft.trim()
  useEffect(() => {
    setSoloShowAutoHint(showHint)
    return () => setSoloShowAutoHint(false)
  }, [showHint, setSoloShowAutoHint])

  const inputLocked = live
  const showYueRuby = Boolean(yueDraft.trim()) && !yueEditing && !inputLocked

  const enterYueEdit = () => {
    editingRef.current = 'yue'
    setYueEditing(true)
    setSpeakDirection('yue')
    queueMicrotask(() => yueInputRef.current?.focus())
  }

  const openYueDetails = (phrase: string) => {
    const en = (enDraft || storeEn).trim()
    openBreakdown(phrase, {
      translation: en || undefined,
      definition: yueDef || undefined,
      definitions: yueDefs,
      alternatives: alts,
    })
  }

  return (
    <div className="solo">
      <motion.div
        className={`solo-stage ${live ? 'live' : ''} status-${status}`}
        animate={
          live
            ? {
                boxShadow: [
                  '0 0 0 0 rgba(61,207,182,0)',
                  '0 0 0 12px rgba(61,207,182,0.08)',
                  '0 0 0 0 rgba(61,207,182,0)',
                ],
              }
            : { boxShadow: '0 0 0 0 rgba(61,207,182,0)' }
        }
        transition={{ duration: 2.4, repeat: live ? Infinity : 0 }}
      >
        <div className="solo-upper">
          <div className="solo-pane-head">
            <p className="solo-label">
              <BiText copy={ui.english} size="sm" only="en" />
            </p>
            {enDraft.trim() ? <SpeakButton text={enDraft} lang="en" /> : null}
          </div>
          {enThinking ? (
            <TranslateThinking className="solo-thinking" />
          ) : (
            <textarea
              className="solo-input solo-input--en"
              value={enDraft}
              rows={3}
              disabled={inputLocked}
              placeholder={ui.soloTapTypeEnglish.en}
              aria-label={ui.soloTapTypeEnglish.en}
              onFocus={() => {
                editingRef.current = 'en'
                setSpeakDirection('en')
              }}
              onBlur={() => {
                if (editingRef.current === 'en') editingRef.current = null
              }}
              onChange={(e) => onEnChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' || e.shiftKey) return
                e.preventDefault()
                runTranslate(enDraft, 'en', 0, true)
              }}
            />
          )}
        </div>

        <div className="solo-divider" />

        <div className="solo-lower">
          <div className="solo-pane-head">
            <p className="solo-label">
              <BiText copy={ui.cantonese} size="sm" only="zh" />
            </p>
            {yueDraft.trim() ? (
              <div className="solo-pane-actions">
                <button
                  type="button"
                  className="solo-details-btn"
                  onClick={openDetails}
                  aria-label={biPlain(ui.charDetail)}
                >
                  <BiText copy={ui.camOpenDetails} size="sm" layout="inline" />
                </button>
                <SpeakButton text={yueDraft} lang="yue" />
              </div>
            ) : null}
          </div>
          {yueThinking ? (
            <TranslateThinking className="solo-thinking" />
          ) : showYueRuby ? (
            <div className="solo-translation">
              <ResultWithDefinition
                text={yueDraft}
                definition={yueDef}
                definitions={yueDefs}
                textClassName="solo-tr-text"
                onActivate={openYueDetails}
                speakLang="yue"
              />
              {altsLoading && alts.length === 0 ? (
                <p className="solo-alts-loading muted" aria-live="polite">
                  <BiText copy={ui.loadingVariations} size="sm" layout="inline" />
                </p>
              ) : null}
              {alts.length > 0 ? (
                <TranslationAlternatives alternatives={alts} onSelect={selectYueVariation} />
              ) : null}
              <button type="button" className="solo-edit-link" onClick={enterYueEdit}>
                {ui.soloTapTypeChinese.zh}
              </button>
            </div>
          ) : (
            <textarea
              ref={yueInputRef}
              className="solo-input solo-input--yue"
              value={yueDraft}
              rows={3}
              disabled={inputLocked}
              placeholder={ui.soloTapTypeChinese.zh}
              aria-label={ui.soloTapTypeChinese.zh}
              onFocus={() => {
                editingRef.current = 'yue'
                setYueEditing(true)
                setSpeakDirection('yue')
              }}
              onBlur={() => {
                if (editingRef.current === 'yue') editingRef.current = null
                setYueEditing(false)
              }}
              onChange={(e) => onYueChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' || e.shiftKey) return
                e.preventDefault()
                runTranslate(yueDraft, 'yue', 0, true)
              }}
            />
          )}
          {!showYueRuby && altsLoading && alts.length === 0 && yueDraft.trim() ? (
            <p className="solo-alts-loading muted" aria-live="polite">
              <BiText copy={ui.loadingVariations} size="sm" layout="inline" />
            </p>
          ) : null}
          {!showYueRuby && alts.length > 0 ? (
            <TranslationAlternatives alternatives={alts} onSelect={selectYueVariation} />
          ) : null}
        </div>
      </motion.div>
    </div>
  )
}
