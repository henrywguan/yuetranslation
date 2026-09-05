import {
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { fetchBreakdown } from '../lib/api'
import { glossForChar, hasHan, isHanChar, pickCharGloss } from '../lib/charGloss'
import { rememberBreakdownRows } from '../lib/learnedGloss'
import { buildLocalBreakdown, ensureIpa, type CharBreakdown, type JyutSeg } from '../lib/jyutping'
import { tagalogStressClass, tagalogStressLabel } from '../lib/tagalogPronunciation'
import { buildLocalPinyinBreakdown, type PinyinSeg } from '../lib/pinyin'
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
import { ui } from '../lib/uiCopy'
import type { Lang } from '../lib/types'
import './DetailPanel.css'

const PANEL_KEY = 'yue-details-panel-v2'
const DOCK_ID = 'details'

function speakLangFor(text: string, detailLang?: Lang): Lang {
  if (detailLang === 'cmn') return 'cmn'
  if (detailLang === 'wuu') return 'wuu'
  if (detailLang === 'tl') return 'tl'
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
  const minimizeDetail = useYueStore((s) => s.minimizeDetail)
  const restoreDetail = useYueStore((s) => s.restoreDetail)
  const selectYueVariation = useYueStore((s) => s.selectYueVariation)
  const selectEnVariation = useYueStore((s) => s.selectEnVariation)
  const altsLoading = useYueStore((s) => s.altsLoading)
  const dockUpsert = usePanelDock((s) => s.upsert)
  const dockRemove = usePanelDock((s) => s.remove)

  const top = stack[stack.length - 1] as DetailLayer | undefined
  const [rows, setRows] = useState<CharBreakdown[]>([])
  const [loading, setLoading] = useState(false)
  const [ipa, setIpa] = useState('')
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
    if (!top || top.kind !== 'phrase') {
      setRows([])
      setLoading(false)
      return
    }
    const phrase = top.phrase
    const detailLang = top.lang || (hasHan(phrase) ? 'yue' : 'en')
    let cancelled = false
    setLoading(true)
    setRows([])
    void (async () => {
      const local =
        detailLang === 'yue'
          ? await buildLocalBreakdown(phrase)
          : detailLang === 'cmn'
            ? await buildLocalPinyinBreakdown(phrase)
            : []
      if (cancelled) return
      setRows(local)
      try {
        // wuu: gloss-only from API; Wugniu stays phrase-level (no per-char ruby).
        const remote = await fetchBreakdown(phrase, { lang: detailLang })
        if (cancelled) return
        const remoteRows = remote.characters || []
        const merged =
          detailLang === 'yue' || detailLang === 'cmn'
            ? mergeMeanings(local, remoteRows)
            : remoteRows.length
              ? remoteRows
              : local
        if (detailLang === 'yue') rememberBreakdownRows(merged, phrase)
        setRows(merged)
      } catch {
        /* local enough */
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [top])

  useEffect(() => {
    if (!top || top.kind !== 'char' || !top.jp) {
      setIpa('')
      return
    }
    const detailLang = top.lang || (hasHan(top.char) ? 'yue' : 'en')
    if (detailLang === 'en' || detailLang === 'tl') {
      setIpa(top.jp)
      return
    }
    if (detailLang === 'cmn' || detailLang === 'wuu') {
      // Cmn: pinyin is tone-marked in jp. Wuu: no per-char romanization in jp.
      setIpa('')
      return
    }
    let cancelled = false
    void ensureIpa(top.jp).then((v) => {
      if (!cancelled) setIpa(v)
    })
    return () => {
      cancelled = true
    }
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
      detailLang === 'yue' || detailLang === 'cmn' || detailLang === 'wuu'
        ? pickCharGloss(row.meaning, glossForChar(row.char))
        : row.meaning.trim()
    if (!sense && !row.jyutping) return
    pushDetail({
      kind: 'char',
      char: row.char,
      jp: detailLang === 'wuu' ? null : row.jyutping,
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
  const topLabel = top.kind === 'phrase' ? top.phrase : top.char
  const detailLang = top.lang || (hasHan(topLabel) ? 'yue' : 'en')
  const isEnglishDetail = detailLang === 'en'
  const isCmnDetail = detailLang === 'cmn'
  const isWuuDetail = detailLang === 'wuu'
  const isTlDetail = detailLang === 'tl'
  const phraseWugniu = top.kind === 'phrase' ? top.romanization?.trim() || '' : ''
  const phraseSandhi = top.kind === 'phrase' ? top.sandhiHint?.trim() || '' : ''
  const phraseWuuIpa = top.kind === 'phrase' ? top.ipa?.trim() || '' : ''
  const showRubyTitle = !isEnglishDetail && !isWuuDetail && !isTlDetail && hasHan(topLabel)
  const showWuuTitle = isWuuDetail && hasHan(topLabel)
  const phraseIpa =
    isEnglishDetail && top.kind === 'phrase'
      ? rows
          .map((r) => r.jyutping)
          .filter(Boolean)
          .join(' ')
      : ''
  const phraseAccented =
    isTlDetail && top.kind === 'phrase'
      ? rows
          .map((r) => r.jyutping)
          .filter(Boolean)
          .join(' ')
      : ''
  const titleSegs: JyutSeg[] | PinyinSeg[] | undefined =
    isWuuDetail
      ? undefined
      : top.kind === 'char' && top.jp
        ? isCmnDetail
          ? [{ char: top.char, py: top.jp }]
          : [{ char: top.char, jp: top.jp }]
        : top.kind === 'phrase' && rows.some((r) => r.jyutping) && !isTlDetail && !isEnglishDetail
          ? isCmnDetail
            ? rows.map((r) => ({ char: r.char, py: r.jyutping || '' }))
            : rows.map((r) => ({ char: r.char, jp: r.jyutping || '' }))
          : undefined
  const showDefinition =
    Boolean(definitionText) &&
    definitions.length <= 1 &&
    definitionText.toLowerCase() !== translationText.toLowerCase() &&
    definitionText.toLowerCase() !== topLabel.toLowerCase()

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
                  : top.kind === 'char' || showRubyTitle || showWuuTitle
                    ? isWuuDetail
                      ? 'wuu-CN'
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
            />
          </div>
          {isWuuDetail && phraseWuuIpa ? (
            <p className="detail-panel-ipa-line" lang="en" title="IPA">
              /{phraseWuuIpa}/
            </p>
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
          ) : ipa ? (
            <p className="detail-panel-ipa-line" lang="en">
              /{ipa}/
            </p>
          ) : phraseAccented ? (
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
            <p className="detail-panel-definition" lang="en">
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
            {definitions.length > 1 || alternatives.length > 0 || altsLoading ? (
              <div className="detail-panel-extra">
                {definitions.length > 1 ? (
                  <section
                    className="detail-panel-defs"
                    aria-label={isEnglishDetail ? 'Meanings' : 'English meanings'}
                  >
                    <h3>{isEnglishDetail ? 'Meanings' : 'English meanings'}</h3>
                    <ul>
                      {definitions.map((def, i) => (
                        <li key={`def-${i}`}>{def}</li>
                      ))}
                    </ul>
                  </section>
                ) : null}
                {altsLoading && alternatives.length === 0 ? (
                  <section className="detail-panel-alts" aria-live="polite">
                    <h3>
                      <BiText copy={ui.historyVariations} size="sm" />
                    </h3>
                    <p className="muted">
                      <BiText copy={ui.loadingVariations} size="sm" />
                    </p>
                  </section>
                ) : alternatives.length > 0 ? (
                  <section className="detail-panel-alts" aria-label="Other variations">
                    <TranslationAlternatives
                      alternatives={alternatives}
                      lang={
                        isEnglishDetail
                          ? 'en'
                          : isTlDetail
                            ? 'tl'
                            : isCmnDetail
                              ? 'cmn'
                              : isWuuDetail
                                ? 'wuu'
                                : 'yue'
                      }
                      onSelect={isEnglishDetail ? selectEnVariation : selectYueVariation}
                    />
                  </section>
                ) : null}
              </div>
            ) : null}
            {loading && !rows.length ? (
              <p className="detail-panel-loading muted">Loading…</p>
            ) : rows.length ? (
              <ul className="detail-panel-list">
                {rows.map((row, i) => {
                  const meaning = pickCharGloss(row.meaning)
                  const canDrill = Boolean(meaning || glossForChar(row.char) || row.jyutping)
                  const canSpeak =
                    isEnglishDetail || isTlDetail || isHanChar(row.char)
                  const rowSpeakLang: Lang = isEnglishDetail
                    ? 'en'
                    : isTlDetail
                      ? 'tl'
                      : isCmnDetail
                        ? 'cmn'
                        : isWuuDetail
                          ? 'wuu'
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
                            isTlDetail ? 'tl' : isWuuDetail ? 'wuu-CN' : isCmnDetail ? 'zh-CN' : 'zh-HK'
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
                            ) : row.jyutping && !isWuuDetail ? (
                              isEnglishDetail ? (
                                <span className="detail-panel-ipa" lang="en">
                                  /{row.jyutping}/
                                </span>
                              ) : isCmnDetail ? (
                                <PinyinSyllable py={row.jyutping} />
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
                        />
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="detail-panel-loading muted">
                {isEnglishDetail || isTlDetail
                  ? 'No word details available.'
                  : 'No character details available.'}
              </p>
            )}
          </>
        ) : (
          <div className="detail-panel-char-view">
            {top.sense ? (
              <section>
                <h3>{isEnglishDetail || isTlDetail ? 'This word' : 'This character'}</h3>
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
