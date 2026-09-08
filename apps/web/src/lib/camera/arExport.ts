import { downloadBase64File } from '../docsApi'
import {
  centeredLabelX,
  drawGlassPanel,
  drawMatchedLabel,
  drawMatchedPanel,
  drawOverlayLabel,
  measureOverlayLabel,
} from './overlayPaint'
import { rgbCss } from './sampleRegionColors'
import type { EditableBox } from './types'
import { unwrapTranslationText } from './unwrapTranslation'

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load snapshot image'))
    img.src = url
  })
}

/** Translations ordered top→bottom (then left→right) for clipboard export. */
export function translationsTopToBottom(boxes: EditableBox[]): string {
  const lines = [...boxes]
    .sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x)
    .map((b) => unwrapTranslationText(b.translated || b.text).trim())
    .filter(Boolean)
  return lines.join('\n')
}

/**
 * Composite the frozen still + matched AR overlays at full image resolution
 * (no zoom / selection chrome) and trigger a JPEG download.
 */
export async function saveArSnapshot(stillUrl: string, boxes: EditableBox[]): Promise<void> {
  const img = await loadImage(stillUrl)
  const w = img.naturalWidth || img.width
  const h = img.naturalHeight || img.height
  if (!w || !h) throw new Error('Snapshot has no dimensions')

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not create canvas')

  ctx.drawImage(img, 0, 0, w, h)

  for (const b of boxes) {
    const ox = b.box.x * w
    const oy = b.box.y * h
    const obw = Math.max(8, b.box.w * w)
    const obh = Math.max(8, b.box.h * h)
    const label = unwrapTranslationText(b.translated || b.text)
    const matched = Boolean(b.bg && b.fg)

    const inflateX = obw * 0.05
    const inflateY = obh * 0.1
    const panelX = ox - inflateX
    const panelY = oy - inflateY
    const panelW = Math.max(8, obw + inflateX * 2)
    const panelH = Math.max(8, obh + inflateY * 2)

    const padX = Math.max(4, panelW * 0.04)
    let fontSize = Math.max(11, Math.min(64, panelH * 0.78))
    if (label) {
      for (; fontSize >= 9; fontSize -= 0.5) {
        const textW = measureOverlayLabel(ctx, label, fontSize)
        if (textW + padX * 2 <= panelW) break
      }
    }
    const labelW = label ? measureOverlayLabel(ctx, label, fontSize) : 0

    if (!label) continue

    if (matched && b.bg && b.fg) {
      drawMatchedPanel(ctx, panelX, panelY, panelW, panelH, {
        bg: rgbCss(b.bg),
        selected: false,
      })
      drawMatchedLabel(
        ctx,
        label,
        centeredLabelX(panelX, panelW, padX, labelW),
        panelY + panelH / 2,
        Math.max(8, panelW - padX * 2),
        fontSize,
        { fg: rgbCss(b.fg) },
      )
    } else {
      // Fallback so saved photos still show translations when color sampling missed.
      drawGlassPanel(ctx, panelX, panelY, panelW, panelH, { selected: false })
      drawOverlayLabel(
        ctx,
        label,
        centeredLabelX(panelX, panelW, padX, labelW),
        panelY + panelH / 2,
        Math.max(8, panelW - padX * 2),
        fontSize,
        { selected: false },
      )
    }
  }

  const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
  const comma = dataUrl.indexOf(',')
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  downloadBase64File(`jyuttranslate-ar-${stamp}.jpg`, 'image/jpeg', base64)
}
