import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { BiText } from './BiText'
import { CamResultsList } from './CamResultsList'
import { cameraScan, type CameraBox } from '../lib/api'
import { mediaFitLayout } from '../lib/camera/geometry'
import {
  drawCornerBrackets,
  drawGlassPanel,
  drawOverlayLabel,
  measureOverlayLabel,
} from '../lib/camera/overlayPaint'
import {
  clampPan,
  clampZoom,
  ZOOM_MAX,
  ZOOM_MIN,
  type ZoomTransform,
} from '../lib/camera/pinchZoom'
import {
  regionToEditable,
  boxDetailArgs,
  type CameraTarget,
  type EditableBox,
} from '../lib/camera/types'
import { useYueStore } from '../lib/store'
import { ui } from '../lib/uiCopy'
import type { Entitlement } from '../lib/types'

type Props = {
  imageUrl: string
  target: CameraTarget
  onBack: () => void
  onEntitlement: (ent: Entitlement) => void
  meter: { start: () => void; stop: () => Promise<void> }
}

type HitRect = { id: string; x: number; y: number; w: number; h: number }

const IDENTITY_ZOOM: ZoomTransform = { scale: 1, x: 0, y: 0 }

export function CameraUploadEditor({ imageUrl, target, onBack, onEntitlement, meter }: Props) {
  const openBreakdown = useYueStore((s) => s.openBreakdown)
  const imgRef = useRef<HTMLImageElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const detailRef = useRef<HTMLDivElement>(null)
  const fileToDataUrl = useRef(imageUrl)
  const boxesRef = useRef<EditableBox[]>([])
  const hitsRef = useRef<HitRect[]>([])
  const zoomRef = useRef<ZoomTransform>(IDENTITY_ZOOM)
  const mediaSizeRef = useRef({ w: 0, h: 0 })

  const [boxes, setBoxes] = useState<EditableBox[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [visionNotice, setVisionNotice] = useState<'ok' | 'unconfigured' | 'authFailed'>('ok')
  const [zoom, setZoom] = useState<ZoomTransform>(IDENTITY_ZOOM)
  const [imgReady, setImgReady] = useState(false)

  const panDrag = useRef<{
    originClientX: number
    originClientY: number
    startX: number
    startY: number
  } | null>(null)

  useEffect(() => {
    boxesRef.current = boxes
  }, [boxes])

  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])

  useEffect(() => {
    meter.start()
    return () => {
      void meter.stop()
    }
  }, [meter])

  const applyZoom = useCallback((next: ZoomTransform) => {
    const frame = frameRef.current
    const clamped = frame
      ? clampPan(next, frame.clientWidth, frame.clientHeight)
      : { ...next, scale: clampZoom(next.scale) }
    zoomRef.current = clamped
    setZoom(clamped)
  }, [])

  const selectResult = useCallback((id: string | null) => {
    setSelectedId(id)
    if (!id) return
    window.requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }, [])

  const paintOverlay = useCallback(() => {
    const frame = frameRef.current
    const canvas = overlayRef.current
    const { w: mw, h: mh } = mediaSizeRef.current
    if (!frame || !canvas || !mw || !mh) return
    const fw = frame.clientWidth
    const fh = frame.clientHeight
    if (!fw || !fh) return

    const layout = mediaFitLayout(fw, fh, mw, mh, 'contain')
    const z = zoomRef.current
    const scale = z.scale
    const cx = fw / 2
    const cy = fh / 2
    const mapX = (px: number) => (px - cx) * scale + cx + z.x
    const mapY = (py: number) => (py - cy) * scale + cy + z.y

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    const buf = Math.min(3, Math.max(1, dpr))
    const bw = Math.round(fw * buf)
    const bh = Math.round(fh * buf)
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw
      canvas.height = bh
    }
    canvas.style.width = `${fw}px`
    canvas.style.height = `${fh}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(buf, 0, 0, buf, 0, 0)
    ctx.clearRect(0, 0, fw, fh)
    const hits: HitRect[] = []

    for (const b of boxesRef.current) {
      const ox = layout.offsetX + b.box.x * layout.dispW
      const oy = layout.offsetY + b.box.y * layout.dispH
      const obw = Math.max(8, b.box.w * layout.dispW)
      const obh = Math.max(8, b.box.h * layout.dispH)
      const label = b.translated || b.text
      const selected = b.id === selectedId

      // Lock panel to the OCR word region (slight pad so ink is fully covered).
      const inflateX = obw * 0.05
      const inflateY = obh * 0.1
      const lx0 = ox - inflateX
      const ly0 = oy - inflateY
      const lx1 = ox + obw + inflateX
      const ly1 = oy + obh + inflateY
      const drawX = mapX(lx0)
      const drawY = mapY(ly0)
      const drawW = Math.max(8, mapX(lx1) - drawX)
      const drawH = Math.max(8, mapY(ly1) - drawY)

      const padX = Math.max(4, drawW * 0.04)
      const maxFont = Math.min(64, 32 + scale * 16)
      let fontSize = Math.max(11, Math.min(maxFont, drawH * 0.78))
      let textW = 0

      if (label) {
        const minFont = Math.max(9, 8 + scale * 2)
        for (; fontSize >= minFont; fontSize -= 0.5) {
          textW = measureOverlayLabel(ctx, label, fontSize)
          if (textW + padX * 2 <= drawW) break
        }
      }

      drawGlassPanel(ctx, drawX, drawY, drawW, drawH, { selected })
      drawCornerBrackets(ctx, drawX, drawY, drawW, drawH, { selected })
      if (label) {
        drawOverlayLabel(ctx, label, drawX + padX, drawY + drawH / 2, Math.max(8, drawW - padX * 2), fontSize, {
          selected,
        })
      }

      const slop = 4
      hits.push({
        id: b.id,
        x: (drawX - slop) / fw,
        y: (drawY - slop) / fh,
        w: (drawW + slop * 2) / fw,
        h: (drawH + slop * 2) / fh,
      })
    }

    hitsRef.current = hits
  }, [selectedId])

  useEffect(() => {
    paintOverlay()
  }, [boxes, paintOverlay, selectedId, zoom, imgReady])

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const ro = new ResizeObserver(() => paintOverlay())
    ro.observe(frame)
    return () => ro.disconnect()
  }, [paintOverlay])

  const onImgLoad = () => {
    const img = imgRef.current
    if (!img) return
    mediaSizeRef.current = { w: img.naturalWidth, h: img.naturalHeight }
    setImgReady(true)
    paintOverlay()
  }

  const runScan = async (opts: { boxes?: CameraBox[]; ocrOnly?: boolean }) => {
    const img = imgRef.current
    if (!img) return
    setBusy(true)
    setError(null)
    try {
      let image = fileToDataUrl.current
      if (!image.startsWith('data:')) {
        const canvas = document.createElement('canvas')
        const max = 1280
        const sw = img.naturalWidth
        const sh = img.naturalHeight
        const s = Math.min(1, max / Math.max(sw, sh))
        canvas.width = Math.round(sw * s)
        canvas.height = Math.round(sh * s)
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Canvas unavailable')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        image = canvas.toDataURL('image/jpeg', 0.72)
      }
      const result = await cameraScan({
        image,
        boxes: opts.boxes,
        target: target === 'auto' ? undefined : target,
        ocrOnly: opts.ocrOnly,
      })
      if (result.visionAuthFailed) {
        setVisionNotice('authFailed')
      } else if (!result.visionConfigured) {
        setVisionNotice('unconfigured')
      } else {
        setVisionNotice('ok')
      }
      if (result.entitlement) onEntitlement(result.entitlement)
      if (opts.boxes && opts.boxes.length) {
        let firstId: string | null = null
        setBoxes((prev) => {
          const next = prev.map((b, i) => {
            const r = result.regions[i]
            if (!r) return b
            if (!firstId && (r.translated || r.text)) firstId = b.id
            return {
              ...b,
              text: r.text || b.text,
              translated: r.translated,
              from: r.from,
              to: r.to,
              dirty: false,
            }
          })
          boxesRef.current = next
          return next
        })
        if (firstId) selectResult(firstId)
      } else {
        const next = result.regions.map(regionToEditable)
        boxesRef.current = next
        setBoxes(next)
        const first = next.find((b) => b.translated || b.text)
        selectResult(first?.id ?? null)
      }
    } catch (e) {
      const err = e as { message?: string; entitlement?: Entitlement }
      if (err.entitlement) onEntitlement(err.entitlement)
      setError(err.message || 'Scan failed')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    const wrap = frameRef.current?.parentElement
    if (!wrap) return
    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault()
      const frame = frameRef.current
      if (!frame) return
      const fr = frame.getBoundingClientRect()
      const z = zoomRef.current
      const nextScale = clampZoom(z.scale * (e.deltaY > 0 ? 0.92 : 1.08))
      if (Math.abs(nextScale - z.scale) < 0.001) return
      const px = e.clientX - fr.left
      const py = e.clientY - fr.top
      const cx = fr.width / 2
      const cy = fr.height / 2
      const worldX = (px - cx - z.x) / z.scale
      const worldY = (py - cy - z.y) / z.scale
      applyZoom({
        scale: nextScale,
        x: px - cx - worldX * nextScale,
        y: py - cy - worldY * nextScale,
      })
    }
    wrap.addEventListener('wheel', onWheelNative, { passive: false })
    return () => wrap.removeEventListener('wheel', onWheelNative)
  }, [applyZoom, imgReady])

  const hitFromClient = (clientX: number, clientY: number): string | null => {
    const canvas = overlayRef.current
    if (!canvas) return null
    const r = canvas.getBoundingClientRect()
    const x = (clientX - r.left) / r.width
    const y = (clientY - r.top) / r.height
    const hit = [...hitsRef.current]
      .reverse()
      .find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h)
    return hit?.id ?? null
  }

  const onPointerDown = (e: ReactPointerEvent) => {
    const painted = hitFromClient(e.clientX, e.clientY)
    if (painted) {
      selectResult(painted)
      panDrag.current = null
      return
    }

    if (zoomRef.current.scale > 1.01) {
      ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
      panDrag.current = {
        originClientX: e.clientX,
        originClientY: e.clientY,
        startX: zoomRef.current.x,
        startY: zoomRef.current.y,
      }
      return
    }

    selectResult(null)
  }

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!panDrag.current) return
    const pan = panDrag.current
    applyZoom({
      scale: zoomRef.current.scale,
      x: pan.startX + (e.clientX - pan.originClientX),
      y: pan.startY + (e.clientY - pan.originClientY),
    })
  }

  const onPointerUp = () => {
    panDrag.current = null
  }

  const openBoxDetails = (box: EditableBox) => {
    const { phrase, translation } = boxDetailArgs(box)
    if (!phrase) return
    openBreakdown(phrase, { translation })
  }

  const zoomStyle = {
    transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})`,
  }

  return (
    <div className="cam-session cam-session--upload">
      <div className="cam-toolbar">
        <button type="button" className="cam-tool-btn" onClick={onBack}>
          <BiText copy={ui.camBack} size="sm" />
        </button>
        <button
          type="button"
          className="cam-tool-btn"
          disabled={busy}
          onClick={() => void runScan({ ocrOnly: false })}
        >
          <BiText copy={ui.camAutoDetect} size="sm" />
        </button>
        <button
          type="button"
          className="cam-tool-btn cam-tool-btn--primary"
          disabled={busy || boxes.length === 0}
          onClick={() => void runScan({ boxes: boxes.map((b) => b.box) })}
        >
          <BiText copy={busy ? ui.camScanning : ui.camTranslate} size="sm" />
        </button>
        <label className="cam-zoom">
          <input
            type="range"
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step={0.05}
            value={zoom.scale}
            onChange={(e) => applyZoom({ ...zoomRef.current, scale: Number(e.target.value) })}
            aria-label="Zoom"
          />
        </label>
      </div>

      <p className="cam-hint">
        <BiText copy={ui.camDrawHint} size="sm" />
      </p>
      {visionNotice === 'unconfigured' ? (
        <p className="cam-hint cam-hint--warn">
          <BiText copy={ui.camNoVision} size="sm" />
        </p>
      ) : null}
      {visionNotice === 'authFailed' ? (
        <p className="cam-hint cam-hint--warn">
          <BiText copy={ui.camVisionAuthFailed} size="sm" />
        </p>
      ) : null}
      {error ? (
        <p className="cam-hint cam-hint--error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="cam-stage-wrap cam-stage-wrap--zoom">
        <div className="cam-upload-frame" ref={frameRef}>
          <div className="cam-upload-zoom" style={zoomStyle}>
            <img
              ref={imgRef}
              src={imageUrl}
              alt=""
              className="cam-image cam-image--fit"
              draggable={false}
              onLoad={onImgLoad}
            />
          </div>
          <canvas
            ref={overlayRef}
            className="cam-overlay-canvas cam-overlay-canvas--upload"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
        </div>
      </div>

      <CamResultsList
        boxes={boxes}
        selectedId={selectedId}
        onSelect={selectResult}
        onOpenDetails={openBoxDetails}
        panelRef={detailRef}
      />
    </div>
  )
}
