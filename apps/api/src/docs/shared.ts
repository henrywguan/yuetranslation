/**
 * Shared helpers for document translation jobs.
 */
import { translate } from '../translate.js'
import { translateCameraText } from '../translateCamera.js'
import { hasHan } from '../canto/han.js'

export type DocLang = 'en' | 'yue'

const SKIP_RE =
  /^(https?:\/\/\S+|[\w.+-]+@[\w.-]+\.\w+|[\d mon.,:%€$£¥+\-/=]+)$/i

/** Short lines (menus, headings, signs) use the Cam written-Chinese path. */
function preferCameraPath(text: string): boolean {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length < 2 || t.length > 64) return false
  // Multi-sentence body copy stays on the colloquial Solo pipeline.
  if (/[.!?。！？]/.test(t) && t.length > 28) return false
  return true
}

export function shouldTranslateSegment(text: string): boolean {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length < 2) return false
  if (SKIP_RE.test(t)) return false
  // Mostly punctuation / bullets
  if (!/[A-Za-z\u00C0-\u024F\u3400-\u9fff]/.test(t)) return false
  return true
}

/** Translate many short segments with limited concurrency. */
export async function translateSegments(
  segments: string[],
  from: DocLang,
  to: DocLang,
  concurrency = 3,
): Promise<string[]> {
  const out = segments.map((s) => s)
  let idx = 0

  async function worker() {
    while (idx < segments.length) {
      const i = idx++
      const src = segments[i] ?? ''
      if (!shouldTranslateSegment(src) || from === to) {
        out[i] = src
        continue
      }
      try {
        if (preferCameraPath(src)) {
          const camFrom = from === 'en' ? 'en' : 'zh'
          const camTo = to === 'en' ? 'en' : 'zh'
          const result = await translateCameraText(src, camFrom, camTo)
          const text = (result.text || '').trim()
          // Reject obvious language echoes.
          if (camTo === 'en' && hasHan(text)) out[i] = src
          else if (camTo === 'zh' && text && !hasHan(text) && /[A-Za-z]/.test(src)) out[i] = src
          else out[i] = text || src
        } else {
          const result = await translate({ text: src, from, to, includeAlternatives: false })
          out[i] = (result.text || src).trim() || src
        }
      } catch {
        out[i] = src
      }
    }
  }

  const n = Math.max(1, Math.min(concurrency, segments.length || 1))
  await Promise.all(Array.from({ length: n }, () => worker()))
  return out
}

export function extOf(filename: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(filename.trim())
  return (m?.[1] || '').toLowerCase()
}

export function decodeDataUrlOrBase64(raw: string): Buffer {
  const s = raw.trim()
  const m = /^data:[^;]+;base64,(.+)$/i.exec(s)
  const b64 = m ? m[1]! : s.replace(/\s+/g, '')
  return Buffer.from(b64, 'base64')
}

export function toBase64(buf: Buffer): string {
  return buf.toString('base64')
}
