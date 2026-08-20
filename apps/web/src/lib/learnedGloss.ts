import { isValidDefinition } from './jyutping'
import { hasStaticGloss } from './charGloss'

const STORAGE_KEY = 'yue-learned-gloss-v1'
const MAX_ENTRIES = 1500

export type LearnedGlossSource = 'breakdown' | 'translate'

export type LearnedGlossEntry = {
  gloss: string
  jyutping?: string | null
  /** Phrase where this sense was observed (context for the learner). */
  phrase?: string
  source: LearnedGlossSource
  at: number
}

type LearnedStore = Record<string, LearnedGlossEntry>

let memory: LearnedStore | null = null

const GENERIC = 'Cantonese character'

function loadStore(): LearnedStore {
  if (memory) return memory
  if (typeof localStorage === 'undefined') {
    memory = {}
    return memory
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    memory = raw ? (JSON.parse(raw) as LearnedStore) : {}
  } catch {
    memory = {}
  }
  return memory
}

function persistStore(store: LearnedStore) {
  const ranked = Object.entries(store).sort((a, b) => b[1].at - a[1].at)
  const trimmed = Object.fromEntries(ranked.slice(0, MAX_ENTRIES)) as LearnedStore
  memory = trimmed
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    /* quota / private mode */
  }
}

function normalizeToken(token: string) {
  return token.trim()
}

/** True when a gloss is worth persisting for offline reuse. */
export function isStorableLearnedGloss(gloss: string): boolean {
  const t = gloss.trim()
  if (!t) return false
  if (t === GENERIC) return false
  if (!isValidDefinition(t)) return false
  if (t.toLowerCase() === 'cantonese character') return false
  return true
}

/** User-learned gloss for a Han token (character or short word). */
export function learnedGloss(token: string): string {
  const key = normalizeToken(token)
  if (!key) return ''
  return loadStore()[key]?.gloss?.trim() || ''
}

export function learnedEntry(token: string): LearnedGlossEntry | null {
  const key = normalizeToken(token)
  if (!key) return null
  return loadStore()[key] || null
}

/** Save a resolved gloss locally so the next offline lookup hits immediately. */
export function rememberLearnedGloss(
  token: string,
  entry: {
    gloss: string
    jyutping?: string | null
    phrase?: string
    source: LearnedGlossSource
  },
) {
  const key = normalizeToken(token)
  const gloss = entry.gloss.trim()
  if (!key || !isStorableLearnedGloss(gloss)) return
  if (hasStaticGloss(key)) return

  const store = loadStore()
  const prev = store[key]
  if (prev) {
    if (prev.gloss === gloss) {
      prev.at = Date.now()
      if (entry.jyutping && !prev.jyutping) prev.jyutping = entry.jyutping
      if (entry.phrase && !prev.phrase) prev.phrase = entry.phrase
      persistStore(store)
      return
    }
    // Prefer breakdown/contextual senses over one-off translate guesses.
    if (prev.source === 'breakdown' && entry.source === 'translate') return
  }

  store[key] = {
    gloss,
    jyutping: entry.jyutping ?? prev?.jyutping ?? null,
    phrase: entry.phrase ?? prev?.phrase,
    source: entry.source,
    at: Date.now(),
  }
  persistStore(store)
}

export function rememberBreakdownRows(
  rows: { char: string; jyutping: string | null; meaning: string }[],
  phrase?: string,
) {
  for (const row of rows) {
    rememberLearnedGloss(row.char, {
      gloss: row.meaning,
      jyutping: row.jyutping,
      phrase,
      source: 'breakdown',
    })
  }
}

/** Dev-only: count of locally learned tokens (for console inspection). */
export function learnedGlossStats() {
  const store = loadStore()
  return { count: Object.keys(store).length, max: MAX_ENTRIES }
}
