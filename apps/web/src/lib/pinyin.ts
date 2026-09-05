import { glossForChar, hasHan, isHanChar } from './charGloss'
import type { CharBreakdown } from './jyutping'

export { hasHan }

export type PinyinSeg = { char: string; py: string }

const cache = new Map<string, string>()
const segCache = new Map<string, PinyinSeg[]>()

type PinyinApi = {
  pinyin: (
    text: string,
    options?: { toneType?: string; type?: string; nonZh?: string },
  ) => string | string[]
}

let apiPromise: Promise<PinyinApi> | null = null

function load() {
  if (!apiPromise) {
    apiPromise = import('pinyin-pro').then((m) => ({
      pinyin: m.pinyin as PinyinApi['pinyin'],
    }))
  }
  return apiPromise
}

export function toPinyinCached(text: string) {
  const t = text.trim()
  if (!t || !hasHan(t)) return ''
  return cache.get(t) || ''
}

/** Full tone-mark pinyin segments (one per character when possible). */
export async function ensurePinyinSegs(text: string): Promise<PinyinSeg[]> {
  const t = text.trim()
  if (!t || !hasHan(t)) return []
  if (segCache.has(t)) return segCache.get(t) || []
  try {
    const api = await load()
    const chars = [...t]
    const syls = api.pinyin(t, {
      toneType: 'symbol',
      type: 'array',
    }) as string[]
    const segs: PinyinSeg[] = chars.map((char, i) => {
      const raw = (syls[i] || '').trim()
      // Punctuation / non-Han: empty ruby cell
      const py = isHanChar(char) ? raw : ''
      return { char, py }
    })
    segCache.set(t, segs)
    const joined = segs
      .map((s) => s.py)
      .filter(Boolean)
      .join(' ')
    cache.set(t, joined)
    return segs
  } catch {
    segCache.set(t, [])
    return []
  }
}

/** Learner rows: Han + punctuation with tone-mark pinyin in the jyutping field. */
export async function buildLocalPinyinBreakdown(text: string): Promise<CharBreakdown[]> {
  const trimmed = text.trim()
  if (!trimmed) return []
  const segs = await ensurePinyinSegs(trimmed)
  if (segs.length) {
    return segs
      .filter((s) => isHanChar(s.char) || /[？！。，、…?]/.test(s.char))
      .map((s) => ({
        char: s.char,
        jyutping: s.py || null,
        meaning: glossForChar(s.char),
      }))
  }
  return Array.from(trimmed)
    .filter((ch) => isHanChar(ch) || /[？！。，、…?]/.test(ch))
    .map((ch) => ({
      char: ch,
      jyutping: null,
      meaning: glossForChar(ch),
    }))
}
