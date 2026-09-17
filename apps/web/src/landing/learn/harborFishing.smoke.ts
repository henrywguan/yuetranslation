/**
 * Offline smoke for Guan fishing catalog + cast rules.
 */
import assert from 'node:assert/strict'
import {
  GUAN_FISH_SPOTS,
  GUAN_FISHING_HUT,
  GUAN_SATELLITE_ISLANDS,
  HARBOR_FISH_BAITS,
  HARBOR_FISH_CATALOG,
  HARBOR_FISH_TOOLS,
  attemptHarborFishCast,
  buyHarborFishBait,
  buyHarborFishTool,
  emptyHarborFishingBag,
  fishingXpToLevel,
  mergeHarborFishingBag,
  nearestGuanFishSpot,
  sanitizeHarborFishingBag,
  sellHarborFish,
} from './harborFishing'

assert.ok(HARBOR_FISH_CATALOG.length >= 12, 'fish catalog breadth')
assert.ok(HARBOR_FISH_TOOLS.length >= 5, 'tool breadth')
assert.ok(HARBOR_FISH_BAITS.length >= 4, 'bait breadth')
assert.ok(GUAN_FISH_SPOTS.length >= 6, 'spot breadth')
assert.ok(GUAN_SATELLITE_ISLANDS.length >= 4, 'satellite islands')
assert.equal(GUAN_FISHING_HUT.id, 'fishing-hut')

assert.equal(fishingXpToLevel(0), 1)
assert.ok(fishingXpToLevel(45 * 98 * 98) >= 90, 'high XP reaches high level')

const bag0 = emptyHarborFishingBag()
assert.ok(bag0.tools.includes('tool-net'))

// Force catch with seeded rng that always succeeds and picks first weight
const catchOk = attemptHarborFishCast(bag0, 'spot-musa-pier', () => 0.01)
assert.equal(catchOk.ok, true)
if (catchOk.ok) {
  assert.ok(catchOk.bag.fishingXp > 0)
  assert.ok((catchOk.bag.fish[catchOk.fish.id] ?? 0) >= 1)
  assert.ok(catchOk.bag.log.includes(catchOk.fish.id))
}

const miss = attemptHarborFishCast(bag0, 'spot-musa-pier', () => 0.99)
assert.equal(miss.ok, false)

const sold = sellHarborFish(catchOk.ok ? catchOk.bag : bag0, 'fish-shrimp', 99)
assert.ok(sold.coins >= 0)

const bought = buyHarborFishTool({ ...bag0, fishingXp: 45 * 4 * 4 }, 'tool-rod', 100)
assert.equal(bought.ok, true)
if (bought.ok) assert.ok(bought.bag.tools.includes('tool-rod'))

const bait = buyHarborFishBait(bag0, 'bait-feather', 100)
assert.equal(bait.ok, true)

const near = nearestGuanFishSpot(GUAN_FISH_SPOTS[0]!.x, GUAN_FISH_SPOTS[0]!.z, 3)
assert.ok(near)

const merged = mergeHarborFishingBag(bag0, sanitizeHarborFishingBag(catchOk.ok ? catchOk.bag : bag0))
assert.ok(merged.fishingXp >= bag0.fishingXp)

console.log('harborFishing.smoke: ok', HARBOR_FISH_CATALOG.length, 'fish', GUAN_FISH_SPOTS.length, 'spots')
