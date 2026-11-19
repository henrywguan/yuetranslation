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
  sourceLang: 'en' | 'yue' | 'cmn' | 'wuu' | 'sichuan' | 'tl' | 'es' | 'eses' | 'vi' | 'th' | 'lo' | 'ko' | 'ja' | 'id' | 'ms' | 'pt' | 'fr' | 'hi' | 'km' | 'my' | 'jv' | 'it' | 'de' | 'nl' | 'ar' | 'arsa' | 'ta' | 'ptpt' | 'tr' | 'bn' | 'te' | 'gu' | 'kn' | 'pl' | 'ro' | 'cs' | 'el' | 'hu' | 'sv' | 'ru' | 'uk' | 'he' | 'fa' | 'ur' | 'ml' | 'mr' | 'pa' | 'or' | 'si' | 'ne' | 'da' | 'nb' | 'fi' | 'sk' | 'hr' | 'ca' | 'az' | 'kk' | 'uz' | 'bg' | 'sr' | 'sw' | 'af' | 'et' | 'lv' | 'lt' | 'ga' | 'cy' | 'eu' | 'gl' | 'mt' | 'is' | 'bs' | 'sq' | 'zu' | 'so' | 'as' | 'mk' | 'mn' | 'hy' | 'ka' | 'am' | 'ps' | 'ceb' | 'ilo' | 'bcl' | 'hak' | 'teo' | 'nan'
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
  targetLang: 'wuu' | 'sichuan' | 'hak' | 'teo' | 'nan',
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
  sourceLang: 'en' | 'yue' | 'cmn' | 'wuu' | 'sichuan' | 'tl' | 'es' | 'eses' | 'vi' | 'th' | 'lo' | 'ko' | 'ja' | 'id' | 'ms' | 'pt' | 'fr' | 'hi' | 'km' | 'my' | 'jv' | 'it' | 'de' | 'nl' | 'ar' | 'arsa' | 'ta' | 'ptpt' | 'tr' | 'bn' | 'te' | 'gu' | 'kn' | 'pl' | 'ro' | 'cs' | 'el' | 'hu' | 'sv' | 'ru' | 'uk' | 'he' | 'fa' | 'ur' | 'ml' | 'mr' | 'pa' | 'or' | 'si' | 'ne' | 'da' | 'nb' | 'fi' | 'sk' | 'hr' | 'ca' | 'az' | 'kk' | 'uz' | 'bg' | 'sr' | 'sw' | 'af' | 'et' | 'lv' | 'lt' | 'ga' | 'cy' | 'eu' | 'gl' | 'mt' | 'is' | 'bs' | 'sq' | 'zu' | 'so' | 'as' | 'mk' | 'mn' | 'hy' | 'ka' | 'am' | 'ps' | 'ceb' | 'ilo' | 'bcl' | 'hak' | 'teo' | 'nan'
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
      entry.targetLang === 'eses' ||
      entry.targetLang === 'vi' ||
      entry.targetLang === 'th' ||
      entry.targetLang === 'lo' ||
      entry.targetLang === 'ko' ||
      entry.targetLang === 'nl' ||
      entry.targetLang === 'ar' ||
      entry.targetLang === 'arsa' ||
      entry.targetLang === 'ta' ||
      entry.targetLang === 'ptpt' ||
      entry.targetLang === 'tr' ||
      entry.targetLang === 'bn' ||
      entry.targetLang === 'te' ||
      entry.targetLang === 'gu' ||
      entry.targetLang === 'kn' ||
      entry.targetLang === 'pl' ||
      entry.targetLang === 'ro' ||
      entry.targetLang === 'cs' ||
      entry.targetLang === 'el' ||
      entry.targetLang === 'hu' ||
      entry.targetLang === 'sv' ||
      entry.targetLang === 'ru' ||
      entry.targetLang === 'uk' ||
      entry.targetLang === 'he' ||
      entry.targetLang === 'fa' ||
      entry.targetLang === 'ur' ||
      entry.targetLang === 'ml' ||
      entry.targetLang === 'mr' ||
      entry.targetLang === 'pa' ||
      entry.targetLang === 'or' ||
      entry.targetLang === 'si' ||
      entry.targetLang === 'ne' ||
      entry.targetLang === 'da' ||
      entry.targetLang === 'nb' ||
      entry.targetLang === 'fi' ||
      entry.targetLang === 'sk' ||
      entry.targetLang === 'hr' ||
      entry.targetLang === 'ca' ||
      entry.targetLang === 'az' ||
      entry.targetLang === 'kk' ||
      entry.targetLang === 'uz' ||
      entry.targetLang === 'bg' ||
      entry.targetLang === 'sr' ||
      entry.targetLang === 'sw' ||
      entry.targetLang === 'af' ||
      entry.targetLang === 'et' ||
      entry.targetLang === 'lv' ||
      entry.targetLang === 'lt' ||
      entry.targetLang === 'ga' ||
      entry.targetLang === 'cy' ||
      entry.targetLang === 'eu' ||
      entry.targetLang === 'gl' ||
      entry.targetLang === 'mt' ||
      entry.targetLang === 'is' ||
      entry.targetLang === 'bs' ||
      entry.targetLang === 'sq' ||
      entry.targetLang === 'zu' ||
      entry.targetLang === 'so' ||
      entry.targetLang === 'as' ||
      entry.targetLang === 'mk' ||
      entry.targetLang === 'mn' ||
      entry.targetLang === 'hy' ||
      entry.targetLang === 'ka' ||
      entry.targetLang === 'am' ||
      entry.targetLang === 'ps' ||
      entry.targetLang === 'de' ||
      entry.targetLang === 'it' ||
      entry.targetLang === 'jv' ||
      entry.targetLang === 'my' ||
      entry.targetLang === 'km' ||
      entry.targetLang === 'hi' ||
      entry.targetLang === 'fr' ||
      entry.targetLang === 'pt' ||
      entry.targetLang === 'ms' ||
      entry.targetLang === 'id' ||
      entry.targetLang === 'ja' ||
      entry.targetLang === 'ceb' ||
      entry.targetLang === 'ilo' ||
      entry.targetLang === 'bcl')
      ? uniqStrings(entry.text, entry.alternatives || [])
      : []
  const alternativeRomanizations =
    opts.targetLang === 'wuu' ||
    opts.targetLang === 'sichuan' ||
    opts.targetLang === 'hak' ||
    opts.targetLang === 'teo' ||
    opts.targetLang === 'nan'
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
