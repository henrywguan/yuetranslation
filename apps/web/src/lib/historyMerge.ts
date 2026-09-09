import type { ConversationTurn } from './types'

const MAX_TURNS = 80

/** Translation history retention — each turn expires 14 days after `at`. */
export const HISTORY_TTL_MS = 14 * 24 * 60 * 60 * 1000

/** Drop turns older than the retention window (or missing a valid `at`). */
export function expireHistoryTurns(
  turns: ConversationTurn[],
  now = Date.now(),
): ConversationTurn[] {
  const cutoff = now - HISTORY_TTL_MS
  return turns.filter((t) => typeof t.at === 'number' && Number.isFinite(t.at) && t.at >= cutoff)
}

/** Merge by id; newest `at` wins; drop expired; keep MAX_TURNS. */
export function mergeHistory(
  a: ConversationTurn[],
  b: ConversationTurn[],
  now = Date.now(),
): ConversationTurn[] {
  const map = new Map<string, ConversationTurn>()
  for (const t of expireHistoryTurns([...a, ...b], now)) {
    const prev = map.get(t.id)
    if (!prev || t.at >= prev.at) map.set(t.id, t)
  }
  return [...map.values()].sort((x, y) => y.at - x.at).slice(0, MAX_TURNS)
}

/** True when a hydrate merge added/changed turns vs the account copy. */
export function shouldPushHydratedHistory(
  merged: ConversationTurn[],
  remote: ConversationTurn[],
): boolean {
  if (merged.length !== remote.length) return true
  for (let i = 0; i < merged.length; i++) {
    const a = merged[i]
    const b = remote[i]
    if (!a || !b) return true
    if (a.id !== b.id || a.at !== b.at || a.translation !== b.translation || a.source !== b.source) {
      return true
    }
  }
  return false
}

export { MAX_TURNS }
