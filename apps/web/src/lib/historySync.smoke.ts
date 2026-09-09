import assert from 'node:assert/strict'
import {
  HISTORY_TTL_MS,
  expireHistoryTurns,
  mergeHistory,
  shouldPushHydratedHistory,
} from './historyMerge.ts'
import type { ConversationTurn } from './types.ts'

function turn(id: string, at: number, translation = 'hi'): ConversationTurn {
  return { id, from: 'en', to: 'yue', source: 'hi', translation, at }
}

const a = turn('a', 1)
const b = turn('b', 2)
assert.equal(shouldPushHydratedHistory([a, b], [a, b]), false)
assert.equal(shouldPushHydratedHistory([b, a], [a, b]), true)
assert.equal(shouldPushHydratedHistory([a], [a, b]), true)
assert.equal(shouldPushHydratedHistory([turn('a', 1, 'bye')], [a]), true)

const now = Date.UTC(2026, 8, 9, 12, 0, 0)
const fresh = turn('fresh', now - 60_000)
const stale = turn('stale', now - HISTORY_TTL_MS - 60_000)
assert.deepEqual(
  expireHistoryTurns([fresh, stale], now).map((t) => t.id),
  ['fresh'],
)

const merged = mergeHistory([fresh], [stale, turn('also', now)], now)
assert.equal(merged.length, 2)
assert.ok(merged.every((t) => t.id !== 'stale'))

console.log('historySync.smoke: ok')
