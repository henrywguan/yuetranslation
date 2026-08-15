import { eachLexiconEntry, lookupGloss, segmentGlosses } from './gloss.js'
import { normalizeLookupKey, uniqStrings } from './normalize.js'
import type { TargetLang } from './types.js'

export type LexiconTranslateHit = {
  text: string
  definition: string
  alternatives: string[]
  notes: string[]
  /** Exact headword/phrase vs composed segmentation. */
  kind: 'exact' | 'segmented' | 'composed'
}

type EnCandidate = {
  trad: string
  gloss: string
  source: string
  exactLemma: boolean
}

const SKIP_EN = new Set([
  'a',
  'an',
  'the',
  'to',
  'of',
  'and',
  'or',
  'in',
  'on',
  'at',
  'for',
  'with',
  'from',
  'by',
  'as',
  'is',
  'are',
  'be',
  'been',
  'being',
  'it',
  'its',
  'this',
  'that',
  'these',
  'those',
])

const META_GLOSS =
  /^(variant of|see also|see |archaic|surname|used in|abbr\.|particle|interjection|classifier|measure word|radical)/i

/** Strip POS tags / noise and split CC-Canto gloss senses into EN lemmas. */
export function glossLemmas(gloss: string): string[] {
  const cleaned = gloss
    .replace(/^\((?:noun|verb|adj|adverb|phrase|slang|interjection|classifier|particle)\)\s*/i, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*]/g, ' ')
    .replace(/[./]+$/g, '')
    .trim()
  if (!cleaned) return []

  const parts = cleaned
    .split(/[;／]/)
    .flatMap((chunk) => chunk.split(/,(?![^()]*\))/))
    .map((p) => p.trim())
    .filter(Boolean)

  const out: string[] = []
  for (const part of parts) {
    const key = normalizeLookupKey(part)
    if (!isUsefulLemma(key)) continue
    out.push(key)
    // Also index "to eat" → "eat"
    if (key.startsWith('to ') && key.length > 4) {
      const bare = key.slice(3)
      if (isUsefulLemma(bare)) out.push(bare)
    }
  }
  return [...new Set(out)]
}

function isUsefulLemma(key: string): boolean {
  if (key.length < 2 || key.length > 40) return false
  if (!/[a-z]/i.test(key)) return false
  if (META_GLOSS.test(key)) return false
  if (SKIP_EN.has(key)) return false
  // Skip very dictionary-y long definitions as lookup keys.
  if (key.split(/\s+/).length > 6) return false
  return true
}

function scoreCandidate(c: EnCandidate, query: string): number {
  let score = 0
  if (c.exactLemma) score += 12
  if (c.source === 'seed') score += 8
  if (c.source === 'wordshk') score += 3
  const len = Array.from(c.trad).length
  if (len <= 2) score += 3
  else if (len === 3) score += 1
  else if (len >= 5) score -= 2
  if (/written|classical|mandarin|literary/i.test(c.gloss)) score -= 6
  if (/^\(slang\)/i.test(c.gloss) && !/slang/.test(query)) score -= 2
  // Prefer gloss that starts with the query lemma.
  const g = normalizeLookupKey(c.gloss.replace(/^\([^)]*\)\s*/g, ''))
  if (g === query) score += 6
  if (g.startsWith(query)) score += 2
  return score
}

const enIndex = new Map<string, EnCandidate[]>()

function buildEnIndex() {
  if (enIndex.size) return
  eachLexiconEntry((entry) => {
    const lemmas = glossLemmas(entry.gloss)
    for (const lemma of lemmas) {
      const list = enIndex.get(lemma) || []
      list.push({
        trad: entry.trad,
        gloss: entry.gloss,
        source: entry.source,
        exactLemma: lemma === normalizeLookupKey(entry.gloss.replace(/^\([^)]*\)\s*/g, '').split(/[;／]/)[0] || ''),
      })
      enIndex.set(lemma, list)
    }
  })
}

export function lexiconStats() {
  buildEnIndex()
  return {
    enKeys: enIndex.size,
    sources: ['seed', 'cc-canto', 'wordshk (gated)'],
  }
}

function pickEnHits(query: string, wantAlternatives: boolean): LexiconTranslateHit | null {
  buildEnIndex()
  const key = normalizeLookupKey(query)
  if (!key) return null

  const raw = enIndex.get(key)
  if (!raw?.length) return null

  const ranked = [...raw].sort((a, b) => scoreCandidate(b, key) - scoreCandidate(a, key))
  const best = ranked[0]
  if (!best || scoreCandidate(best, key) < 4) return null

  const alts = wantAlternatives
    ? uniqStrings(
        best.trad,
        ranked.slice(1, 8).map((c) => c.trad),
      )
    : []

  return {
    text: best.trad,
    definition: best.gloss.replace(/^\([^)]*\)\s*/g, '').split(/[;／]/)[0]?.trim() || query,
    alternatives: alts,
    notes: [`lexicon:en:${best.source}`],
    kind: 'exact',
  }
}

function composeEnToYue(query: string): LexiconTranslateHit | null {
  buildEnIndex()
  const key = normalizeLookupKey(query)
  const tokens = key.split(/\s+/).filter(Boolean)
  if (tokens.length < 2 || tokens.length > 4) return null

  const content = tokens.filter((t) => !SKIP_EN.has(t))
  if (!content.length || content.length > 3) return null

  const parts: string[] = []
  const notes: string[] = ['lexicon:en:composed']
  for (const tok of content) {
    const hit = pickEnHits(tok, false)
    if (!hit) return null
    parts.push(hit.text)
    notes.push(...hit.notes)
  }
  return {
    text: parts.join(''),
    definition: query,
    alternatives: [],
    notes,
    kind: 'composed',
  }
}

function yueToEn(source: string): LexiconTranslateHit | null {
  const trimmed = source.trim()
  if (!trimmed) return null

  // Whole-string lexicon headword.
  const whole = lookupGloss(trimmed)
  if (whole) {
    const def = whole.gloss.replace(/^\([^)]*\)\s*/g, '').split(/[;／]/)[0]?.trim() || whole.gloss
    return {
      text: def,
      definition: '',
      alternatives: [],
      notes: [`lexicon:yue:${whole.source}`],
      kind: 'exact',
    }
  }

  const segs = segmentGlosses(trimmed)
  if (!segs.length) return null

  const hanChars = Array.from(trimmed).filter((ch) => /\p{Script=Han}/u.test(ch))
  const covered = segs
    .filter((s) => s.hit)
    .reduce((n, s) => n + Array.from(s.surface).filter((ch) => /\p{Script=Han}/u.test(ch)).length, 0)
  if (!hanChars.length) return null
  const coverage = covered / hanChars.length
  if (coverage < 0.55) return null

  const pieces = segs.map((s) => {
    if (!s.hit) return s.surface
    const sense = s.hit.gloss.replace(/^\([^)]*\)\s*/g, '').split(/[;／]/)[0]?.trim()
    return sense || s.surface
  })

  return {
    text: pieces.join(' ').replace(/\s+/g, ' ').trim(),
    definition: '',
    alternatives: [],
    notes: [`lexicon:yue:segmented`, `coverage:${coverage.toFixed(2)}`],
    kind: 'segmented',
  }
}

/**
 * Offline dictionary MT using seed + CC-Canto (+ gated words.hk).
 * Prefer phrase memory first; call this before the demo echo fallback.
 */
export function lexiconTranslate(opts: {
  sourceLang: 'en' | 'yue' | 'cmn'
  targetLang: TargetLang
  source: string
  wantAlternatives?: boolean
}): LexiconTranslateHit | null {
  const source = opts.source.trim()
  if (!source) return null

  if (opts.sourceLang === 'en' && opts.targetLang === 'yue') {
    return pickEnHits(source, Boolean(opts.wantAlternatives)) || composeEnToYue(source)
  }
  if (opts.sourceLang === 'yue' && opts.targetLang === 'en') {
    return yueToEn(source)
  }
  return null
}
