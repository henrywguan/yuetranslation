import { useEffect, useRef, useState } from 'react'
import { createVHS } from './createVHS'
import {
  VHS_FADE_MS,
  VHS_HANDOFF_FROM,
  VHS_HANDOFF_TO,
  VHS_TRANSITION_MS,
  mixVhsOptions,
  prefersReducedMotion,
} from './vhsEase'

/**
 * Harbor slate drawn into the tape source.
 * The shader samples this bitmap, so iPhone does not need HTML-in-canvas.
 */
export function paintPartnerVhsSlate(
  canvas: HTMLCanvasElement,
  title: string,
  subtitle: string,
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = canvas.width
  const h = canvas.height
  const g = ctx.createLinearGradient(0, 0, w * 0.2, h)
  g.addColorStop(0, '#04140f')
  g.addColorStop(0.48, '#06241c')
  g.addColorStop(1, '#0c3a2e')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  const band = ctx.createLinearGradient(0, h * 0.38, 0, h * 0.64)
  band.addColorStop(0, 'rgba(61, 207, 182, 0)')
  band.addColorStop(0.5, 'rgba(61, 207, 182, 0.2)')
  band.addColorStop(1, 'rgba(61, 207, 182, 0)')
  ctx.fillStyle = band
  ctx.fillRect(0, h * 0.38, w, h * 0.26)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#3dcfb6'
  const kicker = Math.max(22, Math.round(Math.min(w, h) * 0.055))
  ctx.font = `600 ${kicker}px Syne, "Noto Sans HK", sans-serif`
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0.28em'
  ctx.fillText('BEGIN DRILL', w / 2, h * 0.42)

  ctx.fillStyle = '#e8f4ff'
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0em'
  let titleSize = Math.round(Math.min(w, h) * 0.16)
  const titleFont = (size: number) => `700 ${size}px Syne, "Noto Sans HK", sans-serif`
  ctx.font = titleFont(titleSize)
  const maxWidth = w * 0.84
  while (title && ctx.measureText(title).width > maxWidth && titleSize > 28) {
    titleSize -= 2
    ctx.font = titleFont(titleSize)
  }
  ctx.fillText(title, w / 2, h * 0.51)

  if (subtitle) {
    ctx.fillStyle = 'rgba(61, 207, 182, 0.92)'
    const sub = Math.max(24, Math.round(Math.min(w, h) * 0.07))
    ctx.font = `500 ${sub}px "Noto Sans HK", Syne, sans-serif`
    ctx.fillText(subtitle, w / 2, h * 0.6)
  }
}

/**
 * Fullscreen tape handoff. Pointer-events stay off so Begin drill's
 * unlock + startDrill gesture is never swallowed.
 */
export function PartnerVhsTransition({
  title,
  subtitle,
  onDone,
}: {
  title: string
  subtitle: string
  onDone: () => void
}) {
  const sourceRef = useRef<HTMLCanvasElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const outputRef = useRef<HTMLCanvasElement>(null)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const [leaving, setLeaving] = useState(false)
  const reduce = prefersReducedMotion()

  useEffect(() => {
    if (reduce) {
      onDoneRef.current()
      return
    }
    const source = sourceRef.current
    const content = contentRef.current
    const output = outputRef.current
    if (!source || !content || !output) {
      onDoneRef.current()
      return
    }
    const vhs = createVHS(
      {
        source,
        content,
        output,
        paintFrame: (canvas) => paintPartnerVhsSlate(canvas, title, subtitle),
      },
      VHS_HANDOFF_FROM,
    )
    if (!vhs) {
      onDoneRef.current()
      return
    }
    const started = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = (now - started) / VHS_TRANSITION_MS
      vhs.setOptions(mixVhsOptions(VHS_HANDOFF_FROM, VHS_HANDOFF_TO, Math.min(1, t)))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const fadeTimer = window.setTimeout(() => setLeaving(true), VHS_TRANSITION_MS - VHS_FADE_MS)
    const doneTimer = window.setTimeout(() => onDoneRef.current(), VHS_TRANSITION_MS)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(fadeTimer)
      window.clearTimeout(doneTimer)
      vhs.destroy()
    }
  }, [reduce, subtitle, title])

  if (reduce) return null

  return (
    <div className={`partner-vhs${leaving ? ' is-leaving' : ''}`} aria-hidden="true">
      <canvas ref={sourceRef} className="partner-vhs-source" />
      <div ref={contentRef} className="partner-vhs-content" />
      <canvas ref={outputRef} className="partner-vhs-output" />
    </div>
  )
}
