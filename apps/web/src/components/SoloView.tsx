import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { BiText } from './BiText'
import { ClearIconButton } from './ClearIconButton'
import { LangLabelButton } from './LangLabelButton'
import { ResultWithDefinition } from './ResultWithDefinition'
import { SpeakButton } from './SpeakButton'
import { SayItBack } from './SayItBack'
import { ShareButton } from './ShareButton'
import { StarPhraseButton } from './StarPhraseButton'
import { CantoneseRomanizationToggle } from './CantoneseRomanizationToggle'
import { copyableText } from '../lib/copyText'
import { SoloTextOnlyLangTip } from './TextOnlyLangTip'
import { TranslateThinking } from './TranslateThinking'
import { TranslationAlternatives } from './TranslationAlternatives'
import { isTextOnlyLang, isVoiceLang, langDir } from '../lib/langCapabilities'
import { useYueStore } from '../lib/store'
import { consumePendingShareText } from '../lib/pwaLaunch'
import { biPlain, ui } from '../lib/uiCopy'
import type { Lang } from '../lib/types'

const AUTO_TRANSLATE_MS = 2000
const PASTE_MAX_CHARS = 2000
const HAN_SOURCE_LANGS: Lang[] = ['yue', 'cmn', 'wuu', 'sichuan', 'ja']

function isWorthAutoTranslate(value: string, from: Lang): boolean {
  const t = value.trim()
  if (!t) return false
  if (from === 'yue' || from === 'cmn' || from === 'wuu' || from === 'sichuan') {
    return /[\u4e00-\u9fff]/.test(t) || t.length >= 2
  }
  const letters = t.replace(/[^\p{L}\p{N}]+/gu, '')
  return letters.length >= 3 || t.split(/\s+/).filter(Boolean).length >= 2
}

function placeholderFor(lang: Lang): string {
  if (lang === 'en') return ui.soloTapTypeEnglish.en
  if (lang === 'tl') return 'Mag-type ng Tagalog…'
  if (lang === 'es') return 'Escribe en español mexicano…'
  if (lang === 'eses') return 'Escribe en español de España…'
  if (lang === 'vi') return 'Nhập tiếng Việt…'
  if (lang === 'th') return 'พิมพ์หรือพูดภาษาไทย'
  if (lang === 'lo') return 'ພິມ ຫຼື ເວົ້າພາສາລາວ'
  if (lang === 'ko') return '한국어로 입력하거나 말하기'
  if (lang === 'ja') return '日本語で入力するか話す'
  if (lang === 'id') return 'Ketik atau bicara Bahasa Indonesia…'
  if (lang === 'ms') return 'Taip atau cakap Bahasa Melayu…'
  if (lang === 'pt') return 'Digite ou fale em português (BR)…'
  if (lang === 'fr') return 'Tapez ou parlez en français…'
  if (lang === 'hi') return 'हिन्दी में टाइप करें या बोलें…'
  if (lang === 'km') return 'វាយ ឬនិយាយភាសាខ្មែរ…'
  if (lang === 'my') return 'မြန်မာလို ရိုက်ပါ သို့မဟုတ် ပြောပါ…'
  if (lang === 'jv') return 'Ketik utawa ngomong basa Jawa…'
  if (lang === 'it') return 'Digita o parla in italiano…'
  if (lang === 'de') return 'Auf Deutsch tippen oder sprechen…'
  if (lang === 'nl') return 'Typ of spreek Nederlands…'
  if (lang === 'ar') return 'اكتب أو اتكلم بالمصري…'
  if (lang === 'arsa') return 'اكتب أو تحدّث بالعربية الفصحى…'
  if (lang === 'ceb') return 'I-type ang Cebuano…'
  if (lang === 'ilo') return 'I-type ti Ilocano…'
  if (lang === 'bcl') return 'I-type nin Bikol…'
  if (lang === 'cmn') return ui.soloTapTypeChinese.zh
  return ui.soloTapTypeChinese.zh
}

function isRubyDisplayLang(lang: Lang): boolean {
  return (
    lang === 'yue' ||
    lang === 'cmn' ||
    lang === 'wuu' ||
    lang === 'sichuan' ||
    lang === 'tl' ||
    lang === 'es' ||
    lang === 'eses' ||
    lang === 'vi' ||
    lang === 'th' ||
    lang === 'lo' ||
    lang === 'ko' ||
    lang === 'ja' ||
    lang === 'id' ||
    lang === 'ms' ||
    lang === 'pt' ||
    lang === 'fr' ||
    lang === 'hi' ||
    lang === 'km' ||
    lang === 'my' ||
    lang === 'jv' ||
    lang === 'it' ||
    lang === 'de' ||
    lang === 'nl' ||
    lang === 'ar' ||
    lang === 'arsa' ||
    lang === 'ceb' ||
    lang === 'ilo' ||
    lang === 'bcl'
  )
}

/** Grow the type-to-edit field with the draft so results are never clipped to 3 rows. */
function fitSoloTextarea(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = '0px'
  el.style.height = `${el.scrollHeight}px`
}

function ariaForPane(lang: Lang): string {
  if (lang === 'ceb') return 'Type Cebuano'
  if (lang === 'ilo') return 'Type Ilocano'
  if (lang === 'bcl') return 'Type Bikol'
  if (lang === 'en') return 'Speak English with the mic'
  if (lang === 'tl') return 'Speak Tagalog with the mic'
  if (lang === 'es') return 'Speak Spanish(MX) with the mic'
  if (lang === 'eses') return 'Speak Spanish(ES) with the mic'
  if (lang === 'vi') return 'Speak Vietnamese with the mic'
  if (lang === 'th') return 'Speak Thai with the mic'
  if (lang === 'lo') return 'Speak Lao with the mic'
  if (lang === 'ko') return 'Speak Korean with the mic'
  if (lang === 'ja') return 'Speak Japanese with the mic'
  if (lang === 'id') return 'Speak Indonesian with the mic'
  if (lang === 'ms') return 'Speak Malay with the mic'
  if (lang === 'pt') return 'Speak Portuguese (BR) with the mic'
  if (lang === 'fr') return 'Speak French with the mic'
  if (lang === 'hi') return 'Speak Hindi with the mic'
  if (lang === 'km') return 'Speak Khmer with the mic'
  if (lang === 'my') return 'Speak Burmese with the mic'
  if (lang === 'jv') return 'Speak Javanese with the mic'
  if (lang === 'it') return 'Speak Italian with the mic'
  if (lang === 'de') return 'Speak German with the mic'
  if (lang === 'nl') return 'Speak Dutch with the mic'
  if (lang === 'ar') return 'Speak Egyptian Arabic with the mic'
  if (lang === 'arsa') return 'Speak Modern Standard Arabic with the mic'
  if (lang === 'cmn') return 'Speak Mandarin with the mic'
  if (lang === 'wuu') return 'Speak Shanghainese with the mic'
  if (lang === 'sichuan') return 'Speak Sichuanese with the mic'
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
  const clearCurrent = useYueStore((s) => s.clearCurrent)
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
  const [pasteHint, setPasteHint] = useState(false)
  /** After Clear, do not rehydrate panes from History until the next live/typed turn. */
  const [soloCleared, setSoloCleared] = useState(false)
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
  // After an explicit Clear, skip History fallback so both panes stay empty.
  const storeUpper =
    enInterim ||
    enTranslation ||
    (!turnActive && !soloCleared && latest
      ? latest.from === soloUpperLang
        ? latest.source
        : latest.to === soloUpperLang
          ? latest.translation
          : ''
      : '')
  const storeLower =
    yueInterim ||
    yueTranslation ||
    (!turnActive && !soloCleared && latest
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
      : latest && (latest.to === soloLowerLang || latest.to === 'yue' || latest.to === 'cmn' || latest.to === 'wuu' || latest.to === 'sichuan')
        ? latest.alternatives || []
        : []

  useEffect(() => {
    if (editingRef.current !== 'upper') {
      setUpperDraft(storeUpper)
      return
    }
    // Text-only panes auto-focus empty — don't let that edit lock hide a
    // translation that landed while the textarea was still blank.
    setUpperDraft((prev) => {
      if (prev.trim() || !storeUpper.trim()) return prev
      editingRef.current = null
      queueMicrotask(() => setUpperEditing(false))
      return storeUpper
    })
  }, [storeUpper])

  useEffect(() => {
    if (editingRef.current !== 'lower') {
      setLowerDraft(storeLower)
      return
    }
    setLowerDraft((prev) => {
      if (prev.trim() || !storeLower.trim()) return prev
      editingRef.current = null
      queueMicrotask(() => setLowerEditing(false))
      return storeLower
    })
  }, [storeLower])

  useEffect(() => {
    if (live || translating || enInterim || yueInterim || enTranslation || yueTranslation) {
      setSoloCleared(false)
    }
  }, [live, translating, enInterim, yueInterim, enTranslation, yueTranslation])

  const clearSolo = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    reqId.current += 1
    editingRef.current = null
    setUpperDraft('')
    setLowerDraft('')
    setUpperEditing(false)
    setLowerEditing(false)
    setTypedBusy(false)
    setSoloCleared(true)
    clearCurrent()
  }

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
    const target =
      from === upperLangRef.current
        ? lowerLangRef.current
        : from === lowerLangRef.current
          ? upperLangRef.current
          : null
    // Skip only when the same pair already landed — force (lang switch) always re-runs.
    if (
      !force &&
      top &&
      top.from === from &&
      top.source === next &&
      (target == null || top.to === target)
    ) {
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
    runTranslate(shared, from, 0, true)
  }, [soloUpperLang, soloLowerLang])


  /** User-tapped paste only — never read the clipboard in the background. */
  const pasteAndTranslate = async () => {
    setPasteHint(false)
    let raw = ''
    try {
      raw = await navigator.clipboard.readText()
    } catch {
      setPasteHint(true)
      return
    }
    const pasted = raw.trim().slice(0, PASTE_MAX_CHARS)
    if (!pasted) {
      setPasteHint(true)
      return
    }
    const upper = upperLangRef.current
    const lower = lowerLangRef.current
    const han = /[\u3400-\u9fff]/.test(pasted)
    const from: Lang = han
      ? [upper, lower].find((l) => HAN_SOURCE_LANGS.includes(l)) ||
        (upper !== 'en' ? upper : lower)
      : upper === 'en' || lower === 'en'
        ? 'en'
        : upper
    if (from === upper) {
      setUpperDraft(pasted)
      editingRef.current = 'upper'
    } else {
      setLowerDraft(pasted)
      editingRef.current = 'lower'
    }
    runTranslate(pasted, from, 0, true)
  }

  const activatePane = (pane: 'upper' | 'lower') => {
    const lang = pane === 'upper' ? soloUpperLang : soloLowerLang
    const other = pane === 'upper' ? soloLowerLang : soloUpperLang
    if (isTextOnlyLang(lang)) {
      if (isVoiceLang(other)) setSpeakDirection(other)
      if (pane === 'upper') {
        editingRef.current = 'upper'
        setUpperEditing(true)
        queueMicrotask(() => upperInputRef.current?.focus())
      } else {
        editingRef.current = 'lower'
        setLowerEditing(true)
        queueMicrotask(() => lowerInputRef.current?.focus())
      }
      return
    }
    setSpeakDirection(lang)
  }

  const onPaneLangSelect = (pane: 'upper' | 'lower', lang: Lang) => {
    const thisLang = pane === 'upper' ? soloUpperLang : soloLowerLang
    const otherLang = pane === 'upper' ? soloLowerLang : soloUpperLang
    if (lang === thisLang) return

    const upperText = upperDraft
    const lowerText = lowerDraft
    const otherText = (pane === 'upper' ? lowerText : upperText).trim()
    const swapping = lang === otherLang

    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    if (swapping) {
      // Keep text with its language when panes swap labels.
      setUpperDraft(lowerText)
      setLowerDraft(upperText)
      editingRef.current = null
      setUpperEditing(false)
      setLowerEditing(false)
      setSoloPaneLang(pane, lang)
      // After a swap the text-only pane already has its copy (if any). Only
      // keyboard-focus when that pane is empty so the user can type source.
      const textOnlyDraft = (pane === 'upper' ? lowerText : upperText).trim()
      if (isTextOnlyLang(lang) && !textOnlyDraft) {
        queueMicrotask(() => activatePane(pane))
      }
      return
    }

    setSoloPaneLang(pane, lang)

    // Clear the switched pane; keep the other side as the source.
    if (pane === 'upper') {
      setUpperDraft('')
      setUpperEditing(false)
    } else {
      setLowerDraft('')
      setLowerEditing(false)
    }
    editingRef.current = pane === 'upper' ? 'lower' : 'upper'

    if (otherText) {
      runTranslate(otherText, otherLang, 0, true)
    } else {
      setTypedBusy(false)
    }
    // Keyboard-lead text-only only when there is nothing to translate into it.
    // Auto-focusing the empty target while a translation is in flight locks
    // editing and blocks store→draft sync (Ilocano/Cebuano looked blank).
    if (isTextOnlyLang(lang) && !otherText) {
      queueMicrotask(() => activatePane(pane))
    }
  }

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

  /** Keep learner defs in the Details panel language (paired pane stays header-only). */
  const defFitsPaneLang = (raw: string | undefined, paneLang: Lang): string | undefined => {
    const t = (raw || '').trim()
    if (!t) return undefined
    const han = /[\u3400-\u9fff]/u.test(t)
    if (paneLang === 'en' || paneLang === 'tl' || paneLang === 'es' || paneLang === 'eses' || paneLang === 'vi' || paneLang === 'th' || paneLang === 'lo' || paneLang === 'ceb' || paneLang === 'ilo' || paneLang === 'bcl') {
      // Latin panels: drop pure-Han paired glosses.
      if (han && !/[A-Za-z]/.test(t)) return undefined
      return t
    }
    // Han / dialect panels: require some Han; drop English source fallbacks.
    if (!han) return undefined
    return t
  }

  const openPaneDetails = (pane: 'upper' | 'lower') => {
    const paneLang = pane === 'upper' ? soloUpperLang : soloLowerLang
    const phrase = (pane === 'upper' ? upperDraft || storeUpper : lowerDraft || storeLower).trim()
    const other = (pane === 'upper' ? lowerDraft || storeLower : upperDraft || storeUpper).trim()
    if (!phrase) return
    const isZhTarget =
      latest?.to === paneLang ||
      (pane === 'lower' &&
        (soloLowerLang === 'yue' ||
          soloLowerLang === 'cmn' ||
          soloLowerLang === 'wuu' ||
          soloLowerLang === 'sichuan'))
    openBreakdown(phrase, {
      lang: paneLang,
      translation: other || undefined,
      definition:
        paneLang === 'en'
          ? defFitsPaneLang(enDefinition, paneLang)
          : defFitsPaneLang(lowerDef, paneLang),
      definitions: (
        paneLang === 'en'
          ? enDefinitions
          : lowerDefs
      )
        .map((d) => defFitsPaneLang(d, paneLang))
        .filter((d): d is string => Boolean(d)),
      romanization:
        paneLang === 'wuu' || paneLang === 'sichuan' ? latest?.romanization : undefined,
      sandhiHint: paneLang === 'wuu' ? latest?.sandhiHint : undefined,
      ipa: paneLang === 'wuu' ? latest?.ipa : undefined,
      alternativeRomanizations:
        paneLang === 'wuu' || paneLang === 'sichuan'
          ? latest?.alternativeRomanizations
          : undefined,
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
  const inputLocked = live
  const showLowerResult =
    Boolean(lowerDraft.trim()) &&
    !lowerEditing &&
    (!inputLocked || Boolean(yueInterim.trim()))
  const showUpperResult =
    Boolean(upperDraft.trim()) &&
    !upperEditing &&
    (!inputLocked || Boolean(enInterim.trim()))
  const showLowerRuby = showLowerResult && isRubyDisplayLang(soloLowerLang)

  useLayoutEffect(() => {
    if (!showUpperResult) fitSoloTextarea(upperInputRef.current)
    if (!showLowerResult) fitSoloTextarea(lowerInputRef.current)
  }, [upperDraft, lowerDraft, showUpperResult, showLowerResult, upperThinking, lowerThinking])

  const canClear =
    Boolean(upperDraft.trim()) ||
    Boolean(lowerDraft.trim()) ||
    Boolean(enInterim) ||
    Boolean(yueInterim) ||
    Boolean(enTranslation) ||
    Boolean(yueTranslation)

  /** Say-it-back, phrasebook star, and share for a finished pane line. */
  const renderPaneExtras = (pane: 'upper' | 'lower') => {
    const lang = pane === 'upper' ? soloUpperLang : soloLowerLang
    const draft = (pane === 'upper' ? upperDraft : lowerDraft).trim()
    if (!draft) return null
    const isLatestTarget =
      Boolean(latest) && latest!.to === lang && latest!.translation.trim() === draft
    const shareText = lang === 'yue' || lang === 'cmn' ? copyableText(draft, lang) || draft : draft
    return (
      <>
        {lang === 'yue' ? <SayItBack text={draft} /> : null}
        <div className="result-actions-minor">
          {isLatestTarget && latest ? (
            <StarPhraseButton
              source={latest.source}
              translation={draft}
              from={latest.from}
              to={lang}
              romanization={latest.romanization}
              origin="solo"
            />
          ) : null}
          <ShareButton text={shareText} />
        </div>
      </>
    )
  }

  const renderPaneBody = (opts: {
    pane: 'upper' | 'lower'
    lang: Lang
    draft: string
    thinking: boolean
    showResult: boolean
    inputRef: React.RefObject<HTMLTextAreaElement | null>
    onChange: (v: string) => void
    onEdit: () => void
    onBlurEdit: () => void
  }) => {
    const { pane, lang, draft, thinking, showResult, inputRef, onChange, onEdit, onBlurEdit } = opts
    if (thinking) return <TranslateThinking className="solo-thinking" />

    if (showResult && (isRubyDisplayLang(lang) || lang === 'en')) {
      const def = pane === 'lower' ? lowerDef : ''
      const defs = pane === 'lower' ? lowerDefs : undefined
      const paneAlts = pane === 'lower' ? alts : []
      return (
        <div className={`solo-translation${lang === 'en' ? ' solo-translation--en' : ''}`}>
          <ResultWithDefinition
            text={draft}
            definition={def}
            definitions={defs}
            cantonese={lang !== 'en'}
            chineseLang={lang}
            romanization={
              lang === 'wuu' || lang === 'sichuan' ? latest?.romanization : undefined
            }
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
              alternativeRomanizations={
                lang === 'wuu' || lang === 'sichuan'
                  ? latest?.alternativeRomanizations
                  : undefined
              }
              lang={lang}
              onSelect={selectYueVariation}
            />
          ) : null}
          <button type="button" className="solo-edit-link" onClick={onEdit} dir={langDir(lang)}>
            {placeholderFor(lang)}
          </button>
        </div>
      )
    }

    return (
      <textarea
        ref={inputRef}
        className={`solo-input ${lang === 'en' ? 'solo-input--en' : 'solo-input--yue'}`}
        value={draft}
        rows={1}
        disabled={inputLocked}
        placeholder={placeholderFor(lang)}
        aria-label={placeholderFor(lang)}
        dir={langDir(lang)}
        onFocus={() => {
          editingRef.current = pane
          if (pane === 'upper') setUpperEditing(true)
          else setLowerEditing(true)
          // Text-only panes keep the keyboard; mic side stays on a voice lang.
          if (isVoiceLang(lang)) setSpeakDirection(lang)
          queueMicrotask(() => fitSoloTextarea(inputRef.current))
        }}
        onBlur={() => {
          if (editingRef.current === pane) editingRef.current = null
          onBlurEdit()
        }}
        onChange={(e) => {
          onChange(e.target.value)
          fitSoloTextarea(e.currentTarget)
        }}
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
      <SoloTextOnlyLangTip />
      <div className="solo-toolbar">
        <button
          type="button"
          className="solo-paste-btn"
          disabled={live}
          onClick={() => void pasteAndTranslate()}
          aria-label={biPlain(ui.pasteToTranslate)}
          title={biPlain(ui.pasteToTranslate)}
        >
          <svg className="solo-paste-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M9 4.5h6M9.5 3h5a1 1 0 0 1 1 1v1.5h-7V4a1 1 0 0 1 1-1ZM8.5 5H7a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 7 20h10a1.5 1.5 0 0 0 1.5-1.5v-12A1.5 1.5 0 0 0 17 5h-1.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <BiText copy={ui.pasteToTranslate} size="sm" layout="inline" hideJp />
        </button>
        {soloUpperLang === 'yue' || soloLowerLang === 'yue' ? (
          <CantoneseRomanizationToggle />
        ) : null}
      </div>
      {pasteHint ? (
        <p className="solo-paste-hint muted" role="status">
          <BiText copy={ui.pasteToTranslateEmpty} size="sm" layout="inline" hideJp />
        </p>
      ) : null}
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
            activatePane('upper')
          }}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return
            if (e.target !== e.currentTarget) return
            e.preventDefault()
            activatePane('upper')
          }}
        >
          <div className="solo-pane-head">
            <LangLabelButton
              lang={soloUpperLang}
              active={speakDirection === soloUpperLang}
              drawer="top"
              variant="dropdown"
              onSelect={(lang) => onPaneLangSelect('upper', lang)}
            />
            {upperDraft.trim() || canClear ? (
              <div className="solo-pane-actions">
                {upperDraft.trim() ? (
                  <button
                    type="button"
                    className="solo-details-btn"
                    onClick={() => openPaneDetails('upper')}
                    aria-label="Open details"
                  >
                    <BiText copy={ui.camOpenDetails} size="sm" layout="inline" />
                  </button>
                ) : null}
                <div className="solo-pane-actions-stack">
                  {canClear ? <ClearIconButton onClick={clearSolo} /> : null}
                  {upperDraft.trim() ? (
                    <SpeakButton text={upperDraft} lang={soloUpperLang} />
                  ) : null}
                  {renderPaneExtras('upper')}
                </div>
              </div>
            ) : null}
          </div>
          {renderPaneBody({
            pane: 'upper',
            lang: soloUpperLang,
            draft: upperDraft,
            thinking: upperThinking,
            showResult: showUpperResult,
            inputRef: upperInputRef,
            onChange: onUpperChange,
            onEdit: () => {
              editingRef.current = 'upper'
              setUpperEditing(true)
              activatePane('upper')
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
            activatePane('lower')
          }}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return
            if (e.target !== e.currentTarget) return
            e.preventDefault()
            activatePane('lower')
          }}
        >
          <div className="solo-pane-head">
            <LangLabelButton
              lang={soloLowerLang}
              active={speakDirection === soloLowerLang}
              drawer="bottom"
              variant="dropdown"
              onSelect={(lang) => onPaneLangSelect('lower', lang)}
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
                  {canClear ? <ClearIconButton onClick={clearSolo} /> : null}
                  {lowerDraft.trim() ? (
                    <SpeakButton text={lowerDraft} lang={soloLowerLang} />
                  ) : null}
                  {renderPaneExtras('lower')}
                </div>
              </div>
            ) : null}
          </div>
          {renderPaneBody({
            pane: 'lower',
            lang: soloLowerLang,
            draft: lowerDraft,
            thinking: lowerThinking,
            showResult: showLowerResult,
            inputRef: lowerInputRef,
            onChange: onLowerChange,
            onEdit: () => {
              editingRef.current = 'lower'
              setLowerEditing(true)
              activatePane('lower')
              queueMicrotask(() => lowerInputRef.current?.focus())
            },
            onBlurEdit: () => setLowerEditing(false),
          })}
          {!showLowerRuby && altsLoading && alts.length === 0 && lowerDraft.trim() ? (
            <p className="solo-alts-loading muted" aria-live="polite">
              <BiText copy={ui.loadingVariations} size="sm" layout="inline" />
            </p>
          ) : null}
          {!showLowerRuby &&
          alts.length > 0 &&
          (soloLowerLang === 'yue' ||
            soloLowerLang === 'cmn' ||
            soloLowerLang === 'wuu' ||
            soloLowerLang === 'sichuan' ||
            soloLowerLang === 'tl' ||
            soloLowerLang === 'es' || soloLowerLang === 'eses' ||
            soloLowerLang === 'vi' ||
            soloLowerLang === 'th' ||
            soloLowerLang === 'lo') ? (
            <TranslationAlternatives
              alternatives={alts}
              alternativeRomanizations={
                soloLowerLang === 'wuu' || soloLowerLang === 'sichuan'
                  ? latest?.alternativeRomanizations
                  : undefined
              }
              lang={soloLowerLang}
              onSelect={selectYueVariation}
            />
          ) : null}
        </div>
      </motion.div>
    </div>
  )
}
