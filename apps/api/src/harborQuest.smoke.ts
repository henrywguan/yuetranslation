import assert from 'node:assert/strict'
import { sanitizeHarborProgress } from './harborQuest.js'

const empty = sanitizeHarborProgress(null)
assert.deepEqual(empty.cleared, [])
assert.deepEqual(empty.stepCursor, {})
assert.equal(empty.correctCount, 0)
assert.equal(empty.coins, 40)
assert.ok(empty.owned.includes('hat-straw'))
assert.equal(empty.look.hat, 'hat-straw')
assert.equal(empty.lastSavedAt, 0)

const cleaned = sanitizeHarborProgress({
  cleared: ['intro', 'intro', '', 3, 'lesson-1'],
  stepCursor: { 'lesson-1': 2.9, bad: 'x', 'lesson-2': -1, ok: 4 },
  correctCount: 12.7,
  coins: 55.2,
  owned: ['hat-bamboo', 'nope', 'hand-fan'],
  look: { hat: 'hat-festival', top: 'top-jade', bottom: 'bottom-ink', shoes: 'shoes-storm', hand: 'hand-oar', junk: 1 },
  lastSavedAt: 1700000000000,
})
assert.deepEqual(cleaned.cleared, ['intro', 'lesson-1'])
assert.deepEqual(cleaned.stepCursor, { 'lesson-1': 2, ok: 4 })
assert.equal(cleaned.correctCount, 12)
assert.equal(cleaned.coins, 55)
assert.ok(cleaned.owned.includes('hat-bamboo'))
assert.ok(cleaned.owned.includes('hand-fan'))
assert.ok(cleaned.owned.includes('hat-straw'), 'starter gear kept')
assert.equal(cleaned.look.hat, 'hat-festival')
assert.equal(cleaned.look.hand, 'hand-oar')
assert.equal(cleaned.lastSavedAt, 1700000000000)

console.log('harborQuest.smoke: ok')
