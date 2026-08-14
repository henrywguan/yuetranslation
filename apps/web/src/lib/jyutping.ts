const HAN = /[\u3400-\u9fff\uf900-\ufaff]/

export function hasHan(text: string) {
  return HAN.test(text)
}

export type JyutpingPair = [char: string, jyutping: string | null]

type Api = {
  getJyutpingText: (t: string) => string
  getJyutpingList: (t: string) => JyutpingPair[]
}

let apiPromise: Promise<Api> | null = null
const textCache = new Map<string, string>()
const listCache = new Map<string, JyutpingPair[]>()

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

export function toJyutpingListCached(text: string): JyutpingPair[] | null {
  const t = text.trim()
  if (!t) return []
  if (!hasHan(t)) return t.split('').map((c) => [c, null] as JyutpingPair)
  return listCache.get(t) ?? null
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

/** Per-character Jyutping pairs — every Han glyph gets a reading when available. */
export async function ensureJyutpingList(text: string): Promise<JyutpingPair[]> {
  const t = text.trim()
  if (!t) return []
  if (!hasHan(t)) return t.split('').map((c) => [c, null] as JyutpingPair)
  if (listCache.has(t)) return listCache.get(t) || []
  try {
    const api = await load()
    const list = api.getJyutpingList(t) as JyutpingPair[]
    listCache.set(t, list)
    // Keep sentence cache in sync for any legacy callers.
    if (!textCache.has(t)) {
      textCache.set(t, api.getJyutpingText(t).trim())
    }
    return list
  } catch {
    const fallback = t.split('').map((c) => [c, null] as JyutpingPair)
    listCache.set(t, fallback)
    return fallback
  }
}
