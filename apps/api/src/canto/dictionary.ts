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
  sourceLang: 'en' | 'yue' | 'cmn' | 'wuu' | 'wuu'
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

export function dictionaryTranslate(opts: {
  sourceLang: 'en' | 'yue' | 'cmn' | 'wuu' | 'wuu'
  targetLang: TargetLang
  source: string
  wantAlternatives?: boolean
}): { text: string; alternatives: string[]; entry: PhraseEntry; romanization?: string } | null {
  const entry = lookupPhrase(opts)
  if (!entry) return null
  const alternatives =
    opts.wantAlternatives && (entry.targetLang === 'yue' || entry.targetLang === 'en' || entry.targetLang === 'wuu')
      ? uniqStrings(entry.text, entry.alternatives || [])
      : []
  return {
    text: entry.text,
    alternatives,
    entry,
    romanization: entry.romanization,
  }
}

export function dictionaryStats() {
  return { version: raw.version, entries: raw.entries.length }
}
