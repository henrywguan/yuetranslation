import { useCallback, useEffect, useRef, useState } from 'react'
import { BiText } from './BiText'
import { cameraScan } from '../lib/api'
import {
  captureFrame,
  estimateShift,
  frameChangeScore,
  sampleVideoImageData,
} from '../lib/camera/geometry'
import { regionToEditable, type CameraTarget, type EditableBox } from '../lib/camera/types'
import { cameraBlockedMessage, stopMediaStream, unlockCamera } from '../lib/mediaAccess'
import { useYueStore } from '../lib/store'
import { ui } from '../lib/uiCopy'
import type { Entitlement } from '../lib/types'

type Props = {
  target: CameraTarget
  onBack: () => void
  onEntitlement: (ent: Entitlement) => void
  meter: {
    start: () => void
    stop: () => Promise<void>
    pause: () => Promise<void>
    resume: () => void
  }
}

export function CameraArSession({ target, onBack, onEntitlement, meter }: Props) {
  const speakManual = useYueStore((s) => s.speakManual)
  const videoRef = useRef<HTMLVideoElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const boxesRef = useRef<EditableBox[]>([])
  const prevSample = useRef<ImageData | null>(null)
  const scanning = useRef(false)
  const [paused, setPaused] = useState(false)
  const [boxes, setBoxes] = useState<EditableBox[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const pausedRef = useRef(false)

  useEffect(() => {
    boxesRef.current = boxes
  }, [boxes])

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

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
    for (const b of boxesRef.current) {
      const ox = b.box.x * w
      const oy = b.box.y * h
      const obw = b.box.w * w
      const obh = b.box.h * h
      const label = b.translated || b.text
      const pad = 6
      let fontSize = Math.max(12, Math.min(24, obh * 0.7))
      let textW = 0
      let drawW = obw
      let drawX = ox

      if (label) {
        // Fit the whole translation on one line: shrink font, then widen the cover.
        const minFont = 10
        for (; fontSize >= minFont; fontSize -= 0.5) {
          ctx.font = `600 ${fontSize}px "Noto Sans TC", "PingFang TC", sans-serif`
          textW = ctx.measureText(label).width
          if (textW + pad * 2 <= Math.max(obw, w * 0.95)) break
        }
        ctx.font = `600 ${fontSize}px "Noto Sans TC", "PingFang TC", sans-serif`
        textW = ctx.measureText(label).width
        drawW = Math.min(w, Math.max(obw, textW + pad * 2))
        // Prefer expanding right; clamp to frame, spill left if needed.
        drawX = ox
        if (drawX + drawW > w) drawX = Math.max(0, w - drawW)
      }

      const drawH = Math.max(obh, label ? fontSize + pad * 2 : obh)
      const drawY = Math.min(oy, Math.max(0, h - drawH))

      // Cover original (may be wider than OCR box so text stays one line)
      ctx.fillStyle = 'rgba(8, 24, 36, 0.78)'
      ctx.fillRect(drawX, drawY, drawW, drawH)
      ctx.strokeStyle = 'rgba(62, 196, 160, 0.85)'
      ctx.lineWidth = 1.5
      ctx.strokeRect(drawX, drawY, drawW, drawH)
      if (!label) continue
      ctx.fillStyle = '#e8fff6'
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'left'
      ctx.font = `600 ${fontSize}px "Noto Sans TC", "PingFang TC", sans-serif`
      // Always one line; compress only if still wider than the frame.
      ctx.fillText(label, drawX + pad, drawY + drawH / 2, Math.max(8, drawW - pad * 2))
    }
  }, [])

  useEffect(() => {
    paintOverlay()
  }, [boxes, paintOverlay])

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

  // Live sample loop
  useEffect(() => {
    let raf = 0
    let lastScan = 0

    const tick = async (now: number) => {
      raf = requestAnimationFrame(tick)
      if (pausedRef.current) return
      const video = videoRef.current
      if (!video || video.readyState < 2) return

      const sample = sampleVideoImageData(video, 48)
      if (sample) {
        const shift = estimateShift(prevSample.current, sample)
        if (Math.abs(shift.dx) + Math.abs(shift.dy) > 0.002 && boxesRef.current.length) {
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
        const { score, data } = frameChangeScore(prevSample.current, sample)
        prevSample.current = data

        const due = now - lastScan > 900
        const changed = score > 0.04
        if (due && changed && !scanning.current) {
          lastScan = now
          scanning.current = true
          setBusy(true)
          try {
            const image = captureFrame(video, 960, 0.65)
            if (image) {
              const result = await cameraScan({
                image,
                target: target === 'auto' ? undefined : target,
              })
              if (result.entitlement) onEntitlement(result.entitlement)
              if (!pausedRef.current) {
                setBoxes(result.regions.map(regionToEditable))
              }
            }
          } catch (e) {
            const err = e as { message?: string; entitlement?: Entitlement }
            if (err.entitlement) onEntitlement(err.entitlement)
            if (err.message) setError(err.message)
          } finally {
            scanning.current = false
            setBusy(false)
          }
        }
      }
      paintOverlay()
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [meter, onEntitlement, paintOverlay, target])

  const selected = boxes.find((b) => b.id === selectedId) || null

  const saveSnapshot = () => {
    const video = videoRef.current
    const overlay = overlayRef.current
    if (!video) return
    const w = video.videoWidth || video.clientWidth
    const h = video.videoHeight || video.clientHeight
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, w, h)
    if (overlay) ctx.drawImage(overlay, 0, 0, w, h)
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/jpeg', 0.92)
    a.download = `jyut-camera-${Date.now()}.jpg`
    a.click()
  }

  return (
    <div className="cam-session cam-session--ar">
      <div className="cam-toolbar">
        <button type="button" className="cam-tool-btn" onClick={onBack}>
          <BiText copy={ui.camBack} size="sm" />
        </button>
        <button
          type="button"
          className="cam-tool-btn"
          onClick={() => {
            if (paused) {
              setPaused(false)
              meter.resume()
            } else {
              setPaused(true)
              void meter.pause()
            }
          }}
        >
          <BiText copy={paused ? ui.camResume : ui.camPause} size="sm" />
        </button>
        <button type="button" className="cam-tool-btn" onClick={saveSnapshot}>
          <BiText copy={ui.camSaveSnapshot} size="sm" />
        </button>
        {busy ? (
          <span className="cam-busy">
            <BiText copy={ui.camScanning} size="sm" />
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="cam-hint cam-hint--error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="cam-ar-frame">
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
            const hit = [...boxes].reverse().find(
              (b) =>
                x >= b.box.x &&
                x <= b.box.x + b.box.w &&
                y >= b.box.y &&
                y <= b.box.y + b.box.h,
            )
            setSelectedId(hit?.id || null)
          }}
        />
      </div>

      {selected ? (
        <div className="cam-detail">
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