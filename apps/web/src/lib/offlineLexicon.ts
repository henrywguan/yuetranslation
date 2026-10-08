import type { OfflinePackPayload } from './offlinePackTypes.ts'

const EN_STOP = new Set([
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
])

export type OfflineTranslateResult = {
  text: string
  definition?: string
  definitions?: string[]
  alternatives?: string[]
  notes: string[]
}

type PhraseHit = { text: string; alternatives?: string[] }

type OfflineIndex = {
  phraseEnYue: Map<string, PhraseHit>
  phraseYueEn: Map<string, PhraseHit>
  seedYueEn: Map<string, string>
  glossYueEn: Map<string, string>
  enToYue: Map<string, string[]>
}

let index: OfflineIndex | null = null

function normalizeEn(source: string): string {
  return source.trim().toLowerCase().replace(/\s+/g, ' ')
}

function normalizeYue(source: string): string {
  return source.trim().replace(/\s+/g, ' ')
}

function splitGlossSenses(gloss: string): string[] {
  return gloss
    .split(/[;；]|(?:\s+\/\s+)/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function isMetaSense(sense: string): boolean {
  const lower = sense.toLowerCase()
  return (
    lower.includes('particle') ||
    lower.includes('classifier') ||
    lower.includes('measure word')
  )
}

export function buildOfflineIndex(pack: OfflinePackPayload): OfflineIndex {
  const phraseEnYue = new Map<string, PhraseHit>()
  const phraseYueEn = new Map<string, PhraseHit>()
  const seedYueEn = new Map<string, string>()
  const glossYueEn = new Map<string, string>()
  const enToYue = new Map<string, string[]>()

  const addEnSense = (enSense: string, yueHead: string) => {
    const key = normalizeEn(enSense)
    if (!key) return
    const list = enToYue.get(key) ?? []
    if (!list.includes(yueHead)) list.push(yueHead)
    enToYue.set(key, list)
  }

  for (const entry of pack.phrases) {
    const hit: PhraseHit = { text: entry.text, alternatives: entry.alternatives }
    if (entry.sourceLang === 'en' && entry.targetLang === 'yue') {
      phraseEnYue.set(normalizeEn(entry.source), hit)
    } else if (entry.sourceLang === 'yue' && entry.targetLang === 'en') {
      phraseYueEn.set(normalizeYue(entry.source), hit)
    }
  }

  for (const [yue, gloss] of Object.entries(pack.seed)) {
    const yKey = normalizeYue(yue)
    seedYueEn.set(yKey, gloss)
    for (const sense of splitGlossSenses(gloss)) {
      if (isMetaSense(sense)) continue
      addEnSense(sense, yue)
    }
  }

  if (pack.glossEntries) {
    for (const [yue, entry] of Object.entries(pack.glossEntries)) {
      const yKey = normalizeYue(yue)
      glossYueEn.set(yKey, entry.gloss)
      for (const sense of splitGlossSenses(entry.gloss)) {
        if (isMetaSense(sense)) continue
        addEnSense(sense, yue)
      }
    }
  }

  return { phraseEnYue, phraseYueEn, seedYueEn, glossYueEn, enToYue }
}

export function setOfflinePack(pack: OfflinePackPayload | null): void {
  index = pack ? buildOfflineIndex(pack) : null
}

export function hasOfflinePack(): boolean {
  return index !== null
}

function contentTokens(enKey: string): string[] {
  return enKey.split(' ').filter((t) => t && !EN_STOP.has(t))
}

function lookupYueForEnToken(token: string, enToYue: Map<string, string[]>): string | null {
  const hits = enToYue.get(token)
  return hits?.[0] ?? null
}

export function offlineTranslate(
  from: string,
  to: string,
  source: string,
  wantAlternatives?: boolean,
): OfflineTranslateResult | null {
  if (!index) return null
  if (from === to) return null
  if (!((from === 'en' && to === 'yue') || (from === 'yue' && to === 'en'))) return null

  if (from === 'en' && to === 'yue') {
    const key = normalizeEn(source)
    if (!key) return null

    const phrase = index.phraseEnYue.get(key)
    if (phrase) {
      return {
        text: phrase.text,
        alternatives: wantAlternatives ? phrase.alternatives : undefined,
        notes: ['offline:phrase'],
      }
    }

    const whole = lookupYueForEnToken(key, index.enToYue)
    if (whole) {
      return { text: whole, notes: ['offline:lexicon'] }
    }

    const tokens = contentTokens(key)
    if (tokens.length >= 2 && tokens.length <= 8) {
      const parts: string[] = []
      for (const token of tokens) {
        const head = lookupYueForEnToken(token, index.enToYue)
        if (!head) return null
        parts.push(head)
      }
      return { text: parts.join(''), notes: ['offline:compose'] }
    }

    if (tokens.length === 1) {
      const head = lookupYueForEnToken(tokens[0]!, index.enToYue)
      if (head) return { text: head, notes: ['offline:lexicon'] }
    }

    return null
  }

  const yKey = normalizeYue(source)
  if (!yKey) return null

  const phrase = index.phraseYueEn.get(yKey)
  if (phrase) {
    return {
      text: phrase.text,
      alternatives: wantAlternatives ? phrase.alternatives : undefined,
      notes: ['offline:phrase'],
    }
  }

  const seedGloss = index.seedYueEn.get(yKey)
  if (seedGloss) {
    const senses = splitGlossSenses(seedGloss).filter((s) => !isMetaSense(s))
    if (senses.length) {
      return {
        text: senses[0]!,
        definition: senses[0],
        definitions: senses.length > 1 ? senses : undefined,
        notes: ['offline:seed'],
      }
    }
  }

  const gloss = index.glossYueEn.get(yKey)
  if (gloss) {
    const senses = splitGlossSenses(gloss).filter((s) => !isMetaSense(s))
    if (senses.length) {
      return {
        text: senses[0]!,
        definition: senses[0],
        definitions: senses.length > 1 ? senses : undefined,
        notes: ['offline:gloss'],
      }
    }
  }

  return null
}
