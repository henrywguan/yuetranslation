import type { ConversationTurn, Lang } from './types'
import { fetchAccountHistory, putAccountHistory } from './api'

const LOCAL_KEY = 'yue-translation-history-v1'
const MAX_TURNS = 80

function isLang(v: unknown): v is Lang {
  return v === 'en' || v === 'yue' || v === 'cmn' || v === 'wuu' || v === 'tl' || v === 'es'
}

/** Best-effort sanitize of turns from localStorage / API. */
export function sanitizeTurns(raw: unknown): ConversationTurn[] {
  if (!Array.isArray(raw)) return []
  const out: ConversationTurn[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const t = item as Record<string, unknown>
    if (typeof t.id !== 'string' || !t.id) continue
    if (!isLang(t.from) || !isLang(t.to)) continue
    if (typeof t.source !== 'string' || typeof t.translation !== 'string') continue
    const at = typeof t.at === 'number' && Number.isFinite(t.at) ? t.at : Date.now()
    const turn: ConversationTurn = {
      id: t.id,
      from: t.from,
      to: t.to,
      source: t.source,
      translation: t.translation,
      at,
    }
    if (typeof t.definition === 'string') turn.definition = t.definition
    if (Array.isArray(t.definitions)) {
      turn.definitions = t.definitions.filter((x): x is string => typeof x === 'string')
    }
    if (Array.isArray(t.alternatives)) {
      turn.alternatives = t.alternatives.filter((x): x is string => typeof x === 'string')
    }
    if (typeof t.romanization === 'string') turn.romanization = t.romanization
    if (typeof t.sandhiHint === 'string') turn.sandhiHint = t.sandhiHint
    if (typeof t.ipa === 'string') turn.ipa = t.ipa
    if (Array.isArray(t.alternativeRomanizations)) {
      turn.alternativeRomanizations = t.alternativeRomanizations.filter(
        (x): x is string => typeof x === 'string',
      )
    }
    out.push(turn)
  }
  return out.slice(0, MAX_TURNS)
}

export function readLocalHistory(): ConversationTurn[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY)
    if (!raw) return []
    return sanitizeTurns(JSON.parse(raw))
  } catch {
    return []
  }
}

export function writeLocalHistory(turns: ConversationTurn[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(turns.slice(0, MAX_TURNS)))
  } catch {
    /* quota */
  }
}

/** Merge by id; newest `at` wins; keep MAX_TURNS. */
export function mergeHistory(
  a: ConversationTurn[],
  b: ConversationTurn[],
): ConversationTurn[] {
  const map = new Map<string, ConversationTurn>()
  for (const t of [...a, ...b]) {
    const prev = map.get(t.id)
    if (!prev || t.at >= prev.at) map.set(t.id, t)
  }
  return [...map.values()].sort((x, y) => y.at - x.at).slice(0, MAX_TURNS)
}

let persistTimer: ReturnType<typeof setTimeout> | null = null
let persistLoggedIn = false

export function setHistoryPersistLoggedIn(loggedIn: boolean) {
  persistLoggedIn = loggedIn
}

/** Write local always; debounce account sync when signed in. */
export function persistHistory(turns: ConversationTurn[]) {
  const next = turns.slice(0, MAX_TURNS)
  writeLocalHistory(next)
  if (!persistLoggedIn) return
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    persistTimer = null
    void putAccountHistory(next).catch(() => {
      /* offline / unsigned — local still kept */
    })
  }, 600)
}

/** Load local + account history after bootstrap / sign-in. */
export async function hydrateHistory(loggedIn: boolean): Promise<ConversationTurn[]> {
  const local = readLocalHistory()
  setHistoryPersistLoggedIn(loggedIn)
  if (!loggedIn) return local
  try {
    const remote = await fetchAccountHistory()
    if (!remote) return local
    const merged = mergeHistory(local, remote)
    writeLocalHistory(merged)
    // Push merge up so older devices pick up local-only turns.
    void putAccountHistory(merged).catch(() => {})
    return merged
  } catch {
    return local
  }
}
