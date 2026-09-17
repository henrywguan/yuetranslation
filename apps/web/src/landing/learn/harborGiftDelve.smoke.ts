/**
 * Harbor gift + delve pure helpers smoke (no DOM / paid APIs).
 */
import assert from 'node:assert/strict'
import { applyCosmeticGift, isGiftableLanternId } from './harborGift.ts'
import { buildHarborDelve, HARBOR_DELVE_COINS_PER_HIT } from './harborDelve.ts'
import { sanitizeHarborProgress } from './progressMerge.ts'
import { isHarborTitleId } from './harborTitles.ts'

assert.equal(isGiftableLanternId('lantern-paper-amber'), false, 'starter lantern not giftable')
assert.equal(isGiftableLanternId('lantern-paper-jade'), true, 'priced lantern giftable')
assert.equal(isGiftableLanternId('hat-straw'), false, 'non-lantern not giftable')
assert.ok(isHarborTitleId('title-harbor-coach'))

const gift = applyCosmeticGift({
  fromOwned: ['lantern-paper-amber', 'lantern-paper-jade', 'hat-straw'],
  fromBanked: [],
  fromLookLantern: 'lantern-paper-jade',
  fromTitles: ['title-river-scout'],
  toOwned: ['lantern-paper-amber'],
  toBanked: [],
  toTitles: ['title-river-scout'],
  kind: 'lantern',
  itemId: 'lantern-paper-jade',
})
assert.equal(gift.ok, true)
if (gift.ok) {
  assert.ok(!gift.fromOwned.includes('lantern-paper-jade'))
  assert.ok(gift.toOwned.includes('lantern-paper-jade'))
  assert.equal(gift.fromLookLantern, 'lantern-paper-amber')
  assert.ok(gift.fromTitles.includes('title-generous'))
  assert.ok(gift.toTitles.includes('title-dock-mate'))
}

const badXp = applyCosmeticGift({
  fromOwned: ['lantern-paper-jade'],
  fromBanked: [],
  fromLookLantern: 'lantern-paper-amber',
  fromTitles: [],
  toOwned: [],
  toBanked: [],
  toTitles: [],
  kind: 'lantern',
  itemId: 'hat-bamboo',
})
assert.equal(badXp.ok, false)

const titleGift = applyCosmeticGift({
  fromOwned: [],
  fromBanked: [],
  fromLookLantern: 'lantern-paper-amber',
  fromTitles: ['title-harbor-coach'],
  toOwned: [],
  toBanked: [],
  toTitles: [],
  kind: 'title',
  itemId: 'title-harbor-coach',
})
assert.equal(titleGift.ok, true)
if (titleGift.ok) {
  assert.ok(titleGift.fromTitles.includes('title-harbor-coach'), 'title copy keeps giver')
  assert.ok(titleGift.toTitles.includes('title-harbor-coach'))
}

const delve = buildHarborDelve(42, 5)
assert.equal(delve.length, 5)
assert.ok(delve.every((r) => r.choices.some((c) => c.id === r.correctId)))
assert.ok(HARBOR_DELVE_COINS_PER_HIT > 0)

const progress = sanitizeHarborProgress({
  characterCreated: true,
  ownedTitles: ['title-harbor-coach'],
  titleId: 'title-harbor-coach',
})
assert.ok(progress.ownedTitles.includes('title-river-scout'), 'river scout backfill')
assert.ok(progress.ownedTitles.includes('title-harbor-coach'))
assert.equal(progress.titleId, 'title-harbor-coach')

console.log('harborGiftDelve.smoke: ok')
