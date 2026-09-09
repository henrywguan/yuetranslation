import assert from 'node:assert/strict'
import { HISTORY_TTL_MS, sanitizeTurns } from './historyExpiry.js'

const DAY = 24 * 60 * 60 * 1000
const now = Date.UTC(2026, 8, 9, 12, 0, 0)

const fresh = {
  id: 'fresh',
  from: 'en',
  to: 'yue',
  source: 'hi',
  translation: '哈囉',
  at: now - DAY,
}
const stale = {
  id: 'stale',
  from: 'en',
  to: 'yue',
  source: 'bye',
  translation: '拜拜',
  at: now - HISTORY_TTL_MS - DAY,
}
const noAt = {
  id: 'no-at',
  from: 'en',
  to: 'yue',
  source: 'x',
  translation: 'y',
}

const kept = sanitizeTurns([fresh, stale, noAt, 'bad'], now)
assert.equal(kept.length, 1)
assert.equal(kept[0]?.id, 'fresh')
assert.equal(HISTORY_TTL_MS, 14 * DAY)

console.log('history.smoke: ok')
