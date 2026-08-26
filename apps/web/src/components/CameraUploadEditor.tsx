import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { BiText } from './BiText'
import { cameraScan, type CameraBox } from '../lib/api'
import { applyHandle, hitTest, type Handle } from '../lib/camera/geometry'
import { clampBox, newBox, regionToEditable, boxDetailArgs, type CameraTarget, type EditableBox } from '../lib/camera/types'
import { useYueStore } from '../lib/store'
import { biPlain, ui } from '../lib/uiCopy'
import type { Entitlement } from '../lib/types'

type Props = {
  imageUrl: string
  target: CameraTarget
  onBack: () => void
  onEntitlement: (ent: Entitlement) => void
  meter: { start: () => void; stop: () => Promise<void> }
}

export function CameraUploadEditor({ imageUrl, target, onBack, onEntitlement, meter }: Props) {
  const speakManual = useYueStore((s) => s.speakManual)
  const openBreakdown = useYueStore((s) => s.openBreakdown)
  const imgRef = useRef<HTMLImageElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const fileToDataUrl = useRef(imageUrl)
  const [boxes, setBoxes] = useState<EditableBox[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [visionNotice, setVisionNotice] = useState<'ok' | 'unconfigured' | 'authFailed'>('ok')
  const [scale, setScale] = useState(1)
  const drag = useRef<{
    id: string
    handle: Handle
    lastX: number
    lastY: number
  } | null>(null)
  const drawing = useRef<{ x0: number; y0: number; id: string } | null>(null)

  useEffect(() => {
    meter.start()
    return () => {
      void meter.stop()
    }
  }, [meter])

  const toNorm = useCallback((clientX: number, clientY: number): { x: number; y: number } | null => {
    const stage = stageRef.current
    const img = imgRef.current
    if (!stage || !img) return null
    const r = img.getBoundingClientRect()
    if (r.width <= 0 || r.height <= 0) return null
    return {
      x: Math.min(1, Math.max(0, (clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (clientY - r.top) / r.height)),
    }
  }, [])

  const runScan = async (opts: { boxes?: CameraBox[]; ocrOnly?: boolean }) => {
    const img = imgRef.current
    if (!img) return
    setBusy(true)
    setError(null)
    try {
      // Prefer original data URL when available; else canvas from rendered image.
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
        setBoxes((prev) =>
          prev.map((b, i) => {
            const r = result.regions[i]
            if (!r) return b
            return {
              ...b,
              text: r.text || b.text,
              translated: r.translated,
              from: r.from,
              to: r.to,
              dirty: false,
            }
          }),
        )
      } else {
        setBoxes(result.regions.map(regionToEditable))
      }
    } catch (e) {
      const err = e as { message?: string; entitlement?: Entitlement }
      if (err.entitlement) onEntitlement(err.entitlement)
      setError(err.message || 'Scan failed')
    } finally {
      setBusy(false)
    }
  }

  const onPointerDown = (e: ReactPointerEvent) => {
    const p = toNorm(e.clientX, e.clientY)
    if (!p) return
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)

    // Hit selected / any box handles first
    const ordered = selectedId
      ? [...boxes].sort((a, b) => (a.id === selectedId ? -1 : b.id === selectedId ? 1 : 0))
      : boxes
    for (const b of ordered) {
      const h = hitTest(p.x, p.y, b.box)
      if (h) {
        setSelectedId(b.id)
        drag.current = { id: b.id, handle: h, lastX: p.x, lastY: p.y }
        return
      }
    }

    // Start drawing a new box
    const box = clampBox({ x: p.x, y: p.y, w: 0.02, h: 0.02 })
    const created = newBox(box)
    drawing.current = { x0: p.x, y0: p.y, id: created.id }
    setBoxes((prev) => [...prev, created])
    setSelectedId(created.id)
  }

  const onPointerMove = (e: ReactPointerEvent) => {
    const p = toNorm(e.clientX, e.clientY)
    if (!p) return

    if (drawing.current) {
      const { x0, y0, id } = drawing.current
      const x = Math.min(x0, p.x)
      const y = Math.min(y0, p.y)
      const w = Math.max(0.02, Math.abs(p.x - x0))
      const h = Math.max(0.02, Math.abs(p.y - y0))
      setBoxes((prev) =>
        prev.map((b) => (b.id === id ? { ...b, box: clampBox({ x, y, w, h }), dirty: true } : b)),
      )
      return
    }

    const d = drag.current
    if (!d) return
    const dx = p.x - d.lastX
    const dy = p.y - d.lastY
    d.lastX = p.x
    d.lastY = p.y
    setBoxes((prev) =>
      prev.map((b) =>
        b.id === d.id
          ? { ...b, box: applyHandle(b.box, d.handle, dx, dy), dirty: true, translated: '' }
          : b,
      ),
    )
  }

  const onPointerUp = () => {
    drawing.current = null
    drag.current = null
  }

  const selected = boxes.find((b) => b.id === selectedId) || null

  const openSelectedDetails = () => {
    if (!selected) return
    const { phrase, translation } = boxDetailArgs(selected)
    if (!phrase) return
    openBreakdown(phrase, { translation })
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
          className="cam-tool-btn"
          disabled={!selectedId}
          onClick={() => {
            setBoxes((prev) => prev.filter((b) => b.id !== selectedId))
            setSelectedId(null)
          }}
        >
          <BiText copy={ui.camDeleteBox} size="sm" />
        </button>
        <label className="cam-zoom">
          <input
            type="range"
            min={1}
            max={2.5}
            step={0.05}
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
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

      <div className="cam-stage-wrap">
        <div
          className="cam-stage"
          ref={stageRef}
          style={{ transform: `scale(${scale})`, transformOrigin: 'center top' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <img ref={imgRef} src={imageUrl} alt="" className="cam-image" draggable={false} />
          {boxes.map((b) => (
            <div
              key={b.id}
              className={`cam-box${b.id === selectedId ? ' is-selected' : ''}${b.translated ? ' has-tr' : ''}`}
              style={{
                left: `${b.box.x * 100}%`,
                top: `${b.box.y * 100}%`,
                width: `${b.box.w * 100}%`,
                height: `${b.box.h * 100}%`,
              }}
            >
              {b.translated ? (
                <span className="cam-box-tr">{b.translated}</span>
              ) : b.text ? (
                <span className="cam-box-src">{b.text}</span>
              ) : null}
              {b.id === selectedId
                ? (['nw', 'ne', 'sw', 'se'] as const).map((h) => (
                    <i key={h} className={`cam-handle cam-handle--${h}`} />
                  ))
                : null}
            </div>
          ))}
        </div>
      </div>

      {selected?.translated || selected?.text ? (
        <div className="cam-detail">
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
                  void speakManual(selected.translated, selected.to === 'zh' ? 'yue' : 'en')
                }
              >
                <BiText copy={ui.speak} size="sm" />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}