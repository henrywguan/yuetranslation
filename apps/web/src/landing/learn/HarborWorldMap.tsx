/**
 * Harbor Quest · fullscreen wuxia world map (minimap globe).
 * Overview shows the painted chart full-bleed → drill into region chart with chapter / landmark dots.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
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

function ContinentDetail({
  dest,
  nodes,
  art,
  glb,
  current,
  onBack,
  onTravel,
  onOpenChapter,
  onTravelFishSpot,
}: {
  dest: HarborWorldMapDest
  nodes: WorldMapNode[]
  art: string
  glb: string
  current: HarborWorldMapDest
  onBack: () => void
  onTravel: (dest: HarborWorldMapDest) => void
  onOpenChapter?: (levelId: string) => void
  onTravelFishSpot?: (spot: { id: string; x: number; z: number; level: number }) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const title =
    dest === 'voyage'
      ? { en: 'Learning voyage', zh: '學習航線' }
      : { en: GUAN_HARBOR_META.en, zh: GUAN_HARBOR_META.zh }

  // Optional 3D relief peek — load if GLB exists; fail soft.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let dead = false
    let renderer: import('three').WebGLRenderer | null = null
    let raf = 0
    ;(async () => {
      try {
        const THREE = await import('three')
        const { loadHarborGlb } = await import('./harborGlbAssets')
        const model = await loadHarborGlb(glb, {
          targetHeight: 2.4,
          celShade: false,
          plantOnGround: true,
          name: `continent-${dest}`,
        })
        if (!model || dead) return
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
        renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2))
        renderer.setClearColor(0x000000, 0)
        renderer.outputColorSpace = THREE.SRGBColorSpace
        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40)
        camera.position.set(0, 2.2, 4.2)
        camera.lookAt(0, 0.6, 0)
        scene.add(new THREE.HemisphereLight(0xc8e8ff, 0x1a3020, 1.1))
        const key = new THREE.DirectionalLight(0xfff0d8, 1.1)
        key.position.set(-2, 4, 3)
        scene.add(key)
        model.rotation.x = -0.4
        scene.add(model)
        const resize = () => {
          const p = canvas.parentElement
          if (!p || !renderer) return
          const w = Math.max(1, p.clientWidth)
          const h = Math.max(1, p.clientHeight)
          renderer.setSize(w, h, false)
          camera.aspect = w / h
          camera.updateProjectionMatrix()
        }
        resize()
        const loop = (t: number) => {
          if (dead || !renderer) return
          model.rotation.y = Math.sin(t * 0.0004) * 0.12
          renderer.render(scene, camera)
          raf = requestAnimationFrame(loop)
        }
        raf = requestAnimationFrame(loop)
        window.addEventListener('resize', resize)
        return () => window.removeEventListener('resize', resize)
      } catch {
        /* 2D chart alone is enough */
      }
    })()
    return () => {
      dead = true
      cancelAnimationFrame(raf)
      renderer?.dispose()
    }
  }, [dest, glb])

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

      <div className="hq-worldmap-detail-body">
        <div className="hq-worldmap-detail-chart">
          <img src={art} alt={`${title.en} region chart`} className="hq-worldmap-detail-art" />
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
                <span className="hq-worldmap-dot-label">
                  {n.title.en}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="hq-worldmap-detail-relief" aria-hidden>
          <canvas ref={canvasRef} className="hq-worldmap-detail-canvas" />
          <p className="hq-worldmap-detail-relief-cap">3D relief · 立體航圖</p>
        </div>
      </div>

      <p className="hq-worldmap-hint">
        {hoverNode
          ? `${hoverNode.title.en} · ${hoverNode.title.zh}${
              hoverNode.status === 'locked' ? ' (locked)' : hoverNode.status === 'cleared' ? ' · cleared' : ''
            }`
          : dest === 'voyage'
            ? 'Tap a chapter dot to sail that pier · 撳航點開章'
            : 'Tap a Lv spot to teleport there · 撳釣級航點傳送'}
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
        : { en: 'Hover or tap a continent to drill down', zh: '將滑鼠移上或撳大陸深入' }

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
            <p className="hq-worldmap-sub" lang="zh-HK">
              Harbor Quest · wuxia voyage chart
            </p>
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
              <div className="hq-worldmap-hero">
                <img
                  src={HARBOR_WORLD_MAP_ART}
                  alt="Harbor Quest world map"
                  className="hq-worldmap-hero-art"
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
                Full voyage chart · drill down for region maps and chapter dots
              </p>
            </footer>
          </>
        ) : (
          <ContinentDetail
            dest={view}
            nodes={view === 'voyage' ? voyageNodes : guanNodes}
            art={view === 'voyage' ? HARBOR_CONTINENT_VOYAGE_ART : HARBOR_CONTINENT_GUAN_ART}
            glb={view === 'voyage' ? HARBOR_CONTINENT_VOYAGE_GLB : HARBOR_CONTINENT_GUAN_GLB}
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
