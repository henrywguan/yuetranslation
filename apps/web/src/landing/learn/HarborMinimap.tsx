import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { HARBOR_VISITABLES, type HarborVisitableId } from './harborWorld'
import type { HarborRemotePlayer } from './harborPresence'

export type HarborMinimapPose = {
  x: number
  z: number
  yaw: number
  /** Orbit camera facing direction (world yaw of “look forward”). */
  viewYaw: number
}

const STORAGE_KEY = 'harbor.minimap.layout.v1'
const WORLD_RADIUS = 90
const MIN_SIZE = 108
const MAX_SIZE = 280
const DEFAULT_SIZE = 148
const COLLAPSED_H = 36

type Layout = {
  left: number
  top: number
  size: number
  collapsed: boolean
  locked: boolean
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

function loadLayout(): Layout {
  const fallback: Layout = {
    left: 12,
    top: 72,
    size: DEFAULT_SIZE,
    collapsed: false,
    locked: false,
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<Layout>
    return {
      left: typeof parsed.left === 'number' ? parsed.left : fallback.left,
      top: typeof parsed.top === 'number' ? parsed.top : fallback.top,
      size: typeof parsed.size === 'number' ? clamp(parsed.size, MIN_SIZE, MAX_SIZE) : fallback.size,
      collapsed: Boolean(parsed.collapsed),
      locked: Boolean(parsed.locked),
    }
  } catch {
    return fallback
  }
}

function saveLayout(layout: Layout) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout))
  } catch {
    /* ignore */
  }
}

function project(
  dx: number,
  dz: number,
  viewYaw: number,
  size: number,
): { left: number; top: number; onMap: boolean } {
  // Orbit φ: 0 = camera on −Z looking +Z. forward/right match lookDir past the boat.
  const c = Math.cos(viewYaw)
  const s = Math.sin(viewYaw)
  const forward = -dx * s + dz * c
  const right = dx * c + dz * s
  const nx = right / WORLD_RADIUS
  const ny = -forward / WORLD_RADIUS
  const r = Math.hypot(nx, ny)
  const scale = r > 1 ? 1 / r : 1
  const cx = size / 2
  const cy = size / 2
  const rad = size * 0.42
  return {
    left: cx + nx * scale * rad,
    top: cy + ny * scale * rad,
    onMap: r <= 1.05,
  }
}

const VISIT_DOT: Record<HarborVisitableId, string> = {
  'save-shack': 'hq-minimap-dot--save-shack',
  outfitter: 'hq-minimap-dot--outfitter',
  bank: 'hq-minimap-dot--bank',
  arena: 'hq-minimap-dot--arena',
  barber: 'hq-minimap-dot--barber',
}

type Props = {
  pose: HarborMinimapPose | null
  remotes: HarborRemotePlayer[]
  hidden?: boolean
}

export function HarborMinimap({ pose, remotes, hidden }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState<Layout>(() => loadLayout())
  const dragRef = useRef<{
    kind: 'move' | 'resize'
    pointerId: number
    startX: number
    startY: number
    origLeft: number
    origTop: number
    origSize: number
  } | null>(null)

  useEffect(() => {
    saveLayout(layout)
  }, [layout])

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d || e.pointerId !== d.pointerId) return
      const dx = e.clientX - d.startX
      const dy = e.clientY - d.startY
      if (d.kind === 'move') {
        const el = rootRef.current
        const w = el?.offsetWidth ?? layout.size
        const h = layout.collapsed ? COLLAPSED_H : layout.size + COLLAPSED_H
        setLayout((prev) => ({
          ...prev,
          left: clamp(d.origLeft + dx, 4, window.innerWidth - w - 4),
          top: clamp(d.origTop + dy, 4, window.innerHeight - h - 4),
        }))
      } else {
        const next = clamp(d.origSize + Math.max(dx, dy), MIN_SIZE, MAX_SIZE)
        setLayout((prev) => ({ ...prev, size: next }))
      }
    }
    const onUp = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d || e.pointerId !== d.pointerId) return
      dragRef.current = null
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [layout.collapsed, layout.size])

  const beginMove = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (layout.locked) return
      if ((e.target as HTMLElement).closest('button, .hq-minimap-resize')) return
      e.preventDefault()
      e.stopPropagation()
      dragRef.current = {
        kind: 'move',
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        origLeft: layout.left,
        origTop: layout.top,
        origSize: layout.size,
      }
    },
    [layout.locked, layout.left, layout.top, layout.size],
  )

  const beginResize = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      if (layout.locked || layout.collapsed) return
      e.preventDefault()
      e.stopPropagation()
      dragRef.current = {
        kind: 'resize',
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        origLeft: layout.left,
        origTop: layout.top,
        origSize: layout.size,
      }
    },
    [layout.locked, layout.collapsed, layout.left, layout.top, layout.size],
  )

  if (hidden) return null

  const viewYaw = pose?.viewYaw ?? pose?.yaw ?? 0
  const size = layout.size

  return (
    <div
      ref={rootRef}
      className={`hq-minimap${layout.collapsed ? ' is-collapsed' : ''}${layout.locked ? ' is-locked' : ''}`}
      style={{ left: layout.left, top: layout.top, width: size }}
      aria-label="Harbor minimap"
    >
      <div className="hq-minimap-chrome" onPointerDown={beginMove}>
        <button
          type="button"
          className="hq-minimap-tool"
          aria-expanded={!layout.collapsed}
          aria-label={layout.collapsed ? 'Expand minimap' : 'Collapse minimap'}
          onClick={(e) => {
            e.stopPropagation()
            setLayout((prev) => ({ ...prev, collapsed: !prev.collapsed }))
          }}
        >
          {layout.collapsed ? '+' : '–'}
        </button>
        <span className="hq-minimap-title">Nearby</span>
        <button
          type="button"
          className={`hq-minimap-tool${layout.locked ? ' is-on' : ''}`}
          aria-pressed={layout.locked}
          aria-label={layout.locked ? 'Unlock minimap' : 'Lock minimap'}
          title={layout.locked ? 'Unlock position & size' : 'Lock position & size'}
          onClick={(e) => {
            e.stopPropagation()
            setLayout((prev) => ({ ...prev, locked: !prev.locked }))
          }}
        >
          {layout.locked ? '●' : '○'}
        </button>
      </div>

      {!layout.collapsed && (
        <div className="hq-minimap-body">
          <div className="hq-minimap-ring" aria-hidden />
          <div
            className="hq-minimap-heading"
            aria-hidden
            title="Camera forward"
          />
          {pose &&
            HARBOR_VISITABLES.map((v) => {
              const p = project(v.x - pose.x, v.z - pose.z, viewYaw, size)
              if (!p.onMap) return null
              return (
                <span
                  key={v.id}
                  className={`hq-minimap-dot ${VISIT_DOT[v.id]}`}
                  style={{ left: p.left, top: p.top }}
                  title={v.name.en}
                />
              )
            })}
          {pose &&
            remotes.map((r) => {
              const p = project(r.x - pose.x, r.z - pose.z, viewYaw, size)
              if (!p.onMap) return null
              return (
                <span
                  key={r.userId}
                  className="hq-minimap-dot hq-minimap-dot--remote"
                  style={{ left: p.left, top: p.top }}
                  title={r.username}
                />
              )
            })}
          <span className="hq-minimap-you" aria-hidden />
          {!layout.locked && (
            <button
              type="button"
              className="hq-minimap-resize"
              aria-label="Resize minimap"
              onPointerDown={beginResize}
            />
          )}
        </div>
      )}
    </div>
  )
}
