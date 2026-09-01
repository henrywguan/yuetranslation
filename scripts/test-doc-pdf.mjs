/**
 * Extract PDF text lines + test doc segment translation (requires running API).
 */
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pdfjsPath = join(__dirname, '../apps/web/node_modules/pdfjs-dist/build/pdf.mjs')
const pdfjs = await import(pathToFileURL(pdfjsPath).href)

const pdfPath =
  process.argv[2] ||
  '/home/ubuntu/.cursor/projects/workspace/uploads/Emmanuel_G._Maldonado_Letter_of_Character_7b69.pdf'
const api = process.env.API_URL || 'http://localhost:8787'

function groupLines(items) {
  if (!items.length) return []
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x)
  const lines = []
  for (const it of sorted) {
    const last = lines[lines.length - 1]
    if (!last?.length) {
      lines.push([it])
      continue
    }
    const sample = last[0]
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
      return { text, x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
    })
    .filter((l) => l.text.length > 0)
}

async function extractLines() {
  const data = new Uint8Array(readFileSync(pdfPath))
  const pdf = await pdfjs.getDocument({ data, useSystemFonts: true }).promise
  const page = await pdf.getPage(1)
  const viewport = page.getViewport({ scale: 2 })
  const textContent = await page.getTextContent()
  const items = []
  for (const raw of textContent.items) {
    if (!raw?.str) continue
    const text = String(raw.str).replace(/\s+/g, ' ').trim()
    if (!text) continue
    const vx = pdfjs.Util.transform(viewport.transform, raw.transform)
    const tx = vx[4] ?? 0
    const ty = vx[5] ?? 0
    const scaleX = Math.hypot(vx[0] ?? 0, vx[1] ?? 0) || 1
    const scaleY = Math.hypot(vx[2] ?? 0, vx[3] ?? 0) || scaleX
    const fontH = Math.max(6, scaleY)
    const charCap = fontH * Math.max(1, text.length) * 0.55
    const rawW = raw.width > 0 ? raw.width * scaleX : charCap
    const wPx = Math.max(fontH * 0.35, Math.min(rawW, charCap * 1.1))
    const top = ty - fontH * 0.92
    items.push({
      text,
      x: tx / viewport.width,
      y: top / viewport.height,
      w: wPx / viewport.width,
      h: fontH / viewport.height,
    })
  }
  return groupLines(items)
}

const lines = await extractLines()
console.log('=== English source lines (page 1) ===')
lines.forEach((l, i) => console.log(`${String(i + 1).padStart(2)}. [w=${l.w.toFixed(3)}] ${l.text}`))

const segments = lines.map((l) => l.text).slice(0, 40)
const res = await fetch(`${api}/api/docs/segments`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ segments, from: 'en', to: 'yue' }),
})
if (!res.ok) {
  console.error('translate failed', res.status, await res.text())
  process.exit(1)
}
const { translations } = await res.json()
console.log('\n=== Cantonese translations ===')
translations.forEach((t, i) => console.log(`${String(i + 1).padStart(2)}. ${t}`))
