import assert from 'node:assert/strict'
import {
  emptyHarborProgress,
  harborProgressEqual,
  mergeHarborProgress,
  sanitizeHarborProgress,
} from './progressMerge.ts'

assert.deepEqual(sanitizeHarborProgress(null), emptyHarborProgress())

const a = {
  cleared: ['introduction'],
  stepCursor: { 'lesson-1': 2 },
  correctCount: 3,
  gold: 5,
}
const b = {
  cleared: ['lesson-1'],
  stepCursor: { 'lesson-1': 5, 'lesson-2': 1 },
  correctCount: 10,
  gold: 40,
}
const merged = mergeHarborProgress(a, b)
assert.deepEqual([...merged.cleared].sort(), ['introduction', 'lesson-1'])
assert.equal(merged.stepCursor['lesson-1'], 5)
assert.equal(merged.stepCursor['lesson-2'], 1)
assert.equal(merged.correctCount, 10)
assert.equal(merged.gold, 40)
assert.equal(harborProgressEqual(merged, merged), true)
assert.equal(harborProgressEqual(merged, a), false)

console.log('harborProgress.smoke: ok')
