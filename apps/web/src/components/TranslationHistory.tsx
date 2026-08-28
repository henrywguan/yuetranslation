import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BiText } from './BiText'
import { HistoryPane } from './HistoryPane'
import { usePanelDock, PANEL_TASKBAR_W } from '../lib/panelDock'
import { useFloatingPanel } from '../lib/useFloatingPanel'
import { useYueStore } from '../lib/store'
import { biPlain, ui } from '../lib/uiCopy'
import { inkEase } from '../lib/motion'

const PANEL_KEY = 'yue-history-panel-v3'
const DOCK_ID = 'history'

type PanelGeom = {
  x: number
  y: number
  w: number
  h: number
  minimized: boolean
}

function defaultGeom(): PanelGeom {
  if (typeof window === 'undefined') {
    return { x: 24, y: 24, w: 320, h: 480, minimized: false }
  }
  const w = 320
  const h = Math.min(560, window.innerHeight - 48)
  return {
    // Open on the right; minimize still docks to the left taskbar.
    x: Math.max(PANEL_TASKBAR_W + 16, window.innerWidth - w - 24),
    y: 24,
    w,
    h,
    minimized: false,
  }
}

/** Desktop floating panel + mobile history button / closable sheet. */
export function TranslationHistory() {
  const history = useYueStore((s) => s.history)
  const mode = useYueStore((s) => s.mode)
  const soloShowAutoHint = useYueStore((s) => s.soloShowAutoHint)
  const [sheetOpen, setSheetOpen] = useState(false)
  const { geom, persist, update, onDragPointerDown } = useFloatingPanel<PanelGeom>({
    storageKey: PANEL_KEY,
    minW: 260,
    minH: 200,
    defaultGeom,
  })
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const dockUpsert = usePanelDock((s) => s.upsert)
  const dockRemove = usePanelDock((s) => s.remove)
  const count = history.length
  const showSoloHint = (mode === 'solo' || mode === 'text') && soloShowAutoHint

  useEffect(() => {
    if (!geom.minimized) {
      dockRemove(DOCK_ID)
      return
    }
    dockUpsert({
      id: DOCK_ID,
      title: 'History',
      subtitle: count ? `紀錄 · ${count}` : '紀錄',
      kind: 'history',
    })
    return () => dockRemove(DOCK_ID)
  }, [geom.minimized, count, dockUpsert, dockRemove])

  useEffect(() => {
    const onRestore = (e: Event) => {
      const id = (e as CustomEvent<string>).detail
      if (id !== DOCK_ID) return
      update((g) => ({ ...g, minimized: false }))
    }
    window.addEventListener('yue-dock-restore', onRestore as EventListener)
    return () => window.removeEventListener('yue-dock-restore', onRestore as EventListener)
  }, [update])

  useEffect(() => {
    if (!sheetOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSheetOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [sheetOpen])

  return (
    <>
      {!geom.minimized ? (
        <aside
          className="history-rail"
          aria-labelledby="history-rail-title"
          style={{
            left: geom.x,
            top: geom.y,
            width: geom.w,
            height: geom.h,
          }}
        >
          <header
            className="history-panel-header history-rail-chrome"
            onPointerDown={(e) => onDragPointerDown(e, 'move')}
          >
            <div className="history-rail-title-wrap">
              <h2 id="history-rail-title" className="history-panel-title">
                <BiText copy={ui.historyTitle} size="md" />
              </h2>
              {count ? (
                <span className="history-count" aria-label={`${count}`}>
                  {count}
                </span>
              ) : null}
            </div>
            <div className="history-rail-actions">
              <button
                type="button"
                className="history-rail-btn"
                onClick={() => persist({ ...geom, minimized: true })}
                aria-label={biPlain(ui.historyCollapse)}
                title={biPlain(ui.historyCollapse)}
              >
                –
              </button>
            </div>
          </header>
          <HistoryPane turns={history} />
          <div
            className="history-resize-handle"
            aria-hidden="true"
            onPointerDown={(e) => onDragPointerDown(e, 'resize')}
          />
        </aside>
      ) : null}

      <div className="history-mobile-row">
        <div className="history-mobile-leading">
          {showSoloHint ? (
            <p className="solo-auto-hint" aria-live="polite">
              <BiText copy={ui.autoTranslateHint} size="sm" layout="inline" />
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="history-open-btn"
          onClick={() => setSheetOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
          aria-label={biPlain(ui.historyTitle)}
        >
          <BiText copy={ui.historyTitle} size="sm" />
          {count ? <span className="history-open-count">{count}</span> : null}
        </button>
      </div>

      <AnimatePresence>
        {sheetOpen ? (
          <>
            <motion.div
              key="history-backdrop"
              className="history-sheet-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSheetOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              key="history-sheet"
              className="history-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              initial={{ opacity: 0, y: 36 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.28, ease: inkEase }}
            >
              <header className="history-panel-header history-sheet-header">
                <div>
                  <h2 id={titleId} className="history-panel-title">
                    <BiText copy={ui.historyTitle} size="md" />
                  </h2>
                </div>
                <button
                  ref={closeRef}
                  type="button"
                  className="history-sheet-close"
                  onClick={() => setSheetOpen(false)}
                  aria-label={biPlain(ui.close)}
                >
                  ×
                </button>
              </header>
              <HistoryPane turns={history} onOpenBreakdown={() => setSheetOpen(false)} />
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  )
}
