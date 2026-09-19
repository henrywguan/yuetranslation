/**
 * Harbor Quest · fullscreen wuxia world map (minimap globe).
 */
import { useEffect, useRef, useState } from 'react'
import {
  createHarborWorldMapScene,
  type HarborWorldMapDest,
  type HarborWorldMapScene,
  HARBOR_WORLD_MAP_ART,
} from './harborWorldMapScene'
import { GUAN_HARBOR_META } from './harborGuanRealm'

type Props = {
  open: boolean
  current: HarborWorldMapDest
  onClose: () => void
  onTravel: (dest: HarborWorldMapDest) => void
}

export function HarborWorldMap({ open, current, onClose, onTravel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<HarborWorldMapScene | null>(null)
  const [hover, setHover] = useState<HarborWorldMapDest | null>(null)
  const [ready, setReady] = useState(false)
  const [loadErr, setLoadErr] = useState(false)

  useEffect(() => {
    if (!open) return
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    let alive = true
    let raf = 0
    let scene: HarborWorldMapScene | null = null

    const resize = () => {
      if (!scene || !wrap) return
      const w = Math.max(1, wrap.clientWidth)
      const h = Math.max(1, wrap.clientHeight)
      scene.renderer.setSize(w, h, false)
      scene.camera.aspect = w / h
      scene.camera.updateProjectionMatrix()
    }

    ;(async () => {
      try {
        scene = await createHarborWorldMapScene(canvas)
        if (!alive) {
          scene.dispose()
          return
        }
        sceneRef.current = scene
        setReady(true)
        setLoadErr(false)
        resize()
        const loop = (t: number) => {
          if (!alive || !scene) return
          scene.tick(t)
          scene.renderer.render(scene.scene, scene.camera)
          raf = requestAnimationFrame(loop)
        }
        raf = requestAnimationFrame(loop)
      } catch {
        if (alive) setLoadErr(true)
      }
    })()

    window.addEventListener('resize', resize)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      scene?.dispose()
      sceneRef.current = null
      setReady(false)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const hint =
    hover === 'voyage'
      ? { en: 'Learning voyage', zh: '學習航線' }
      : hover === 'guan'
        ? { en: GUAN_HARBOR_META.en, zh: GUAN_HARBOR_META.zh }
        : { en: 'Hover or tap a continent', zh: '將滑鼠移上或撳大陸' }

  const applyHover = (id: HarborWorldMapDest | null) => {
    setHover(id)
    sceneRef.current?.setHover(id)
  }

  const onPointer = (clientX: number, clientY: number) => {
    const el = wrapRef.current
    const scene = sceneRef.current
    if (!el || !scene) return null
    return scene.pick(clientX, clientY, el)
  }

  return (
    <div className="hq-worldmap" role="dialog" aria-label="Harbor world map" aria-modal="true">
      <div className="hq-worldmap-veil" onClick={onClose} aria-hidden />
      <div className="hq-worldmap-sheet">
        <header className="hq-worldmap-head">
          <div>
            <p className="hq-worldmap-kicker">World map · 世界地圖</p>
            <h2 className="hq-worldmap-title">Harbor World</h2>
            <p className="hq-worldmap-sub" lang="zh-HK">
              港灣世界 · wuxia voyage chart
            </p>
          </div>
          <button type="button" className="hq-btn hq-btn--ghost" onClick={onClose}>
            Close
          </button>
        </header>

        <div
          ref={wrapRef}
          className={`hq-worldmap-stage${hover ? ` is-glow-${hover}` : ''}${ready ? ' is-ready' : ''}`}
          onPointerMove={(e) => {
            applyHover(onPointer(e.clientX, e.clientY))
          }}
          onPointerLeave={() => applyHover(null)}
          onClick={(e) => {
            const id = onPointer(e.clientX, e.clientY)
            if (!id) return
            if (id === current) return
            onTravel(id)
          }}
        >
          <canvas ref={canvasRef} className="hq-worldmap-canvas" />
          {!ready && !loadErr ? <p className="hq-worldmap-loading">Charting seas…</p> : null}
          {loadErr ? (
            <div className="hq-worldmap-fallback">
              <img src={HARBOR_WORLD_MAP_ART} alt="Harbor World map" />
              <button
                type="button"
                className={`hq-worldmap-hotspot hq-worldmap-hotspot--voyage${current === 'voyage' ? ' is-here' : ''}${hover === 'voyage' ? ' is-glow' : ''}`}
                onMouseEnter={() => applyHover('voyage')}
                onFocus={() => applyHover('voyage')}
                onClick={() => current !== 'voyage' && onTravel('voyage')}
                disabled={current === 'voyage'}
              >
                Learning voyage
              </button>
              <button
                type="button"
                className={`hq-worldmap-hotspot hq-worldmap-hotspot--guan${current === 'guan' ? ' is-here' : ''}${hover === 'guan' ? ' is-glow' : ''}`}
                onMouseEnter={() => applyHover('guan')}
                onFocus={() => applyHover('guan')}
                onClick={() => current !== 'guan' && onTravel('guan')}
                disabled={current === 'guan'}
              >
                {GUAN_HARBOR_META.en}
              </button>
            </div>
          ) : null}

          <div className="hq-worldmap-legend" aria-hidden={!ready}>
            <button
              type="button"
              className={`hq-worldmap-chip hq-worldmap-chip--voyage${hover === 'voyage' ? ' is-on' : ''}${current === 'voyage' ? ' is-here' : ''}`}
              disabled={current === 'voyage'}
              onMouseEnter={() => applyHover('voyage')}
              onFocus={() => applyHover('voyage')}
              onClick={() => current !== 'voyage' && onTravel('voyage')}
            >
              <span className="hq-worldmap-chip-en">Learning voyage</span>
              <span className="hq-worldmap-chip-zh" lang="zh-HK">
                學習航線
              </span>
              <span className="hq-worldmap-chip-status">
                {current === 'voyage' ? 'Here' : 'Travel'}
              </span>
            </button>
            <button
              type="button"
              className={`hq-worldmap-chip hq-worldmap-chip--guan${hover === 'guan' ? ' is-on' : ''}${current === 'guan' ? ' is-here' : ''}`}
              disabled={current === 'guan'}
              onMouseEnter={() => applyHover('guan')}
              onFocus={() => applyHover('guan')}
              onClick={() => current !== 'guan' && onTravel('guan')}
            >
              <span className="hq-worldmap-chip-en">{GUAN_HARBOR_META.en}</span>
              <span className="hq-worldmap-chip-zh" lang="zh-HK">
                {GUAN_HARBOR_META.zh}
              </span>
              <span className="hq-worldmap-chip-status">
                {current === 'guan' ? 'Here' : 'Travel'}
              </span>
            </button>
          </div>
        </div>

        <footer className="hq-worldmap-foot">
          <p className="hq-worldmap-hint">
            {hint.en}
            <span aria-hidden="true"> · </span>
            <span lang="zh-HK">{hint.zh}</span>
          </p>
          <p className="hq-worldmap-credit">Illustrated chart inspired by classic game world maps · original Harbor craft</p>
        </footer>
      </div>
    </div>
  )
}
