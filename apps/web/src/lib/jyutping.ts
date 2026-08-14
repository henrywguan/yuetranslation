const HAN = /[\u3400-\u9fff\uf900-\ufaff]/
export function hasHan(text: string) {
  return HAN.test(text)
}

/**
 * LSHK Jyutping §4 Chao tone letters.
 * @see https://jyutping.org/en/jyutping/
 */
export const TONE_LETTERS: Record<string, string> = {
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

type Api = { getJyutpingText: (t: string) => string }
let apiPromise: Promise<Api> | null = null
const cache = new Map<string, string>()
function load() {
  if (!apiPromise) apiPromise = import('to-jyutping').then((m) => ({ getJyutpingText: m.getJyutpingText }))
  return apiPromise
}
export function toJyutpingCached(text: string) {
  const t = text.trim()
  if (!t || !hasHan(t)) return ''
  return cache.get(t) || ''
}
export async function ensureJyutping(text: string) {
  const t = text.trim()
  if (!t || !hasHan(t)) return ''
  if (cache.has(t)) return cache.get(t) || ''
  try {
    const api = await load()
    const jp = api.getJyutpingText(t).trim()
    cache.set(t, jp)
    return jp
  } catch {
    cache.set(t, '')
    return ''
  }
}
