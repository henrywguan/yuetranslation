import { useCallback, useEffect, useRef, useState } from 'react'
import { BiText } from './BiText'
import { cameraScan } from '../lib/api'
import { captureFrame, estimateShift, sampleVideoImageData } from '../lib/camera/geometry'
import { regionToEditable, type CameraTarget, type EditableBox } from '../lib/camera/types'
import { cameraBlockedMessage, stopMediaStream, unlockCamera } from '../lib/mediaAccess'
import { useYueStore } from '../lib/store'
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

export function CameraArSession({ target, onTargetChange, onBack, onEntitlement, meter }: Props) {
  const speakManual = useYueStore((s) => s.speakManual)
  const videoRef = useRef<HTMLVideoElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const boxesRef = useRef<EditableBox[]>([])
  const hitsRef = useRef<HitRect[]>([])
  const prevSample = useRef<ImageData | null>(null)
  const scanning = useRef(false)
  const [boxes, setBoxes] = useState<EditableBox[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    boxesRef.current = boxes
  }, [boxes])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const paintOverlay = useCallback(() => {
    const video = videoRef.current
    const canvas = overlayRef.current
    if (!video || !canvas) return
    const w = video.clientWidth
    const h = video.clientHeight
    if (!w || !h) return
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, w, h)
    const hits: HitRect[] = []

    for (const b of boxesRef.current) {
      const ox = b.box.x * w
      const oy = b.box.y * h
      const obw = Math.max(8, b.box.w * w)
      const obh = Math.max(8, b.box.h * h)
      const label = b.translated || b.text
      const pad = 6
      let fontSize = Math.max(12, Math.min(24, obh * 0.7))
      let textW = 0
      let drawW = obw
      let drawX = ox
      const selected = b.id === selectedId

      if (label) {
        const minFont = 10
        for (; fontSize >= minFont; fontSize -= 0.5) {
          ctx.font = `600 ${fontSize}px "Noto Sans TC", "PingFang TC", sans-serif`
          textW = ctx.measureText(label).width
          if (textW + pad * 2 <= Math.max(obw, w * 0.95)) break
        }
        ctx.font = `600 ${fontSize}px "Noto Sans TC", "PingFang TC", sans-serif`
        textW = ctx.measureText(label).width
        drawW = Math.min(w, Math.max(obw, textW + pad * 2))
        drawX = ox
        if (drawX + drawW > w) drawX = Math.max(0, w - drawW)
      }

      const drawH = Math.max(obh, label ? fontSize + pad * 2 : obh)
      const drawY = Math.min(oy, Math.max(0, h - drawH))

      ctx.fillStyle = selected ? 'rgba(8, 36, 32, 0.88)' : 'rgba(8, 24, 36, 0.78)'
      ctx.fillRect(drawX, drawY, drawW, drawH)
      ctx.strokeStyle = selected ? 'rgba(120, 230, 190, 1)' : 'rgba(62, 196, 160, 0.85)'
      ctx.lineWidth = selected ? 2.25 : 1.5
      ctx.strokeRect(drawX, drawY, drawW, drawH)

      hits.push({
        id: b.id,
        x: drawX / w,
        y: drawY / h,
        w: drawW / w,
        h: drawH / h,
      })

      if (!label) continue
      ctx.fillStyle = '#e8fff6'
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'left'
      ctx.font = `600 ${fontSize}px "Noto Sans TC", "PingFang TC", sans-serif`
      ctx.fillText(label, drawX + pad, drawY + drawH / 2, Math.max(8, drawW - pad * 2))
    }

    hitsRef.current = hits
  }, [selectedId])

  useEffect(() => {
    paintOverlay()
  }, [boxes, paintOverlay, selectedId])

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
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        await video.play().catch(() => undefined)
      }
      meter.start()
    })()

    return () => {
      cancelled = true
      void meter.stop()
      stopMediaStream(streamRef.current)
      streamRef.current = null
    }
  }, [meter])

  // Track existing overlays with the camera — no Vision calls.
  useEffect(() => {
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const video = videoRef.current
      if (!video || video.readyState < 2) {
        paintOverlay()
        return
      }
      if (boxesRef.current.length) {
        const sample = sampleVideoImageData(video, 48)
        if (sample) {
          const shift = estimateShift(prevSample.current, sample)
          prevSample.current = sample
          if (Math.abs(shift.dx) + Math.abs(shift.dy) > 0.002) {
            boxesRef.current = boxesRef.current.map((b) => ({
              ...b,
              box: {
                x: Math.min(0.98, Math.max(0, b.box.x + shift.dx)),
                y: Math.min(0.98, Math.max(0, b.box.y + shift.dy)),
                w: b.box.w,
                h: b.box.h,
              },
            }))
            setBoxes([...boxesRef.current])
          }
        }
      } else {
        prevSample.current = null
      }
      paintOverlay()
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [paintOverlay])

  const runCapture = async () => {
    const video = videoRef.current
    if (!video || scanning.current) return
    scanning.current = true
    setBusy(true)
    setError(null)
    setSelectedId(null)
    try {
      const image = captureFrame(video, 1280, 0.72)
      if (!image) throw new Error('Could not capture frame')
      const result = await cameraScan({
        image,
        target: target === 'auto' ? undefined : target,
      })
      if (result.entitlement) onEntitlement(result.entitlement)
      const next = result.regions.map(regionToEditable)
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
    setBoxes([])
    setSelectedId(null)
    setError(null)
    paintOverlay()
  }

  const selected = boxes.find((b) => b.id === selectedId) || null

  return (
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
            ['zh', ui.camTargetZh],
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

      <div className="cam-ar-frame cam-ar-frame--fs">
        <video ref={videoRef} className="cam-video" playsInline muted autoPlay />
        <canvas
          ref={overlayRef}
          className="cam-overlay-canvas"
          onClick={(e) => {
            const canvas = overlayRef.current
            if (!canvas) return
            const r = canvas.getBoundingClientRect()
            const x = (e.clientX - r.left) / r.width
            const y = (e.clientY - r.top) / r.height
            const hit = [...hitsRef.current].reverse().find(
              (b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h,
            )
            setSelectedId(hit?.id || null)
          }}
        />
      </div>

      {busy ? (
        <div className="cam-ar-busy" role="status">
          <BiText copy={ui.camScanning} size="sm" />
        </div>
      ) : null}

      {error ? (
        <p className="cam-ar-toast cam-ar-toast--error" role="alert">
          {error}
        </p>
      ) : null}

      {!busy && !boxes.length && !error ? (
        <p className="cam-ar-toast">
          <BiText copy={ui.camCaptureHint} size="sm" />
        </p>
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
            disabled={busy || boxes.length === 0}
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

      {selected ? (
        <div className="cam-ar-sheet" role="region" aria-label={biPlain(ui.camDetailTitle)}>
          <button
            type="button"
            className="cam-ar-sheet-close"
            onClick={() => setSelectedId(null)}
            aria-label={biPlain(ui.camChoiceClose)}
          >
            ×
          </button>
          {selected.text ? <p className="cam-detail-src">{selected.text}</p> : null}
          {selected.translated ? <p className="cam-detail-tr">{selected.translated}</p> : null}
          <div className="cam-detail-actions">
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
