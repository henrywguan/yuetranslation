/**
 * Harbor Quest · fullscreen world map (minimap globe).
 * Overview painted chart → drill into region chart with chapter / landmark dots.
 * Charts support pinch / wheel zoom + drag pan.
 */
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react'
import { type HarborWorldMapDest, HARBOR_WORLD_MAP_ART } from './harborWorldMapScene'
import { GUAN_HARBOR_META } from './harborGuanRealm'
import {
  guanLandmarkNodes,
  voyageChapterNodes,
  voyageProgressSummary,
  type WorldMapNode,
} from './harborWorldMapNodes'
import type { HarborProgress } from './progressMerge'

export const HARBOR_CONTINENT_VOYAGE_ART = '/assets/harbor-quest/world-map/harbor-continent-voyage.png'
export const HARBOR_CONTINENT_GUAN_ART = '/assets/harbor-quest/world-map/harbor-continent-guan.png'
export const HARBOR_CONTINENT_VOYAGE_GLB = '/assets/harbor-quest/world-map/harbor-continent-voyage.glb'
export const HARBOR_CONTINENT_GUAN_GLB = '/assets/harbor-quest/world-map/harbor-continent-guan.glb'

const ZOOM_MIN = 1
const ZOOM_MAX = 3.2
const ZOOM_STEP = 0.28

type Props = {
  open: boolean
  current: HarborWorldMapDest
  /** Active pier id (for “you are here” on chapter dots). */
  activeLevelId?: string | null
  progress: HarborProgress
  onClose: () => void
  onTravel: (dest: HarborWorldMapDest) => void
  /** Open a campaign pier from a chapter dot (Learning voyage). */
  onOpenChapter?: (levelId: string) => void
  /** Teleport canoe to a Guan fishing lodge / spot (world xz). */
  onTravelFishSpot?: (spot: { id: string; x: number; z: number; level: number }) => void
  /** Player fishing XP — gates Guan fish-spot dots. */
  fishingXp?: number
}

type View = 'overview' | HarborWorldMapDest

type ZoomState = { scale: number; x: number; y: number }

function clampZoom(s: number) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, s))
}

/** Pinch / wheel zoom + drag pan for painted charts. */
function useMapZoom(resetKey: string) {
  const [zoom, setZoom] = useState<ZoomState>({ scale: 1, x: 0, y: 0 })
  const wrapRef = useRef<HTMLDivElement>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinchStart = useRef<{ dist: number; scale: number; x: number; y: number } | null>(null)
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom

  useEffect(() => {
    setZoom({ scale: 1, x: 0, y: 0 })
    pointers.current.clear()
    pinchStart.current = null
    dragStart.current = null
  }, [resetKey])

  const onPointerDown = (e: ReactPointerEvent) => {
    const el = wrapRef.current
    if (!el) return
    el.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) {
      const pts = [...pointers.current.values()]
      const dist = Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y)
      const z = zoomRef.current
      pinchStart.current = { dist: Math.max(1, dist), scale: z.scale, x: z.x, y: z.y }
      dragStart.current = null
    } else if (pointers.current.size === 1 && zoomRef.current.scale > 1.02) {
      const z = zoomRef.current
      dragStart.current = { x: e.clientX, y: e.clientY, ox: z.x, oy: z.y }
    }
  }

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2 && pinchStart.current) {
      const pts = [...pointers.current.values()]
      const dist = Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y)
      const next = clampZoom(pinchStart.current.scale * (dist / pinchStart.current.dist))
      setZoom({ scale: next, x: pinchStart.current.x, y: pinchStart.current.y })
      return
    }
    if (dragStart.current && pointers.current.size === 1) {
      const dx = e.clientX - dragStart.current.x
      const dy = e.clientY - dragStart.current.y
      setZoom({
        scale: zoomRef.current.scale,
        x: dragStart.current.ox + dx,
        y: dragStart.current.oy + dy,
      })
    }
  }

  const onPointerUp = (e: ReactPointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinchStart.current = null
    if (pointers.current.size === 0) dragStart.current = null
    try {
      wrapRef.current?.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
  }

  const onWheel = (e: ReactWheelEvent) => {
    e.preventDefault()
    const el = wrapRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cx = e.clientX - rect.left - rect.width / 2
    const cy = e.clientY - rect.top - rect.height / 2
    const z = zoomRef.current
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
    const next = clampZoom(z.scale * factor)
    if (next === z.scale) return
    // Zoom toward cursor
    const t = next / z.scale
    setZoom({
      scale: next,
      x: next <= 1.01 ? 0 : cx - (cx - z.x) * t,
      y: next <= 1.01 ? 0 : cy - (cy - z.y) * t,
    })
  }

  const bump = (dir: 1 | -1) => {
    setZoom((z) => {
      const next = clampZoom(z.scale + dir * ZOOM_STEP)
      if (next <= 1.01) return { scale: 1, x: 0, y: 0 }
      return { ...z, scale: next }
    })
  }

  const reset = () => setZoom({ scale: 1, x: 0, y: 0 })

  const transform = `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})`
  const canPan = zoom.scale > 1.02

  return {
    wrapRef,
    transform,
    scale: zoom.scale,
    canPan,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onWheel,
    zoomIn: () => bump(1),
    zoomOut: () => bump(-1),
    reset,
  }
}

function MapZoomControls({
  scale,
  onZoomIn,
  onZoomOut,
  onReset,
}: {
  scale: number
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
}) {
  return (
    <div className="hq-worldmap-zoom" role="group" aria-label="Map zoom">
      <button type="button" className="hq-worldmap-zoom-btn" aria-label="Zoom in" onClick={onZoomIn}>
        +
      </button>
      <button
        type="button"
        className="hq-worldmap-zoom-btn"
        aria-label="Zoom out"
        onClick={onZoomOut}
        disabled={scale <= ZOOM_MIN + 0.01}
      >
        −
      </button>
      <button
        type="button"
        className="hq-worldmap-zoom-btn hq-worldmap-zoom-btn--reset"
        aria-label="Reset zoom"
        onClick={onReset}
        disabled={scale <= ZOOM_MIN + 0.01}
      >
        1×
      </button>
    </div>
  )
}

function ContinentDetail({
  dest,
  nodes,
  art,
  current,
  onBack,
  onTravel,
  onOpenChapter,
  onTravelFishSpot,
}: {
  dest: HarborWorldMapDest
  nodes: WorldMapNode[]
  art: string
  current: HarborWorldMapDest
  onBack: () => void
  onTravel: (dest: HarborWorldMapDest) => void
  onOpenChapter?: (levelId: string) => void
  onTravelFishSpot?: (spot: { id: string; x: number; z: number; level: number }) => void
}) {
  const [hoverId, setHoverId] = useState<string | null>(null)
  const zoom = useMapZoom(dest)
  const title =
    dest === 'voyage'
      ? { en: 'Learning voyage', zh: '學習航線' }
      : { en: GUAN_HARBOR_META.en, zh: GUAN_HARBOR_META.zh }

  const hoverNode = nodes.find((n) => n.id === hoverId) ?? null

  return (
    <div className={`hq-worldmap-detail hq-worldmap-detail--${dest}`}>
      <div className="hq-worldmap-detail-toolbar">
        <button type="button" className="hq-book-back" onClick={onBack}>
          ← Harbor Quest
        </button>
        <div className="hq-worldmap-detail-titles">
          <h3 className="hq-worldmap-detail-title">{title.en}</h3>
          <p className="hq-worldmap-detail-zh" lang="zh-HK">
            {title.zh}
          </p>
        </div>
        <button
          type="button"
          className="hq-btn hq-btn--primary hq-btn--tiny"
          disabled={current === dest}
          onClick={() => onTravel(dest)}
        >
          {current === dest ? 'Here' : 'Begin navigation'}
        </button>
      </div>

      <div className="hq-worldmap-detail-body hq-worldmap-detail-body--solo">
        <div
          ref={zoom.wrapRef}
          className={`hq-worldmap-detail-chart hq-worldmap-zoom-frame${zoom.canPan ? ' is-panning' : ''}`}
          onPointerDown={zoom.onPointerDown}
          onPointerMove={zoom.onPointerMove}
          onPointerUp={zoom.onPointerUp}
          onPointerCancel={zoom.onPointerUp}
          onWheel={zoom.onWheel}
        >
          <div className="hq-worldmap-zoom-layer" style={{ transform: zoom.transform }}>
            <img src={art} alt={`${title.en} region chart`} className="hq-worldmap-detail-art" draggable={false} />
            <svg className="hq-worldmap-detail-paths" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
              {nodes.length > 1
                ? nodes.slice(0, -1).map((n, i) => {
                    const next = nodes[i + 1]!
                    return (
                      <line
                        key={`${n.id}-path`}
                        x1={n.x * 100}
                        y1={n.y * 100}
                        x2={next.x * 100}
                        y2={next.y * 100}
                        className="hq-worldmap-path"
                      />
                    )
                  })
                : null}
            </svg>
            <ul className="hq-worldmap-dots" aria-label={`${title.en} chapters`}>
              {nodes.map((n) => (
                <li
                  key={n.id}
                  className="hq-worldmap-dot-wrap"
                  style={{ left: `${n.x * 100}%`, top: `${n.y * 100}%` }}
                >
                  <button
                    type="button"
                    className={`hq-worldmap-dot hq-worldmap-dot--${n.status}${hoverId === n.id ? ' is-hover' : ''}`}
                    title={`${n.title.en} · ${n.title.zh}`}
                    disabled={n.status === 'locked' || (n.kind === 'chapter' && !n.levelId)}
                    onMouseEnter={() => setHoverId(n.id)}
                    onFocus={() => setHoverId(n.id)}
                    onMouseLeave={() => setHoverId(null)}
                    onClick={() => {
                      if (n.kind === 'chapter' && n.levelId && n.status !== 'locked') {
                        onOpenChapter?.(n.levelId)
                      } else if (
                        n.kind === 'fish-spot' &&
                        n.status !== 'locked' &&
                        typeof n.worldX === 'number' &&
                        typeof n.worldZ === 'number'
                      ) {
                        onTravelFishSpot?.({
                          id: n.fishSpotId ?? n.id,
                          x: n.worldX,
                          z: n.worldZ,
                          level: n.fishLevel ?? 1,
                        })
                      } else if (n.kind === 'landmark') {
                        onTravel(dest)
                      }
                    }}
                  >
                    <span className="hq-worldmap-dot-core" />
                    {typeof n.fishLevel === 'number' ? (
                      <span className="hq-worldmap-dot-lv" aria-hidden>
                        {n.fishLevel}
                      </span>
                    ) : null}
                  </button>
                  <span className="hq-worldmap-dot-label">{n.title.en}</span>
                </li>
              ))}
            </ul>
          </div>
          <MapZoomControls
            scale={zoom.scale}
            onZoomIn={zoom.zoomIn}
            onZoomOut={zoom.zoomOut}
            onReset={zoom.reset}
          />
        </div>
      </div>

      <p className="hq-worldmap-hint">
        {hoverNode
          ? `${hoverNode.title.en} · ${hoverNode.title.zh}${
              hoverNode.status === 'locked' ? ' (locked)' : hoverNode.status === 'cleared' ? ' · cleared' : ''
            }`
          : dest === 'voyage'
            ? 'Pinch or scroll to zoom · tap a chapter · 捏放縮放 · 撳航點'
            : 'Pinch or scroll to zoom · tap a Lv spot · 捏放縮放 · 撳釣級航點'}
      </p>
    </div>
  )
}

export function HarborWorldMap({
  open,
  current,
  activeLevelId = null,
  progress,
  onClose,
  onTravel,
  onOpenChapter,
  onTravelFishSpot,
  fishingXp,
}: Props) {
  const [view, setView] = useState<View>('overview')
  const [hover, setHover] = useState<HarborWorldMapDest | null>(null)
  const [artReady, setArtReady] = useState(false)
  const overviewZoom = useMapZoom(open ? 'overview' : 'closed')

  const voyageNodes = useMemo(
    () => voyageChapterNodes(progress, activeLevelId),
    [progress, activeLevelId],
  )
  const guanNodes = useMemo(
    () =>
      guanLandmarkNodes(current === 'guan', {
        fishingXp: fishingXp ?? progress.fishing?.fishingXp ?? 0,
      }),
    [current, fishingXp, progress.fishing?.fishingXp],
  )
  const voyageProg = useMemo(() => voyageProgressSummary(progress), [progress])

  useEffect(() => {
    if (!open) {
      setView('overview')
      setHover(null)
      setArtReady(false)
      return
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (view !== 'overview') setView('overview')
        else onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, view])

  if (!open) return null

  const hint =
    hover === 'voyage'
      ? { en: 'Drill into Learning voyage', zh: '打開學習航線詳圖' }
      : hover === 'guan'
        ? { en: `Drill into ${GUAN_HARBOR_META.en}`, zh: `打開${GUAN_HARBOR_META.zh}詳圖` }
        : { en: 'Pinch to zoom · tap a continent', zh: '捏放縮放 · 撳大陸深入' }

  const applyHover = (id: HarborWorldMapDest | null) => setHover(id)

  const drill = (dest: HarborWorldMapDest) => {
    setView(dest)
    setHover(null)
  }

  return (
    <div className="hq-worldmap" role="dialog" aria-label="Harbor Quest world map" aria-modal="true">
      <div className="hq-worldmap-veil" onClick={onClose} aria-hidden />
      <div className="hq-worldmap-sheet hq-worldmap-sheet--hero">
        <header className="hq-worldmap-head">
          <div>
            <p className="hq-worldmap-kicker">World map · 世界地圖</p>
            <h2 className="hq-worldmap-title">Harbor Quest</h2>
          </div>
          <button type="button" className="hq-btn hq-btn--ghost" onClick={onClose}>
            Close
          </button>
        </header>

        {view === 'overview' ? (
          <>
            <div
              className={`hq-worldmap-stage hq-worldmap-stage--hero${hover ? ` is-glow-${hover}` : ''}${
                artReady ? ' is-ready' : ''
              }`}
            >
              {!artReady ? <p className="hq-worldmap-loading">Charting seas…</p> : null}
              <div
                ref={overviewZoom.wrapRef}
                className={`hq-worldmap-hero hq-worldmap-zoom-frame${overviewZoom.canPan ? ' is-panning' : ''}`}
                onPointerDown={overviewZoom.onPointerDown}
                onPointerMove={overviewZoom.onPointerMove}
                onPointerUp={overviewZoom.onPointerUp}
                onPointerCancel={overviewZoom.onPointerUp}
                onWheel={overviewZoom.onWheel}
              >
                <div className="hq-worldmap-zoom-layer" style={{ transform: overviewZoom.transform }}>
                  <img
                    src={HARBOR_WORLD_MAP_ART}
                    alt="Harbor Quest world map"
                    className="hq-worldmap-hero-art"
                    draggable={false}
                    onLoad={() => setArtReady(true)}
                  />
                  <button
                    type="button"
                    className={`hq-worldmap-hotspot hq-worldmap-hotspot--voyage${hover === 'voyage' ? ' is-glow' : ''}`}
                    aria-label="Learning voyage"
                    onMouseEnter={() => applyHover('voyage')}
                    onFocus={() => applyHover('voyage')}
                    onMouseLeave={() => applyHover(null)}
                    onBlur={() => applyHover(null)}
                    onClick={() => drill('voyage')}
                  />
                  <button
                    type="button"
                    className={`hq-worldmap-hotspot hq-worldmap-hotspot--guan${hover === 'guan' ? ' is-glow' : ''}`}
                    aria-label={GUAN_HARBOR_META.en}
                    onMouseEnter={() => applyHover('guan')}
                    onFocus={() => applyHover('guan')}
                    onMouseLeave={() => applyHover(null)}
                    onBlur={() => applyHover(null)}
                    onClick={() => drill('guan')}
                  />
                </div>
                <MapZoomControls
                  scale={overviewZoom.scale}
                  onZoomIn={overviewZoom.zoomIn}
                  onZoomOut={overviewZoom.zoomOut}
                  onReset={overviewZoom.reset}
                />
              </div>

              <div className="hq-worldmap-overview-dots" aria-hidden>
                <div className="hq-worldmap-overview-cluster hq-worldmap-overview-cluster--voyage">
                  {voyageNodes.slice(0, 8).map((n) => (
                    <span
                      key={n.id}
                      className={`hq-worldmap-dot hq-worldmap-dot--${n.status} hq-worldmap-dot--mini`}
                      title={n.title.en}
                    >
                      <span className="hq-worldmap-dot-core" />
                    </span>
                  ))}
                  <span className="hq-worldmap-overview-count">
                    {voyageProg.cleared}/{voyageProg.total}
                  </span>
                </div>
                <div className="hq-worldmap-overview-cluster hq-worldmap-overview-cluster--guan">
                  {guanNodes.slice(0, 4).map((n) => (
                    <span
                      key={n.id}
                      className={`hq-worldmap-dot hq-worldmap-dot--landmark hq-worldmap-dot--mini`}
                      title={n.title.en}
                    >
                      <span className="hq-worldmap-dot-core" />
                    </span>
                  ))}
                </div>
              </div>

              <div className="hq-worldmap-legend">
                <button
                  type="button"
                  className={`hq-worldmap-chip hq-worldmap-chip--voyage${hover === 'voyage' ? ' is-on' : ''}`}
                  onMouseEnter={() => applyHover('voyage')}
                  onFocus={() => applyHover('voyage')}
                  onClick={() => drill('voyage')}
                >
                  <span className="hq-worldmap-chip-en">Learning voyage</span>
                  <span className="hq-worldmap-chip-zh" lang="zh-HK">
                    學習航線
                  </span>
                  <span className="hq-worldmap-chip-status">
                    {voyageProg.cleared}/{voyageProg.total} chapters
                  </span>
                </button>
                <button
                  type="button"
                  className={`hq-worldmap-chip hq-worldmap-chip--guan${hover === 'guan' ? ' is-on' : ''}`}
                  onMouseEnter={() => applyHover('guan')}
                  onFocus={() => applyHover('guan')}
                  onClick={() => drill('guan')}
                >
                  <span className="hq-worldmap-chip-en">{GUAN_HARBOR_META.en}</span>
                  <span className="hq-worldmap-chip-zh" lang="zh-HK">
                    {GUAN_HARBOR_META.zh}
                  </span>
                  <span className="hq-worldmap-chip-status">Open region</span>
                </button>
              </div>
            </div>
            <footer className="hq-worldmap-foot">
              <p className="hq-worldmap-hint">
                {hint.en}
                <span aria-hidden="true"> · </span>
                <span lang="zh-HK">{hint.zh}</span>
              </p>
              <p className="hq-worldmap-credit">
                Pinch, scroll, or +/− to zoom · drill down for region maps
              </p>
            </footer>
          </>
        ) : (
          <ContinentDetail
            dest={view}
            nodes={view === 'voyage' ? voyageNodes : guanNodes}
            art={view === 'voyage' ? HARBOR_CONTINENT_VOYAGE_ART : HARBOR_CONTINENT_GUAN_ART}
            current={current}
            onBack={() => setView('overview')}
            onTravel={onTravel}
            onOpenChapter={onOpenChapter}
            onTravelFishSpot={onTravelFishSpot}
          />
        )}
      </div>
    </div>
  )
}
