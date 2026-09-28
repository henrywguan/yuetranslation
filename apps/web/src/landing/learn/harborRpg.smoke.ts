/**
 * HarborRPG safe-slice smoke — bag sanitize, scene craft, realm id wiring.
 * No paid APIs / WebGL boot.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  createHarborRpgCharacter,
  emptyHarborRpgBag,
  harborRpgLevelFromXp,
  HARBOR_RPG_MAX_CHARS,
  HARBOR_RPG_SHRINE_XP,
  mergeHarborRpgBag,
  sanitizeHarborRpgBag,
} from './harborRpgProgress.ts'
import {
  buildRpgContinentScene,
  clampRpgFootTarget,
  HARBOR_RPG_META,
  isRpgLand,
  nearestRpgInteract,
} from './harborRpgRealm.ts'
import {
  emptyHarborProgress,
  mergeHarborProgress,
  sanitizeHarborProgress,
} from './progressMerge.ts'

assert.equal(HARBOR_RPG_META.en, 'HarborRPG')
assert.equal(HARBOR_RPG_MAX_CHARS, 2)
assert.equal(harborRpgLevelFromXp(0), 1)
assert.ok(harborRpgLevelFromXp(100) >= 2)

const empty = emptyHarborRpgBag()
assert.equal(empty.characters.length, 0)
assert.ok(empty.ownedCosmetics.includes('rpg-cloak-traveler'))

const rogue = sanitizeHarborRpgBag({
  characters: [
    { id: 'rpg-a1', name: 'Jade', gender: 'female', createdAt: 1 },
    { id: 'rpg-b2', name: 'Ink', createdAt: 2 },
    { id: 'hack', name: 'No', createdAt: 3 },
    { id: 'rpg-c3', name: 'Extra', createdAt: 4 },
  ],
  activeCharacterId: 'hack',
  xp: 999.7,
  gold: -5,
  ownedCosmetics: ['rpg-cloak-jade', 'rpg-helm-bogus'],
  equippedCosmetic: 'rpg-helm-bogus',
  boosts: { xpMultUntil: 50, creditMultUntil: -1 },
  shrineClaims: 2.2,
  dummyKills: 1.8,
})
assert.equal(rogue.characters.length, 2, 'max 2 characters')
assert.equal(rogue.xp, 999)
assert.equal(rogue.gold, 0)
assert.ok(rogue.ownedCosmetics.includes('rpg-cloak-jade'))
assert.ok(!rogue.ownedCosmetics.includes('rpg-helm-bogus'))
assert.equal(rogue.equippedCosmetic, 'rpg-cloak-traveler')
assert.equal(rogue.activeCharacterId, 'rpg-a1')
assert.equal(rogue.shrineClaims, 2)
assert.equal(rogue.dummyKills, 1)

const a = sanitizeHarborRpgBag({
  characters: [createHarborRpgCharacter({ name: 'A' })],
  xp: 10,
  gold: 3,
  shrineClaims: 1,
})
const b = sanitizeHarborRpgBag({
  characters: [createHarborRpgCharacter({ name: 'B' })],
  xp: 40,
  gold: 1,
  dummyKills: 2,
})
const mergedBag = mergeHarborRpgBag(a, b)
assert.ok(mergedBag.characters.length <= 2)
assert.equal(mergedBag.xp, 40)
assert.equal(mergedBag.gold, 3)
assert.equal(mergedBag.shrineClaims, 1)
assert.equal(mergedBag.dummyKills, 2)

const progress = sanitizeHarborProgress({
  ...emptyHarborProgress(),
  rpg: {
    characters: [{ id: 'rpg-slot1', name: 'Scout', createdAt: 9 }],
    xp: 25,
    gold: 6,
  },
})
assert.equal(progress.rpg.xp, 25)
assert.equal(progress.rpg.gold, 6)
assert.equal(progress.rpg.characters.length, 1)
assert.equal(progress.xp, 0, 'rpg xp must not bleed into pedagogy xp')

const mergedProgress = mergeHarborProgress(
  { ...emptyHarborProgress(), rpg: { xp: 10, gold: 1 } },
  { ...emptyHarborProgress(), rpg: { xp: 50, gold: 8, shrineClaims: 3 } },
)
assert.equal(mergedProgress.rpg.xp, 50)
assert.equal(mergedProgress.rpg.gold, 8)
assert.equal(mergedProgress.rpg.shrineClaims, 3)

assert.equal(isRpgLand(0, 0), true)
assert.equal(isRpgLand(99, 99), false)
const clamped = clampRpgFootTarget(99, -99)
assert.ok(isRpgLand(clamped.x, clamped.z))
assert.equal(nearestRpgInteract(0, -10), 'rpg-shrine')
assert.equal(nearestRpgInteract(8, -6), 'rpg-dummy')
assert.equal(nearestRpgInteract(0, 18), 'rpg-return')
assert.equal(nearestRpgInteract(0, 0), null)

const scene = buildRpgContinentScene()
assert.equal(scene.name, 'harbor-rpg')
assert.ok(scene.children.some((c) => c.name === 'rpg-grass'))
assert.ok(scene.children.some((c) => c.name === 'rpg-shrine'))
assert.ok(scene.children.some((c) => c.name === 'rpg-dummy'))
assert.ok(scene.children.some((c) => c.name === 'rpg-return-portal'))

const worldSrc = readFileSync(new URL('./harborWorld.ts', import.meta.url), 'utf8')
assert.match(
  worldSrc,
  /HarborRealmId = 'river' \| 'bamboo' \| 'guan' \| 'rpg'/,
  'realm id includes rpg',
)
assert.match(worldSrc, /buildRpgContinentScene/, 'world remounts rpg scene')
assert.match(worldSrc, /getRpgInteract/, 'world exposes rpg interact probe')
assert.match(worldSrc, /isRpg/, 'rpg pocket branch')

const curriculumSrc = readFileSync(new URL('./curriculum.ts', import.meta.url), 'utf8')
assert.match(
  curriculumSrc,
  /HarborRealmId = 'river' \| 'bamboo' \| 'guan' \| 'rpg'/,
  'curriculum realm id includes rpg',
)

const playSrc = readFileSync(new URL('./LearnPlay.tsx', import.meta.url), 'utf8')
assert.match(playSrc, /hq-teleport-btn--rpg/, 'always-unlocked HarborRPG teleport button')
assert.match(playSrc, /setRealmOverride\('rpg'\)/, 'teleport opens rpg realm')
assert.match(playSrc, /claimHarborRpgShrine|hitHarborRpgDummy/, 'soft shrine/dummy wired')
assert.match(playSrc, /HARBOR_RPG_META/, 'RPG meta labels in teleport')

assert.ok(HARBOR_RPG_SHRINE_XP > 0)

console.log('harborRpg.smoke: ok')
