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

/**
 * History: desktop floating rail + mobile slim edge sidebar.
 * Collapsed tab expands into a right drawer — no circular FAB stealing Solo space.
 */
export function TranslationHistory() {
  const history = useYueStore((s) => s.history)
  const clearHistory = useYueStore((s) => s.clearHistory)
  const [drawerOpen, setDrawerOpen] = useState(false)
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
    if (!drawerOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [drawerOpen])

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
            <div
              className="history-rail-actions"
              onPointerDown={(e) => e.stopPropagation()}
            >
              {count ? (
                <button
                  type="button"
                  className="history-clear-btn"
                  onClick={() => clearHistory()}
                  aria-label={biPlain(ui.historyClear)}
                  title={biPlain(ui.historyClear)}
                >
                  <BiText copy={ui.historyClear} size="sm" hideJp />
                </button>
              ) : null}
              <button
                type="button"
                className="history-rail-btn history-rail-btn--collapse"
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

      <button
        type="button"
        className="history-edge-tab"
        onClick={() => setDrawerOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={drawerOpen}
        aria-controls={titleId}
        aria-label={biPlain(ui.historyTitle)}
        hidden={drawerOpen}
      >
        <span className="history-edge-tab-label">
          <BiText copy={ui.historyTitle} size="sm" only="zh" hideJp />
        </span>
        {count ? <span className="history-edge-tab-count">{count}</span> : null}
        <span className="history-edge-tab-chevron" aria-hidden="true">
          ‹
        </span>
      </button>

      <AnimatePresence>
        {drawerOpen ? (
          <>
            <motion.div
              key="history-drawer-backdrop"
              className="history-drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDrawerOpen(false)}
              aria-hidden="true"
            />
            <motion.aside
              key="history-drawer"
              className="history-drawer"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.28, ease: inkEase }}
            >
              <header className="history-panel-header history-drawer-header">
                <div className="history-drawer-title-wrap">
                  <h2 id={titleId} className="history-panel-title">
                    <BiText copy={ui.historyTitle} size="md" />
                  </h2>
                  {count ? (
                    <span className="history-count" aria-label={`${count}`}>
                      {count}
                    </span>
                  ) : null}
                </div>
                <div className="history-drawer-actions">
                  {count ? (
                    <button
                      type="button"
                      className="history-clear-btn"
                      onClick={() => clearHistory()}
                      aria-label={biPlain(ui.historyClear)}
                      title={biPlain(ui.historyClear)}
                    >
                      <BiText copy={ui.historyClear} size="sm" hideJp />
                    </button>
                  ) : null}
                  <button
                    ref={closeRef}
                    type="button"
                    className="history-drawer-close"
                    onClick={() => setDrawerOpen(false)}
                    aria-label={biPlain(ui.historyCollapse)}
                    title={biPlain(ui.historyCollapse)}
                  >
                    ›
                  </button>
                </div>
              </header>
              <HistoryPane turns={history} onOpenBreakdown={() => setDrawerOpen(false)} />
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  )
}
