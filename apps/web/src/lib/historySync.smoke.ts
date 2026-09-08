import assert from 'node:assert/strict'
import { mergeHistory, shouldPushHydratedHistory } from './historyMerge.ts'
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

const merged = mergeHistory([a], [b])
assert.equal(merged.length, 2)

console.log('historySync.smoke: ok')
