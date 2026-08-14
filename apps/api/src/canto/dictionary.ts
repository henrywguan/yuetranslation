import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { normalizeLookupKey, uniqStrings } from './normalize.js'
import type { PhraseEntry, TargetLang } from './types.js'

type PhrasesFile = { version: number; entries: PhraseEntry[] }

const dir = dirname(fileURLToPath(import.meta.url))
const raw = JSON.parse(readFileSync(join(dir, 'data/phrases.json'), 'utf8')) as PhrasesFile

type IndexKey = string

function keyFor(sourceLang: string, targetLang: TargetLang, source: string): IndexKey {
  return `${sourceLang}|${targetLang}|${normalizeLookupKey(source)}`
}

const index = new Map<IndexKey, PhraseEntry>()

for (const entry of raw.entries) {
  index.set(keyFor(entry.sourceLang, entry.targetLang, entry.source), entry)
}

export function lookupPhrase(opts: {
  sourceLang: 'en' | 'yue' | 'cmn'
  targetLang: TargetLang
  source: string
}): PhraseEntry | null {
  return index.get(keyFor(opts.sourceLang, opts.targetLang, opts.source)) || null
}

export function dictionaryTranslate(opts: {
  sourceLang: 'en' | 'yue' | 'cmn'
  targetLang: TargetLang
  source: string
  wantAlternatives?: boolean
}): { text: string; alternatives: string[]; entry: PhraseEntry } | null {
  const entry = lookupPhrase(opts)
  if (!entry) return null
  const alternatives =
    opts.wantAlternatives && entry.targetLang === 'yue'
      ? uniqStrings(entry.text, entry.alternatives || [])
      : []
  return { text: entry.text, alternatives, entry }
}

export function dictionaryStats() {
  return { version: raw.version, entries: raw.entries.length }
}
