/** Shared media layout + frame capture helpers for Cam AR / upload. */

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

/** Decode a data URL and return its intrinsic pixel size (what OCR boxes are normalized to). */
export function decodeDataUrlSize(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => reject(new Error('Could not decode capture'))
    img.src = dataUrl
  })
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
