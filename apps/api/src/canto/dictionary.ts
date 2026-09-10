import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cantoDataDir } from './dataDir.js'
import { normalizeLookupKey, uniqStrings } from './normalize.js'
import type { PhraseEntry, TargetLang } from './types.js'

type PhrasesFile = { version: number; entries: PhraseEntry[] }

const raw = JSON.parse(readFileSync(join(cantoDataDir(), 'phrases.json'), 'utf8')) as PhrasesFile

type IndexKey = string

function keyFor(sourceLang: string, targetLang: TargetLang, source: string): IndexKey {
  return `${sourceLang}|${targetLang}|${normalizeLookupKey(source)}`
}

const index = new Map<IndexKey, PhraseEntry>()

for (const entry of raw.entries) {
  index.set(keyFor(entry.sourceLang, entry.targetLang, entry.source), entry)
}

function lookupPhrase(opts: {
  sourceLang: 'en' | 'yue' | 'cmn' | 'wuu' | 'sichuan' | 'tl' | 'es' | 'vi' | 'ceb' | 'ilo'
  targetLang: TargetLang
  source: string
}): PhraseEntry | null {
  const sources =
    opts.sourceLang === 'yue' ? yueSttVariants(opts.source) : [opts.source.trim()]
  for (const source of sources) {
    const hit = index.get(keyFor(opts.sourceLang, opts.targetLang, source))
    if (hit) return hit
  }
  return null
}

/** Common Cantonese STT repairs before phrase-memory lookup. */
function yueSttVariants(source: string): string[] {
  const trimmed = source.trim()
  const out = [trimmed]
  // Dropped 唔 between repeated syllables: 明明白 → 明唔明白
  const repaired = trimmed.replace(/([\u3400-\u9fff])\1/g, '$1唔$1')
  if (repaired !== trimmed) out.push(repaired)
  return out
}

function romanizationForTargetText(han: string, targetLang: TargetLang): string | undefined {
  const needle = normalizeLookupKey(han)
  if (!needle) return undefined
  for (const entry of raw.entries) {
    if (entry.targetLang !== targetLang) continue
    if (normalizeLookupKey(entry.text) === needle && entry.romanization?.trim()) {
      return entry.romanization.trim()
    }
  }
  return undefined
}

function alternativeRomanizationsFor(
  entry: PhraseEntry,
  alternatives: string[],
  targetLang: 'wuu' | 'sichuan',
): string[] | undefined {
  if (!alternatives.length) return undefined
  const curated = entry.alternativeRomanizations || []
  const entryAlts = entry.alternatives || []
  const out = alternatives.map((alt) => {
    const idx = entryAlts.indexOf(alt)
    const fromCurated = idx >= 0 ? curated[idx]?.trim() : ''
    if (fromCurated) return fromCurated
    return romanizationForTargetText(alt, targetLang) || ''
  })
  return out.some(Boolean) ? out : undefined
}

export function dictionaryTranslate(opts: {
  sourceLang: 'en' | 'yue' | 'cmn' | 'wuu' | 'sichuan' | 'tl' | 'es' | 'vi' | 'ceb' | 'ilo'
  targetLang: TargetLang
  source: string
  wantAlternatives?: boolean
}): {
  text: string
  alternatives: string[]
  entry: PhraseEntry
  romanization?: string
  sandhiHint?: string
  ipa?: string
  alternativeRomanizations?: string[]
} | null {
  const entry = lookupPhrase(opts)
  if (!entry) return null
  const alternatives =
    opts.wantAlternatives &&
    (entry.targetLang === 'yue' ||
      entry.targetLang === 'en' ||
      entry.targetLang === 'wuu' ||
      entry.targetLang === 'sichuan' ||
      entry.targetLang === 'tl' ||
      entry.targetLang === 'es' ||
      entry.targetLang === 'vi' ||
      entry.targetLang === 'ceb' ||
      entry.targetLang === 'ilo')
      ? uniqStrings(entry.text, entry.alternatives || [])
      : []
  const alternativeRomanizations =
    opts.targetLang === 'wuu' || opts.targetLang === 'sichuan'
      ? alternativeRomanizationsFor(entry, alternatives, opts.targetLang)
      : undefined
  return {
    text: entry.text,
    alternatives,
    entry,
    romanization: entry.romanization,
    sandhiHint: entry.sandhiHint,
    ipa: entry.ipa,
    ...(alternativeRomanizations ? { alternativeRomanizations } : {}),
  }
}

export function dictionaryStats() {
  return { version: raw.version, entries: raw.entries.length }
}
