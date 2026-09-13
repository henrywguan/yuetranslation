import type { JyutTone } from './jyutping'
import { decodeChaoToneGlyph } from './chaoToneCipher'

/**
 * Layer 2 — paint Chao glyphs onto canvas so the DOM has no Chao text nodes.
 * Imported separately from the cipher so the mapping and the painter stay split
 * in source (and can land in different Vite chunks when dynamically imported).
 */

const FONT =
  '600 64px "Noto Sans", "Noto Sans HK", system-ui, sans-serif'

const dataUrlCache = new Map<string, string>()

function cacheKey(tone: JyutTone, cssColor: string, width: number, height: number) {
  return `${tone}|${cssColor}|${width}x${height}`
}

/** Rasterize one Chao tone contour with Noto Sans (same look as Unicode ruby). */
export function paintChaoToneDataUrl(
  tone: JyutTone,
  cssColor: string,
  cssWidthPx: number,
  cssHeightPx: number,
): string {
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 3) : 1
  const w = Math.max(1, Math.ceil(cssWidthPx * dpr))
  const h = Math.max(1, Math.ceil(cssHeightPx * dpr))
  const key = cacheKey(tone, cssColor, w, h)
  const hit = dataUrlCache.get(key)
  if (hit) return hit

  const glyph = decodeChaoToneGlyph(tone)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, cssWidthPx, cssHeightPx)
  ctx.fillStyle = cssColor
  ctx.font = FONT
  // Scale the 64px design font into the CSS box.
  const scale = cssHeightPx / 64
  ctx.translate(cssWidthPx / 2, cssHeightPx / 2 + cssHeightPx * 0.06)
  ctx.scale(scale, scale)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(glyph, 0, 0)

  const url = canvas.toDataURL('image/png')
  dataUrlCache.set(key, url)
  if (dataUrlCache.size > 64) {
    const oldest = dataUrlCache.keys().next().value
    if (oldest !== undefined) dataUrlCache.delete(oldest)
  }
  return url
}

/** Clear paint cache (tests / theme swaps). */
export function clearChaoTonePaintCache() {
  dataUrlCache.clear()
}
