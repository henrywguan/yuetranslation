/**
 * PDF hybrid C+B:
 * - C: extract text items + positions when the page has a text layer
 * - B: always rasterize the page as the visual base; paint translations on top
 * - Scanned pages (sparse text): Azure Vision via /camera/scan, then paint overlays
 */
import { PDFDocument } from 'pdf-lib'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { cameraScan } from './api'
import { commitDocPages, translateDocSegments, type DocLang } from './docsApi'
import { groupTextItemsIntoLines, clampInkWidth, type PdfTextItem } from './pdfTextLayout'
import type { Entitlement } from './types'

export type PdfProgressPhase = 'reading' | 'translating' | 'ocr' | 'saving'
export type PdfProgress = (phase: PdfProgressPhase, page: number, total: number) => void

type TextItem = PdfTextItem

const TEXT_CHAR_THRESHOLD = 24
const MAX_SEGMENTS = 80
const FONT_FAMILY = '"Noto Sans HK", "Noto Sans TC", "PingFang TC", "Segoe UI", sans-serif'

async function loadPdfJs() {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc
  return pdfjs
}

/** Exact page count for quota pre-check (no translation). */
export async function getPdfPageCount(file: File): Promise<number> {
  const pdfjs = await loadPdfJs()
  const data = new Uint8Array(await file.arrayBuffer())
  const pdf = await pdfjs.getDocument({ data }).promise
  return pdf.numPages
}

/** Group PDF.js glyph runs into reading lines (same baseline band). */
export { groupTextItemsIntoLines } from './pdfTextLayout'

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (!words.length) return []
  // CJK often has no spaces — break by measure.
  if (words.length === 1 && words[0]!.length > 1 && ctx.measureText(words[0]!).width > maxW) {
    const chars = [...words[0]!]
    const lines: string[] = []
    let cur = ''
    for (const ch of chars) {
      const next = cur + ch
      if (cur && ctx.measureText(next).width > maxW) {
        lines.push(cur)
        cur = ch
      } else cur = next
    }
    if (cur) lines.push(cur)
    return lines
  }
  const lines: string[] = []
  let cur = ''
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word
    if (cur && ctx.measureText(next).width > maxW) {
      lines.push(cur)
      cur = word
    } else cur = next
  }
  if (cur) lines.push(cur)
  return lines
}

/**
 * Cover source glyphs and paint translation sized to the source line height.
 * Shrinks / wraps only when the translated string is wider than the box.
 */
export function paintTranslations(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  items: Array<{ x: number; y: number; w: number; h: number; translated: string }>,
) {
  for (const it of items) {
    const translated = it.translated.trim()
    if (!translated) continue
    const x = it.x * canvas.width
    const y = it.y * canvas.height
    const w = Math.max(10, Math.min(it.w, 1 - it.x - 0.005) * canvas.width)
    const h = Math.max(10, it.h * canvas.height)

    // Match source line height — previous 28px cap made headings unreadable.
    let fontSize = Math.max(9, h * 0.88)
    const padX = Math.max(2, Math.min(6, h * 0.08))
    const maxW = Math.max(8, w - padX * 2)
    ctx.textBaseline = 'top'
    ctx.textAlign = 'left'

    let lines: string[] = [translated]
    for (; fontSize >= 9; fontSize -= 0.5) {
      ctx.font = `600 ${fontSize}px ${FONT_FAMILY}`
      lines = wrapLines(ctx, translated, maxW)
      const lineH = fontSize * 1.15
      const fitsHeight = lines.length * lineH <= h * 1.2
      const fitsWidth =
        lines.length === 1 ? ctx.measureText(lines[0]!).width <= maxW + 0.5 : true
      if (fitsHeight && fitsWidth) break
    }
    ctx.font = `600 ${fontSize}px ${FONT_FAMILY}`
    lines = wrapLines(ctx, translated, maxW)
    const lineH = fontSize * 1.15
    const lineWidths = lines.map((line) => ctx.measureText(line).width)
    const textW = lineWidths.length ? Math.max(...lineWidths) : 0
    // Mask full source ink box; grow only when translation is wider than the source line.
    const inflateX = w * 0.03
    const sourceCoverW = w + inflateX * 2 + 2
    const transCoverW = textW + padX * 2 + 4
    const coverW = Math.max(sourceCoverW, transCoverW)
    const coverX = x - inflateX - 1
    // Grow cover slightly when wrapping so glyphs stay readable.
    const textBlockH = Math.max(h, lines.length * lineH + 2)
    const coverH = Math.min(textBlockH, h * 2.2)
    const coverY = y - Math.max(0, (coverH - h) * 0.15)

    ctx.fillStyle = 'rgba(7, 19, 31, 0.88)'
    ctx.fillRect(coverX, coverY - 1, coverW, coverH + 2)
    ctx.fillStyle = '#e8f4f1'
    const startY = coverY + Math.max(1, (coverH - lines.length * lineH) / 2)
    const textMaxW = Math.max(8, w - padX * 2)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!
      let draw = line
      while (ctx.measureText(draw).width > textMaxW && draw.length > 1) {
        draw = draw.slice(0, -1)
      }
      ctx.fillText(draw, x + padX, startY + i * lineH, textMaxW)
    }
  }
}

type PdfJsUtil = { transform: (m1: number[], m2: number[]) => number[] }

/** Map PDF.js text content items into normalized page boxes (origin top-left). */
export function textContentToItems(
  pdfjs: { Util: PdfJsUtil },
  viewport: { width: number; height: number; transform: number[] },
  textContent: { items: unknown[] },
): TextItem[] {
  const items: TextItem[] = []
  for (const raw of textContent.items) {
    if (!raw || typeof raw !== 'object' || !('str' in raw)) continue
    const it = raw as {
      str: string
      transform: number[]
      width: number
      height?: number
    }
    const text = (it.str || '').replace(/\s+/g, ' ').trim()
    if (!text) continue
    // Viewport transform already flips PDF → canvas (top-left origin, Y down).
    const vx = pdfjs.Util.transform(viewport.transform, it.transform)
    const tx = vx[4] ?? 0
    const ty = vx[5] ?? 0
    const scaleX = Math.hypot(vx[0] ?? 0, vx[1] ?? 0) || 1
    const scaleY = Math.hypot(vx[2] ?? 0, vx[3] ?? 0) || scaleX
    const fontH = Math.max(6, scaleY)
    const rawW =
      typeof it.width === 'number' && it.width > 0 ? it.width * scaleX : fontH * text.length * 0.5
    const hNorm = fontH / viewport.height
    const wNorm = clampInkWidth(text, hNorm, rawW / viewport.width)
    // Baseline at ty; glyphs extend upward on the canvas.
    const top = ty - fontH * 0.92
    const x = tx / viewport.width
    const y = top / viewport.height
    items.push({
      text,
      x: Math.min(0.98, Math.max(0, x)),
      y: Math.min(0.98, Math.max(0, y)),
      w: Math.min(1 - Math.min(0.98, Math.max(0, x)), Math.max(0.01, wNorm)),
      h: Math.min(1, Math.max(0.012, hNorm)),
    })
  }
  return items
}

export async function translatePdfHybrid(
  file: File,
  from: DocLang,
  to: DocLang,
  onProgress?: PdfProgress,
  onEntitlement?: (ent: Entitlement) => void,
): Promise<{ filename: string; mime: string; dataBase64: string; pages: number }> {
  const pdfjs = await loadPdfJs()
  const data = new Uint8Array(await file.arrayBuffer())
  const pdf = await pdfjs.getDocument({ data }).promise
  const outPdf = await PDFDocument.create()
  const total = pdf.numPages
  const target = to === 'en' ? ('en' as const) : to === 'cmn' ? ('cmn' as const) : ('yue' as const)

  for (let pageNum = 1; pageNum <= total; pageNum++) {
    onProgress?.('reading', pageNum, total)
    const page = await pdf.getPage(pageNum)
    // Higher scale → sharper paint + better OCR boxes on scanned pages.
    const viewport = page.getViewport({ scale: 2 })
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.floor(viewport.width))
    canvas.height = Math.max(1, Math.floor(viewport.height))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas unavailable')

    await page.render({ canvasContext: ctx, viewport }).promise

    const textContent = await page.getTextContent()
    const rawItems = textContentToItems(pdfjs, viewport, textContent)
    const lineItems = groupTextItemsIntoLines(rawItems)

    const charCount = lineItems.reduce((n, i) => n + i.text.length, 0)
    if (charCount >= TEXT_CHAR_THRESHOLD) {
      onProgress?.('translating', pageNum, total)
      const slice = lineItems.slice(0, MAX_SEGMENTS)
      const { translations, entitlement } = await translateDocSegments({
        segments: slice.map((i) => i.text),
        from,
        to,
      })
      if (entitlement) onEntitlement?.(entitlement)
      paintTranslations(
        ctx,
        canvas,
        slice.map((it, i) => ({
          x: it.x,
          y: it.y,
          w: it.w,
          h: it.h,
          translated: translations[i] || it.text,
        })),
      )
    } else {
      onProgress?.('ocr', pageNum, total)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
      const scan = await cameraScan({ image: dataUrl, target, forDocs: true })
      if (scan.entitlement) onEntitlement?.(scan.entitlement as Entitlement)
      paintTranslations(
        ctx,
        canvas,
        (scan.regions || []).map((r) => ({
          x: r.box.x,
          y: r.box.y,
          w: r.box.w,
          h: Math.max(r.box.h, 0.014),
          translated: r.translated || '',
        })),
      )
    }

    const jpeg = await new Promise<ArrayBuffer>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) reject(new Error('Failed to encode page'))
          else void blob.arrayBuffer().then(resolve, reject)
        },
        'image/jpeg',
        0.9,
      )
    })
    const embedded = await outPdf.embedJpg(jpeg)
    const pageOut = outPdf.addPage([embedded.width, embedded.height])
    pageOut.drawImage(embedded, {
      x: 0,
      y: 0,
      width: embedded.width,
      height: embedded.height,
    })
  }

  const bytes = await outPdf.save()
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  const base = file.name.replace(/\.pdf$/i, '') || 'document'
  // Bill only after the full PDF hybrid job succeeds.
  onProgress?.('saving', total, total)
  const committed = await commitDocPages(total)
  if (committed.entitlement) onEntitlement?.(committed.entitlement)
  return {
    filename: `${base}.${to}.pdf`,
    mime: 'application/pdf',
    dataBase64: btoa(binary),
    pages: total,
  }
}
