import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { BiText } from './BiText'
import { TranslateThinking } from './TranslateThinking'
import { cameraScan } from '../lib/api'
import { captureFrame, captureZoomedVideoFrame, decodeDataUrlSize, mediaFitLayout } from '../lib/camera/geometry'
import {
  clampPan,
  clampZoom,
  touchDistance,
  touchMidpoint,
  ZOOM_MAX,
  ZOOM_MIN,
  type ZoomTransform,
} from '../lib/camera/pinchZoom'
import {
  focusTrackAt,
  framePointToMediaNorm,
  preferContinuousFocus,
  probeCameraTrack,
  setTrackZoom,
  type CameraTrackFeatures,
  type ZoomRange,
} from '../lib/camera/trackControls'
import {
  centeredLabelX,
  drawMatchedLabel,
  drawMatchedPanel,
  drawSourceOutline,
  measureOverlayLabel,
} from '../lib/camera/overlayPaint'
import { rgbCss, sampleColorsFromImageUrl } from '../lib/camera/sampleRegionColors'
import { regionToEditable, type CameraTarget, type EditableBox, boxDetailArgs, speakLangForBox } from '../lib/camera/types'
import { unwrapTranslationText } from '../lib/camera/unwrapTranslation'
import { cameraBlockedMessage, stopMediaStream, unlockCamera } from '../lib/mediaAccess'
import { useYueStore } from '../lib/store'
import { useReducedMotion } from '../lib/useReducedMotion'
import { biPlain, ui } from '../lib/uiCopy'
import type { Entitlement } from '../lib/types'

type Props = {
  target: CameraTarget
  onTargetChange: (t: CameraTarget) => void
  onBack: () => void
  onEntitlement: (ent: Entitlement) => void
  meter: {
    start: () => void
    stop: () => Promise<void>
  }
}

type HitRect = { id: string; x: number; y: number; w: number; h: number }

const IDENTITY_ZOOM: ZoomTransform = { scale: 1, x: 0, y: 0 }

export function CameraArSession({ target, onTargetChange, onBack, onEntitlement, meter }: Props) {
  const speakManual = useYueStore((s) => s.speakManual)
  const openBreakdown = useYueStore((s) => s.openBreakdown)
  const reduce = useReducedMotion()
  const videoRef = useRef<HTMLVideoElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const zoomLayerRef = useRef<HTMLDivElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const boxesRef = useRef<EditableBox[]>([])
  const hitsRef = useRef<HitRect[]>([])
  const appearAtRef = useRef<Map<string, number>>(new Map())
  const scanning = useRef(false)
  const stillUrlRef = useRef<string | null>(null)
  const zoomRef = useRef<ZoomTransform>(IDENTITY_ZOOM)
  const mediaSizeRef = useRef({ w: 0, h: 0 })
  const pinchRef = useRef<{
    mode: 'pinch' | 'pan' | null
    startDist: number
    startScale: number
    startX: number
    startY: number
    lastMidX: number
    lastMidY: number
    lastX: number
    lastY: number
  } | null>(null)

  const [boxes, setBoxes] = useState<EditableBox[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  /** Frozen capture — live preview is hidden while this is set. */
  const [stillUrl, setStillUrl] = useState<string | null>(null)
  const [zoom, setZoom] = useState<ZoomTransform>(IDENTITY_ZOOM)
  /** Hardware zoom range when the track exposes it; otherwise digital CSS zoom. */
  const [hwZoomRange, setHwZoomRange] = useState<ZoomRange | null>(null)
  const [hwZoom, setHwZoom] = useState(1)
  const [canTapFocus, setCanTapFocus] = useState(false)
  const [focusRing, setFocusRing] = useState<{ x: number; y: number; key: number } | null>(null)
  const focusRingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const livePinchRef = useRef<{ startDist: number; startZoom: number } | null>(null)

  useEffect(() => {
    boxesRef.current = boxes
  }, [boxes])

  useEffect(() => {
    stillUrlRef.current = stillUrl
  }, [stillUrl])

  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.body.classList.add('cam-ar-open')
    return () => {
      document.body.style.overflow = prev
      document.body.classList.remove('cam-ar-open')
    }
  }, [])

  const paintOverlay = useCallback(() => {
    const frame = frameRef.current
    const canvas = overlayRef.current
    if (!frame || !canvas) return
    const w = frame.clientWidth
    const h = frame.clientHeight
    if (!w || !h) return

    const video = videoRef.current
    const mw = mediaSizeRef.current.w || video?.videoWidth || w
    const mh = mediaSizeRef.current.h || video?.videoHeight || h
    // Match object-fit: cover so full-frame OCR boxes land on the cropped view.
    const layout = mediaFitLayout(w, h, mw, mh, 'cover')

    // Paint in screen space (canvas sits above the CSS-zoomed still) so glyph
    // size tracks pinch zoom and stays sharp instead of bitmap-upscaling.
    const z = zoomRef.current
    const scale = z.scale
    const cx = w / 2
    const cy = h / 2
    const mapX = (px: number) => (px - cx) * scale + cx + z.x
    const mapY = (py: number) => (py - cy) * scale + cy + z.y

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    const buf = Math.min(3, Math.max(1, dpr))
    const bw = Math.round(w * buf)
    const bh = Math.round(h * buf)
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw
      canvas.height = bh
    }
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(buf, 0, 0, buf, 0, 0)
    ctx.clearRect(0, 0, w, h)
    const hits: HitRect[] = []
    const now = performance.now()

    type Planned = {
      id: string
      label: string
      selected: boolean
      matched: boolean
      bg?: { r: number; g: number; b: number }
      fg?: { r: number; g: number; b: number }
      panelX: number
      panelY: number
      panelW: number
      panelH: number
      fontSize: number
      padX: number
      labelW: number
      ease: number
    }

    const planned: Planned[] = []

    for (const b of boxesRef.current) {
      const ox = layout.offsetX + b.box.x * layout.dispW
      const oy = layout.offsetY + b.box.y * layout.dispH
      const obw = Math.max(8, b.box.w * layout.dispW)
      const obh = Math.max(8, b.box.h * layout.dispH)
      const label = unwrapTranslationText(b.translated || b.text)
      const selected = b.id === selectedId
      const matched = Boolean(b.bg && b.fg)

      // Lock panel to the OCR word region — same placement as upload overlays.
      const inflateX = obw * 0.05
      const inflateY = obh * 0.1
      const panelX = mapX(ox - inflateX)
      const panelY = mapY(oy - inflateY)
      const panelW = Math.max(8, mapX(ox + obw + inflateX) - panelX)
      const panelH = Math.max(8, mapY(oy + obh + inflateY) - panelY)

      const born = appearAtRef.current.get(b.id) ?? now
      const age = now - born
      const enter = reduce ? 1 : Math.min(1, age / 360)
      const ease = 1 - Math.pow(1 - enter, 3)

      const padX = Math.max(4, panelW * 0.04)
      const maxFont = Math.min(64, 32 + scale * 16)
      let fontSize = Math.max(11, Math.min(maxFont, panelH * 0.78))
      if (label) {
        const minFont = Math.max(9, 8 + scale * 2)
        for (; fontSize >= minFont; fontSize -= 0.5) {
          const textW = measureOverlayLabel(ctx, label, fontSize)
          if (textW + padX * 2 <= panelW) break
        }
      }

      const labelW = label ? measureOverlayLabel(ctx, label, fontSize) : 0
      // Blanket the full OCR region — shrinking to glyph width left source ink visible (#250).
      planned.push({
        id: b.id,
        label,
        selected,
        matched,
        bg: b.bg,
        fg: b.fg,
        panelX,
        panelY,
        panelW,
        panelH,
        fontSize,
        padX,
        labelW,
        ease,
      })
    }

    // Selected on top for both paint and hit order.
    const paintOrder = [...planned].sort((a, b) => Number(a.selected) - Number(b.selected))

    for (const p of paintOrder) {
      ctx.save()
      ctx.globalAlpha = 0.2 + 0.8 * p.ease

      if (p.label && p.matched && p.bg && p.fg) {
        drawMatchedPanel(ctx, p.panelX, p.panelY, p.panelW, p.panelH, {
          bg: rgbCss(p.bg),
          selected: p.selected,
        })
        drawMatchedLabel(
          ctx,
          p.label,
          centeredLabelX(p.panelX, p.panelW, p.padX, p.labelW),
          p.panelY + p.panelH / 2,
          Math.max(8, p.panelW - p.padX * 2),
          p.fontSize,
          { fg: rgbCss(p.fg) },
        )
      } else {
        drawSourceOutline(ctx, p.panelX, p.panelY, p.panelW, p.panelH, {
          selected: p.selected,
        })
      }

      const slop = 5
      hits.push({
        id: p.id,
        x: (p.panelX - slop) / w,
        y: (p.panelY - slop) / h,
        w: (p.panelW + slop * 2) / w,
        h: (p.panelH + slop * 2) / h,
      })
      ctx.restore()
    }

    hitsRef.current = hits
  }, [reduce, selectedId])

  useEffect(() => {
    paintOverlay()
  }, [boxes, paintOverlay, selectedId, stillUrl, zoom])

  useEffect(() => {
    let cancelled = false
    const blocked = cameraBlockedMessage()
    if (blocked) {
      setError(blocked)
      return
    }

    void (async () => {
      const stream = await unlockCamera()
      if (cancelled) {
        stopMediaStream(stream)
        return
      }
      if (!stream) {
        setError(cameraBlockedMessage() || 'Could not open camera')
        return
      }
      streamRef.current = stream
      const features: CameraTrackFeatures = probeCameraTrack(stream)
      setHwZoomRange(features.zoom)
      setHwZoom(features.zoomValue)
      setCanTapFocus(features.canTapFocus || features.canContinuousFocus)
      await preferContinuousFocus(stream)
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        await video.play().catch(() => undefined)
      }
      meter.start()
    })()

    return () => {
      cancelled = true
      if (focusRingTimer.current) clearTimeout(focusRingTimer.current)
      void meter.stop()
      stopMediaStream(streamRef.current)
      streamRef.current = null
    }
  }, [meter])

  // Repaint while overlays are visible (enter animation + zoom sync).
  useEffect(() => {
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      if (boxesRef.current.length) paintOverlay()
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [paintOverlay])

  const resumeLive = useCallback(() => {
    setStillUrl(null)
    setZoom(IDENTITY_ZOOM)
    zoomRef.current = IDENTITY_ZOOM
    setFocusRing(null)
    const video = videoRef.current
    if (video && video.paused) {
      void video.play().catch(() => undefined)
    }
  }, [])

  const applyLiveZoom = useCallback(async (next: number) => {
    if (hwZoomRange) {
      const applied = await setTrackZoom(streamRef.current, next)
      if (applied != null) setHwZoom(applied)
      return
    }
    const scale = clampZoom(next)
    const frame = frameRef.current
    const clamped = clampPan(
      { scale, x: zoomRef.current.x, y: zoomRef.current.y },
      frame?.clientWidth || 1,
      frame?.clientHeight || 1,
    )
    zoomRef.current = clamped
    setZoom(clamped)
  }, [hwZoomRange])

  const onLiveFocusTap = useCallback(
    async (e: ReactMouseEvent<HTMLDivElement>) => {
      if (stillUrlRef.current || busy || scanning.current) return
      // Ignore taps on dock / chrome — only the frame receives this.
      const frame = frameRef.current
      const video = videoRef.current
      if (!frame || !video) return
      const rect = frame.getBoundingClientRect()
      const localX = e.clientX - rect.left
      const localY = e.clientY - rect.top
      setFocusRing({ x: localX, y: localY, key: Date.now() })
      if (focusRingTimer.current) clearTimeout(focusRingTimer.current)
      focusRingTimer.current = setTimeout(() => setFocusRing(null), 900)

      if (!canTapFocus) return
      const mw = video.videoWidth || mediaSizeRef.current.w
      const mh = video.videoHeight || mediaSizeRef.current.h
      // Undo digital CSS zoom so focus maps into the true video frame.
      const z = zoomRef.current
      const zx = (localX - z.x) / Math.max(1, z.scale)
      const zy = (localY - z.y) / Math.max(1, z.scale)
      const norm = framePointToMediaNorm(rect.width, rect.height, mw, mh, zx, zy)
      if (!norm) return
      await focusTrackAt(streamRef.current, norm.x, norm.y)
    },
    [busy, canTapFocus],
  )

  const runCapture = async () => {
    const video = videoRef.current
    if (!video || scanning.current) return
    scanning.current = true
    setBusy(true)
    setError(null)
    setSelectedId(null)
    boxesRef.current = []
    hitsRef.current = []
    appearAtRef.current = new Map()
    setBoxes([])
    setZoom(IDENTITY_ZOOM)
    zoomRef.current = IDENTITY_ZOOM

    try {
      // Always grab from the live stream (kept warm under the still).
      if (video.paused) {
        await video.play().catch(() => undefined)
      }
      const frame = frameRef.current
      const image =
        !hwZoomRange && frame && zoomRef.current.scale > 1.01
          ? captureZoomedVideoFrame(
              video,
              frame.clientWidth,
              frame.clientHeight,
              zoomRef.current,
              1280,
              0.72,
            )
          : captureFrame(video, 1280, 0.72)
      if (!image) throw new Error('Could not capture frame')
      try {
        mediaSizeRef.current = await decodeDataUrlSize(image)
      } catch {
        mediaSizeRef.current = {
          w: video.videoWidth || video.clientWidth,
          h: video.videoHeight || video.clientHeight,
        }
      }
      setStillUrl(image)
      stillUrlRef.current = image
      video.pause()

      const result = await cameraScan({
        image,
        target: target === 'auto' ? undefined : target,
      })
      if (result.entitlement) onEntitlement(result.entitlement)
      let next = result.regions.map(regionToEditable)
      try {
        const colors = await sampleColorsFromImageUrl(
          image,
          next.map((b) => b.box),
        )
        next = next.map((b, i) => ({
          ...b,
          bg: colors[i]?.bg,
          fg: colors[i]?.fg,
        }))
      } catch {
        // Fall back to high-contrast covers if decode/sample fails.
        next = next.map((b) => ({
          ...b,
          bg: { r: 245, g: 245, b: 240 },
          fg: { r: 18, g: 18, b: 20 },
        }))
      }
      const born = performance.now()
      const appear = new Map<string, number>()
      next.forEach((box, i) => appear.set(box.id, born + i * 45))
      appearAtRef.current = appear
      boxesRef.current = next
      setBoxes(next)
      if (!next.length) {
        setError(biPlain(ui.camNoTextFound))
      }
    } catch (e) {
      const err = e as { message?: string; entitlement?: Entitlement }
      if (err.entitlement) onEntitlement(err.entitlement)
      const msg = err.message || 'Scan failed'
      if (/429|rate limit|call rate/i.test(msg)) {
        setError(biPlain(ui.camRateLimited))
      } else {
        setError(msg)
      }
    } finally {
      scanning.current = false
      setBusy(false)
    }
  }

  const clearOverlays = () => {
    boxesRef.current = []
    hitsRef.current = []
    appearAtRef.current = new Map()
    setBoxes([])
    setSelectedId(null)
    setError(null)
    resumeLive()
    paintOverlay()
  }

  const onZoomTouchStart = useCallback((e: TouchEvent) => {
    const touches = e.touches
    const live = !stillUrlRef.current
    if (live && hwZoomRange && touches.length === 2) {
      e.preventDefault()
      const a = touches[0]!
      const b = touches[1]!
      livePinchRef.current = {
        startDist: Math.max(1, touchDistance(a, b)),
        startZoom: hwZoom,
      }
      pinchRef.current = null
      return
    }
    if (live && hwZoomRange) {
      livePinchRef.current = null
      return
    }
    // Still mode, or live digital zoom (no hardware zoom).
    if (touches.length === 2) {
      e.preventDefault()
      const a = touches[0]!
      const b = touches[1]!
      const mid = touchMidpoint(a, b)
      const z = zoomRef.current
      pinchRef.current = {
        mode: 'pinch',
        startDist: Math.max(1, touchDistance(a, b)),
        startScale: z.scale,
        startX: z.x,
        startY: z.y,
        lastMidX: mid.x,
        lastMidY: mid.y,
        lastX: mid.x,
        lastY: mid.y,
      }
    } else if (touches.length === 1 && zoomRef.current.scale > 1.01) {
      const t = touches[0]!
      pinchRef.current = {
        mode: 'pan',
        startDist: 0,
        startScale: zoomRef.current.scale,
        startX: zoomRef.current.x,
        startY: zoomRef.current.y,
        lastMidX: t.clientX,
        lastMidY: t.clientY,
        lastX: t.clientX,
        lastY: t.clientY,
      }
    } else {
      pinchRef.current = null
    }
  }, [hwZoom, hwZoomRange])

  const onZoomTouchMove = useCallback((e: TouchEvent) => {
    if (!stillUrlRef.current && hwZoomRange && livePinchRef.current && e.touches.length === 2) {
      e.preventDefault()
      const a = e.touches[0]!
      const b = e.touches[1]!
      const dist = Math.max(1, touchDistance(a, b))
      const ratio = dist / livePinchRef.current.startDist
      const next = livePinchRef.current.startZoom * ratio
      void applyLiveZoom(next)
      return
    }
    if (!pinchRef.current) return
    if (!stillUrlRef.current && hwZoomRange) return
    const state = pinchRef.current
    const frame = frameRef.current
    const apply = (next: ZoomTransform) => {
      const clamped = frame
        ? clampPan(next, frame.clientWidth, frame.clientHeight)
        : { ...next, scale: clampZoom(next.scale) }
      zoomRef.current = clamped
      setZoom(clamped)
    }
    if (state.mode === 'pinch' && e.touches.length === 2) {
      e.preventDefault()
      const a = e.touches[0]!
      const b = e.touches[1]!
      const dist = Math.max(1, touchDistance(a, b))
      const mid = touchMidpoint(a, b)
      const scale = clampZoom(state.startScale * (dist / state.startDist))
      apply({
        scale,
        x: state.startX + (mid.x - state.lastX),
        y: state.startY + (mid.y - state.lastY),
      })
    } else if (state.mode === 'pan' && e.touches.length === 1) {
      e.preventDefault()
      const t = e.touches[0]!
      apply({
        scale: state.startScale,
        x: state.startX + (t.clientX - state.lastX),
        y: state.startY + (t.clientY - state.lastY),
      })
    }
  }, [applyLiveZoom, hwZoomRange])

  const onZoomTouchEnd = useCallback((e: TouchEvent) => {
    if (e.touches.length === 0) {
      pinchRef.current = null
      livePinchRef.current = null
      return
    }
    if (e.touches.length === 1 && zoomRef.current.scale > 1.01 && (!stillUrlRef.current ? !hwZoomRange : true)) {
      const t = e.touches[0]!
      const z = zoomRef.current
      pinchRef.current = {
        mode: 'pan',
        startDist: 0,
        startScale: z.scale,
        startX: z.x,
        startY: z.y,
        lastMidX: t.clientX,
        lastMidY: t.clientY,
        lastX: t.clientX,
        lastY: t.clientY,
      }
    } else if (e.touches.length >= 2 && (stillUrlRef.current || !hwZoomRange)) {
      const a = e.touches[0]!
      const b = e.touches[1]!
      const mid = touchMidpoint(a, b)
      const z = zoomRef.current
      pinchRef.current = {
        mode: 'pinch',
        startDist: Math.max(1, touchDistance(a, b)),
        startScale: z.scale,
        startX: z.x,
        startY: z.y,
        lastMidX: mid.x,
        lastMidY: mid.y,
        lastX: mid.x,
        lastY: mid.y,
      }
    }
  }, [hwZoomRange])

  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    el.addEventListener('touchstart', onZoomTouchStart, { passive: false, capture: true })
    el.addEventListener('touchmove', onZoomTouchMove, { passive: false, capture: true })
    el.addEventListener('touchend', onZoomTouchEnd, { capture: true })
    el.addEventListener('touchcancel', onZoomTouchEnd, { capture: true })
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (stillUrlRef.current) {
        const z = zoomRef.current
        const nextScale = clampZoom(z.scale * (e.deltaY > 0 ? 0.92 : 1.08))
        if (Math.abs(nextScale - z.scale) < 0.001) return
        const r = el.getBoundingClientRect()
        const px = e.clientX - r.left
        const py = e.clientY - r.top
        const cx = r.width / 2
        const cy = r.height / 2
        const worldX = (px - cx - z.x) / z.scale
        const worldY = (py - cy - z.y) / z.scale
        const next = clampPan(
          {
            scale: nextScale,
            x: px - cx - worldX * nextScale,
            y: py - cy - worldY * nextScale,
          },
          r.width,
          r.height,
        )
        zoomRef.current = next
        setZoom(next)
        return
      }
      if (hwZoomRange) {
        const span = hwZoomRange.max - hwZoomRange.min
        const step = Math.max(hwZoomRange.step, span * 0.04)
        void applyLiveZoom(hwZoom + (e.deltaY < 0 ? step : -step))
      } else {
        const nextScale = clampZoom(zoomRef.current.scale * (e.deltaY < 0 ? 1.08 : 0.92))
        void applyLiveZoom(nextScale)
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('touchstart', onZoomTouchStart, true)
      el.removeEventListener('touchmove', onZoomTouchMove, true)
      el.removeEventListener('touchend', onZoomTouchEnd, true)
      el.removeEventListener('touchcancel', onZoomTouchEnd, true)
      el.removeEventListener('wheel', onWheel)
    }
  }, [stillUrl, hwZoom, hwZoomRange, applyLiveZoom, onZoomTouchStart, onZoomTouchMove, onZoomTouchEnd])

  const onOverlayClick = (e: ReactMouseEvent<HTMLCanvasElement>) => {
    if (busy) return
    // Live preview: tap-to-focus (canvas sits above the video).
    if (!stillUrl && !boxes.length) {
      void onLiveFocusTap(e as unknown as ReactMouseEvent<HTMLDivElement>)
      return
    }
    const canvas = overlayRef.current
    if (!canvas) return
    const r = canvas.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    const hit = [...hitsRef.current].reverse().find(
      (b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h,
    )
    setSelectedId(hit?.id || null)
  }

  const selected = boxes.find((b) => b.id === selectedId) || null

  const openSelectedDetails = () => {
    if (!selected) return
    const { phrase, translation, lang } = boxDetailArgs(selected)
    if (!phrase) return
    openBreakdown(phrase, { translation, lang })
  }

  const liveZoomValue = hwZoomRange ? hwZoom : zoom.scale
  const liveZoomMin = hwZoomRange?.min ?? ZOOM_MIN
  const liveZoomMax = hwZoomRange?.max ?? ZOOM_MAX
  const liveZoomStep = hwZoomRange?.step ?? 0.05
  const showLiveZoom = !stillUrl && !busy

  const zoomStyle = {
    transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})`,
  }

  return createPortal(
    <div className="cam-ar-fs" role="dialog" aria-modal="true" aria-label={biPlain(ui.camChoiceAr)}>
      <button
        type="button"
        className="cam-ar-close"
        onClick={onBack}
        aria-label={biPlain(ui.camChoiceClose)}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path
            d="M6.4 6.4l11.2 11.2M17.6 6.4L6.4 17.6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <div className="cam-ar-target-row" role="radiogroup" aria-label="Translate target">
        {(
          [
            ['auto', ui.camTargetAuto],
            ['en', ui.camTargetEn],
            ['yue', ui.camTargetYue],
            ['cmn', ui.camTargetCmn],
          ] as const
        ).map(([id, copy]) => (
          <label key={id} className={`cam-target-opt${target === id ? ' is-on' : ''}`}>
            <input
              type="radio"
              name="cam-ar-target"
              checked={target === id}
              onChange={() => onTargetChange(id)}
            />
            <BiText copy={copy} size="sm" />
          </label>
        ))}
      </div>

      <div
        className={`cam-ar-frame cam-ar-frame--fs${stillUrl ? ' is-still' : ' is-live'}`}
        ref={frameRef}
      >
        <div
          className="cam-ar-zoom"
          ref={zoomLayerRef}
          style={zoomStyle}
        >
          <video
            ref={videoRef}
            className={`cam-video${stillUrl ? ' is-hidden' : ''}`}
            playsInline
            muted
            autoPlay
          />
          {stillUrl ? (
            <img src={stillUrl} alt="" className="cam-still" draggable={false} />
          ) : null}
        </div>
        <canvas
          ref={overlayRef}
          className="cam-overlay-canvas"
          onClick={onOverlayClick}
        />
        {focusRing ? (
          <span
            key={focusRing.key}
            className="cam-ar-focus-ring"
            style={{ left: focusRing.x, top: focusRing.y }}
            aria-hidden="true"
          />
        ) : null}
      </div>

      {busy ? (
        <div className="cam-ar-busy cam-ar-busy--thinking" role="status">
          <TranslateThinking className="cam-ar-thinking" />
        </div>
      ) : null}

      {error ? (
        <p className="cam-ar-toast cam-ar-toast--error" role="alert">
          {error}
        </p>
      ) : null}

      {!busy && !boxes.length && !error && !stillUrl ? (
        <p className="cam-ar-toast">
          <BiText
            copy={canTapFocus || showLiveZoom ? ui.camCaptureHintZoomFocus : ui.camCaptureHint}
            size="sm"
          />
        </p>
      ) : null}

      {showLiveZoom ? (
        <label className="cam-ar-live-zoom">
          <span className="cam-ar-live-zoom-label">
            <BiText copy={ui.camLiveZoom} size="sm" />
          </span>
          <input
            type="range"
            min={liveZoomMin}
            max={liveZoomMax}
            step={liveZoomStep}
            value={liveZoomValue}
            onChange={(e) => void applyLiveZoom(Number(e.target.value))}
            aria-label={biPlain(ui.camLiveZoom)}
          />
        </label>
      ) : null}

      <div className="cam-ar-dock">
        <div className="cam-ar-dock-cluster">
          <button
            type="button"
            className="cam-ar-shutter"
            disabled={busy}
            onClick={() => void runCapture()}
            aria-label={biPlain(ui.camCapture)}
          >
            <span className="cam-ar-shutter-ring" aria-hidden="true" />
            <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
              <path
                d="M9 7l1.2-2h3.6L15 7h3a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h3z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="13" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
            </svg>
          </button>
          <button
            type="button"
            className="cam-ar-clear"
            disabled={busy || (!boxes.length && !stillUrl)}
            onClick={clearOverlays}
            aria-label={biPlain(ui.camClearOverlays)}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path
                d="M5 7h14M10 7V5h4v2M8 7l1 12h6l1-12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {selected && !busy ? (
        <div className="cam-ar-sheet" role="region" aria-label={biPlain(ui.camDetailTitle)}>
          <button
            type="button"
            className="cam-ar-sheet-close"
            onClick={() => setSelectedId(null)}
            aria-label={biPlain(ui.camChoiceClose)}
          >
            ×
          </button>
          <button
            type="button"
            className="cam-detail-open"
            onClick={openSelectedDetails}
            aria-label={biPlain(ui.camOpenDetails)}
          >
            {selected.text ? <span className="cam-detail-src">{selected.text}</span> : null}
            {selected.translated ? <span className="cam-detail-tr">{selected.translated}</span> : null}
            <span className="cam-detail-open-hint">
              <BiText copy={ui.camOpenDetailsHint} size="sm" />
            </span>
          </button>
          <div className="cam-detail-actions">
            <button
              type="button"
              className="cam-tool-btn cam-tool-btn--primary"
              onClick={openSelectedDetails}
            >
              <BiText copy={ui.camOpenDetails} size="sm" />
            </button>
            <button
              type="button"
              className="cam-tool-btn"
              onClick={() => {
                const t = selected.translated || selected.text
                if (t) void navigator.clipboard?.writeText(t)
              }}
            >
              <BiText copy={ui.camCopy} size="sm" />
            </button>
            {selected.translated ? (
              <button
                type="button"
                className="cam-tool-btn"
                onClick={() =>
                  void speakManual(selected.translated, speakLangForBox(selected))
                }
              >
                <BiText copy={ui.speak} size="sm" />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>,
    document.body,
  )
}
