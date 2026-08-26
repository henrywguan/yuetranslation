import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { BiText } from './BiText'
import { CamFitText } from './CamFitText'
import { CopyButton } from './CopyButton'
import { SpeakButton } from './SpeakButton'
import { cameraScan, type CameraBox } from '../lib/api'
import { applyHandle, hitTest, type Handle } from '../lib/camera/geometry'
import {
  clampBox,
  newBox,
  regionToEditable,
  boxDetailArgs,
  type CameraTarget,
  type EditableBox,
} from '../lib/camera/types'
import { useYueStore } from '../lib/store'
import { biPlain, ui } from '../lib/uiCopy'
import type { Entitlement, Lang } from '../lib/types'

type Props = {
  imageUrl: string
  target: CameraTarget
  onBack: () => void
  onEntitlement: (ent: Entitlement) => void
  meter: { start: () => void; stop: () => Promise<void> }
}

const DRAW_SLOP_PX = 12

export function CameraUploadEditor({ imageUrl, target, onBack, onEntitlement, meter }: Props) {
  const openBreakdown = useYueStore((s) => s.openBreakdown)
  const imgRef = useRef<HTMLImageElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const detailRef = useRef<HTMLDivElement>(null)
  const fileToDataUrl = useRef(imageUrl)
  const [boxes, setBoxes] = useState<EditableBox[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [visionNotice, setVisionNotice] = useState<'ok' | 'unconfigured' | 'authFailed'>('ok')
  const [scale, setScale] = useState(1)
  /** Explicit draw mode — off by default so scroll/pan doesn’t spawn boxes. */
  const [drawMode, setDrawMode] = useState(false)
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

  const selectResult = useCallback((id: string | null) => {
    setSelectedId(id)
    if (!id) return
    window.requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }, [])

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
        setBoxes((prev) =>
          prev.map((b, i) => {
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
          }),
        )
        if (firstId) {
          selectResult(firstId)
          setDrawMode(false)
        }
      } else {
        const next = result.regions.map(regionToEditable)
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

  const onPointerDown = (e: ReactPointerEvent) => {
    const p = toNorm(e.clientX, e.clientY)
    if (!p) return

    const ordered = selectedId
      ? [...boxes].sort((a, b) => (a.id === selectedId ? -1 : b.id === selectedId ? 1 : 0))
      : boxes
    for (const b of ordered) {
      const h = hitTest(p.x, p.y, b.box)
      if (h) {
        ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
        selectResult(b.id)
        drag.current = { id: b.id, handle: h, lastX: p.x, lastY: p.y }
        pendingDraw.current = null
        return
      }
    }

    // Empty space: only prepare a draw when Draw box is on (scroll otherwise).
    if (!drawMode) {
      selectResult(null)
      return
    }

    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    pendingDraw.current = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      x0: p.x,
      y0: p.y,
    }
  }

  const onPointerMove = (e: ReactPointerEvent) => {
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
      setBoxes((prev) => [...prev, created])
      selectResult(created.id)
    }

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
    pendingDraw.current = null
    drawing.current = null
    drag.current = null
  }

  const selected = boxes.find((b) => b.id === selectedId) || null
  const resultBox =
    selected?.translated || selected?.text
      ? selected
      : boxes.find((b) => b.translated || b.text) || null

  const openSelectedDetails = () => {
    if (!resultBox) return
    const { phrase, translation } = boxDetailArgs(resultBox)
    if (!phrase) return
    openBreakdown(phrase, { translation })
  }

  const resultLang: Lang = resultBox
    ? resultBox.to === 'zh'
      ? 'yue'
      : resultBox.to === 'en'
        ? 'en'
        : /[\u3400-\u9fff]/.test(resultBox.translated || resultBox.text)
          ? 'yue'
          : 'en'
    : 'en'
  const speakText = resultBox?.translated || resultBox?.text || ''
  const copyText = resultBox?.translated || resultBox?.text || ''

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

      <div className={`cam-stage-wrap${drawMode ? ' is-draw' : ''}`}>
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
              className={`cam-box${b.id === selectedId ? ' is-selected' : ''}${b.translated ? ' has-tr' : ''}${b.text && !b.translated ? ' has-src' : ''}`}
              style={{
                left: `${b.box.x * 100}%`,
                top: `${b.box.y * 100}%`,
                width: `${b.box.w * 100}%`,
                height: `${b.box.h * 100}%`,
              }}
            >
              {b.translated ? (
                <CamFitText text={b.translated} className="cam-box-tr" />
              ) : b.text ? (
                <CamFitText text={b.text} className="cam-box-src" />
              ) : null}
              {b.translated ? (
                <>
                  <i className="cam-box-corner cam-box-corner--ne" aria-hidden="true" />
                  <i className="cam-box-corner cam-box-corner--sw" aria-hidden="true" />
                </>
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

      {resultBox ? (
        <div className="cam-detail" ref={detailRef} aria-label={biPlain(ui.camResults)}>
          <div className="cam-detail-head">
            <h3 className="cam-detail-title">
              <BiText copy={ui.camResults} size="sm" />
            </h3>
            <div className="cam-detail-icons">
              <CopyButton text={copyText} lang={resultLang} />
              {speakText ? <SpeakButton text={speakText} lang={resultLang} /> : null}
            </div>
          </div>
          <button
            type="button"
            className="cam-detail-open"
            onClick={openSelectedDetails}
            aria-label={biPlain(ui.camOpenDetails)}
          >
            {resultBox.text ? <span className="cam-detail-src">{resultBox.text}</span> : null}
            {resultBox.translated ? (
              <span className="cam-detail-tr">{resultBox.translated}</span>
            ) : null}
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
          </div>
        </div>
      ) : null}
    </div>
  )
}
