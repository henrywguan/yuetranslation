import { glossForChar, isHanChar } from './charGloss'

export type CharBreakdown = {
  char: string
  jyutping: string | null
  meaning: string
}

type JyutpingApi = {
  getJyutpingText: (t: string) => string
  getJyutpingList: (t: string) => [string, string | null][]
}

let apiPromise: Promise<JyutpingApi> | null = null
const textCache = new Map<string, string>()
const listCache = new Map<string, [string, string | null][]>()

const HAN = /[\u3400-\u9fff\uf900-\ufaff]/

export function hasHan(text: string) {
  return HAN.test(text)
}

function load() {
  if (!apiPromise) {
    apiPromise = import('to-jyutping').then((m) => ({
      getJyutpingText: m.getJyutpingText,
      getJyutpingList: m.getJyutpingList,
    }))
  }
  return apiPromise
}

export function toJyutpingCached(text: string) {
  const t = text.trim()
  if (!t || !hasHan(t)) return ''
  return textCache.get(t) || ''
}

export async function ensureJyutping(text: string) {
  const t = text.trim()
  if (!t || !hasHan(t)) return ''
  if (textCache.has(t)) return textCache.get(t) || ''
  try {
    const api = await load()
    const jp = api.getJyutpingText(t).trim()
    textCache.set(t, jp)
    return jp
  } catch {
    textCache.set(t, '')
    return ''
  }
}

export async function ensureJyutpingList(text: string): Promise<[string, string | null][]> {
  const t = text.trim()
  if (!t) return []
  if (listCache.has(t)) return listCache.get(t) || []
  try {
    const api = await load()
    const list = api.getJyutpingList(t)
    listCache.set(t, list)
    // Warm phrase-level cache too.
    const jp = api.getJyutpingText(t).trim()
    textCache.set(t, jp)
    return list
  } catch {
    listCache.set(t, [])
    return []
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
  // Fallback without the library: one row per code point.
  return Array.from(trimmed)
    .filter((ch) => isHanChar(ch) || /[？！。，、…?]/.test(ch))
    .map((ch) => ({
      char: ch,
      jyutping: null,
      meaning: glossForChar(ch),
    }))
}
