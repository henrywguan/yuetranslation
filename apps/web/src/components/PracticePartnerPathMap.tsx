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
  practicePartnerMapRegions,
  practicePartnerMapScrolls,
  type PartnerMapScroll,
} from '../lib/practicePartnerMapLayout'
import { WuxiaCloudFrame } from './WuxiaClouds'
import { WuxiaFarPeaks, WuxiaMistVeil, WuxiaNearWeather, WuxiaSectionMid, WuxiaSectionSky } from './WuxiaDepth'
import { WuxiaJourneyArt } from './WuxiaJourneyArt'
import {
  PATH_LESSONS_PER_UNIT,
  PATH_UNIT_LABELS,
  type PathCategory,
  type PathFresh,
  type PracticePartnerPathState,
} from '../lib/practicePartnerPath'

const FAR_PARALLAX = 0.38
const SKY_PARALLAX = 0.9
const MID_PARALLAX = 0.96
const NEAR_PARALLAX = 1.06
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

/** Vertical travel only. Scale and sideways drift stay locked. */
function clampPan(pan: Pan, box: Box): Pan {
  const scale = 1
  const minY = Math.min(0, box.h - box.ch * scale)
  return {
    scale,
    x: 0,
    y: clamp(pan.y, minY, 0),
  }
}

function ScrollFace({ row, next }: { row: PartnerMapScroll; next: boolean }) {
  return (
    <>
      {next ? <span className="partner-map-next-badge">Next</span> : null}
      <span className="partner-map-scroll-roller" />
      <span className="partner-map-scroll-sheet">
        <span className="partner-map-scroll-cefr">{row.cefr}</span>
        <span className="partner-map-scroll-mark" lang="zh-HK">
          {row.mark}
        </span>
      </span>
      <span className="partner-map-scroll-roller is-foot" />
    </>
  )
}

/**
 * The Ink Road, read as a ladder.
 * The sheet opens on the next open line. Drag moves up and down.
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
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const drag = useRef<{ y: number; oy: number; moved: number } | null>(null)
  const blockClick = useRef(false)
  const userMoved = useRef(false)
  const boxRef = useRef<Box>({ w: 0, h: 0, cw: 0, ch: 0 })
  const [box, setBox] = useState<Box>({ w: 0, h: 0, cw: 0, ch: 0 })
  const scrolls = practicePartnerMapScrolls(progress, fresh)
  const regions = practicePartnerMapRegions()
  const nextScroll = scrolls.find((row) => !row.colored) ?? scrolls[scrolls.length - 1]
  const nextId = nextScroll?.id ?? ''
  const nextTale = nextScroll ? practicePartnerChapterTale(progress, nextScroll.category) : ''
  const nextPlace = regions.find((row) => row.id === nextScroll?.category)
  const nextFilled = nextScroll ? (progress.units[nextScroll.category][nextScroll.unit] ?? 0) : 0

  const apply = (next: Pan) => {
    const sized = boxRef.current
    const clamped = sized.w > 0 ? clampPan(next, sized) : { scale: 1, x: 0, y: next.y }
    const prev = panRef.current
    panRef.current = clamped
    if (prev.scale === clamped.scale && prev.x === clamped.x && prev.y === clamped.y) return
    setPan(clamped)
  }

  useLayoutEffect(() => {
    const frame = frameRef.current
    if (!frame || !nextScroll) return
    const focusY = nextScroll.y
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
      if (!userMoved.current) {
        const y = next.h * 0.42 - focusY * next.ch
        apply({ scale: 1, x: 0, y })
      } else apply(panRef.current)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(frame)
    return () => observer.disconnect()
    // apply reads refs; re-open on the next line when that line changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextId])

  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const onTouchMove = (event: TouchEvent) => {
      if (pointers.current.size > 0) event.preventDefault()
    }
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => {
      el.removeEventListener('touchmove', onTouchMove)
    }
  }, [])

  const onPointerDown = (event: ReactPointerEvent) => {
    const target = event.target as HTMLElement
    if (target.closest('.partner-map-chrome')) return
    const el = frameRef.current
    if (!el) return
    el.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const z = panRef.current
    drag.current = { y: event.clientY, oy: z.y, moved: 0 }
  }

  const onPointerMove = (event: ReactPointerEvent) => {
    if (!pointers.current.has(event.pointerId) || !drag.current) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const dy = event.clientY - drag.current.y
    drag.current.moved = Math.max(drag.current.moved, Math.abs(dy))
    if (drag.current.moved < 6) return
    userMoved.current = true
    blockClick.current = true
    apply({ scale: 1, x: 0, y: drag.current.oy + dy })
  }

  const onPointerUp = (event: ReactPointerEvent) => {
    const moved = drag.current?.moved ?? 0
    pointers.current.delete(event.pointerId)
    if (pointers.current.size === 0) drag.current = null
    if (moved > 6) {
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

  const start = (id: PathCategory) => {
    if (blockClick.current || !onPick) return
    onPick(id)
  }

  return (
    <div className="partner-map">
      <p className="partner-map-hint">Drag up or down. Tap Next, or a finished line, to practice.</p>
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
        <div className="partner-map-depth is-sky" style={layerStyle(box, pan, SKY_PARALLAX)}>
          <WuxiaSectionSky />
        </div>
        <div className="partner-map-depth is-mid" style={layerStyle(box, pan, MID_PARALLAX)}>
          <WuxiaSectionMid />
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
                <div className={`partner-map-region-plaque${activeId === region.id ? ' is-current' : ''}`}>
                  <span className="partner-map-region-cefr">{region.cefr}</span>
                  <span className="partner-map-region-place" lang="zh-HK">
                    {region.placeZh}
                  </span>
                  <span>{region.placeEn}</span>
                  <span className="partner-map-region-topic">{region.labelEn}</span>
                </div>
              </li>
            ))}
            {nextScroll ? (
              <li
                aria-hidden="true"
                className="partner-map-you-wrap"
                style={{ left: `${nextScroll.x * 100}%`, top: `${nextScroll.y * 100}%` }}
              >
                <span className="partner-map-you" />
              </li>
            ) : null}
            {scrolls.map((row) => {
              const isNext = row.id === nextId
              const locked = !row.colored && !isNext
              const faceClass = `partner-map-scroll${row.colored ? ' is-colored' : ' is-sealed'}${
                row.fresh ? ' is-fresh' : ''
              }${isNext ? ' is-next' : ''}${locked ? ' is-locked' : ''}`
              return (
                <li
                  key={row.id}
                  className={`partner-map-scroll-wrap${isNext ? ' is-next' : ''}`}
                  style={{ left: `${row.x * 100}%`, top: `${row.y * 100}%` }}
                >
                  {locked || !onPick ? (
                    <span className={faceClass} aria-hidden="true">
                      <ScrollFace row={row} next={isNext} />
                    </span>
                  ) : (
                    <button
                      type="button"
                      className={faceClass}
                      aria-label={isNext ? `Next. ${row.title}` : row.title}
                      aria-pressed={row.colored}
                      onClick={() => start(row.category)}
                    >
                      <ScrollFace row={row} next={isNext} />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
        <div className="partner-map-depth is-mist" style={layerStyle(box, pan, MIST_PARALLAX)}>
          <WuxiaMistVeil />
        </div>
        <div className="partner-map-depth is-near" style={layerStyle(box, pan, NEAR_PARALLAX)}>
          <WuxiaNearWeather />
        </div>
        <WuxiaCloudFrame pan={pan} />
        {nextScroll && nextPlace ? (
          onPick ? (
            <button
              type="button"
              className="partner-map-next partner-map-chrome"
              onClick={() => start(nextScroll.category)}
            >
              <span className="partner-map-next-kicker">Next</span>
              <span className="partner-map-next-place" lang="zh-HK">
                {nextPlace.placeZh}
                <span lang="en">{nextPlace.placeEn}</span>
              </span>
              <span className="partner-map-next-meta">
                {PATH_UNIT_LABELS[nextScroll.unit]} · {nextFilled} of {PATH_LESSONS_PER_UNIT}
              </span>
              <span className="partner-map-next-tale">{nextTale}</span>
            </button>
          ) : (
            <div className="partner-map-next partner-map-chrome">
              <span className="partner-map-next-kicker">Next</span>
              <span className="partner-map-next-place" lang="zh-HK">
                {nextPlace.placeZh}
                <span lang="en">{nextPlace.placeEn}</span>
              </span>
              <span className="partner-map-next-meta">
                {PATH_UNIT_LABELS[nextScroll.unit]} · {nextFilled} of {PATH_LESSONS_PER_UNIT}
              </span>
              <span className="partner-map-next-tale">{nextTale}</span>
            </div>
          )
        ) : null}
      </div>
    </div>
  )
}
