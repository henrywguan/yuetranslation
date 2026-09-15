import assert from 'node:assert/strict'
import {
  emptyHarborProgress,
  harborProgressEqual,
  mergeHarborProgress,
  sanitizeHarborProgress,
} from './progressMerge.ts'
import { missionBaseXp, missionXpAward, sailorLevelFromXp } from './xpRewards.ts'
import type { HarborLevel } from './curriculum.ts'

assert.deepEqual(sanitizeHarborProgress(null), emptyHarborProgress())

const a = {
  cleared: ['introduction'],
  stepCursor: { 'lesson-1': 2 },
  correctCount: 3,
  gold: 5,
  xp: 100,
  missionClears: { introduction: 1 },
}
const b = {
  cleared: ['lesson-1'],
  stepCursor: { 'lesson-1': 5, 'lesson-2': 1 },
  correctCount: 10,
  gold: 40,
  xp: 250,
  missionClears: { introduction: 2, 'lesson-1': 1 },
}
const merged = mergeHarborProgress(a, b)
assert.deepEqual([...merged.cleared].sort(), ['introduction', 'lesson-1'])
assert.equal(merged.stepCursor['lesson-1'], 5)
assert.equal(merged.stepCursor['lesson-2'], 1)
assert.equal(merged.correctCount, 10)
assert.equal(merged.gold, 40)
assert.equal(merged.xp, 250)
assert.equal(merged.missionClears.introduction, 2)
assert.equal(merged.missionClears['lesson-1'], 1)
assert.equal(harborProgressEqual(merged, merged), true)
assert.equal(harborProgressEqual(merged, a), false)

// Backfill cleared → missionClears
const backfilled = sanitizeHarborProgress({
  cleared: ['introduction'],
  stepCursor: {},
  correctCount: 0,
  gold: 0,
})
assert.equal(backfilled.missionClears.introduction, 1)
assert.equal(backfilled.xp, 0)

assert.equal(missionXpAward(100, 0), 100)
assert.equal(missionXpAward(100, 1), 50)
assert.equal(missionXpAward(101, 2), 50)
assert.equal(sailorLevelFromXp(0), 1)
assert.ok(sailorLevelFromXp(400) >= 2)

const fakeLevel = {
  id: 'lesson-1',
  chapter: 1,
  steps: [{}, {}, {}],
} as unknown as HarborLevel
assert.ok(missionBaseXp(fakeLevel) > 80)

console.log('harborProgress.smoke: ok')
