import { glossForChar, hasHan, isHanChar } from './charGloss'

export type CharBreakdown = {
  char: string
  jyutping: string | null
  meaning: string
}

export { hasHan }

/**
 * UI tone rendering — flip to reverse in one place:
 * - `true`  → ruby DOM is `teng1` + SVG contour (no Chao Unicode in HTML)
 * - `false` → classic `teng1˥` Unicode Chao in the DOM (previous look)
 *
 * Family “Copy Jyutping + Chao” always uses Unicode Chao via `rubyJpSyllable()`.
 */
export const JYUTPING_UI_SVG_TONES = true

/**
 * Select/copy prank for Free/guest — flip to `false` to disable.
 * Selecting Jyutping ruby and copying replaces the clipboard with a Family nudge
 * (Family/Business are exempt; use the Copy Jyutping button instead).
 */
export const JYUTPING_SELECT_COPY_TRAP = true

/** Family / Business (and open-mode with no entitlement snapshot). */
export function planAllowsJyutpingCopy(plan: string | undefined, hasEntitlement: boolean): boolean {
  if (!hasEntitlement) return true
  return plan === 'family' || plan === 'business'
}

/**
 * LSHK Jyutping §4 tone contour marks (Chao tone letters) — product label: Jyutping + Chao tone letters.
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

export type JyutTone = '1' | '2' | '3' | '4' | '5' | '6'

/** Split `teng1` → roman+digit for UI; null if not a plain Jyutping syllable. */
export function parseJyutpingTone(jp: string): { roman: string; tone: JyutTone } | null {
  const t = jp.trim()
  if (!t) return null
  const m = t.match(/^([A-Za-z]+)([1-6])$/)
  if (!m) return null
  return { roman: `${m[1]}${m[2]}`, tone: m[2] as JyutTone }
}

/** Clipboard / Unicode form: `zou2` → `zou2˧˥` (tone digit + Chao letter). */
export function rubyJpSyllable(jp: string) {
  const t = jp.trim()
  if (!t) return '\u00a0'
  const parsed = parseJyutpingTone(t)
  if (!parsed) return t
  return `${parsed.roman}${TONE_LETTERS[parsed.tone]}`
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
