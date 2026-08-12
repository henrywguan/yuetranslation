const HAN = /[\u3400-\u9fff\uf900-\ufaff]/
export function hasHan(text: string) {
  return HAN.test(text)
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
