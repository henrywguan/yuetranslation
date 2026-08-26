/** Shared canvas helpers for Cam OCR overlays — glass panels + corner brackets. */

export function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

export function drawGlassPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { selected: boolean; radius?: number },
) {
  const radius = opts.radius ?? Math.min(12, h * 0.28)
  const selected = opts.selected

  ctx.save()
  ctx.shadowColor = selected ? 'rgba(61, 207, 182, 0.35)' : 'rgba(0, 0, 0, 0.4)'
  ctx.shadowBlur = selected ? 18 : 14
  ctx.shadowOffsetY = 4

  roundedRectPath(ctx, x, y, w, h, radius)
  const fill = ctx.createLinearGradient(x, y, x, y + h)
  if (selected) {
    fill.addColorStop(0, 'rgba(14, 52, 46, 0.88)')
    fill.addColorStop(0.55, 'rgba(8, 36, 40, 0.9)')
    fill.addColorStop(1, 'rgba(5, 22, 28, 0.92)')
  } else {
    fill.addColorStop(0, 'rgba(10, 36, 46, 0.78)')
    fill.addColorStop(0.55, 'rgba(6, 24, 34, 0.84)')
    fill.addColorStop(1, 'rgba(4, 16, 24, 0.88)')
  }
  ctx.fillStyle = fill
  ctx.fill()
  ctx.restore()

  // Hairline rim
  ctx.save()
  roundedRectPath(ctx, x + 0.5, y + 0.5, w - 1, h - 1, Math.max(0, radius - 0.5))
  ctx.strokeStyle = selected ? 'rgba(126, 240, 220, 0.55)' : 'rgba(232, 255, 246, 0.16)'
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.restore()

  // Top sheen
  ctx.save()
  roundedRectPath(ctx, x + 1, y + 1, w - 2, Math.max(2, h * 0.38), Math.max(0, radius - 1))
  const sheen = ctx.createLinearGradient(x, y, x, y + h * 0.4)
  sheen.addColorStop(0, 'rgba(232, 255, 246, 0.14)')
  sheen.addColorStop(1, 'rgba(232, 255, 246, 0)')
  ctx.fillStyle = sheen
  ctx.fill()
  ctx.restore()
}

export function drawCornerBrackets(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { selected: boolean; pulse?: number },
) {
  const len = Math.max(10, Math.min(22, Math.min(w, h) * 0.28))
  const inset = 3
  const pulse = opts.pulse ?? 1
  const alpha = (opts.selected ? 0.95 : 0.72) * pulse
  ctx.save()
  ctx.strokeStyle = opts.selected
    ? `rgba(126, 240, 220, ${alpha})`
    : `rgba(61, 207, 182, ${alpha})`
  ctx.lineWidth = opts.selected ? 2.1 : 1.65
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  const corners: Array<[number, number, number, number, number, number]> = [
    [x + inset, y + inset + len, x + inset, y + inset, x + inset + len, y + inset],
    [x + w - inset - len, y + inset, x + w - inset, y + inset, x + w - inset, y + inset + len],
    [x + inset, y + h - inset - len, x + inset, y + h - inset, x + inset + len, y + h - inset],
    [
      x + w - inset - len,
      y + h - inset,
      x + w - inset,
      y + h - inset,
      x + w - inset,
      y + h - inset - len,
    ],
  ]
  for (const [x0, y0, x1, y1, x2, y2] of corners) {
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }
  ctx.restore()
}

export function drawOverlayLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  opts: { selected: boolean; shimmer?: number },
) {
  const family = '"Syne", "Noto Sans HK", "Noto Sans TC", "PingFang TC", sans-serif'
  ctx.save()
  ctx.font = `650 ${fontSize}px ${family}`
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  if ('letterSpacing' in ctx) {
    ;(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '-0.015em'
  }

  // Soft depth under glyphs
  ctx.fillStyle = 'rgba(4, 16, 24, 0.55)'
  ctx.fillText(text, x + 0.6, y + 0.8, maxWidth)

  const shimmer = opts.shimmer ?? 0
  if (opts.selected || shimmer > 0.02) {
    const grad = ctx.createLinearGradient(x - 20, y, x + maxWidth + 40, y)
    const t = shimmer
    grad.addColorStop(Math.max(0, t - 0.18), '#e8fff6')
    grad.addColorStop(t, '#9af0de')
    grad.addColorStop(Math.min(1, t + 0.18), '#e8fff8')
    ctx.fillStyle = grad
  } else {
    ctx.fillStyle = '#e8fff6'
  }
  ctx.fillText(text, x, y, maxWidth)
  ctx.restore()
}

export function measureOverlayLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontSize: number,
): number {
  const family = '"Syne", "Noto Sans HK", "Noto Sans TC", "PingFang TC", sans-serif'
  ctx.font = `650 ${fontSize}px ${family}`
  if ('letterSpacing' in ctx) {
    ;(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '-0.015em'
  }
  return ctx.measureText(text).width
}

/**
 * Google Translate–style cover: opaque fill matching the source background,
 * then translation ink in the sampled (or contrast) foreground color.
 */
export function drawMatchedPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { bg: string; selected: boolean; radius?: number },
) {
  const radius = opts.radius ?? Math.min(4, h * 0.12)
  ctx.save()
  roundedRectPath(ctx, x, y, w, h, radius)
  ctx.fillStyle = opts.bg
  ctx.fill()
  if (opts.selected) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)'
    ctx.lineWidth = 1.5
    ctx.stroke()
    roundedRectPath(ctx, x + 1.25, y + 1.25, w - 2.5, h - 2.5, Math.max(0, radius - 1))
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)'
    ctx.lineWidth = 1
    ctx.stroke()
  }
  ctx.restore()
}

export function drawMatchedLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  opts: { fg: string },
) {
  const family = '"Noto Sans HK", "Noto Sans TC", "PingFang TC", "Syne", sans-serif'
  ctx.save()
  ctx.font = `600 ${fontSize}px ${family}`
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  if ('letterSpacing' in ctx) {
    ;(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '-0.01em'
  }
  ctx.fillStyle = opts.fg
  ctx.fillText(text, x, y, maxWidth)
  ctx.restore()
}
