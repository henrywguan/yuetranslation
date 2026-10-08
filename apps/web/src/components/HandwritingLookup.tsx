import { useCallback, useEffect, useRef, useState } from 'react'
import { useYueStore } from '../lib/store'
import { biPlain, ui } from '../lib/uiCopy'
import { BiText } from './BiText'
import { DetailCollapsible } from './DetailCollapsible'

const PAD_CSS_SIZE = 168
const HAN_RUN = /[\u3400-\u9fff\uf900-\ufaff]+/u

/**
 * Sketch pad + typed lookup for Cantonese Details.
 *
 * There is no recognizer here: browsers do not ship a Han handwriting engine
 * we can rely on (the experimental `HandwritingRecognizer` API is Chromium /
 * ChromeOS-only and has no Cantonese model), and we deliberately do not send
 * the drawing to paid OCR. The canvas is a visual aid; the user types the
 * character they drew and we open its breakdown.
 */
export function HandwritingLookup() {
  const openBreakdown = useYueStore((s) => s.openBreakdown)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const lastRef = useRef<{ x: number; y: number } | null>(null)
  const [hasInk, setHasInk] = useState(false)
  const [query, setQuery] = useState('')

  const paintBackdrop = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const width = canvas.clientWidth || PAD_CSS_SIZE
    const height = canvas.clientHeight || PAD_CSS_SIZE
    ctx.clearRect(0, 0, width, height)
    ctx.save()
    ctx.strokeStyle = 'rgba(154, 240, 222, 0.16)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 6])
    ctx.beginPath()
    ctx.moveTo(width / 2, 6)
    ctx.lineTo(width / 2, height - 6)
    ctx.moveTo(6, height / 2)
    ctx.lineTo(width - 6, height / 2)
    ctx.stroke()
    ctx.restore()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const cssSize = PAD_CSS_SIZE
    canvas.width = cssSize * dpr
    canvas.height = cssSize * dpr
    canvas.style.width = `${cssSize}px`
    canvas.style.height = `${cssSize}px`
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(dpr, dpr)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.lineWidth = 5
      ctx.strokeStyle = '#9af0de'
    }
    paintBackdrop()
  }, [paintBackdrop])

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
    paintBackdrop()
    setHasInk(false)
  }

  const search = () => {
    const match = query.match(HAN_RUN)
    if (!match) return
    openBreakdown([...match[0]].slice(0, 8).join(''), { lang: 'yue' })
  }

  return (
    <DetailCollapsible title={ui.handwriting} className="detail-handwriting" defaultOpen={false}>
      <p className="detail-handwriting-hint muted">
        <BiText copy={ui.handwritingHint} size="sm" hideJp />
      </p>
      <div className="detail-handwriting-pad">
        <canvas
          ref={canvasRef}
          className="detail-handwriting-canvas"
          aria-label={biPlain(ui.handwriting)}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            drawingRef.current = true
            lastRef.current = point(e)
          }}
          onPointerMove={(e) => {
            if (!drawingRef.current) return
            const ctx = e.currentTarget.getContext('2d')
            const from = lastRef.current
            const to = point(e)
            if (!ctx || !from) return
            ctx.beginPath()
            ctx.moveTo(from.x, from.y)
            ctx.lineTo(to.x, to.y)
            ctx.stroke()
            lastRef.current = to
            setHasInk(true)
          }}
          onPointerUp={() => {
            drawingRef.current = false
            lastRef.current = null
          }}
          onPointerCancel={() => {
            drawingRef.current = false
            lastRef.current = null
          }}
        />
        <button
          type="button"
          className="detail-handwriting-clear"
          onClick={clear}
          disabled={!hasInk}
          aria-label={biPlain(ui.handwritingClear)}
          title={biPlain(ui.handwritingClear)}
        >
          <BiText copy={ui.handwritingClear} size="sm" layout="inline" hideJp />
        </button>
      </div>
      <form
        className="detail-handwriting-form"
        onSubmit={(e) => {
          e.preventDefault()
          search()
        }}
      >
        <input
          type="text"
          className="detail-handwriting-input"
          lang="zh-HK"
          value={query}
          maxLength={16}
          placeholder={biPlain(ui.handwritingInput)}
          aria-label={biPlain(ui.handwritingInput)}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="submit"
          className="detail-handwriting-search"
          disabled={!HAN_RUN.test(query)}
        >
          <BiText copy={ui.handwritingSearch} size="sm" layout="inline" hideJp />
        </button>
      </form>
      <p className="detail-handwriting-note muted">
        <BiText copy={ui.handwritingNote} size="sm" hideJp />
      </p>
    </DetailCollapsible>
  )
}
