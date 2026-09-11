import {
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { fetchBreakdown, fetchDetailsEnrich, type DictionaryEntry } from '../lib/api'
import { glossForChar, hasHan, isHanChar, pickCharGloss } from '../lib/charGloss'
import { rememberBreakdownRows } from '../lib/learnedGloss'
import { buildLocalBreakdown, type CharBreakdown, type JyutSeg } from '../lib/jyutping'
import { buildLocalLatinBreakdown, isLatinDetailLang } from '../lib/localLatinBreakdown'
import { detailPedagogy } from '../lib/detailPedagogy'
import { tagalogStressClass, tagalogStressLabel } from '../lib/tagalogPronunciation'
import {
  mexicanStressClass,
  mexicanStressLabel,
} from '../lib/mexicanSpanishStress'
import { buildLocalPinyinBreakdown, type PinyinSeg } from '../lib/pinyin'
import { vietnameseToneClass, vietnameseToneChipShort, vietnameseToneLabel } from '../lib/vietnameseTones'
import { VietnameseText } from './VietnameseText'
import { JyutRuby, JyutSyllable } from './JyutRuby'
import { PinyinRuby, PinyinSyllable } from './PinyinRuby'
import { JpPop } from './JpPop'
import { useJpPopup } from '../lib/useJpPopup'
import { usePanelDock, PANEL_TASKBAR_W } from '../lib/panelDock'
import { useFloatingPanel, type PanelBox } from '../lib/useFloatingPanel'
import { useYueStore } from '../lib/store'
import type { DetailLayer } from '../lib/detailTypes'
import { inkEase } from '../lib/motion'
import { TranslationAlternatives } from './TranslationAlternatives'
import { BiText } from './BiText'
import { SpeakButton } from './SpeakButton'
import { ResultActions } from './ResultActions'
import { ShanghaineseText } from './ShanghaineseText'
import { SichuaneseText } from './SichuaneseText'
import { MexicanSpanishRegisterPanel } from './MexicanSpanishRegisterPanel'
import { DetailDictionaryPanel } from './DetailDictionaryPanel'
import { DetailCollapsible } from './DetailCollapsible'
import { detailEmojiFor } from '../lib/detailEmoji'
import { ui } from '../lib/uiCopy'
import type { Lang } from '../lib/types'
import './DetailPanel.css'

function offlineDictSeed(opts: {
  lemma: string
  lang: Lang
  /** Paired pane text — emoji disambiguation only; never a dictionary sense. */
  contextText?: string
}): DictionaryEntry {
  const emoji = detailEmojiFor(opts.lemma, opts.contextText || '')
  return {
    lemma: opts.lemma,
    lang: opts.lang,
    // Senses stay monolingual in the panel language (filled by /api/details/enrich).
    senses: [],
    examples: [],
    usageNotes: [],
    media: emoji
      ? [{ type: 'emoji', emoji, alt: opts.lemma, source: 'emoji' }]
      : [],
    provenance: [...(emoji ? ['emoji'] : [])],
    engine: 'offline',
  }
}

/** Infer paired-pane lang for CONTEXT disambiguation (not for sense gloss language). */
function inferContextLang(opts: {
  detailLang: Lang
  contextText?: string
  pairedFromTurn?: Lang
}): Lang | undefined {
  if (opts.pairedFromTurn) return opts.pairedFromTurn
  const ctx = (opts.contextText || '').trim()
  if (!ctx) return undefined
  if (!hasHan(ctx)) return 'en'
  if (opts.detailLang === 'cmn') return 'cmn'
  // Prefer Solo/history pair over defaulting every Han string to 粵.
  return undefined
}

const PANEL_KEY = 'yue-details-panel-v2'
const DOCK_ID = 'details'

function speakLangFor(text: string, detailLang?: Lang): Lang {
  if (detailLang === 'cmn') return 'cmn'
  if (detailLang === 'wuu') return 'wuu'
  if (detailLang === 'sichuan') return 'sichuan'
  if (detailLang === 'tl') return 'tl'
  if (detailLang === 'es') return 'es'
  if (detailLang === 'vi') return 'vi'
  if (detailLang === 'ceb') return 'ceb'
  if (detailLang === 'ilo') return 'ilo'
  if (detailLang === 'bcl') return 'bcl'
  if (detailLang === 'en') return 'en'
  if (detailLang === 'yue') return 'yue'
  return hasHan(text) ? 'yue' : 'en'
}

function defaultGeom(): PanelBox {
  if (typeof window === 'undefined') return { x: 48, y: 72, w: 360, h: 520 }
  const w = 360
  const h = Math.min(560, window.innerHeight - 96)
  return {
    // Open beside the left taskbar so restored panels stay left-aligned.
    x: PANEL_TASKBAR_W + 16,
    y: 48,
    w,
    h,
  }
}

function mergeMeanings(local: CharBreakdown[], remote: CharBreakdown[]): CharBreakdown[] {
  if (!remote.length) return local
  return local.map((row, i) => {
    const hit =
      remote[i]?.char === row.char
        ? remote[i]
        : remote.find((r) => r.char === row.char && r.meaning)
    if (!hit) return row
    return {
      char: row.char,
      jyutping: row.jyutping,
      meaning: pickCharGloss(hit.meaning, row.meaning),
    }
  })
}

/** Floating / sheet details with drill-down stack, back, minimize → dock, resize. */
export function CharacterBreakdownHost() {
  const stack = useYueStore((s) => s.detailStack)
  const minimized = useYueStore((s) => s.detailMinimized)
  const popDetail = useYueStore((s) => s.popDetail)
  const pushDetail = useYueStore((s) => s.pushDetail)
  const closeBreakdown = useYueStore((s) => s.closeBreakdown)
  const primaryLanguage = useYueStore((s) => s.primaryLanguage)
  const minimizeDetail = useYueStore((s) => s.minimizeDetail)
  const restoreDetail = useYueStore((s) => s.restoreDetail)
  const selectYueVariation = useYueStore((s) => s.selectYueVariation)
  const selectEnVariation = useYueStore((s) => s.selectEnVariation)
  const altsLoading = useYueStore((s) => s.altsLoading)
  const latestTurn = useYueStore((s) => s.history[0])
  const dockUpsert = usePanelDock((s) => s.upsert)
  const dockRemove = usePanelDock((s) => s.remove)

  const top = stack[stack.length - 1] as DetailLayer | undefined
  const [rows, setRows] = useState<CharBreakdown[]>([])
  const [loading, setLoading] = useState(false)
  const [ipa, setIpa] = useState('')
  const [dictEntry, setDictEntry] = useState<DictionaryEntry | null>(null)
  const [dictLoading, setDictLoading] = useState(false)
  const { geom, desktop, onDragPointerDown } = useFloatingPanel({
    storageKey: PANEL_KEY,
    minW: 280,
    minH: 240,
    defaultGeom,
  })
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const titlePhrase = top ? (top.kind === 'phrase' ? top.phrase : top.char) : ''
  const titleJpEnabled = Boolean(top && !minimized && hasHan(titlePhrase))
  const { tipId: titleJpTipId, show: titleJpShow, bind: titleJpBind, wrapRef: titleJpRef } =
    useJpPopup(titleJpEnabled)

  useEffect(() => {
    if (!top || minimized) {
      document.body.classList.remove('yue-details-open')
      return
    }
    document.body.classList.add('yue-details-open')
    return () => document.body.classList.remove('yue-details-open')
  }, [top, minimized])

  useEffect(() => {
    if (!top || !minimized) {
      dockRemove(DOCK_ID)
      return
    }
    const phrase = top.kind === 'phrase' ? top.phrase : top.char
    const short = phrase.length > 10 ? `${phrase.slice(0, 10)}…` : phrase
    dockUpsert({
      id: DOCK_ID,
      title: 'Details',
      subtitle: short,
      kind: 'details',
    })
    return () => dockRemove(DOCK_ID)
  }, [top, minimized, dockUpsert, dockRemove])

  useEffect(() => {
    const onRestore = (e: Event) => {
      const id = (e as CustomEvent<string>).detail
      if (id === DOCK_ID) restoreDetail()
    }
    window.addEventListener('yue-dock-restore', onRestore as EventListener)
    return () => window.removeEventListener('yue-dock-restore', onRestore as EventListener)
  }, [restoreDetail])

  useEffect(() => {
    if (!top || (top.kind !== 'phrase' && top.kind !== 'char')) {
      setRows([])
      setLoading(false)
      setDictEntry(null)
      setDictLoading(false)
      return
    }
    const phrase = top.kind === 'phrase' ? top.phrase : top.char
    const detailLang = top.lang || (hasHan(phrase) ? 'yue' : 'en')
    // Same-language learner gloss only — never the paired pane’s translation.
    const phraseGloss =
      top.kind === 'phrase'
        ? top.definition?.trim() || ''
        : top.sense?.trim() || top.definition?.trim() || ''
    const contextText =
      top.kind === 'phrase' ? top.translation || undefined : top.phrase || undefined
    const turn = useYueStore.getState().history[0]
    let cancelled = false
    // Immediate offline seed (emoji) so Details isn’t blank while enrich loads.
    const seed = offlineDictSeed({
      lemma: phrase,
      lang: detailLang,
      contextText: contextText || undefined,
    })
    setDictEntry(seed.media.length ? seed : null)
    setDictLoading(true)

    if (top.kind === 'phrase') {
      setLoading(true)
      setRows([])
      void (async () => {
        const local =
          detailLang === 'yue'
            ? await buildLocalBreakdown(phrase)
            : detailLang === 'cmn'
              ? await buildLocalPinyinBreakdown(phrase)
              : isLatinDetailLang(detailLang)
                ? buildLocalLatinBreakdown(phrase, { phraseGloss, lang: detailLang })
                : []
        if (cancelled) return
        setRows(local)
        try {
          const remote = await fetchBreakdown(phrase, { lang: detailLang })
          if (cancelled) return
          const remoteRows = remote.characters || []
          const merged =
            detailLang === 'yue' || detailLang === 'cmn'
              ? mergeMeanings(local, remoteRows)
              : remoteRows.length
                ? remoteRows.map((r, i) => ({
                    char: r.char,
                    jyutping: r.jyutping,
                    meaning: pickCharGloss(r.meaning, local[i]?.meaning, phraseGloss),
                  }))
                : local
          if (detailLang === 'yue') rememberBreakdownRows(merged, phrase)
          setRows(merged)
        } catch {
          /* local enough */
        } finally {
          if (!cancelled) setLoading(false)
        }
      })()
    } else {
      setRows([])
      setLoading(false)
    }

    void (async () => {
      try {
        const pairedFromTurn =
          turn && top.kind === 'phrase'
            ? turn.to === detailLang
              ? turn.from
              : turn.from === detailLang
                ? turn.to
                : undefined
            : undefined
        const contextLang = inferContextLang({
          detailLang,
          contextText: contextText || undefined,
          pairedFromTurn,
        })
        const entry = await fetchDetailsEnrich({
          text: phrase,
          lang: detailLang,
          contextText: contextText || undefined,
          contextLang,
          glossLang: primaryLanguage,
          wantMedia: true,
        })
        if (!cancelled) setDictEntry(entry)
      } catch {
        if (!cancelled) {
          const fallback = offlineDictSeed({
            lemma: phrase,
            lang: detailLang,
            contextText: contextText || undefined,
          })
          setDictEntry(fallback.media.length ? fallback : null)
        }
      } finally {
        if (!cancelled) setDictLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [top, primaryLanguage])

  useEffect(() => {
    if (!top || top.kind !== 'char' || !top.jp) {
      setIpa('')
      return
    }
    const detailLang = top.lang || (hasHan(top.char) ? 'yue' : 'en')
    if (
      detailLang === 'en' ||
      detailLang === 'tl' ||
      detailLang === 'es' ||
      detailLang === 'vi' ||
      detailLang === 'ceb' ||
      detailLang === 'ilo' ||
      detailLang === 'bcl'
    ) {
      setIpa(top.jp)
      return
    }
    if (
      detailLang === 'yue' ||
      detailLang === 'cmn' ||
      detailLang === 'wuu' ||
      detailLang === 'sichuan'
    ) {
      // Yue: Jyutping + Chao on the title (not IPA / AI pinyin).
      // Cmn: pinyin is tone-marked in jp. Wuu: citation Wugniu lives in jp but is not IPA.
      // Sichuan: 四川话拼音 lives in jp; not Yue Jyutping for IPA lookup.
      setIpa('')
      return
    }
    setIpa('')
  }, [top])

  useEffect(() => {
    if (!top || minimized) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (stack.length > 1) popDetail()
        else closeBreakdown()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [top, minimized, stack.length, popDetail, closeBreakdown])

  const openChar = (row: CharBreakdown) => {
    const detailLang =
      (top?.kind === 'phrase' || top?.kind === 'char' ? top.lang : undefined) ||
      (hasHan(row.char) ? 'yue' : 'en')
    const sense =
      detailLang === 'yue' ||
      detailLang === 'cmn' ||
      detailLang === 'wuu' ||
      detailLang === 'sichuan'
        ? pickCharGloss(row.meaning, glossForChar(row.char))
        : row.meaning.trim()
    if (!sense && !row.jyutping) return
    pushDetail({
      kind: 'char',
      char: row.char,
      // Wuu / Sichuan: jyutping field carries romanization (Wugniu / 四川话拼音).
      jp: row.jyutping,
      phrase: top?.kind === 'phrase' ? top.phrase : row.char,
      lang: detailLang,
      definition: top?.kind === 'phrase' ? top.definition || top.translation : undefined,
      sense: sense || undefined,
    })
  }

  if (!top || minimized) return null

  const translationText =
    top.kind === 'phrase'
      ? top.translation?.trim() || ''
      : pickCharGloss(top.sense)
  const definitionText =
    top.kind === 'phrase' ? top.definition?.trim() || '' : top.definition?.trim() || ''
  const definitions =
    top.kind === 'phrase'
      ? (top.definitions || []).map((d) => d.trim()).filter(Boolean)
      : []
  const alternatives =
    top.kind === 'phrase'
      ? (top.alternatives || []).map((a) => a.trim()).filter(Boolean)
      : []
  const alternativeRomanizations =
    top.kind === 'phrase' ? top.alternativeRomanizations || [] : []
  const topLabel = top.kind === 'phrase' ? top.phrase : top.char
  const detailLang = top.lang || (hasHan(topLabel) ? 'yue' : 'en')
  const isEnglishDetail = detailLang === 'en'
  const isCmnDetail = detailLang === 'cmn'
  const isWuuDetail = detailLang === 'wuu'
  const isSichuanDetail = detailLang === 'sichuan'
  const isTlDetail = detailLang === 'tl'
  const isEsDetail = detailLang === 'es'
  const isViDetail = detailLang === 'vi'
  const isPhilippineRegionalDetail =
    detailLang === 'ceb' || detailLang === 'ilo' || detailLang === 'bcl'
  const isLatinDetail = isTlDetail || isEsDetail || isViDetail || isPhilippineRegionalDetail
  const phraseWugniu =
    top.kind === 'phrase'
      ? top.romanization?.trim() || ''
      : top.jp?.trim() || ''
  const phraseSandhi = top.kind === 'phrase' ? top.sandhiHint?.trim() || '' : ''
  const phraseWuuIpa = top.kind === 'phrase' ? top.ipa?.trim() || '' : ''
  const phraseSichuanRom = top.kind === 'phrase' ? top.romanization?.trim() || '' : ''
  // Sichuanese title uses SichuaneseText (Han + 四川话拼音), not Yue JyutRuby.
  const showRubyTitle =
    !isEnglishDetail &&
    !isWuuDetail &&
    !isSichuanDetail &&
    !isLatinDetail &&
    hasHan(topLabel)
  const showWuuTitle = isWuuDetail && hasHan(topLabel)
  const showSichuanTitle = isSichuanDetail && hasHan(topLabel)
  const phraseIpa =
    isEnglishDetail && top.kind === 'phrase'
      ? rows
          .map((r) => r.jyutping)
          .filter(Boolean)
          .join(' ')
      : ''
  const phraseAccented =
    isLatinDetail && top.kind === 'phrase'
      ? rows
          .map((r) => r.jyutping)
          .filter(Boolean)
          .join(' ')
      : ''
  const titleSegs: JyutSeg[] | PinyinSeg[] | undefined =
    isWuuDetail || isSichuanDetail
      ? undefined
      : top.kind === 'char' && top.jp
        ? isCmnDetail
          ? [{ char: top.char, py: top.jp }]
          : [{ char: top.char, jp: top.jp }]
        : top.kind === 'phrase' && rows.some((r) => r.jyutping) && !isLatinDetail && !isEnglishDetail
          ? isCmnDetail
            ? rows.map((r) => ({ char: r.char, py: r.jyutping || '' }))
            : rows.map((r) => ({ char: r.char, jp: r.jyutping || '' }))
          : undefined
  const showDefinition =
    Boolean(definitionText) &&
    definitions.length === 0 &&
    definitionText.toLowerCase() !== topLabel.toLowerCase()

  /**
   * Learner sense list — same-language definitions only.
   * Paired translation stays in the header; never inject it into SENSES.
   */
  const senseList = (() => {
    const out: string[] = []
    const seen = new Set<string>()
    const paired = translationText.toLowerCase()
    const push = (raw?: string) => {
      const t = (raw || '').trim()
      if (!t) return
      if (paired && t.toLowerCase() === paired) return
      if (t.toLowerCase() === topLabel.toLowerCase()) return
      const han = hasHan(t)
      // Drop cross-script learner defs (e.g. English source on a Sichuanese pane).
      if ((isEnglishDetail || isLatinDetail) && han && !/[A-Za-z]/.test(t)) return
      if (!(isEnglishDetail || isLatinDetail) && !han) return
      const key = t.toLowerCase()
      if (seen.has(key)) return
      seen.add(key)
      out.push(t)
    }
    for (const d of definitions) push(d)
    if (definitions.length === 0) push(definitionText)
    return out
  })()
  // Dictionary panel already surfaces paired gloss + emoji — avoid duplicating the same line.
  const showSenseList =
    senseList.length > 0 &&
    !(
      dictEntry &&
      senseList.every((s) =>
        dictEntry.senses.some((d) => d.gloss.trim().toLowerCase() === s.toLowerCase()),
      )
    )
  const contentRows = rows.filter((r) => /[\p{L}\p{N}]/u.test(r.char))
  const redundantSingleLatin =
    (isEnglishDetail || isLatinDetail) &&
    contentRows.length === 1 &&
    contentRows[0]!.char.toLowerCase() === topLabel.toLowerCase() &&
    Boolean(
      pickCharGloss(contentRows[0]!.meaning) &&
        (pickCharGloss(contentRows[0]!.meaning) === translationText ||
          pickCharGloss(contentRows[0]!.meaning) === definitionText ||
          senseList.includes(pickCharGloss(contentRows[0]!.meaning))),
    )
  const showWordBreakdown = rows.length > 0 && !redundantSingleLatin
  const pedagogy = detailPedagogy(detailLang)
  const body = (
    <>
      <header
        className={`detail-panel-header${desktop ? ' is-draggable' : ''}`}
        onPointerDown={desktop ? (e) => onDragPointerDown(e, 'move') : undefined}
      >
        <div className="detail-panel-titles">
          <p className="detail-panel-kicker">
            {stack.length > 1 ? `Details · ${stack.length} deep` : translationText ? 'Details' : 'Character breakdown'}
          </p>
          <div className="detail-panel-title-row">
            <h2
              id={titleId}
              className="detail-panel-title"
              lang={
                isTlDetail
                  ? 'tl'
                  : isEsDetail
                    ? 'es-MX'
                    : isViDetail
                      ? 'vi'
                      : top.kind === 'char' || showRubyTitle || showWuuTitle || showSichuanTitle
                      ? isWuuDetail
                        ? 'wuu-CN'
                        : isSichuanDetail
                          ? 'zh-CN-sichuan'
                          : isCmnDetail
                            ? 'zh-CN'
                            : 'zh-HK'
                      : 'en'
              }
            >
              {showWuuTitle ? (
                <ShanghaineseText
                  text={topLabel}
                  romanization={phraseWugniu || undefined}
                  sandhiHint={phraseSandhi || undefined}
                  showSandhiHint
                  className="detail-panel-title-han"
                />
              ) : showSichuanTitle ? (
                <SichuaneseText
                  text={topLabel}
                  romanization={phraseSichuanRom || undefined}
                  className="detail-panel-title-han"
                />
              ) : showRubyTitle ? (
                <span
                  {...titleJpBind}
                  className="detail-panel-title-jp"
                  onPointerDown={(e) => e.stopPropagation()}
                  aria-label={
                    isCmnDetail
                      ? `Show pinyin for ${topLabel}`
                      : `Show Jyutping for ${topLabel}`
                  }
                >
                  {isCmnDetail ? (
                    <PinyinRuby
                      han={topLabel}
                      segs={titleSegs as PinyinSeg[] | undefined}
                      size="lg"
                      className="detail-panel-title-ruby jyut-ruby--hint"
                    />
                  ) : (
                    <JyutRuby
                      han={topLabel}
                      segs={titleSegs as JyutSeg[] | undefined}
                      size="lg"
                      className="detail-panel-title-ruby jyut-ruby--hint"
                    />
                  )}
                  {!isCmnDetail ? (
                    <JpPop
                      show={titleJpShow}
                      id={titleJpTipId}
                      han={topLabel}
                      segs={titleSegs as JyutSeg[] | undefined}
                      size="lg"
                      anchorRef={titleJpRef}
                    />
                  ) : null}
                </span>
              ) : (
                topLabel
              )}
            </h2>
            <ResultActions
              text={topLabel}
              lang={speakLangFor(topLabel, detailLang)}
              className="detail-panel-speak"
              showJyutpingCopy={detailLang === 'yue'}
            />
          </div>
          {isWuuDetail && phraseWuuIpa ? (
            <p className="detail-panel-ipa-line" lang="en" title="IPA">
              /{phraseWuuIpa}/
            </p>
          ) : isViDetail ? (
            <VietnameseText text={topLabel} showTones />
          ) : ipa && isTlDetail ? (
            <p className="detail-panel-ipa-line detail-panel-tl-pron" lang="tl">
              <span title="Accented / stress form">{ipa}</span>
              {(() => {
                const kind = tagalogStressClass(ipa || topLabel)
                return kind ? (
                  <span
                    className={`tagalog-stress-chip tagalog-stress-chip--${kind}`}
                    title={tagalogStressLabel(kind)}
                  >
                    {tagalogStressLabel(kind)}
                  </span>
                ) : null
              })()}
            </p>
          ) : ipa && isEsDetail ? (
            <p className="detail-panel-ipa-line detail-panel-tl-pron" lang="es-MX">
              <span title="Accented / stress form">{ipa}</span>
              {(() => {
                const kind = mexicanStressClass(ipa || topLabel)
                return kind ? (
                  <span
                    className={`mexican-spanish-stress-chip mexican-spanish-stress-chip--${kind}`}
                    title={mexicanStressLabel(kind)}
                  >
                    {mexicanStressLabel(kind)}
                  </span>
                ) : null
              })()}
            </p>
          ) : ipa ? (
            <p className="detail-panel-ipa-line" lang="en">
              /{ipa}/
            </p>
          ) : phraseAccented && isTlDetail ? (
            <p className="detail-panel-ipa-line detail-panel-tl-pron" lang="tl" title="Accented / stress forms">
              <span>{phraseAccented}</span>
              {(() => {
                const kind = tagalogStressClass(phraseAccented.split(/\s+/)[0] || topLabel)
                return kind ? (
                  <span
                    className={`tagalog-stress-chip tagalog-stress-chip--${kind}`}
                    title={tagalogStressLabel(kind)}
                  >
                    {tagalogStressLabel(kind)}
                  </span>
                ) : null
              })()}
            </p>
          ) : phraseAccented && isEsDetail ? (
            <p
              className="detail-panel-ipa-line detail-panel-tl-pron"
              lang="es-MX"
              title="Accented / stress forms"
            >
              <span>{phraseAccented}</span>
              {(() => {
                const kind = mexicanStressClass(phraseAccented.split(/\s+/)[0] || topLabel)
                return kind ? (
                  <span
                    className={`mexican-spanish-stress-chip mexican-spanish-stress-chip--${kind}`}
                    title={mexicanStressLabel(kind)}
                  >
                    {mexicanStressLabel(kind)}
                  </span>
                ) : null
              })()}
            </p>
          ) : phraseIpa ? (
            <p className="detail-panel-ipa-line" lang="en">
              /{phraseIpa}/
            </p>
          ) : null}
          {translationText ? (
            <p className="detail-panel-translation" lang="en">
              {translationText}
            </p>
          ) : null}
          {showDefinition ? (
            <p className="detail-panel-definition" lang={pedagogy.htmlLang}>
              {definitionText}
            </p>
          ) : null}
        </div>
        <div className="detail-panel-actions">
          {stack.length > 1 ? (
            <button
              type="button"
              className="detail-panel-btn"
              onClick={() => popDetail()}
              aria-label="Back"
              title="Back"
            >
              ←
            </button>
          ) : null}
          {desktop ? (
            <button
              type="button"
              className="detail-panel-btn"
              onClick={() => minimizeDetail()}
              aria-label="Minimize"
              title="Minimize"
            >
              –
            </button>
          ) : null}
          <button
            ref={closeRef}
            type="button"
            className="detail-panel-btn detail-panel-close"
            onClick={() => closeBreakdown()}
            aria-label="Close details"
          >
            ×
          </button>
        </div>
      </header>

      <div className="detail-panel-body">
        {top.kind === 'phrase' ? (
          <>
            <div className="detail-panel-extra">
              {showSenseList ? (
                <DetailCollapsible
                  title={ui.detailSenses}
                  className="detail-panel-defs"
                  defaultOpen
                >
                  <ul>
                    {senseList.map((def, i) => (
                      <li key={`def-${i}`}>{def}</li>
                    ))}
                  </ul>
                </DetailCollapsible>
              ) : null}
              <DetailCollapsible
                title={ui.historyVariations}
                className="detail-panel-alts"
                defaultOpen={false}
              >
                {altsLoading && alternatives.length === 0 ? (
                  <p className="muted" aria-live="polite">
                    <BiText copy={ui.loadingVariations} size="sm" />
                  </p>
                ) : alternatives.length > 0 ? (
                  <TranslationAlternatives
                    alternatives={alternatives}
                    alternativeRomanizations={
                      isWuuDetail || isSichuanDetail ? alternativeRomanizations : undefined
                    }
                    lang={
                      isEnglishDetail
                        ? 'en'
                        : isTlDetail
                          ? 'tl'
                          : isEsDetail
                            ? 'es'
                            : isViDetail
                              ? 'vi'
                              : isCmnDetail
                                ? 'cmn'
                                : isWuuDetail
                                  ? 'wuu'
                                  : isSichuanDetail
                                    ? 'sichuan'
                                    : 'yue'
                    }
                    onSelect={isEnglishDetail ? selectEnVariation : selectYueVariation}
                    hideLabel
                  />
                ) : (
                  <p className="muted">
                    <BiText copy={ui.detailNoAlternatives} size="sm" />
                  </p>
                )}
              </DetailCollapsible>
            </div>
            <DetailDictionaryPanel entry={dictEntry} loading={dictLoading} glossLang={primaryLanguage} />
            {isEsDetail && pedagogy.extraPanels.includes('mx-register') ? (
              <MexicanSpanishRegisterPanel
                text={topLabel}
                sourceText={
                  top.kind === 'phrase'
                    ? top.translation ||
                      (latestTurn?.to === 'es' ? latestTurn.source : undefined)
                    : undefined
                }
                sourceLang={
                  latestTurn?.to === 'es' && latestTurn.from !== 'es'
                    ? latestTurn.from
                    : 'en'
                }
              />
            ) : null}
            {loading && !rows.length ? (
              <p className="detail-panel-loading muted">Loading…</p>
            ) : showWordBreakdown ? (
              <DetailCollapsible
                title={ui.detailWordBreakdown}
                className="detail-panel-breakdown"
                defaultOpen={rows.length <= 8}
              >
              <ul className="detail-panel-list">
                {rows.map((row, i) => {
                  const meaning = pickCharGloss(row.meaning)
                  const canDrill = Boolean(meaning || glossForChar(row.char) || row.jyutping)
                  const canSpeak =
                    isEnglishDetail || isLatinDetail || isHanChar(row.char)
                  const rowSpeakLang: Lang = isEnglishDetail
                    ? 'en'
                    : isTlDetail
                      ? 'tl'
                      : isEsDetail
                        ? 'es'
                        : isViDetail
                          ? 'vi'
                          : isCmnDetail
                            ? 'cmn'
                            : isWuuDetail
                              ? 'wuu'
                              : isSichuanDetail
                                ? 'sichuan'
                                : 'yue'
                  return (
                    <li key={`${row.char}-${i}`} className="detail-panel-row-wrap">
                      <button
                        type="button"
                        className={`detail-panel-row${canDrill ? ' is-drillable' : ''}`}
                        disabled={!canDrill}
                        onClick={() => openChar(row)}
                        aria-label={
                          canDrill
                            ? `Open details for ${row.char}`
                            : `${row.char}: no further details`
                        }
                      >
                        <span
                          className="detail-panel-char-stack"
                          lang={
                            isTlDetail
                              ? 'tl'
                              : isEsDetail
                                ? 'es-MX'
                                : isViDetail
                                  ? 'vi'
                                  : isWuuDetail
                                    ? 'wuu-CN'
                                    : isSichuanDetail
                                      ? 'zh-CN-sichuan'
                                      : isCmnDetail
                                        ? 'zh-CN'
                                        : 'zh-HK'
                          }
                        >
                          <span className="detail-panel-row-jp">
                            {isTlDetail ? (
                              <span className="detail-panel-tl-pron" lang="tl">
                                {row.jyutping ? (
                                  <span
                                    className="detail-panel-ipa"
                                    title="Accented / stress form"
                                  >
                                    {row.jyutping}
                                  </span>
                                ) : (
                                  <span className="detail-panel-ipa muted" title="Unmarked form">
                                    {row.char}
                                  </span>
                                )}
                                {(() => {
                                  const kind = tagalogStressClass(row.jyutping || row.char)
                                  return kind ? (
                                    <span
                                      className={`tagalog-stress-chip tagalog-stress-chip--${kind}`}
                                      title={tagalogStressLabel(kind)}
                                    >
                                      {tagalogStressLabel(kind)}
                                    </span>
                                  ) : (
                                    <span className="detail-panel-ipa muted">—</span>
                                  )
                                })()}
                              </span>
                            ) : isEsDetail ? (
                              <span className="detail-panel-tl-pron" lang="es-MX">
                                {row.jyutping ? (
                                  <span
                                    className="detail-panel-ipa"
                                    title="Accented / stress form"
                                  >
                                    {row.jyutping}
                                  </span>
                                ) : (
                                  <span className="detail-panel-ipa muted" title="Unmarked form">
                                    {row.char}
                                  </span>
                                )}
                                {(() => {
                                  const kind = mexicanStressClass(row.jyutping || row.char)
                                  return kind ? (
                                    <span
                                      className={`mexican-spanish-stress-chip mexican-spanish-stress-chip--${kind}`}
                                      title={mexicanStressLabel(kind)}
                                    >
                                      {mexicanStressLabel(kind)}
                                    </span>
                                  ) : (
                                    <span className="detail-panel-ipa muted">—</span>
                                  )
                                })()}
                              </span>
                            ) : isViDetail ? (
                              <span className="detail-panel-tl-pron" lang="vi">
                                <span
                                  className="detail-panel-ipa"
                                  title="Full Quốc ngữ form"
                                >
                                  {row.jyutping || row.char}
                                </span>
                                {(() => {
                                  const kind = vietnameseToneClass(row.jyutping || row.char)
                                  return kind ? (
                                    <span
                                      className={`vietnamese-tone-chip vietnamese-tone-chip--${kind}`}
                                      title={vietnameseToneLabel(kind)}
                                    >
                                      {vietnameseToneChipShort(kind)}
                                    </span>
                                  ) : (
                                    <span className="detail-panel-ipa muted">—</span>
                                  )
                                })()}
                              </span>
                            ) : isWuuDetail ? (
                              row.jyutping ? (
                                <span
                                  className="detail-panel-ipa"
                                  lang="en"
                                  title="Wugniu (citation form)"
                                >
                                  {row.jyutping}
                                </span>
                              ) : (
                                '—'
                              )
                            ) : row.jyutping ? (
                              isEnglishDetail ? (
                                <span className="detail-panel-ipa" lang="en">
                                  /{row.jyutping}/
                                </span>
                              ) : isCmnDetail ? (
                                <PinyinSyllable py={row.jyutping} />
                              ) : isSichuanDetail ? (
                                <span
                                  className="detail-panel-ipa"
                                  lang="zh-Latn-CN-sichuan"
                                  title="四川话拼音"
                                >
                                  {row.jyutping}
                                </span>
                              ) : (
                                <JyutSyllable jp={row.jyutping} />
                              )
                            ) : (
                              '—'
                            )}
                          </span>
                          <span className="detail-panel-char">{row.char}</span>
                        </span>
                        <span className="detail-panel-meta">
                          <span className="detail-panel-meaning">
                            {meaning || (loading ? '…' : 'No entry yet')}
                          </span>
                        </span>
                        {canDrill ? <span className="detail-panel-chevron">›</span> : null}
                      </button>
                      {canSpeak ? (
                        <SpeakButton
                          text={row.char}
                          lang={rowSpeakLang}
                          className="detail-panel-row-speak"
                          warm={false}
                        />
                      ) : null}
                    </li>
                  )
                })}
              </ul>
              </DetailCollapsible>
            ) : (
              <p className="detail-panel-loading muted">
                <BiText copy={ui.detailNoWordDetails} size="sm" />
              </p>
            )}
          </>
        ) : (
          <div className="detail-panel-char-view">
            <DetailDictionaryPanel entry={dictEntry} loading={dictLoading} glossLang={primaryLanguage} />
            {top.sense ? (
              <section>
                <h3>{isEnglishDetail || isLatinDetail ? 'This word' : 'This character'}</h3>
                <p>{top.sense}</p>
              </section>
            ) : (
              <p className="muted">No further definition for this character.</p>
            )}
            {top.definition ? (
              <section>
                <h3>In this phrase</h3>
                <p lang="zh-HK">{top.phrase}</p>
                <p className="detail-panel-definition">{top.definition}</p>
              </section>
            ) : null}
            {!top.sense && !top.definition && !top.jp ? (
              <p className="muted">End of drill-down — nothing more to open.</p>
            ) : null}
          </div>
        )}
      </div>
      {desktop ? (
        <div
          className="detail-resize-handle"
          aria-hidden="true"
          onPointerDown={(e) => onDragPointerDown(e, 'resize')}
        />
      ) : null}
    </>
  )

  if (desktop) {
    return createPortal(
      <aside
        className="detail-panel-rail"
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        style={{ left: geom.x, top: geom.y, width: geom.w, height: geom.h }}
      >
        {body}
      </aside>,
      document.body,
    )
  }

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="breakdown-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={() => closeBreakdown()}
        aria-hidden="true"
      />
      <motion.div
        className="breakdown-frame detail-panel-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.28, ease: inkEase }}
      >
        {body}
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}
