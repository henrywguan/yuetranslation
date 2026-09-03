export type PdfTextItem = {
  text: string
  x: number
  y: number
  w: number
  h: number
}

/**
 * Clamp a measured line/glyph width to plausible ink bounds.
 * PDF.js item.width often spans to the margin; char cap keeps covers tight to text.
 */
export function clampInkWidth(text: string, h: number, measuredW: number): number {
  if (!text.length || measuredW <= 0 || h <= 0) return measuredW
  const charCap = h * text.length * 0.55 * 1.1
  return Math.max(h * 0.35, Math.min(measuredW, charCap))
}

/** Group PDF.js glyph runs into reading lines (same baseline band). */
export function groupTextItemsIntoLines(items: PdfTextItem[]): PdfTextItem[] {
  if (!items.length) return []
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x)
  const lines: PdfTextItem[][] = []
  for (const it of sorted) {
    const last = lines[lines.length - 1]
    if (!last?.length) {
      lines.push([it])
      continue
    }
    const sample = last[0]!
    const band = Math.max(sample.h, it.h) * 0.55
    const midA = sample.y + sample.h / 2
    const midB = it.y + it.h / 2
    if (Math.abs(midA - midB) <= band) last.push(it)
    else lines.push([it])
  }

  return lines
    .map((parts) => {
      parts.sort((a, b) => a.x - b.x)
      const text = parts
        .map((p) => p.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
      const x0 = Math.min(...parts.map((p) => p.x))
      const y0 = Math.min(...parts.map((p) => p.y))
      const x1 = Math.max(...parts.map((p) => p.x + p.w))
      const y1 = Math.max(...parts.map((p) => p.y + p.h))
      return {
        text,
        x: x0,
        y: y0,
        w: Math.max(0.01, x1 - x0),
        h: Math.max(0.01, y1 - y0),
      }
    })
    .filter((l) => l.text.length > 0)
}
