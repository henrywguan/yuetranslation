import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  PARTNER_MAP_HEIGHT,
  partnerMapLayerSize,
  practicePartnerChapterTale,
  practicePartnerMapFocusY,
  practicePartnerMapRegions,
  practicePartnerMapScrolls,
} from '../lib/practicePartnerMapLayout'
import { WuxiaCloudFrame } from './WuxiaClouds'
import { WuxiaFarPeaks, WuxiaMistVeil } from './WuxiaDepth'
import { WuxiaJourneyArt } from './WuxiaJourneyArt'
import {
  pathFocusSection,
  type PathCategory,
  type PathFresh,
  type PracticePartnerPathState,
} from '../lib/practicePartnerPath'

const ZOOM_MIN = 1
const ZOOM_MAX = 3.2
const FAR_PARALLAX = 0.38
const MIST_PARALLAX = 1.18

type Pan = { scale: number; x: number; y: number }

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n))
}

type Box = { w: number; h: number; cw: number; ch: number }

function layerStyle(box: Box, pan: Pan, factor: number): CSSProperties {
  const x = pan.x * factor
  const y = pan.y * factor
  if (box.cw > 0) {
    return {
      width: box.cw * pan.scale,
      height: box.ch * pan.scale,
      transform: `translate(calc(-50% + ${x}px), ${y}px)`,
    }
  }
  return {
    width: `${100 * pan.scale}%`,
    height: `${PARTNER_MAP_HEIGHT * 100 * pan.scale}%`,
    transform: `translate(calc(-50% + ${x}px), ${y}px)`,
  }
}

function clampPan(pan: Pan, box: Box): Pan {
  const scale = clamp(pan.scale, ZOOM_MIN, ZOOM_MAX)
  const minY = Math.min(0, box.h - box.ch * scale)
  const extraX = Math.max(0, (box.cw * scale - box.w) / 2)
  return {
    scale,
    x: clamp(pan.x, -extraX, extraX),
    y: clamp(pan.y, minY, 0),
  }
}

/**
 * The Ink Road. Drag travels the scroll. Pinch and wheel zoom.
 */
export function PracticePartnerPathMap({
  progress,
  activeId,
  onPick,
  fresh = null,
  listClassName = '',
}: {
  progress: PracticePartnerPathState
  activeId: PathCategory
  onPick?: (id: PathCategory) => void
  fresh?: PathFresh | null
  listClassName?: string
}) {
  const frameRef = useRef<HTMLDivElement>(null)
  const panRef = useRef<Pan>({ scale: 1, x: 0, y: 0 })
  const [pan, setPan] = useState<Pan>({ scale: 1, x: 0, y: 0 })
  const [full, setFull] = useState(false)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const drag = useRef<{ x: number; y: number; ox: number; oy: number; moved: number } | null>(null)
  const pinch = useRef<{ dist: number; scale: number; x: number; y: number } | null>(null)
  const blockClick = useRef(false)
  const userMoved = useRef(false)
  const boxRef = useRef<Box>({ w: 0, h: 0, cw: 0, ch: 0 })
  const [box, setBox] = useState<Box>({ w: 0, h: 0, cw: 0, ch: 0 })
  const focus = pathFocusSection(progress)
  const scrolls = practicePartnerMapScrolls(progress, fresh)
  const regions = practicePartnerMapRegions()
  const currentId =
    scrolls.find((row) => row.category === activeId && !row.colored)?.id ??
    [...scrolls].reverse().find((row) => row.category === activeId)?.id
  const currentScroll = scrolls.find((row) => row.id === currentId)
  const tale = practicePartnerChapterTale(progress, activeId)

  const apply = (next: Pan) => {
    const sized = boxRef.current
    const clamped = sized.w > 0 ? clampPan(next, sized) : next
    const prev = panRef.current
    panRef.current = clamped
    if (
      prev.scale === clamped.scale &&
      prev.x === clamped.x &&
      prev.y === clamped.y
    ) {
      return
    }
    setPan(clamped)
  }

  const lookAt = (category: PathCategory, sized: Box) => {
    const y = sized.h * 0.28 - practicePartnerMapFocusY(category) * sized.ch
    apply({ scale: panRef.current.scale, x: 0, y })
  }

  useLayoutEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const measure = () => {
      const w = frame.clientWidth
      const h = frame.clientHeight
      if (w < 2 || h < 2) return
      const layer = partnerMapLayerSize(w, h)
      const next: Box = { w, h, cw: layer.w, ch: layer.h }
      boxRef.current = next
      setBox((prev) =>
        prev.w === next.w && prev.h === next.h && prev.cw === next.cw && prev.ch === next.ch
          ? prev
          : next,
      )
      if (!userMoved.current) lookAt(focus, next)
      else apply(panRef.current)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(frame)
    return () => observer.disconnect()
    // lookAt/apply read refs; re-measure when the focused section or fullscreen frame changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, full])

  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = el.getBoundingClientRect()
      const px = event.clientX - rect.left
      const py = event.clientY - rect.top
      const z = panRef.current
      const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12
      const nextScale = clamp(z.scale * factor, ZOOM_MIN, ZOOM_MAX)
      if (nextScale === z.scale) return
      const contentX = (px - rect.width / 2 - z.x) / z.scale
      const contentY = (py - z.y) / z.scale
      userMoved.current = true
      apply({
        scale: nextScale,
        x: px - rect.width / 2 - contentX * nextScale,
        y: py - contentY * nextScale,
      })
    }
    const onTouchMove = (event: TouchEvent) => {
      if (pointers.current.size > 0) event.preventDefault()
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchmove', onTouchMove)
    }
  }, [full])

  useEffect(() => {
    if (!full) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFull(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [full])

  const onPointerDown = (event: ReactPointerEvent) => {
    const target = event.target as HTMLElement
    if (target.closest('.partner-map-chrome')) return
    const el = frameRef.current
    if (!el) return
    el.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.current.size === 2) {
      const pts = [...pointers.current.values()]
      const dist = Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y)
      const z = panRef.current
      pinch.current = { dist: Math.max(1, dist), scale: z.scale, x: z.x, y: z.y }
      drag.current = null
      return
    }
    const z = panRef.current
    drag.current = { x: event.clientX, y: event.clientY, ox: z.x, oy: z.y, moved: 0 }
  }

  const onPointerMove = (event: ReactPointerEvent) => {
    if (!pointers.current.has(event.pointerId)) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.current.size === 2 && pinch.current) {
      const pts = [...pointers.current.values()]
      const dist = Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y)
      const nextScale = clamp(
        pinch.current.scale * (dist / pinch.current.dist),
        ZOOM_MIN,
        ZOOM_MAX,
      )
      userMoved.current = true
      blockClick.current = true
      apply({ scale: nextScale, x: pinch.current.x, y: pinch.current.y })
      return
    }
    if (!drag.current || pointers.current.size !== 1) return
    const dx = event.clientX - drag.current.x
    const dy = event.clientY - drag.current.y
    drag.current.moved = Math.max(drag.current.moved, Math.hypot(dx, dy))
    if (drag.current.moved < 6) return
    userMoved.current = true
    blockClick.current = true
    apply({
      scale: panRef.current.scale,
      x: drag.current.ox + dx,
      y: drag.current.oy + dy,
    })
  }

  const onPointerUp = (event: ReactPointerEvent) => {
    const moved = drag.current?.moved ?? 0
    const pinched = pinch.current !== null
    pointers.current.delete(event.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    if (pointers.current.size === 0) drag.current = null
    if (moved > 6 || pinched) {
      blockClick.current = true
      window.setTimeout(() => {
        blockClick.current = false
      }, 0)
    }
    try {
      frameRef.current?.releasePointerCapture(event.pointerId)
    } catch {
      /* already released */
    }
  }

  const bump = (dir: 1 | -1) => {
    userMoved.current = true
    apply({ ...panRef.current, scale: panRef.current.scale + dir * 0.28 })
  }

  return (
    <div className={`partner-map${full ? ' is-fullscreen' : ''}`}>
      <div className="partner-map-hud partner-map-chrome">
        <div className="partner-map-copy">
          <p className="partner-map-tale">{tale}</p>
          <p className="partner-map-hint">Drag the Ink Road. Scroll or pinch to look closer.</p>
        </div>
        <button
          type="button"
          className="partner-map-full"
          onClick={() => setFull((open) => !open)}
        >
          {full ? 'Close map' : 'Full screen'}
        </button>
      </div>
      <div
        ref={frameRef}
        className="partner-map-frame"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="partner-map-depth is-far" style={layerStyle(box, pan, FAR_PARALLAX)}>
          <WuxiaFarPeaks />
        </div>
        <div className="partner-map-layer" style={layerStyle(box, pan, 1)}>
          <WuxiaJourneyArt progress={progress} mastery={progress.mastery} />
          <svg className="partner-map-road" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {regions.map((region) => {
              const points = scrolls
                .filter((row) => row.category === region.id)
                .map((row) => `${row.x * 100},${row.y * 100}`)
                .join(' ')
              return (
                <g key={region.id}>
                  <polyline className="is-bed" points={points} vectorEffect="non-scaling-stroke" />
                  <polyline points={points} vectorEffect="non-scaling-stroke" />
                </g>
              )
            })}
          </svg>
          <div className="partner-map-wash" />
          <ul className={listClassName || 'partner-map-scrolls'} aria-label="Practice path">
            {regions.map((region) => (
              <li
                key={region.id}
                className="partner-map-region"
                style={{ left: `${region.x * 100}%`, top: `${region.y * 100}%` }}
              >
                <button
                  type="button"
                  className={`partner-map-region-btn${activeId === region.id ? ' is-current' : ''}`}
                  onClick={() => {
                    if (blockClick.current) return
                    onPick?.(region.id)
                  }}
                >
                  <span className="partner-map-region-cefr">{region.cefr}</span>
                  <span className="partner-map-region-place" lang="zh-HK">
                    {region.placeZh}
                  </span>
                  <span>{region.placeEn}</span>
                  <span className="partner-map-region-topic">{region.labelEn}</span>
                </button>
              </li>
            ))}
            {currentScroll ? (
              <li
                aria-hidden="true"
                className="partner-map-you-wrap"
                style={{ left: `${currentScroll.x * 100}%`, top: `${currentScroll.y * 100}%` }}
              >
                <span className="partner-map-you" />
              </li>
            ) : null}
            {scrolls.map((row) => (
              <li
                key={row.id}
                className="partner-map-scroll-wrap"
                style={{ left: `${row.x * 100}%`, top: `${row.y * 100}%` }}
              >
                <button
                  type="button"
                  className={`partner-map-scroll${row.colored ? ' is-colored' : ' is-sealed'}${
                    row.fresh ? ' is-fresh' : ''
                  }${row.id === currentId ? ' is-current' : ''}`}
                  aria-label={row.title}
                  aria-pressed={row.colored}
                  onClick={() => {
                    if (blockClick.current) return
                    onPick?.(row.category)
                  }}
                >
                  <span className="partner-map-scroll-roller" />
                  <span className="partner-map-scroll-sheet">
                    <span className="partner-map-scroll-cefr">{row.cefr}</span>
                    <span className="partner-map-scroll-mark" lang="zh-HK">
                      {row.mark}
                    </span>
                  </span>
                  <span className="partner-map-scroll-roller is-foot" />
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="partner-map-depth is-mist" style={layerStyle(box, pan, MIST_PARALLAX)}>
          <WuxiaMistVeil />
        </div>
        <WuxiaCloudFrame pan={pan} />
        <div className="partner-map-zoom partner-map-chrome" role="group" aria-label="Map zoom">
          <button type="button" aria-label="Zoom in" onClick={() => bump(1)}>
            +
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => bump(-1)}
            disabled={pan.scale <= ZOOM_MIN + 0.01}
          >
            −
          </button>
        </div>
      </div>
    </div>
  )
}
