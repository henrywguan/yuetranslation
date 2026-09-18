import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  HARBOR_BEAUTY_SKUS,
  harborBeautyIsUnlocked,
  harborBeautyLockedSku,
  harborBeautySkusForAppearance,
  harborBeautyStarterOwned,
  harborBeautyUnlockCost,
  sanitizeHarborBeautyOwned,
} from './harborBeauty.ts'
import { HARBOR_DEFAULT_APPEARANCE } from './harborAppearance.ts'
import {
  HARBOR_FREE_EVENTS,
  HARBOR_SHOWOFF_CATALOG,
  claimHarborFreeEvent,
  emptyHarborShowoffBag,
  harborShowoffAccent,
  harborShowoffForKind,
  mergeHarborShowoffBag,
  sanitizeHarborShowoffBag,
} from './harborShowoff.ts'
import { emptyHarborProgress, mergeHarborProgress, sanitizeHarborProgress } from './progressMerge.ts'

assert.ok(HARBOR_BEAUTY_SKUS.length >= 12, 'beauty SKU table populated')
const starter = harborBeautyStarterOwned()
assert.ok(starter.every((id) => harborBeautyIsUnlocked(id, starter)))
assert.equal(harborBeautyIsUnlocked('beauty-hair-twin', starter), false, 'twin hair is premium')
assert.equal(harborBeautyIsUnlocked('beauty-hair-wave', starter), false, 'wave hair is premium')
assert.equal(harborBeautyIsUnlocked('beauty-hair-ridge', starter), false, 'ridge hair is premium')
assert.equal(harborBeautyIsUnlocked('beauty-hair-bald', starter), true, 'tonsure is free')
assert.equal(harborBeautyIsUnlocked('beauty-hair-curtains', starter), true, 'curtains are free')
assert.equal(harborBeautyIsUnlocked('beauty-hair-pony', starter), true, 'ponytail is free')

const locked = harborBeautyLockedSku(
  { ...HARBOR_DEFAULT_APPEARANCE, hairStyle: 'twin' },
  starter,
)
assert.equal(locked?.id, 'beauty-hair-twin')
const cost = harborBeautyUnlockCost(
  { ...HARBOR_DEFAULT_APPEARANCE, hairStyle: 'twin', faceStyle: 'sharp' },
  starter,
)
assert.ok(cost.cost >= 48, 'premium bundle costs ferry coins')
assert.ok(cost.missing.includes('beauty-hair-twin'))
assert.ok(cost.missing.includes('beauty-face-sharp'))

const owned = sanitizeHarborBeautyOwned(['beauty-hair-twin', 'nope', 3])
assert.ok(owned.includes('beauty-hair-twin'))
assert.ok(!owned.includes('nope'))
assert.ok(harborBeautySkusForAppearance(HARBOR_DEFAULT_APPEARANCE).length === 5)

assert.ok(HARBOR_SHOWOFF_CATALOG.some((i) => i.kind === 'nametag' && i.tier === 'vip'))
assert.ok(HARBOR_SHOWOFF_CATALOG.some((i) => i.tier === 'event' && i.price === 0))
assert.ok(harborShowoffForKind('nametag').length >= 4)
assert.equal(harborShowoffAccent('tag-phoenix'), 0xf0d060)

const bag0 = emptyHarborShowoffBag()
assert.ok(bag0.owned.includes('tag-plain'))
assert.ok(!bag0.owned.includes('tag-lantern-fest'), 'event items not starter-owned')

const claim1 = claimHarborFreeEvent(bag0, 'event-lantern-fest')
assert.equal(claim1.already, false)
assert.ok(claim1.granted.includes('tag-lantern-fest'))
assert.ok(claim1.bag.owned.includes('pet-lantern-fox'))
assert.ok(claim1.bag.claimedEvents.includes('event-lantern-fest'))

const claim2 = claimHarborFreeEvent(claim1.bag, 'event-lantern-fest')
assert.equal(claim2.already, true)
assert.deepEqual(claim2.granted, [])

assert.equal(HARBOR_FREE_EVENTS.length, 3)

const mergedShow = mergeHarborShowoffBag(bag0, claim1.bag)
assert.ok(mergedShow.owned.includes('tag-lantern-fest'))

const progress = sanitizeHarborProgress({
  beautyOwned: ['beauty-hair-twin'],
  showoff: {
    owned: ['tag-plain', 'tag-jade', 'tag-lantern-fest'],
    look: { nametag: 'tag-jade', bubble: 'bubble-plain', chair: 'chair-stool', pet: 'pet-none', emote: null },
    claimedEvents: ['event-lantern-fest'],
  },
})
assert.ok(progress.beautyOwned.includes('beauty-hair-twin'))
assert.equal(progress.showoff.look.nametag, 'tag-jade')
assert.ok(progress.showoff.claimedEvents.includes('event-lantern-fest'))

const mergedP = mergeHarborProgress(emptyHarborProgress(), progress)
assert.ok(mergedP.beautyOwned.includes('beauty-hair-twin'))
assert.equal(mergedP.showoff.look.nametag, 'tag-jade')

const dirty = sanitizeHarborShowoffBag({
  owned: ['tag-jade', 'hacked'],
  look: { nametag: 'tag-jade', bubble: 'bubble-plain', chair: 'chair-stool', pet: 'pet-none' },
  claimedEvents: ['event-nope', 'event-midautumn'],
})
assert.ok(!dirty.owned.includes('hacked'))
assert.ok(dirty.claimedEvents.includes('event-midautumn'))
assert.ok(!dirty.claimedEvents.includes('event-nope'))

const prd = readFileSync(new URL('../../../../../docs/harbor-quest/character-looks-v1-v4.md', import.meta.url), 'utf8')
assert.match(prd, /Fashion overlay[\s\S]*Rejected/, 'PRD rejects fashion overlay')
assert.match(prd, /Gacha[\s\S]*deferred|not yet/i, 'PRD defers gacha')
assert.match(prd, /Free event/, 'PRD locks free events')

const canvasSrc = readFileSync(new URL('./HarborWorldCanvas.tsx', import.meta.url), 'utf8')
assert.match(canvasSrc, /nametagFrame/, 'canvas accepts nametagFrame')
assert.match(canvasSrc, /setNametagFrame|setLocalUsername\(name, frame\)/, 'canvas syncs frame')

const stageSrc = readFileSync(new URL('./HarborStage.tsx', import.meta.url), 'utf8')
assert.match(stageSrc, /nametagFrame/, 'stage passes nametagFrame')

const playSrc = readFileSync(new URL('./LearnPlay.tsx', import.meta.url), 'utf8')
assert.match(playSrc, /claimHarborFreeEventProgress/, 'Save Shack claims free events')
assert.match(playSrc, /equipHarborShowoff/, 'Save Shack equips nametag plates')
assert.match(playSrc, /purchaseHarborBeautySku/, 'barber unlocks premium beauty')

console.log('harborBeautyShowoff.smoke: ok')
