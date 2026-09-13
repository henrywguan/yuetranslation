import assert from 'node:assert/strict'
import { sanitizeHarborProgress } from './harborQuest.js'

assert.deepEqual(sanitizeHarborProgress(null), {
  cleared: [],
  stepCursor: {},
  correctCount: 0,
})

const cleaned = sanitizeHarborProgress({
  cleared: ['intro', 'intro', '', 3, 'lesson-1'],
  stepCursor: { 'lesson-1': 2.9, bad: 'x', 'lesson-2': -1, ok: 4 },
  correctCount: 12.7,
})
assert.deepEqual(cleaned.cleared, ['intro', 'lesson-1'])
assert.deepEqual(cleaned.stepCursor, { 'lesson-1': 2, ok: 4 })
assert.equal(cleaned.correctCount, 12)

console.log('harborQuest.smoke: ok')
