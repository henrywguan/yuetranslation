import { eachLexiconEntry, lookupGloss } from './gloss.js'
import { dictionaryTranslate } from './dictionary.js'
import { normalizeLookupKey, uniqStrings } from './normalize.js'
import type { TargetLang } from './types.js'
import { looksLikeGlossDump } from '@jyut/shared/glossDump'
export { looksLikeGlossDump }

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

/** Dictionary sense labels that must never appear as “translations”. */
const META_SENSE =
  /^(softening particle|assertive particle|change-of-state particle|hearsay(?:\s*\/\s*soft particle)?|progressive(?:\s*\(-ing\))?|perfective(?:\s*\(already done\))?|plural marker(?:[^a-z].*)?|possessive(?:\s*\/\s*relative)?|relative|classifier|question particle|comma|full stop|exclamation mark|question mark|interjection)\b/i

/** Strip stacked CC-Canto labels: (interjection) (of …) hello → hello */
function cleanGlossSense(gloss: string): string {
  let s = gloss.trim()
  while (/^\([^)]*\)\s*/.test(s)) {
    s = s.replace(/^\([^)]*\)\s*/, '')
  }
  return s.split(/[;／]/)[0]?.trim() || ''
}

/**
 * All usable English sense strings from a CC-Canto / seed gloss
 * (split on ; ／ and " / ").
 */
function allGlossSenses(gloss: string): string[] {
  let s = gloss.trim()
  while (/^\([^)]*\)\s*/.test(s)) {
    s = s.replace(/^\([^)]*\)\s*/, '')
  }
  if (!s) return []
  const parts = s
    .split(/[;／]/)
    .flatMap((chunk) => chunk.split(/\s+\/\s+/))
    .map((p) =>
      p
        .replace(/^\d+\.\s*/, '')
        .replace(/^\([^)]*\)\s*/g, '')
        .trim(),
    )
    .filter(Boolean)

  const out: string[] = []
  const seen = new Set<string>()
  for (const part of parts) {
    if (isMetaSense(part) || looksLikeGlossDump(part)) continue
    // Skip tiny fragments and dictionary scaffolding
    if (part.length < 2 || part.length > 120) continue
    if (/^(literal meaning|cantonese slang|derived from)\b/i.test(part)) continue
    const key = part.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(part)
  }
  return out
}

/** English dictionary senses for a Cantonese headword / phrase (exact lookup). */
export function englishDefinitionsForYue(yue: string): string[] {
  const trimmed = yue.trim().replace(/[。？！，、….!?,]+$/g, '')
  if (!trimmed) return []
  const whole = lookupGloss(trimmed)
  if (!whole) return []
  return allGlossSenses(whole.gloss)
}

function isMetaSense(sense: string): boolean {
  const s = sense.trim()
  if (!s) return true
  if (META_SENSE.test(s)) return true
  if (/\bparticle\b/i.test(s)) return true
  if (/^\(of\b/i.test(s)) return true
  return false
}

/** Strip POS tags / noise and split CC-Canto gloss senses into EN lemmas. */
function glossLemmas(gloss: string): string[] {
  const cleaned = gloss
    .replace(/^\((?:noun|verb|adj|adverb|phrase|slang|interjection|classifier|particle)\)\s*/i, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
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
  // Dated / slang euphemisms (e.g. 牛一 for birthday) lose to modern seed/phrase hits.
  if (/\bdated\b|archaic|obsolete|euphemism/i.test(c.gloss)) score -= 10
  if (/slang/i.test(c.gloss) && !/slang/.test(query)) score -= 4
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
        exactLemma:
          lemma ===
          normalizeLookupKey(entry.gloss.replace(/^\([^)]*\)\s*/g, '').split(/[;／]/)[0] || ''),
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
    definition: cleanGlossSense(best.gloss) || query,
    alternatives: alts,
    notes: [`lexicon:en:${best.source}`],
    kind: 'exact',
  }
}

function singularEnToken(tok: string): string | null {
  if (tok.endsWith('ies') && tok.length > 4) return `${tok.slice(0, -3)}y`
  // -es plurals (boxes, watches) — not plain -s words like "apples" → "apple".
  if (tok.endsWith('es') && tok.length > 4) {
    const stem = tok.slice(0, -2)
    if (/[sxz]$|[cs]h$/.test(stem) || stem.endsWith('o')) return stem
  }
  if (tok.endsWith('s') && tok.length > 3 && !tok.endsWith('ss')) return tok.slice(0, -1)
  return null
}

/** Resolve one English content word to Cantonese via lexicon headword or phrase memory. */
function resolveEnToken(tok: string): LexiconTranslateHit | null {
  const hit = pickEnHits(tok, false)
  if (hit) return hit

  const dict = dictionaryTranslate({
    sourceLang: 'en',
    targetLang: 'yue',
    source: tok,
  })
  if (dict) {
    return {
      text: dict.text,
      definition: tok,
      alternatives: [],
      notes: [`dict:${dict.entry.id}`],
      kind: 'exact',
    }
  }

  const singular = singularEnToken(tok)
  if (singular && singular !== tok) {
    const fromSingular = pickEnHits(singular, false)
    if (fromSingular) return fromSingular
    const dictSingular = dictionaryTranslate({
      sourceLang: 'en',
      targetLang: 'yue',
      source: singular,
    })
    if (dictSingular) {
      return {
        text: dictSingular.text,
        definition: singular,
        alternatives: [],
        notes: [`dict:${dictSingular.entry.id}`],
        kind: 'exact',
      }
    }
  }

  return null
}

function composeEnToYue(query: string): LexiconTranslateHit | null {
  buildEnIndex()
  const key = normalizeLookupKey(query)
  const tokens = key.split(/\s+/).filter(Boolean)
  if (tokens.length < 2 || tokens.length > 10) return null

  const content = tokens.filter((t) => !SKIP_EN.has(t))
  if (!content.length || content.length > 8) return null

  const parts: string[] = []
  const notes: string[] = ['lexicon:en:composed']
  for (const tok of content) {
    const hit = resolveEnToken(tok)
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

  // Whole-string lexicon headword only — segmented gloss joins are never
  // natural translations (e.g. “greeting word … full stop”).
  const whole = lookupGloss(trimmed)
  if (!whole) return null
  const def = cleanGlossSense(whole.gloss)
  if (!def || isMetaSense(def) || looksLikeGlossDump(def)) return null
  return {
    text: def,
    definition: '',
    alternatives: [],
    notes: [`lexicon:yue:${whole.source}`],
    kind: 'exact',
  }
}


/**
 * Offline dictionary MT using seed + CC-Canto (+ gated words.hk).
 * Prefer phrase memory first; call this before the demo echo fallback.
 */

/** Cantonese gloss for an English lemma/phrase (lexicon or phrase memory). */
export function cantoneseGlossForEnglish(en: string): string | null {
  const trimmed = en.trim()
  if (!trimmed) return null
  const hit = resolveEnToken(trimmed) || pickEnHits(trimmed, false)
  return hit?.text?.trim() || null
}

/** Learner-facing Cantonese senses for an English phrase (primary + close variants). */
export function cantoneseSensesForEnglish(en: string): string[] {
  const trimmed = en.trim()
  if (!trimmed) return []
  const hit = pickEnHits(trimmed, true) || resolveEnToken(trimmed)
  if (!hit) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const s of [hit.text, ...(hit.alternatives || [])]) {
    const t = (s || '').trim()
    if (!t || seen.has(t)) continue
    seen.add(t)
    out.push(t)
    if (out.length >= 6) break
  }
  return out
}

export function lexiconTranslate(opts: {
  sourceLang: 'en' | 'yue' | 'cmn' | 'wuu' | 'wuu'
  targetLang: TargetLang
  source: string
  wantAlternatives?: boolean
}): LexiconTranslateHit | null {
  // Shanghainese is handled by translateShanghainese — no Yue lexicon MT.
  if (opts.sourceLang === 'wuu' || opts.targetLang === 'wuu') return null

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
