import {
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { fetchBreakdown } from '../lib/api'
import { charSense } from '../lib/charGloss'
import { buildLocalBreakdown, ensureIpa, type CharBreakdown } from '../lib/jyutping'
import { JyutRuby, JyutSyllable } from './JyutRuby'
import { usePanelDock, PANEL_TASKBAR_W } from '../lib/panelDock'
import { useFloatingPanel, type PanelBox } from '../lib/useFloatingPanel'
import { useYueStore } from '../lib/store'
import type { DetailLayer } from '../lib/detailTypes'
import { inkEase } from '../lib/motion'
import { TranslationAlternatives } from './TranslationAlternatives'
import { BiText } from './BiText'
import { ui } from '../lib/uiCopy'
import './DetailPanel.css'

const PANEL_KEY = 'yue-details-panel-v2'
const DOCK_ID = 'details'

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
      meaning: hit.meaning?.trim() || row.meaning,
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
    let cancelled = false
    setLoading(true)
    setRows([])
    void (async () => {
      const local = await buildLocalBreakdown(phrase)
      if (cancelled) return
      setRows(local)
      try {
        const remote = await fetchBreakdown(phrase)
        if (cancelled) return
        setRows(mergeMeanings(local, remote.characters || []))
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
    const sense = row.meaning?.trim() || charSense(row.char) || ''
    if (!sense && !row.jyutping) return
    pushDetail({
      kind: 'char',
      char: row.char,
      jp: row.jyutping,
      phrase: top?.kind === 'phrase' ? top.phrase : row.char,
      definition: top?.kind === 'phrase' ? top.definition || top.translation : undefined,
      sense: sense || undefined,
    })
  }

  if (!top || minimized) return null

  const translationText =
    top.kind === 'phrase' ? top.translation?.trim() || '' : top.sense?.trim() || ''
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
          <h2 id={titleId} className="detail-panel-title" lang={top.kind === 'char' || /[一-龥]/.test(topLabel) ? 'zh-HK' : 'en'}>
            {topLabel}
          </h2>
          {top.kind === 'char' && top.jp ? (
            <p className="detail-panel-jp" lang="en">
              <JyutRuby
                han={top.char}
                segs={[{ char: top.char, jp: top.jp }]}
                size="md"
              />
              {ipa ? <span className="detail-panel-ipa">[{ipa}]</span> : null}
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
                  <section className="detail-panel-defs" aria-label="English meanings">
                    <h3>English meanings</h3>
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
                      onSelect={selectYueVariation}
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
                  const canDrill = Boolean(row.meaning?.trim() || charSense(row.char) || row.jyutping)
                  return (
                    <li key={`${row.char}-${i}`}>
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
                        <span className="detail-panel-char" lang="zh-HK">
                          {row.char}
                        </span>
                        <span className="detail-panel-meta">
                          <span className="detail-panel-row-jp">
                            {row.jyutping ? <JyutSyllable jp={row.jyutping} /> : '—'}
                          </span>
                          <span className="detail-panel-meaning">
                            {row.meaning || (loading ? '…' : '—')}
                          </span>
                        </span>
                        {canDrill ? <span className="detail-panel-chevron">›</span> : null}
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="detail-panel-loading muted">No character details available.</p>
            )}
          </>
        ) : (
          <div className="detail-panel-char-view">
            {top.sense ? (
              <section>
                <h3>This character</h3>
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
    return (
      <aside
        className="detail-panel-rail"
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        style={{ left: geom.x, top: geom.y, width: geom.w, height: geom.h }}
      >
        {body}
      </aside>
    )
  }

  return (
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
    </AnimatePresence>
  )
}
