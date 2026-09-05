/**
 * Shared helpers for document translation jobs.
 */
import { translateCameraText, translateCameraBatch, type CameraLang } from '../translateCamera.js'
import { hasHan } from '../canto/han.js'

export type DocLang = 'en' | 'yue' | 'cmn'

const SKIP_RE =
  /^(https?:\/\/\S+|[\w.+-]+@[\w.-]+\.\w+|[\d mon.,:%€$£¥+\-/=]+)$/i

export function shouldTranslateSegment(text: string): boolean {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length < 2) return false
  if (SKIP_RE.test(t)) return false
  // Mostly punctuation / bullets
  if (!/[A-Za-z\u00C0-\u024F\u3400-\u9fff]/.test(t)) return false
  return true
}

function toCameraLang(lang: DocLang): CameraLang {
  return lang
}

/** Translate many short segments with document-level context when possible. */
export async function translateSegments(
  segments: string[],
  from: DocLang,
  to: DocLang,
  concurrency = 3,
): Promise<string[]> {
  if (from === to) return segments.map((s) => s)

  const camFrom = toCameraLang(from)
  const camTo = toCameraLang(to)

  const indices: number[] = []
  const toTranslate: string[] = []
  for (let i = 0; i < segments.length; i++) {
    const src = segments[i] ?? ''
    if (shouldTranslateSegment(src)) {
      indices.push(i)
      toTranslate.push(src)
    }
  }

  if (!toTranslate.length) return segments

  const out = segments.map((s) => s)
  try {
    const { translations } = await translateCameraBatch(toTranslate, camFrom, camTo)
    for (let j = 0; j < indices.length; j++) {
      out[indices[j]!] = translations[j] || segments[indices[j]!]!
    }
    return out
  } catch {
    // Fall back to per-line translate with limited concurrency.
  }

  let idx = 0
  async function worker() {
    while (idx < toTranslate.length) {
      const j = idx++
      const i = indices[j]!
      const src = toTranslate[j] ?? ''
      const prev = j > 0 ? toTranslate[j - 1] : ''
      const next = j + 1 < toTranslate.length ? toTranslate[j + 1] : ''
      const context = [prev, next].filter(Boolean).join('\n')
      try {
        const result = await translateCameraText(src, camFrom, camTo, { context })
        const text = (result.text || '').trim()
        if (camTo === 'en' && hasHan(text)) out[i] = src
        else if (
          (camTo === 'yue' || camTo === 'cmn') &&
          text &&
          !hasHan(text) &&
          /[A-Za-z]/.test(src)
        )
          out[i] = src
        else out[i] = text || src
      } catch {
        out[i] = src
      }
    }
  }

  const n = Math.max(1, Math.min(concurrency, toTranslate.length || 1))
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
