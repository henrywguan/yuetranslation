import type { CameraBox } from '../api'

export type Handle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | 'move'

const HANDLE_PAD = 0.028

export function pointInBox(px: number, py: number, box: CameraBox): boolean {
  return px >= box.x && px <= box.x + box.w && py >= box.y && py <= box.y + box.h
}

export function hitTest(px: number, py: number, box: CameraBox): Handle | null {
  const { x, y, w, h } = box
  const x2 = x + w
  const y2 = y + h
  const pad = HANDLE_PAD
  const near = (a: number, b: number) => Math.abs(a - b) <= pad

  if (near(px, x) && near(py, y)) return 'nw'
  if (near(px, x2) && near(py, y)) return 'ne'
  if (near(px, x) && near(py, y2)) return 'sw'
  if (near(px, x2) && near(py, y2)) return 'se'
  if (near(px, x) && py >= y && py <= y2) return 'w'
  if (near(px, x2) && py >= y && py <= y2) return 'e'
  if (near(py, y) && px >= x && px <= x2) return 'n'
  if (near(py, y2) && px >= x && px <= x2) return 's'
  if (pointInBox(px, py, box)) return 'move'
  return null
}

export function applyHandle(
  box: CameraBox,
  handle: Handle,
  dx: number,
  dy: number,
): CameraBox {
  let { x, y, w, h } = box
  if (handle === 'move') {
    x += dx
    y += dy
  } else {
    if (handle.includes('w')) {
      const nx = x + dx
      const nw = w - dx
      if (nw >= 0.02) {
        x = nx
        w = nw
      }
    }
    if (handle.includes('e')) {
      w += dx
    }
    if (handle.includes('n')) {
      const ny = y + dy
      const nh = h - dy
      if (nh >= 0.02) {
        y = ny
        h = nh
      }
    }
    if (handle.includes('s')) {
      h += dy
    }
  }
  x = Math.min(0.98, Math.max(0, x))
  y = Math.min(0.98, Math.max(0, y))
  w = Math.min(1 - x, Math.max(0.02, w))
  h = Math.min(1 - y, Math.max(0.02, h))
  return { x, y, w, h }
}

/** Capture a video frame or image element as a JPEG data URL (downscaled). */
export function captureFrame(
  source: HTMLVideoElement | HTMLImageElement,
  maxEdge = 1280,
  quality = 0.72,
): string {
  const sw =
    'videoWidth' in source ? source.videoWidth || source.clientWidth : source.naturalWidth
  const sh =
    'videoHeight' in source ? source.videoHeight || source.clientHeight : source.naturalHeight
  if (!sw || !sh) return ''
  const scale = Math.min(1, maxEdge / Math.max(sw, sh))
  const w = Math.max(1, Math.round(sw * scale))
  const h = Math.max(1, Math.round(sh * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.drawImage(source, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', quality)
}

/** Simple frame-difference score 0–1 (higher = more change). */
export function frameChangeScore(
  prev: ImageData | null,
  next: ImageData,
): { score: number; data: ImageData } {
  if (!prev || prev.width !== next.width || prev.height !== next.height) {
    return { score: 1, data: next }
  }
  const a = prev.data
  const b = next.data
  let diff = 0
  const step = 16 * 4
  for (let i = 0; i < a.length; i += step) {
    diff += Math.abs(a[i]! - b[i]!) + Math.abs(a[i + 1]! - b[i + 1]!) + Math.abs(a[i + 2]! - b[i + 2]!)
  }
  const samples = Math.ceil(a.length / step)
  const score = Math.min(1, diff / (samples * 255 * 3))
  return { score, data: next }
}

export function sampleVideoImageData(video: HTMLVideoElement, size = 64): ImageData | null {
  const sw = video.videoWidth
  const sh = video.videoHeight
  if (!sw || !sh) return null
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(video, 0, 0, size, size)
  return ctx.getImageData(0, 0, size, size)
}

/** Optical-flow-lite: shift boxes by average motion between tiny frames. */
export function estimateShift(
  prev: ImageData | null,
  next: ImageData | null,
): { dx: number; dy: number } {
  if (!prev || !next || prev.width !== next.width) return { dx: 0, dy: 0 }
  // Block-match center patch — coarse but cheap for overlay stickiness.
  const w = prev.width
  const h = prev.height
  const cx = Math.floor(w / 2)
  const cy = Math.floor(h / 2)
  const patch = 8
  let best = Infinity
  let bestDx = 0
  let bestDy = 0
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      let err = 0
      for (let y = -patch; y <= patch; y++) {
        for (let x = -patch; x <= patch; x++) {
          const sx = cx + x
          const sy = cy + y
          const tx = sx + dx
          const ty = sy + dy
          if (sx < 0 || sy < 0 || sx >= w || sy >= h || tx < 0 || ty < 0 || tx >= w || ty >= h) {
            err += 40
            continue
          }
          const si = (sy * w + sx) * 4
          const ti = (ty * w + tx) * 4
          err += Math.abs(prev.data[si]! - next.data[ti]!)
        }
      }
      if (err < best) {
        best = err
        bestDx = dx
        bestDy = dy
      }
    }
  }
  return { dx: bestDx / w, dy: bestDy / h }
}

/** How an image/video is laid out inside a frame with object-fit: cover|contain. */
export type MediaFitLayout = {
  offsetX: number
  offsetY: number
  dispW: number
  dispH: number
}

export function mediaFitLayout(
  frameW: number,
  frameH: number,
  mediaW: number,
  mediaH: number,
  mode: 'cover' | 'contain' = 'contain',
): MediaFitLayout {
  if (!frameW || !frameH || !mediaW || !mediaH) {
    return { offsetX: 0, offsetY: 0, dispW: frameW || 0, dispH: frameH || 0 }
  }
  const scale =
    mode === 'cover'
      ? Math.max(frameW / mediaW, frameH / mediaH)
      : Math.min(frameW / mediaW, frameH / mediaH)
  const dispW = mediaW * scale
  const dispH = mediaH * scale
  return {
    offsetX: (frameW - dispW) / 2,
    offsetY: (frameH - dispH) / 2,
    dispW,
    dispH,
  }
}

/** Image-normalized (0–1) → frame pixels for a cover/contain layout. */
export function normToFitPx(
  nx: number,
  ny: number,
  layout: MediaFitLayout,
): { x: number; y: number } {
  return {
    x: layout.offsetX + nx * layout.dispW,
    y: layout.offsetY + ny * layout.dispH,
  }
}

/** Frame client point → image-normalized (0–1), or null if outside the media. */
export function clientToNormOnFit(
  clientX: number,
  clientY: number,
  frameRect: DOMRect,
  layout: MediaFitLayout,
): { x: number; y: number } | null {
  const lx = clientX - frameRect.left
  const ly = clientY - frameRect.top
  if (layout.dispW <= 0 || layout.dispH <= 0) return null
  const x = (lx - layout.offsetX) / layout.dispW
  const y = (ly - layout.offsetY) / layout.dispH
  if (x < 0 || y < 0 || x > 1 || y > 1) return null
  return { x, y }
}
