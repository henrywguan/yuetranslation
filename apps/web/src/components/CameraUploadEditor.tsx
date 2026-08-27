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
import {
  applyHandle,
  hitTest,
  mediaFitLayout,
  type Handle,
} from '../lib/camera/geometry'
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
  clampBox,
  newBox,
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

const DRAW_SLOP_PX = 12
const IDENTITY_ZOOM: ZoomTransform = { scale: 1, x: 0, y: 0 }
const HANDLE_SCREEN = 10

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
  const [drawMode, setDrawMode] = useState(false)
  const [imgReady, setImgReady] = useState(false)

  const drag = useRef<{
    id: string
    handle: Handle
    lastX: number
    lastY: number
  } | null>(null)
  const drawing = useRef<{ x0: number; y0: number; id: string } | null>(null)
  const pendingDraw = useRef<{
    pointerId: number
    startClientX: number
    startClientY: number
    x0: number
    y0: number
  } | null>(null)
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

  /** Map client → image-normalized coords through contain layout + reverse zoom. */
  const toNorm = useCallback((clientX: number, clientY: number): { x: number; y: number } | null => {
    const frame = frameRef.current
    const { w: mw, h: mh } = mediaSizeRef.current
    if (!frame || !mw || !mh) return null
    const fr = frame.getBoundingClientRect()
    const layout = mediaFitLayout(fr.width, fr.height, mw, mh, 'contain')
    const z = zoomRef.current
    const cx = fr.width / 2
    const cy = fr.height / 2
    // Reverse screen-space zoom → layout space
    const lx = (clientX - fr.left - z.x - cx) / z.scale + cx
    const ly = (clientY - fr.top - z.y - cy) / z.scale + cy
    if (layout.dispW <= 0 || layout.dispH <= 0) return null
    const x = (lx - layout.offsetX) / layout.dispW
    const y = (ly - layout.offsetY) / layout.dispH
    return {
      x: Math.min(1, Math.max(0, x)),
      y: Math.min(1, Math.max(0, y)),
    }
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

      let drawX = mapX(ox)
      let drawY = mapY(oy)
      let drawW = Math.max(8, mapX(ox + obw) - drawX)
      let drawH = Math.max(8, mapY(oy + obh) - drawY)

      const padX = 10
      const padY = 8
      const maxFont = Math.min(64, 32 + scale * 16)
      let fontSize = Math.max(16, Math.min(maxFont, drawH * 0.78))
      let textW = 0

      if (label) {
        const minFont = Math.max(14, 12 + scale * 2)
        for (; fontSize >= minFont; fontSize -= 0.5) {
          textW = measureOverlayLabel(ctx, label, fontSize)
          if (textW + padX * 2 <= drawW) break
        }
        textW = measureOverlayLabel(ctx, label, fontSize)
        // Grow panel for long translations (glass style — not matched bg).
        drawW = Math.max(drawW, textW + padX * 2)
        drawH = Math.max(drawH, fontSize + padY * 2.15)
      }

      drawGlassPanel(ctx, drawX, drawY, drawW, drawH, { selected })
      drawCornerBrackets(ctx, drawX, drawY, drawW, drawH, { selected })
      if (label) {
        drawOverlayLabel(ctx, label, drawX + padX, drawY + drawH / 2, Math.max(8, drawW - padX * 2), fontSize, {
          selected,
        })
      }

      if (selected) {
        const hs = HANDLE_SCREEN
        const corners: Array<[number, number]> = [
          [drawX, drawY],
          [drawX + drawW, drawY],
          [drawX, drawY + drawH],
          [drawX + drawW, drawY + drawH],
        ]
        for (const [hx, hy] of corners) {
          ctx.fillStyle = 'rgba(126, 240, 220, 0.95)'
          ctx.strokeStyle = 'rgba(4, 16, 24, 0.55)'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.rect(hx - hs / 2, hy - hs / 2, hs, hs)
          ctx.fill()
          ctx.stroke()
        }
      }

      // Slight hit slop so small / right-edge regions stay tappable.
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
        if (firstId) {
          selectResult(firstId)
          setDrawMode(false)
        }
      } else {
        const next = result.regions.map(regionToEditable)
        boxesRef.current = next
        setBoxes(next)
        const first = next.find((b) => b.translated || b.text)
        selectResult(first?.id ?? null)
        setDrawMode(false)
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
    const p = toNorm(e.clientX, e.clientY)
    if (!p) return
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)

    const ordered = selectedId
      ? [...boxes].sort((a, b) => (a.id === selectedId ? -1 : b.id === selectedId ? 1 : 0))
      : boxes
    for (const b of ordered) {
      const h = hitTest(p.x, p.y, b.box)
      if (h) {
        selectResult(b.id)
        drag.current = { id: b.id, handle: h, lastX: p.x, lastY: p.y }
        pendingDraw.current = null
        panDrag.current = null
        return
      }
    }

    // Prefer painted hit (expanded glass label) if geometry miss.
    const painted = hitFromClient(e.clientX, e.clientY)
    if (painted) {
      selectResult(painted)
      drag.current = { id: painted, handle: 'move', lastX: p.x, lastY: p.y }
      return
    }

    if (drawMode) {
      pendingDraw.current = {
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        x0: p.x,
        y0: p.y,
      }
      return
    }

    if (zoomRef.current.scale > 1.01) {
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
    if (panDrag.current) {
      const pan = panDrag.current
      applyZoom({
        scale: zoomRef.current.scale,
        x: pan.startX + (e.clientX - pan.originClientX),
        y: pan.startY + (e.clientY - pan.originClientY),
      })
      return
    }

    const p = toNorm(e.clientX, e.clientY)
    if (!p) return

    if (pendingDraw.current && !drawing.current) {
      const pending = pendingDraw.current
      const dist = Math.hypot(e.clientX - pending.startClientX, e.clientY - pending.startClientY)
      if (dist < DRAW_SLOP_PX) return
      const box = clampBox({ x: pending.x0, y: pending.y0, w: 0.02, h: 0.02 })
      const created = newBox(box)
      drawing.current = { x0: pending.x0, y0: pending.y0, id: created.id }
      pendingDraw.current = null
      setBoxes((prev) => {
        const next = [...prev, created]
        boxesRef.current = next
        return next
      })
      selectResult(created.id)
    }

    if (drawing.current) {
      const { x0, y0, id } = drawing.current
      const x = Math.min(x0, p.x)
      const y = Math.min(y0, p.y)
      const w = Math.max(0.02, Math.abs(p.x - x0))
      const h = Math.max(0.02, Math.abs(p.y - y0))
      setBoxes((prev) => {
        const next = prev.map((b) =>
          b.id === id ? { ...b, box: clampBox({ x, y, w, h }), dirty: true } : b,
        )
        boxesRef.current = next
        return next
      })
      return
    }

    const d = drag.current
    if (!d) return
    const dx = p.x - d.lastX
    const dy = p.y - d.lastY
    d.lastX = p.x
    d.lastY = p.y
    setBoxes((prev) => {
      const next = prev.map((b) =>
        b.id === d.id
          ? { ...b, box: applyHandle(b.box, d.handle, dx, dy), dirty: true, translated: '' }
          : b,
      )
      boxesRef.current = next
      return next
    })
  }

  const onPointerUp = () => {
    pendingDraw.current = null
    drawing.current = null
    drag.current = null
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
        <button
          type="button"
          className={`cam-tool-btn${drawMode ? ' is-on' : ''}`}
          aria-pressed={drawMode}
          onClick={() => setDrawMode((v) => !v)}
        >
          <BiText copy={ui.camDrawMode} size="sm" />
        </button>
        <button
          type="button"
          className="cam-tool-btn"
          disabled={!selectedId}
          onClick={() => {
            setBoxes((prev) => {
              const next = prev.filter((b) => b.id !== selectedId)
              boxesRef.current = next
              return next
            })
            setSelectedId(null)
          }}
        >
          <BiText copy={ui.camDeleteBox} size="sm" />
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

      <div className={`cam-stage-wrap cam-stage-wrap--zoom${drawMode ? ' is-draw' : ''}`}>
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
