/**
 * Starred travel / study phrases — separate from time-ordered History.
 * Local-only (survives refresh); not synced to the account history API.
 */

import type { ConversationTurn, Lang } from './types'

const LOCAL_KEY = 'yue-phrasebook-v1'
const MAX_CARDS = 120

export type PhraseCard = {
  id: string
  source: string
  translation: string
  from: Lang
  to: Lang
  /** Optional Jyutping / romanization line. */
  romanization?: string
  note?: string
  at: number
  /** Origin tag for UI filters. */
  origin?: 'solo' | 'conversation' | 'camera' | 'manual'
}

function isLang(v: unknown): v is Lang {
  return typeof v === 'string' && v.length >= 2 && v.length <= 8
}

export function sanitizePhraseCards(raw: unknown): PhraseCard[] {
  if (!Array.isArray(raw)) return []
  const out: PhraseCard[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const t = item as Record<string, unknown>
    if (typeof t.id !== 'string' || !t.id) continue
    if (typeof t.source !== 'string' || typeof t.translation !== 'string') continue
    if (!isLang(t.from) || !isLang(t.to)) continue
    if (typeof t.at !== 'number' || !Number.isFinite(t.at)) continue
    const card: PhraseCard = {
      id: t.id,
      source: t.source,
      translation: t.translation,
      from: t.from,
      to: t.to,
      at: t.at,
    }
    if (typeof t.romanization === 'string') card.romanization = t.romanization
    if (typeof t.note === 'string') card.note = t.note
    if (
      t.origin === 'solo' ||
      t.origin === 'conversation' ||
      t.origin === 'camera' ||
      t.origin === 'manual'
    ) {
      card.origin = t.origin
    }
    out.push(card)
  }
  return out.sort((a, b) => b.at - a.at).slice(0, MAX_CARDS)
}

export function readLocalPhrasebook(): PhraseCard[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY)
    if (!raw) return []
    return sanitizePhraseCards(JSON.parse(raw))
  } catch {
    return []
  }
}

export function writeLocalPhrasebook(cards: PhraseCard[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(cards.slice(0, MAX_CARDS)))
  } catch {
    /* quota */
  }
}

export function phraseCardKey(source: string, translation: string, from: Lang, to: Lang) {
  return `${from}|${to}|${source.trim()}|${translation.trim()}`
}

export function cardFromTurn(
  turn: ConversationTurn,
  origin: PhraseCard['origin'] = 'solo',
): PhraseCard {
  return {
    id: `pb-${turn.id}`,
    source: turn.source,
    translation: turn.translation,
    from: turn.from,
    to: turn.to,
    romanization: turn.romanization,
    at: Date.now(),
    origin,
  }
}

export function upsertPhraseCard(cards: PhraseCard[], next: PhraseCard): PhraseCard[] {
  const key = phraseCardKey(next.source, next.translation, next.from, next.to)
  const filtered = cards.filter(
    (c) => phraseCardKey(c.source, c.translation, c.from, c.to) !== key,
  )
  return [next, ...filtered].slice(0, MAX_CARDS)
}

export function removePhraseCard(cards: PhraseCard[], id: string): PhraseCard[] {
  return cards.filter((c) => c.id !== id)
}

export function isStarred(
  cards: PhraseCard[],
  source: string,
  translation: string,
  from: Lang,
  to: Lang,
): boolean {
  const key = phraseCardKey(source, translation, from, to)
  return cards.some((c) => phraseCardKey(c.source, c.translation, c.from, c.to) === key)
}

export function formatPhrasebookExport(cards: PhraseCard[]): string {
  return cards
    .map((c) => {
      const lines = [`${c.source} → ${c.translation}`]
      if (c.romanization?.trim()) lines.push(c.romanization.trim())
      return lines.join('\n')
    })
    .join('\n\n')
}
