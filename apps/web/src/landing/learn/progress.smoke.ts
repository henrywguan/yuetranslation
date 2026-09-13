import assert from 'node:assert/strict'
import {
  emptyHarborProgress,
  harborProgressEqual,
  mergeHarborProgress,
  sanitizeHarborProgress,
} from './progressMerge.ts'
import {
  HARBOR_GEAR_CATALOG,
  HARBOR_GEAR_SLOTS,
  harborGearForSlot,
} from './harborGear.ts'

assert.deepEqual(sanitizeHarborProgress(null), emptyHarborProgress())

const a = {
  cleared: ['introduction'],
  stepCursor: { 'lesson-1': 2 },
  correctCount: 3,
}
const b = {
  cleared: ['lesson-1'],
  stepCursor: { 'lesson-1': 5, 'lesson-2': 1 },
  correctCount: 10,
  coins: 80,
  owned: ['hat-bamboo', 'hand-fan'],
  look: {
    hat: 'hat-bamboo',
    top: 'top-harbor',
    bottom: 'bottom-travel',
    shoes: 'shoes-leather',
    hand: 'hand-fan',
  },
  lastSavedAt: 100,
}
const merged = mergeHarborProgress(a, b)
assert.deepEqual([...merged.cleared].sort(), ['introduction', 'lesson-1'])
assert.equal(merged.stepCursor['lesson-1'], 5)
assert.equal(merged.stepCursor['lesson-2'], 1)
assert.equal(merged.correctCount, 10)
assert.equal(merged.coins, 80)
assert.ok(merged.owned.includes('hat-bamboo'))
assert.equal(merged.look.hat, 'hat-bamboo')
assert.equal(merged.lastSavedAt, 100)
assert.equal(harborProgressEqual(merged, merged), true)
assert.equal(harborProgressEqual(merged, sanitizeHarborProgress(a)), false)

assert.equal(HARBOR_GEAR_CATALOG.length, 25, '5 slots × 5 items')
for (const slot of HARBOR_GEAR_SLOTS) {
  assert.equal(harborGearForSlot(slot).length, 5, `${slot} kit size`)
}

console.log('harborProgress.smoke: ok')
