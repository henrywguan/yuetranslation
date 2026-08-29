/**
 * PDF hybrid C+B:
 * - C: extract text items + positions when the page has a text layer
 * - B: always rasterize the page as the visual base; paint translations on top
 * - Scanned pages (sparse text): Azure Vision via /camera/scan, then paint overlays
 */
import { PDFDocument } from 'pdf-lib'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { cameraScan } from './api'
import { translateDocSegments, type DocLang } from './docsApi'

export type PdfProgress = (msg: string, page: number, total: number) => void

type TextItem = {
  text: string
  x: number
  y: number
  w: number
  h: number
}

const TEXT_CHAR_THRESHOLD = 24

async function loadPdfJs() {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc
  return pdfjs
}

function paintTranslations(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  items: Array<{ x: number; y: number; w: number; h: number; translated: string }>,
) {
  for (const it of items) {
    if (!it.translated.trim()) continue
    const x = it.x * canvas.width
    const y = it.y * canvas.height
    const w = Math.max(8, it.w * canvas.width)
    const h = Math.max(8, it.h * canvas.height)
    ctx.fillStyle = 'rgba(7, 19, 31, 0.82)'
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2)
    ctx.fillStyle = '#e8f4f1'
    const fontSize = Math.max(10, Math.min(h * 0.78, 28))
    ctx.font = `600 ${fontSize}px "Noto Sans HK", "Segoe UI", sans-serif`
    ctx.textBaseline = 'top'
    const maxW = w - 2
    let line = it.translated
    while (ctx.measureText(line).width > maxW && line.length > 1) {
      line = line.slice(0, -1)
    }
    ctx.fillText(line, x + 1, y + Math.max(0, (h - fontSize) / 2), maxW)
  }
}

export async function translatePdfHybrid(
  file: File,
  from: DocLang,
  to: DocLang,
  onProgress?: PdfProgress,
): Promise<{ filename: string; mime: string; dataBase64: string; pages: number }> {
  const pdfjs = await loadPdfJs()
  const data = new Uint8Array(await file.arrayBuffer())
  const pdf = await pdfjs.getDocument({ data }).promise
  const outPdf = await PDFDocument.create()
  const total = pdf.numPages
  const target = to === 'en' ? ('en' as const) : ('zh' as const)

  for (let pageNum = 1; pageNum <= total; pageNum++) {
    onProgress?.(`Page ${pageNum} · reading`, pageNum, total)
    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale: 1.45 })
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.floor(viewport.width))
    canvas.height = Math.max(1, Math.floor(viewport.height))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas unavailable')

    await page.render({ canvasContext: ctx, viewport }).promise

    const textContent = await page.getTextContent()
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
      const vx = pdfjs.Util.transform(viewport.transform, it.transform) as number[]
      const tx = vx[4] ?? 0
      const ty = vx[5] ?? 0
      const fontH = Math.max(6, Math.abs(vx[3] || vx[0] || 12))
      const wPx = Math.max(it.width || fontH * text.length * 0.55, fontH)
      const hPx = Math.max(it.height || fontH, 6)
      const x = tx / viewport.width
      const y = 1 - (ty + hPx * 0.15) / viewport.height
      items.push({
        text,
        x: Math.min(0.98, Math.max(0, x)),
        y: Math.min(0.98, Math.max(0, y - hPx / viewport.height)),
        w: Math.min(1 - x, Math.max(0.01, wPx / viewport.width)),
        h: Math.min(1, Math.max(0.01, hPx / viewport.height)),
      })
    }

    const charCount = items.reduce((n, i) => n + i.text.length, 0)
    if (charCount >= TEXT_CHAR_THRESHOLD) {
      onProgress?.(`Page ${pageNum} · translating text layer`, pageNum, total)
      const slice = items.slice(0, 120)
      const { translations } = await translateDocSegments({
        segments: slice.map((i) => i.text),
        from,
        to,
      })
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
      onProgress?.(`Page ${pageNum} · vision OCR`, pageNum, total)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.84)
      const scan = await cameraScan({ image: dataUrl, target })
      paintTranslations(
        ctx,
        canvas,
        (scan.regions || []).map((r) => ({
          x: r.box.x,
          y: r.box.y,
          w: r.box.w,
          h: r.box.h,
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
        0.88,
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
  return {
    filename: `${base}.${to}.pdf`,
    mime: 'application/pdf',
    dataBase64: btoa(binary),
    pages: total,
  }
}
