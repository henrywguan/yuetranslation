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
    boat: 'boat-canoe',
    lantern: 'lantern-paper-amber',
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

assert.equal(HARBOR_GEAR_CATALOG.length, 49, '5 clothing slots × 5 + boats/lanterns × 12')
for (const slot of HARBOR_GEAR_SLOTS) {
  const n = harborGearForSlot(slot).length
  assert.equal(n, slot === 'boat' || slot === 'lantern' ? 12 : 5, `${slot} kit size`)
}

// Legacy cloud blob without gear fields
const legacy = sanitizeHarborProgress({
  cleared: ['introduction'],
  stepCursor: { 'lesson-1': 1 },
  correctCount: 2,
})
assert.equal(legacy.coins, 0, 'missing coins on existing progress → 0')
assert.ok(legacy.owned.includes('hat-straw'))
assert.equal(legacy.look.hat, 'hat-straw')

const spent = sanitizeHarborProgress({
  ...emptyHarborProgress(),
  coins: 12,
  owned: ['hat-straw', 'top-harbor', 'bottom-travel', 'shoes-leather', 'hand-none', 'hat-bamboo'],
  look: { ...emptyHarborProgress().look, hat: 'hat-bamboo' },
  lastSavedAt: 50,
})
const mergedLegacy = mergeHarborProgress(spent, legacy)
assert.equal(mergedLegacy.coins, 12, 'merge must not refill spent coins from legacy cloud')
assert.ok(mergedLegacy.owned.includes('hat-bamboo'))
assert.equal(mergedLegacy.look.hat, 'hat-bamboo', 'local Save Shack look wins on newer stamp')


// Banked gear stays out of carried inventory across merge
const bankBlob = sanitizeHarborProgress({
  ...emptyHarborProgress(),
  owned: ['hat-straw', 'top-harbor', 'bottom-travel', 'shoes-leather', 'hand-none', 'hat-bamboo'],
  banked: ['hat-bamboo'],
  coins: 20,
})
assert.ok(!bankBlob.owned.includes('hat-bamboo'), 'banked gear removed from carried')
assert.ok(bankBlob.banked.includes('hat-bamboo'))
const mergedBank = mergeHarborProgress(bankBlob, emptyHarborProgress())
assert.ok(mergedBank.banked.includes('hat-bamboo'))
assert.ok(!mergedBank.owned.includes('hat-bamboo'))

console.log('harborProgress.smoke: ok')
