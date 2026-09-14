import assert from 'node:assert/strict'
import { compareLeaderboardScores, sanitizeHarborProgress } from './harborQuest.js'

assert.deepEqual(sanitizeHarborProgress(null), {
  cleared: [],
  stepCursor: {},
  correctCount: 0,
  gold: 0,
})

const cleaned = sanitizeHarborProgress({
  cleared: ['intro', 'intro', '', 3, 'lesson-1'],
  stepCursor: { 'lesson-1': 2.9, bad: 'x', 'lesson-2': -1, ok: 4 },
  correctCount: 12.7,
  gold: 55.8,
})
assert.deepEqual(cleaned.cleared, ['intro', 'lesson-1'])
assert.deepEqual(cleaned.stepCursor, { 'lesson-1': 2, ok: 4 })
assert.equal(cleaned.correctCount, 12)
assert.equal(cleaned.gold, 55)

assert.ok(compareLeaderboardScores({ gold: 20, correctCount: 1, clearedCount: 0 }, { gold: 10, correctCount: 99, clearedCount: 9 }) < 0)
assert.ok(compareLeaderboardScores({ gold: 10, correctCount: 5, clearedCount: 0 }, { gold: 10, correctCount: 2, clearedCount: 9 }) < 0)
assert.equal(compareLeaderboardScores({ gold: 1, correctCount: 1, clearedCount: 1 }, { gold: 1, correctCount: 1, clearedCount: 1 }), 0)

console.log('harborQuest.smoke: ok')
