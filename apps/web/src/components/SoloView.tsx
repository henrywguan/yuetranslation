import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { BiText } from './BiText'
import { ClearIconButton } from './ClearIconButton'
import { LangLabelButton } from './LangLabelButton'
import { ResultWithDefinition } from './ResultWithDefinition'
import { SpeakButton } from './SpeakButton'
import { TranslateThinking } from './TranslateThinking'
import { TranslationAlternatives } from './TranslationAlternatives'
import { useYueStore } from '../lib/store'
import { consumePendingShareText } from '../lib/pwaLaunch'
import { biPlain, ui } from '../lib/uiCopy'
import type { Lang } from '../lib/types'

const AUTO_TRANSLATE_MS = 2000

function isWorthAutoTranslate(value: string, from: Lang): boolean {
  const t = value.trim()
  if (!t) return false
  if (from === 'yue' || from === 'cmn') {
    return /[\u4e00-\u9fff]/.test(t) || t.length >= 2
  }
  const letters = t.replace(/[^\p{L}\p{N}]+/gu, '')
  return letters.length >= 3 || t.split(/\s+/).filter(Boolean).length >= 2
}

function placeholderFor(lang: Lang): string {
  if (lang === 'en') return ui.soloTapTypeEnglish.en
  if (lang === 'tl') return 'Mag-type ng Tagalog…'
  if (lang === 'cmn') return ui.soloTapTypeChinese.zh
  return ui.soloTapTypeChinese.zh
}

function ariaForPane(lang: Lang): string {
  if (lang === 'en') return 'Speak English with the mic'
  if (lang === 'tl') return 'Speak Tagalog with the mic'
  if (lang === 'cmn') return 'Speak Mandarin with the mic'
  return 'Speak Cantonese with the mic'
}

export function SoloView() {
  const enInterim = useYueStore((s) => s.enInterim)
  const yueInterim = useYueStore((s) => s.yueInterim)
  const enTranslation = useYueStore((s) => s.enTranslation)
  const yueTranslation = useYueStore((s) => s.yueTranslation)
  const yueDefinition = useYueStore((s) => s.yueDefinition)
  const yueDefinitions = useYueStore((s) => s.yueDefinitions)
  const yueAlternatives = useYueStore((s) => s.yueAlternatives)
  const enAlternatives = useYueStore((s) => s.enAlternatives)
  const enDefinitions = useYueStore((s) => s.enDefinitions)
  const enDefinition = useYueStore((s) => s.enDefinition)
  const altsLoading = useYueStore((s) => s.altsLoading)
  const openBreakdown = useYueStore((s) => s.openBreakdown)
  const selectYueVariation = useYueStore((s) => s.selectYueVariation)
  const speakDirection = useYueStore((s) => s.speakDirection)
  const soloUpperLang = useYueStore((s) => s.soloUpperLang)
  const soloLowerLang = useYueStore((s) => s.soloLowerLang)
  const setSpeakDirection = useYueStore((s) => s.setSpeakDirection)
  const setSoloPaneLang = useYueStore((s) => s.setSoloPaneLang)
  const clearHistory = useYueStore((s) => s.clearHistory)
  const setSoloShowAutoHint = useYueStore((s) => s.setSoloShowAutoHint)
  const translateTyped = useYueStore((s) => s.translateTyped)
  const live = useYueStore((s) => s.live)
  const status = useYueStore((s) => s.status)
  const history = useYueStore((s) => s.history)
  const translating = useYueStore((s) => s.translating)
  const translatingTo = useYueStore((s) => s.translatingTo)

  const [upperDraft, setUpperDraft] = useState('')
  const [lowerDraft, setLowerDraft] = useState('')
  const [lowerEditing, setLowerEditing] = useState(false)
  const [upperEditing, setUpperEditing] = useState(false)
  const [typedBusy, setTypedBusy] = useState(false)
  const editingRef = useRef<'upper' | 'lower' | null>(null)
  const upperInputRef = useRef<HTMLTextAreaElement>(null)
  const lowerInputRef = useRef<HTMLTextAreaElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reqId = useRef(0)
  const translateRef = useRef(translateTyped)
  const historyRef = useRef(history)
  const upperLangRef = useRef(soloUpperLang)
  const lowerLangRef = useRef(soloLowerLang)
  translateRef.current = translateTyped
  historyRef.current = history
  upperLangRef.current = soloUpperLang
  lowerLangRef.current = soloLowerLang

  const latest = history[0]
  const turnActive = live || translating || Boolean(enInterim) || Boolean(yueInterim)

  // Solo store: en* = upper pane, yue* = lower pane.
  const storeUpper =
    enInterim ||
    enTranslation ||
    (!turnActive && latest
      ? latest.from === soloUpperLang
        ? latest.source
        : latest.to === soloUpperLang
          ? latest.translation
          : ''
      : '')
  const storeLower =
    yueInterim ||
    yueTranslation ||
    (!turnActive && latest
      ? latest.from === soloLowerLang
        ? latest.source
        : latest.to === soloLowerLang
          ? latest.translation
          : ''
      : '')

  const lowerDef = turnActive
    ? yueDefinition
    : yueDefinition || latest?.definition || ''
  const lowerDefs = turnActive
    ? yueDefinitions
    : yueDefinitions.length
      ? yueDefinitions
      : latest?.definitions || []
  const alts = turnActive
    ? yueAlternatives
    : yueAlternatives.length
      ? yueAlternatives
      : latest && (latest.to === soloLowerLang || latest.to === 'yue' || latest.to === 'cmn')
        ? latest.alternatives || []
        : []

  useEffect(() => {
    if (editingRef.current !== 'upper') setUpperDraft(storeUpper)
  }, [storeUpper])

  useEffect(() => {
    if (editingRef.current !== 'lower') setLowerDraft(storeLower)
  }, [storeLower])

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

  useEffect(() => {
    const shared = consumePendingShareText()
    if (!shared) return
    const hasHan = /[\u4e00-\u9fff]/.test(shared)
    const from: Lang = hasHan
      ? soloUpperLang !== 'en'
        ? soloUpperLang
        : soloLowerLang !== 'en'
          ? soloLowerLang
          : 'yue'
      : soloUpperLang === 'en'
        ? 'en'
        : soloLowerLang === 'en'
          ? 'en'
          : 'en'
    if (from === soloUpperLang) {
      setUpperDraft(shared)
      editingRef.current = 'upper'
    } else {
      setLowerDraft(shared)
      editingRef.current = 'lower'
    }
    setSoloShowAutoHint(false)
    runTranslate(shared, from, 0, true)
  }, [setSoloShowAutoHint, soloUpperLang, soloLowerLang])

  const onUpperChange = (value: string) => {
    editingRef.current = 'upper'
    setUpperDraft(value)
    runTranslate(value, upperLangRef.current, AUTO_TRANSLATE_MS)
  }

  const onLowerChange = (value: string) => {
    editingRef.current = 'lower'
    setLowerDraft(value)
    runTranslate(value, lowerLangRef.current, AUTO_TRANSLATE_MS)
  }

  const openPaneDetails = (pane: 'upper' | 'lower') => {
    const paneLang = pane === 'upper' ? soloUpperLang : soloLowerLang
    const phrase = (pane === 'upper' ? upperDraft || storeUpper : lowerDraft || storeLower).trim()
    const other = (pane === 'upper' ? lowerDraft || storeLower : upperDraft || storeUpper).trim()
    if (!phrase) return
    const isZhTarget =
      latest?.to === paneLang ||
      (pane === 'lower' && (soloLowerLang === 'yue' || soloLowerLang === 'cmn'))
    openBreakdown(phrase, {
      lang: paneLang,
      translation: other || undefined,
      definition:
        paneLang === 'en'
          ? enDefinition || undefined
          : lowerDef || undefined,
      definitions:
        paneLang === 'en'
          ? enDefinitions.length
            ? enDefinitions
            : undefined
          : lowerDefs,
      alternatives:
        paneLang === 'en'
          ? enAlternatives.length
            ? enAlternatives
            : undefined
          : isZhTarget
            ? alts
            : undefined,
    })
  }

  const upperThinking =
    (translating && translatingTo === soloUpperLang) ||
    (typedBusy && editingRef.current === 'lower')
  const lowerThinking =
    (translating && translatingTo === soloLowerLang) ||
    (typedBusy && editingRef.current === 'upper')
  const showHint = !live && !translating && !typedBusy && !upperDraft.trim() && !lowerDraft.trim()
  useEffect(() => {
    setSoloShowAutoHint(showHint)
    return () => setSoloShowAutoHint(false)
  }, [showHint, setSoloShowAutoHint])

  const inputLocked = live
  const showLowerRuby =
    (soloLowerLang === 'yue' || soloLowerLang === 'cmn' || soloLowerLang === 'tl') &&
    Boolean(lowerDraft.trim()) &&
    !lowerEditing &&
    (!inputLocked || Boolean(yueInterim.trim()))
  const showUpperRuby =
    (soloUpperLang === 'yue' || soloUpperLang === 'cmn' || soloUpperLang === 'tl') &&
    Boolean(upperDraft.trim()) &&
    !upperEditing &&
    (!inputLocked || Boolean(enInterim.trim()))

  const canClear =
    Boolean(upperDraft.trim()) ||
    Boolean(lowerDraft.trim()) ||
    history.length > 0 ||
    Boolean(enInterim) ||
    Boolean(yueInterim) ||
    Boolean(enTranslation) ||
    Boolean(yueTranslation)

  const renderPaneBody = (opts: {
    pane: 'upper' | 'lower'
    lang: Lang
    draft: string
    thinking: boolean
    showRuby: boolean
    inputRef: React.RefObject<HTMLTextAreaElement | null>
    onChange: (v: string) => void
    onEdit: () => void
    onBlurEdit: () => void
  }) => {
    const { pane, lang, draft, thinking, showRuby, inputRef, onChange, onEdit, onBlurEdit } = opts
    if (thinking) return <TranslateThinking className="solo-thinking" />

    if (showRuby && (lang === 'yue' || lang === 'cmn' || lang === 'tl')) {
      const def = pane === 'lower' ? lowerDef : ''
      const defs = pane === 'lower' ? lowerDefs : undefined
      const paneAlts = pane === 'lower' ? alts : []
      return (
        <div className="solo-translation">
          <ResultWithDefinition
            text={draft}
            definition={def}
            definitions={defs}
            chineseLang={lang}
            textClassName="solo-tr-text"
            onActivate={() => openPaneDetails(pane)}
            showCopy
          />
          {pane === 'lower' && altsLoading && paneAlts.length === 0 ? (
            <p className="solo-alts-loading muted" aria-live="polite">
              <BiText copy={ui.loadingVariations} size="sm" layout="inline" />
            </p>
          ) : null}
          {paneAlts.length > 0 ? (
            <TranslationAlternatives
              alternatives={paneAlts}
              lang={lang}
              onSelect={selectYueVariation}
            />
          ) : null}
          <button type="button" className="solo-edit-link" onClick={onEdit}>
            {placeholderFor(lang)}
          </button>
        </div>
      )
    }

    if (lang === 'en' && draft.trim() && !thinking) {
      // Plain English stays in the textarea for type-to-edit.
    }

    return (
      <textarea
        ref={inputRef}
        className={`solo-input ${lang === 'en' ? 'solo-input--en' : 'solo-input--yue'}`}
        value={draft}
        rows={3}
        disabled={inputLocked}
        placeholder={placeholderFor(lang)}
        aria-label={placeholderFor(lang)}
        onFocus={() => {
          editingRef.current = pane
          if (pane === 'upper') setUpperEditing(true)
          else setLowerEditing(true)
          setSpeakDirection(lang)
        }}
        onBlur={() => {
          if (editingRef.current === pane) editingRef.current = null
          onBlurEdit()
        }}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' || e.shiftKey) return
          e.preventDefault()
          runTranslate(draft, lang, 0, true)
        }}
      />
    )
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
        <div
          className={`solo-upper${speakDirection === soloUpperLang ? ' is-mic-active' : ''}`}
          role="button"
          tabIndex={0}
          aria-pressed={speakDirection === soloUpperLang}
          aria-label={ariaForPane(soloUpperLang)}
          onClick={(e) => {
            const t = e.target as HTMLElement
            if (t.closest('button, a, textarea, input, [role="listbox"], [role="option"]')) return
            setSpeakDirection(soloUpperLang)
          }}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return
            if (e.target !== e.currentTarget) return
            e.preventDefault()
            setSpeakDirection(soloUpperLang)
          }}
        >
          <div className="solo-pane-head">
            <LangLabelButton
              lang={soloUpperLang}
              active={speakDirection === soloUpperLang}
              drawer="top"
              onSelect={(lang) => setSoloPaneLang('upper', lang)}
            />
            {upperDraft.trim() ? (
              <div className="solo-pane-actions">
                <button
                  type="button"
                  className="solo-details-btn"
                  onClick={() => openPaneDetails('upper')}
                  aria-label="Open details"
                >
                  <BiText copy={ui.camOpenDetails} size="sm" layout="inline" />
                </button>
                <SpeakButton text={upperDraft} lang={soloUpperLang} />
              </div>
            ) : null}
          </div>
          {renderPaneBody({
            pane: 'upper',
            lang: soloUpperLang,
            draft: upperDraft,
            thinking: upperThinking,
            showRuby: showUpperRuby,
            inputRef: upperInputRef,
            onChange: onUpperChange,
            onEdit: () => {
              editingRef.current = 'upper'
              setUpperEditing(true)
              setSpeakDirection(soloUpperLang)
              queueMicrotask(() => upperInputRef.current?.focus())
            },
            onBlurEdit: () => setUpperEditing(false),
          })}
        </div>

        <div className="solo-divider" />

        <div
          className={`solo-lower${speakDirection === soloLowerLang ? ' is-mic-active' : ''}`}
          role="button"
          tabIndex={0}
          aria-pressed={speakDirection === soloLowerLang}
          aria-label={ariaForPane(soloLowerLang)}
          onClick={(e) => {
            const t = e.target as HTMLElement
            if (t.closest('button, a, textarea, input, [role="listbox"], [role="option"]')) return
            setSpeakDirection(soloLowerLang)
          }}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return
            if (e.target !== e.currentTarget) return
            e.preventDefault()
            setSpeakDirection(soloLowerLang)
          }}
        >
          <div className="solo-pane-head">
            <LangLabelButton
              lang={soloLowerLang}
              active={speakDirection === soloLowerLang}
              drawer="bottom"
              onSelect={(lang) => setSoloPaneLang('lower', lang)}
            />
            {lowerDraft.trim() || canClear ? (
              <div className="solo-pane-actions">
                {lowerDraft.trim() ? (
                  <button
                    type="button"
                    className="solo-details-btn"
                    onClick={() => openPaneDetails('lower')}
                    aria-label={biPlain(ui.charDetail)}
                  >
                    <BiText copy={ui.camOpenDetails} size="sm" layout="inline" />
                  </button>
                ) : null}
                <div className="solo-pane-actions-stack">
                  {canClear ? <ClearIconButton onClick={clearHistory} /> : null}
                  {lowerDraft.trim() ? (
                    <SpeakButton text={lowerDraft} lang={soloLowerLang} />
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
          {renderPaneBody({
            pane: 'lower',
            lang: soloLowerLang,
            draft: lowerDraft,
            thinking: lowerThinking,
            showRuby: showLowerRuby,
            inputRef: lowerInputRef,
            onChange: onLowerChange,
            onEdit: () => {
              editingRef.current = 'lower'
              setLowerEditing(true)
              setSpeakDirection(soloLowerLang)
              queueMicrotask(() => lowerInputRef.current?.focus())
            },
            onBlurEdit: () => setLowerEditing(false),
          })}
          {!showLowerRuby && altsLoading && alts.length === 0 && lowerDraft.trim() ? (
            <p className="solo-alts-loading muted" aria-live="polite">
              <BiText copy={ui.loadingVariations} size="sm" layout="inline" />
            </p>
          ) : null}
          {!showLowerRuby && alts.length > 0 && (soloLowerLang === 'yue' || soloLowerLang === 'cmn' || soloLowerLang === 'tl') ? (
            <TranslationAlternatives
              alternatives={alts}
              lang={soloLowerLang}
              onSelect={selectYueVariation}
            />
          ) : null}
        </div>
      </motion.div>
    </div>
  )
}
