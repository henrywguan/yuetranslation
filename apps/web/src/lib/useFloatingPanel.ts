import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { PANEL_TASKBAR_W } from './panelDock'

export type PanelBox = { x: number; y: number; w: number; h: number }

function isDesktopMq() {
  return typeof window !== 'undefined' && window.matchMedia('(min-width: 960px)').matches
}

function clampBox<T extends PanelBox>(g: T, minW: number, minH: number): T {
  if (typeof window === 'undefined') return g
  const w = Math.min(Math.max(g.w, minW), window.innerWidth - 16 - PANEL_TASKBAR_W)
  const h = Math.min(Math.max(g.h, minH), window.innerHeight - 16)
  const x = Math.min(Math.max(PANEL_TASKBAR_W + 12, g.x), window.innerWidth - Math.min(w, 120))
  const y = Math.min(Math.max(8, g.y), window.innerHeight - Math.min(h, 48))
  return { ...g, x, y, w, h }
}

function loadBox<T extends PanelBox>(key: string, fallback: () => T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback()
    return { ...fallback(), ...(JSON.parse(raw) as Partial<T>) }
  } catch {
    return fallback()
  }
}

function saveBox(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore quota */
  }
}

/** Shared geom / persist / drag-resize for desktop floating panels. */
export function useFloatingPanel<T extends PanelBox>(opts: {
  storageKey: string
  minW: number
  minH: number
  defaultGeom: () => T
}) {
  const { storageKey, minW, minH, defaultGeom } = opts
  const clamp = useCallback((g: T) => clampBox(g, minW, minH), [minW, minH])
  const [geom, setGeom] = useState<T>(() => clamp(loadBox(storageKey, defaultGeom)))
  const [desktop, setDesktop] = useState(isDesktopMq)
  const dragRef = useRef<{
    mode: 'move' | 'resize'
    ox: number
    oy: number
    sx: number
    sy: number
    sw: number
    sh: number
  } | null>(null)

  const persist = useCallback(
    (next: T) => {
      const clamped = clamp(next)
      setGeom(clamped)
      saveBox(storageKey, clamped)
    },
    [clamp, storageKey],
  )

  const update = useCallback(
    (fn: (g: T) => T) => {
      setGeom((g) => {
        const next = clamp(fn(g))
        saveBox(storageKey, next)
        return next
      })
    },
    [clamp, storageKey],
  )

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 960px)')
    const sync = () => setDesktop(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    const onResize = () => setGeom((g) => clamp(g))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [clamp])

  const onDragPointerDown = (e: ReactPointerEvent, mode: 'move' | 'resize') => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (mode === 'move' && target.closest('button')) return
    e.preventDefault()
    dragRef.current = {
      mode,
      ox: e.clientX,
      oy: e.clientY,
      sx: geom.x,
      sy: geom.y,
      sw: geom.w,
      sh: geom.h,
    }
    const onMove = (ev: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      const dx = ev.clientX - d.ox
      const dy = ev.clientY - d.oy
      if (d.mode === 'move') {
        setGeom((g) => clamp({ ...g, x: d.sx + dx, y: d.sy + dy }))
        return
      }
      setGeom((g) => clamp({ ...g, w: d.sw + dx, h: d.sh + dy }))
    }
    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      setGeom((g) => {
        const clamped = clamp(g)
        saveBox(storageKey, clamped)
        return clamped
      })
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  return { geom, setGeom, persist, update, desktop, onDragPointerDown, clamp }
}
