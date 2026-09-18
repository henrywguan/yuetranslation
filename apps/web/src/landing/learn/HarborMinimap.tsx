import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { HARBOR_VISITABLES, type HarborVisitable, type HarborVisitableId } from './harborWorld'
import type { HarborRealmId } from './harborWorld'
import { GUAN_CAPE_LOOM, GUAN_RETURN_PORTAL } from './harborGuanRealm'
import { GUAN_FISH_SPOTS, GUAN_FISHING_HUT } from './harborFishing'
import {
  MINIMAP_CARDINALS,
  buildMinimapGeoFeatures,
  resolveHarborMinimapPlace,
} from './harborMinimapGeo'
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
const MIN_SIZE = 96
const MAX_SIZE = 240
const DEFAULT_SIZE = 120
const COLLAPSED_H = 52
/** Hide the "Nearby" chrome label when tools leave too little room. */
const COMPACT_TITLE_BELOW = 148

type Layout = {
  left: number
  top: number
  size: number
  collapsed: boolean
  locked: boolean
  /** Color key — off by default so the radar stays quiet. */
  legendOpen: boolean
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
    legendOpen: false,
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
      // Prefer explicit false; missing key stays hidden (less intrusive default).
      legendOpen: parsed.legendOpen === true,
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

/**
 * Inverse of `project` for OSRS-style minimap click-to-walk.
 * Local pixel (left, top) inside the circular body → world (x, z).
 * Returns null when the tap is outside the usable radar disc.
 */
export function unprojectMinimapTap(
  localX: number,
  localY: number,
  pose: HarborMinimapPose,
  size: number,
): { x: number; z: number } | null {
  const cx = size / 2
  const cy = size / 2
  const rad = size * 0.42
  if (rad <= 0) return null
  const nx = (localX - cx) / rad
  const ny = (localY - cy) / rad
  const r = Math.hypot(nx, ny)
  if (r > 1.05) return null
  const viewYaw = pose.viewYaw ?? pose.yaw
  const c = Math.cos(viewYaw)
  const s = Math.sin(viewYaw)
  const right = WORLD_RADIUS * nx
  const forward = -WORLD_RADIUS * ny
  const dx = c * right - s * forward
  const dz = s * right + c * forward
  return { x: pose.x + dx, z: pose.z + dz }
}

/** Place a world-fixed cardinal on the radar rim. */
function cardinalRimPos(
  dx: number,
  dz: number,
  viewYaw: number,
  size: number,
): { left: number; top: number } {
  const p = project(dx * WORLD_RADIUS * 0.85, dz * WORLD_RADIUS * 0.85, viewYaw, size)
  const cx = size / 2
  const cy = size / 2
  const vx = p.left - cx
  const vy = p.top - cy
  const len = Math.hypot(vx, vy) || 1
  const rad = size * 0.42
  return { left: cx + (vx / len) * rad * 0.96, top: cy + (vy / len) * rad * 0.96 }
}

function geoPathD(
  points: readonly { x: number; z: number }[],
  pose: HarborMinimapPose,
  viewYaw: number,
  size: number,
  closed: boolean,
): string | null {
  if (points.length < 2) return null
  const parts: string[] = []
  for (let i = 0; i < points.length; i++) {
    const pt = points[i]!
    const p = project(pt.x - pose.x, pt.z - pose.z, viewYaw, size)
    parts.push(`${i === 0 ? 'M' : 'L'}${p.left.toFixed(2)} ${p.top.toFixed(2)}`)
  }
  if (closed) parts.push('Z')
  return parts.join(' ')
}

const VISIT_DOT: Record<HarborVisitableId, string> = {
  'save-shack': 'hq-minimap-dot--save-shack',
  outfitter: 'hq-minimap-dot--outfitter',
  bank: 'hq-minimap-dot--bank',
  arena: 'hq-minimap-dot--arena',
  barber: 'hq-minimap-dot--barber',
  'cape-loom': 'hq-minimap-dot--cape-loom',
  'fishing-hut': 'hq-minimap-dot--fishing-hut',
  'fishing-spot': 'hq-minimap-dot--fishing-spot',
}

function minimapVisitables(realm: HarborRealmId | null | undefined): readonly HarborVisitable[] {
  if (realm !== 'guan') return HARBOR_VISITABLES
  return [
    {
      id: GUAN_RETURN_PORTAL.id,
      name: { en: 'Customs', zh: '關口' },
      x: GUAN_RETURN_PORTAL.x,
      z: GUAN_RETURN_PORTAL.z,
    },
    {
      id: GUAN_CAPE_LOOM.id,
      name: GUAN_CAPE_LOOM.name,
      x: GUAN_CAPE_LOOM.x,
      z: GUAN_CAPE_LOOM.z,
    },
    {
      id: GUAN_FISHING_HUT.id,
      name: GUAN_FISHING_HUT.name,
      x: GUAN_FISHING_HUT.x,
      z: GUAN_FISHING_HUT.z,
    },
    ...GUAN_FISH_SPOTS.map((s) => ({
      id: 'fishing-spot' as const,
      name: s.name,
      x: s.x,
      z: s.z,
    })),
  ]
}

type Props = {
  pose: HarborMinimapPose | null
  remotes: HarborRemotePlayer[]
  hidden?: boolean
  /** Active voyage pocket — Guan shows fishing lodge / spots. */
  realm?: HarborRealmId | null
  /** OSRS minimap navigate — world (x, z) from a tap inside the radar disc. */
  onNavigate?: (x: number, z: number) => void
}

type TapMark = { left: number; top: number; id: number }

export function HarborMinimap({ pose, remotes, hidden, realm = null, onNavigate }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState<Layout>(() => loadLayout())
  const [tapMark, setTapMark] = useState<TapMark | null>(null)
  const tapSeqRef = useRef(0)
  const navPointerRef = useRef<{ pointerId: number; x: number; y: number } | null>(null)
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
        const h = el?.offsetHeight ?? (layout.collapsed ? COLLAPSED_H : layout.size + COLLAPSED_H)
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

  const onBodyPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, .hq-minimap-resize')) return
    // Chrome drag owns move/resize; body taps are click-to-walk only.
    if (dragRef.current) return
    navPointerRef.current = { pointerId: e.pointerId, x: e.clientX, y: e.clientY }
  }, [])

  const onBodyPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const start = navPointerRef.current
      navPointerRef.current = null
      if (!start || start.pointerId !== e.pointerId) return
      if (!onNavigate || !pose || !bodyRef.current) return
      // Ignore drags / sloppy presses — keep this a deliberate tap.
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) return
      const rect = bodyRef.current.getBoundingClientRect()
      const localX = e.clientX - rect.left
      const localY = e.clientY - rect.top
      // Use the painted disc size so center tap = stand still / sail in place.
      const mapSize = Math.min(rect.width, rect.height)
      const world = unprojectMinimapTap(localX, localY, pose, mapSize)
      if (!world) return
      e.preventDefault()
      e.stopPropagation()
      tapSeqRef.current += 1
      const id = tapSeqRef.current
      setTapMark({ left: localX, top: localY, id })
      window.setTimeout(() => {
        setTapMark((prev) => (prev?.id === id ? null : prev))
      }, 700)
      onNavigate(world.x, world.z)
    },
    [onNavigate, pose],
  )

  const place = useMemo(() => {
    if (!pose) return { en: 'Charting…', zh: '定位中', kind: 'sea' as const }
    return resolveHarborMinimapPlace(pose.x, pose.z, realm)
  }, [pose, realm])

  const geoFeatures = useMemo(() => {
    if (!pose) return []
    return buildMinimapGeoFeatures(realm, pose.z)
  }, [pose, realm])

  if (hidden) return null

  const viewYaw = pose?.viewYaw ?? pose?.yaw ?? 0
  const size = layout.size
  const compact = size < COMPACT_TITLE_BELOW

  const visitables = minimapVisitables(realm)

  const nearbyVisits =
    pose == null
      ? []
      : visitables.filter((v) => {
          const p = project(v.x - pose.x, v.z - pose.z, viewYaw, size)
          return p.onMap
        })
  const nearbyRemotes =
    pose == null
      ? []
      : remotes.filter((r) => {
          const p = project(r.x - pose.x, r.z - pose.z, viewYaw, size)
          return p.onMap
        })

  return (
    <div
      ref={rootRef}
      className={`hq-minimap${layout.collapsed ? ' is-collapsed' : ''}${layout.locked ? ' is-locked' : ''}${layout.legendOpen ? ' is-legend-open' : ''}${compact ? ' is-compact' : ''}${onNavigate ? ' is-navigable' : ''}`}
      style={
        {
          left: layout.left,
          top: layout.top,
          width: size,
          '--hq-minimap-size': `${size}px`,
        } as CSSProperties
      }
      aria-label="Harbor minimap"
    >
      <div className={`hq-minimap-place hq-minimap-place--${place.kind}`} title={`${place.en} · ${place.zh}`}>
        <span className="hq-minimap-place-en">{place.en}</span>
        <span className="hq-minimap-place-zh" lang="zh-HK">
          {place.zh}
        </span>
      </div>

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
        {!compact && <span className="hq-minimap-title">Nearby</span>}
        {compact && <span className="hq-minimap-chrome-spacer" aria-hidden />}
        {!layout.collapsed && (
          <button
            type="button"
            className={`hq-minimap-tool hq-minimap-tool--legend${layout.legendOpen ? ' is-on' : ''}`}
            aria-expanded={layout.legendOpen}
            aria-label={layout.legendOpen ? 'Hide legend' : 'Show legend'}
            title={layout.legendOpen ? 'Hide legend' : 'Show legend'}
            onClick={(e) => {
              e.stopPropagation()
              setLayout((prev) => ({ ...prev, legendOpen: !prev.legendOpen }))
            }}
          >
            <span className="hq-minimap-legend-ico" aria-hidden />
          </button>
        )}
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
        <>
          <div
            ref={bodyRef}
            className="hq-minimap-body"
            role={onNavigate ? 'button' : undefined}
            tabIndex={onNavigate ? 0 : undefined}
            aria-label={onNavigate ? 'Tap to walk or sail' : undefined}
            title={onNavigate ? 'Tap to walk or sail' : undefined}
            onPointerDown={onNavigate ? onBodyPointerDown : undefined}
            onPointerUp={onNavigate ? onBodyPointerUp : undefined}
            onPointerCancel={() => {
              navPointerRef.current = null
            }}
          >
            <div className="hq-minimap-ring" aria-hidden />
            {pose ? (
              <svg
                className="hq-minimap-geo"
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                aria-hidden
              >
                {geoFeatures.map((f) => {
                  const d = geoPathD(f.points, pose, viewYaw, size, f.closed)
                  if (!d) return null
                  return (
                    <path
                      key={f.id}
                      className={`hq-minimap-geo-path hq-minimap-geo-path--${f.kind}`}
                      d={d}
                    />
                  )
                })}
              </svg>
            ) : null}
            <div className="hq-minimap-heading" aria-hidden title="Camera forward" />
            {pose &&
              MINIMAP_CARDINALS.map((c) => {
                const p = cardinalRimPos(c.dx, c.dz, viewYaw, size)
                return (
                  <span
                    key={c.id}
                    className={`hq-minimap-cardinal hq-minimap-cardinal--${c.id.toLowerCase()}`}
                    style={{ left: p.left, top: p.top }}
                    aria-hidden
                  >
                    {c.label}
                  </span>
                )
              })}
            {pose &&
              visitables.map((v) => {
                const p = project(v.x - pose.x, v.z - pose.z, viewYaw, size)
                if (!p.onMap) return null
                return (
                  <span
                    key={`${v.id}:${v.x.toFixed(2)}:${v.z.toFixed(2)}`}
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
            {tapMark && (
              <span
                key={tapMark.id}
                className="hq-minimap-tap-x"
                style={{ left: tapMark.left, top: tapMark.top }}
                aria-hidden
              />
            )}
            {!layout.locked && (
              <button
                type="button"
                className="hq-minimap-resize"
                aria-label="Resize minimap"
                onPointerDown={beginResize}
              />
            )}
          </div>

          {layout.legendOpen && (
            <ul className="hq-minimap-legend" aria-label="Minimap legend">
              {nearbyVisits.length === 0 && nearbyRemotes.length === 0 ? (
                <li className="hq-minimap-empty">Nothing nearby</li>
              ) : (
                <>
                  {nearbyVisits.map((v) => (
                    <li key={`${v.id}:${v.x}:${v.z}`}>
                      <span className={`hq-minimap-legend-swatch ${VISIT_DOT[v.id]}`} />
                      <span>{v.name.en}</span>
                    </li>
                  ))}
                  {nearbyRemotes.map((r) => (
                    <li key={r.userId}>
                      <span className="hq-minimap-legend-swatch hq-minimap-dot--remote" />
                      <span>{r.username}</span>
                    </li>
                  ))}
                </>
              )}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
