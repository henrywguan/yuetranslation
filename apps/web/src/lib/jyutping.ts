import { glossForChar, isHanChar } from './charGloss'

export type CharBreakdown = {
  char: string
  jyutping: string | null
  meaning: string
}

const HAN = /[\u3400-\u9fff\uf900-\ufaff]/
export function hasHan(text: string) {
  return HAN.test(text)
}

/**
 * LSHK Jyutping §4 Chao tone letters.
 * @see https://jyutping.org/en/jyutping/
 */
const TONE_LETTERS: Record<string, string> = {
  '1': '˥',
  '2': '˧˥',
  '3': '˧',
  '4': '˨˩',
  '5': '˩˧',
  '6': '˨',
}

/** Compact `zou2 san4` → detailed `zou2 ˧˥  san4 ˨˩`. */
export function expandJyutping(jp: string) {
  return jp.replace(/([A-Za-z]+)([1-6])/g, (_, syl: string, n: string) => `${syl}${n}\u00a0${TONE_LETTERS[n]}`)
}

type Api = {
  getJyutpingText: (t: string) => string
  getJyutpingList: (t: string) => [string, string | null][]
  jyutpingToIPA: (t: string) => string
}
let apiPromise: Promise<Api> | null = null
const cache = new Map<string, string>()
const segCache = new Map<string, JyutSeg[]>()
const listCache = new Map<string, [string, string | null][]>()

export type JyutSeg = { char: string; jp: string }

function load() {
  if (!apiPromise) {
    apiPromise = import('to-jyutping').then((m) => ({
      getJyutpingText: m.getJyutpingText,
      getJyutpingList: m.getJyutpingList,
      jyutpingToIPA: m.default.jyutpingToIPA,
    }))
  }
  return apiPromise
}

export function isValidDefinition(def?: string) {
  const d = def?.trim() || ''
  if (!d) return false
  if (/^（示範）/.test(d) || /^\(demo\)/i.test(d)) return false
  return true
}

export function toneNumber(jp: string) {
  const m = jp.trim().match(/([1-6])$/)
  return m ? m[1] : ''
}

export function isEnteringTone(jp: string) {
  return /[ptk][136]$/i.test(jp.trim())
}

function segsFromList(list: [string, string | null][]): JyutSeg[] {
  const segs: JyutSeg[] = []
  for (const [token, jp] of list) {
    const chars = [...token]
    const syls = jp?.trim().split(/\s+/).filter(Boolean) || []
    if (chars.length === syls.length) {
      chars.forEach((char, i) => segs.push({ char, jp: syls[i] }))
    } else if (chars.length === 1) {
      segs.push({ char: token, jp: jp?.trim() || '' })
    } else {
      chars.forEach((char) => segs.push({ char, jp: '' }))
    }
  }
  return segs
}

export function toJyutpingCached(text: string) {
  const t = text.trim()
  if (!t || !hasHan(t)) return ''
  return cache.get(t) || ''
}

export async function ensureJyutpingSegs(text: string): Promise<JyutSeg[]> {
  const t = text.trim()
  if (!t || !hasHan(t)) return []
  if (segCache.has(t)) return segCache.get(t) || []
  try {
    const api = await load()
    const list = api.getJyutpingList(t)
    const segs = segsFromList(list)
    segCache.set(t, segs)
    listCache.set(t, list)
    const jp = api.getJyutpingText(t).trim()
    cache.set(t, jp)
    return segs
  } catch {
    segCache.set(t, [])
    return []
  }
}

async function ensureJyutpingList(text: string): Promise<[string, string | null][]> {
  const t = text.trim()
  if (!t) return []
  if (listCache.has(t)) return listCache.get(t) || []
  try {
    const api = await load()
    const list = api.getJyutpingList(t)
    listCache.set(t, list)
    const jp = api.getJyutpingText(t).trim()
    cache.set(t, jp)
    if (!segCache.has(t)) segCache.set(t, segsFromList(list))
    return list
  } catch {
    listCache.set(t, [])
    return []
  }
}

export async function ensureIpa(jp: string) {
  const t = jp.trim()
  if (!t) return ''
  try {
    const api = await load()
    return api.jyutpingToIPA(t) || ''
  } catch {
    return ''
  }
}

/** Build a learner-facing row list: Han chars + common punctuation. */
export async function buildLocalBreakdown(text: string): Promise<CharBreakdown[]> {
  const trimmed = text.trim()
  if (!trimmed) return []
  const list = await ensureJyutpingList(trimmed)
  if (list.length) {
    return list
      .filter(([ch]) => isHanChar(ch) || /[？！。，、…?]/.test(ch))
      .map(([ch, jp]) => ({
        char: ch,
        jyutping: jp,
        meaning: glossForChar(ch),
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
