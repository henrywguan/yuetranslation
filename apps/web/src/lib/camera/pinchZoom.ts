/** Pinch + pan transform helpers for the frozen AR still. */

export type ZoomTransform = { scale: number; x: number; y: number }

export const ZOOM_MIN = 1
export const ZOOM_MAX = 4

export function clampZoom(scale: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, scale))
}

export function touchDistance(a: Touch, b: Touch): number {
  const dx = a.clientX - b.clientX
  const dy = a.clientY - b.clientY
  return Math.hypot(dx, dy)
}

export function touchMidpoint(a: Touch, b: Touch): { x: number; y: number } {
  return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 }
}

/** Keep translation sane as scale changes so the image doesn’t drift too far. */
export function clampPan(
  t: ZoomTransform,
  frameW: number,
  frameH: number,
): ZoomTransform {
  const scale = clampZoom(t.scale)
  if (scale <= 1.01) return { scale: 1, x: 0, y: 0 }
  const maxX = ((scale - 1) * frameW) / 2
  const maxY = ((scale - 1) * frameH) / 2
  return {
    scale,
    x: Math.min(maxX, Math.max(-maxX, t.x)),
    y: Math.min(maxY, Math.max(-maxY, t.y)),
  }
}
