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
assert.equal(merged.gold, 40)
assert.equal(merged.xp, 250)
assert.equal(merged.missionClears.introduction, 2)
assert.equal(merged.missionClears['lesson-1'], 1)
assert.equal(merged.coins, 80)
assert.ok(merged.owned.includes('hat-bamboo'))
assert.equal(merged.look.hat, 'hat-bamboo')
assert.equal(merged.lastSavedAt, 100)
assert.equal(harborProgressEqual(merged, merged), true)
assert.equal(harborProgressEqual(merged, sanitizeHarborProgress(a)), false)

assert.equal(HARBOR_GEAR_CATALOG.length, 61, 'clothing + hands + 12 boats + 12 lanterns')
for (const slot of HARBOR_GEAR_SLOTS) {
  const n = harborGearForSlot(slot).length
  if (slot === 'boat' || slot === 'lantern') {
    assert.equal(n, 12, `${slot} kit size`)
  } else if (slot === 'hand') {
    // Dedicated handhelds + boat lanterns (holdable in hand)
    assert.equal(n, 8 + 12, `${slot} kit includes boat lanterns`)
  } else {
    assert.ok(n >= 5, `${slot} kit size`)
  }
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
assert.equal(legacy.missionClears.introduction, 1, 'cleared pier backfills missionClears')
assert.equal(legacy.xp, 0)

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

// Beauty / showoff progress fields survive sanitize + merge
const withLooks = sanitizeHarborProgress({
  ...emptyHarborProgress(),
  beautyOwned: ['beauty-hair-twin'],
  showoff: {
    owned: ['tag-plain', 'tag-jade'],
    look: {
      nametag: 'tag-jade',
      bubble: 'bubble-plain',
      chair: 'chair-stool',
      pet: 'pet-none',
      emote: null,
    },
    claimedEvents: [],
  },
})
assert.ok(withLooks.beautyOwned.includes('beauty-hair-twin'))
assert.equal(withLooks.showoff.look.nametag, 'tag-jade')
const mergedLooks = mergeHarborProgress(emptyHarborProgress(), withLooks)
assert.ok(mergedLooks.beautyOwned.includes('beauty-hair-twin'))
assert.equal(mergedLooks.showoff.look.nametag, 'tag-jade')

console.log('harborProgress.smoke: ok')
