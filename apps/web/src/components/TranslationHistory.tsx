import { useCallback, useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BiText } from './BiText'
import { HistoryPane } from './HistoryPane'
import { useYueStore } from '../lib/store'
import { biPlain, ui } from '../lib/uiCopy'
import { inkEase } from '../lib/motion'

const PANEL_KEY = 'yue-history-panel-v1'
const MIN_W = 260
const MIN_H = 200
const MINIMIZED_H = 52

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
    x: Math.max(16, window.innerWidth - w - 24),
    y: 24,
    w,
    h,
    minimized: false,
  }
}

function loadGeom(): PanelGeom {
  try {
    const raw = localStorage.getItem(PANEL_KEY)
    if (!raw) return defaultGeom()
    const parsed = JSON.parse(raw) as Partial<PanelGeom>
    return { ...defaultGeom(), ...parsed }
  } catch {
    return defaultGeom()
  }
}

function clampGeom(g: PanelGeom): PanelGeom {
  if (typeof window === 'undefined') return g
  const maxW = Math.max(MIN_W, window.innerWidth - 16)
  const maxH = Math.max(MIN_H, window.innerHeight - 16)
  const w = Math.min(Math.max(g.w, MIN_W), maxW)
  // Keep stored height as the expanded size even while minimized.
  const h = Math.min(Math.max(g.h, MIN_H), maxH)
  const displayH = g.minimized ? MINIMIZED_H : h
  const x = Math.min(Math.max(8, g.x), window.innerWidth - Math.min(w, 120))
  const y = Math.min(Math.max(8, g.y), window.innerHeight - Math.min(displayH, 48))
  return { ...g, x, y, w, h }
}

/** Desktop floating panel + mobile history button / closable sheet. */
export function TranslationHistory() {
  const history = useYueStore((s) => s.history)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [geom, setGeom] = useState<PanelGeom>(() => clampGeom(loadGeom()))
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const dragRef = useRef<{
    mode: 'move' | 'resize'
    ox: number
    oy: number
    sx: number
    sy: number
    sw: number
    sh: number
  } | null>(null)
  const count = history.length

  const persist = useCallback((next: PanelGeom) => {
    const clamped = clampGeom(next)
    setGeom(clamped)
    try {
      localStorage.setItem(PANEL_KEY, JSON.stringify(clamped))
    } catch {
      /* ignore quota */
    }
  }, [])

  useEffect(() => {
    const onResize = () => setGeom((g) => clampGeom(g))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

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

  const onDragPointerDown = (e: ReactPointerEvent, mode: 'move' | 'resize') => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (mode === 'move' && target.closest('button')) return
    e.preventDefault()
    const start = {
      mode,
      ox: e.clientX,
      oy: e.clientY,
      sx: geom.x,
      sy: geom.y,
      sw: geom.w,
      sh: geom.h,
    }
    dragRef.current = start

    const onMove = (ev: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      const dx = ev.clientX - d.ox
      const dy = ev.clientY - d.oy
      if (d.mode === 'move') {
        setGeom((g) => clampGeom({ ...g, x: d.sx + dx, y: d.sy + dy }))
        return
      }
      setGeom((g) =>
        clampGeom({
          ...g,
          w: d.sw + dx,
          h: d.sh + dy,
        }),
      )
    }
    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      setGeom((g) => {
        const clamped = clampGeom(g)
        try {
          localStorage.setItem(PANEL_KEY, JSON.stringify(clamped))
        } catch {
          /* ignore */
        }
        return clamped
      })
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  const toggleMinimized = () => {
    persist({ ...geom, minimized: !geom.minimized })
  }

  return (
    <>
      <aside
        className={`history-rail${geom.minimized ? ' is-minimized' : ''}`}
        aria-labelledby="history-rail-title"
        style={{
          left: geom.x,
          top: geom.y,
          width: geom.w,
          height: geom.minimized ? MINIMIZED_H : geom.h,
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
              onClick={toggleMinimized}
              aria-label={biPlain(geom.minimized ? ui.historyExpand : ui.historyCollapse)}
              title={biPlain(geom.minimized ? ui.historyExpand : ui.historyCollapse)}
            >
              {geom.minimized ? '▢' : '–'}
            </button>
          </div>
        </header>
        {!geom.minimized ? (
          <>
            <HistoryPane turns={history} />
            <div
              className="history-resize-handle"
              aria-hidden="true"
              onPointerDown={(e) => onDragPointerDown(e, 'resize')}
            />
          </>
        ) : null}
      </aside>

      {/* In-flow above controls on mobile — avoids covering mode tabs / mic. */}
      <div className="history-mobile-row">
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
