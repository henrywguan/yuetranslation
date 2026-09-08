import type { ConversationTurn } from './types'

const MAX_TURNS = 80

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
