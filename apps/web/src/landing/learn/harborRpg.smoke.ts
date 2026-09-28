/**
 * HarborRPG v1 smoke — zones, combat, loot bag, social soft hire.
 * No paid APIs / WebGL boot beyond procedural Three meshes.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  HARBOR_RPG_ZONES,
  HARBOR_RPG_ZONE_SPAWNS,
  HARBOR_RPG_PORTALS,
  HARBOR_RPG_QUESTS,
  HARBOR_RPG_VENDOR,
} from './harborRpgData.ts'
import {
  createHarborRpgCharacter,
  emptyHarborRpgBag,
  harborRpgAttackPower,
  harborRpgLevelFromXp,
  harborRpgMaxHp,
  HARBOR_RPG_MAX_CHARS,
  mergeHarborRpgBag,
  sanitizeHarborRpgBag,
  addRpgInventoryItem,
} from './harborRpgProgress.ts'
import {
  buildRpgZoneScene,
  clampRpgFootTarget,
  isRpgLand,
  nearestRpgInteract,
  HARBOR_RPG_META,
} from './harborRpgRealm.ts'
import { spawnRpgMonsters, tickRpgCombat, resetRpgCombatSessionCd } from './harborRpgCombat.ts'
import { hireRpgCompanion, HARBOR_RPG_COMPANION_COST } from './harborRpgSocial.ts'
import {
  emptyHarborProgress,
  mergeHarborProgress,
  sanitizeHarborProgress,
} from './progressMerge.ts'

assert.equal(HARBOR_RPG_META.en, 'HarborRPG')
assert.equal(HARBOR_RPG_ZONES.length, 4)
assert.ok(HARBOR_RPG_PORTALS.length >= 6)
assert.ok(HARBOR_RPG_QUESTS.length >= 3)
assert.ok(HARBOR_RPG_VENDOR.stock.length >= 3)

for (const zone of HARBOR_RPG_ZONES) {
  const scene = buildRpgZoneScene(zone)
  assert.equal(scene.name, 'harbor-rpg')
  assert.equal(scene.userData.rpgZone, zone)
  assert.ok(scene.children.some((c) => c.name === 'rpg-grass'), `${zone} grass`)
  if (zone === 'town') {
    assert.ok(scene.children.some((c) => c.name === 'rpg-building'), 'town buildings')
    assert.ok(scene.children.some((c) => c.name === 'rpg-npc-stall'), 'town stalls')
  }
  if (zone === 'meadow') {
    assert.ok(scene.children.some((c) => c.name === 'rpg-shrine'), 'meadow shrine')
  }
  const dens = scene.children.length
  assert.ok(dens >= 20, `${zone} dense craft (${dens})`)
}

assert.equal(isRpgLand(0, 0), true)
assert.equal(isRpgLand(99, 99), false)
const clamped = clampRpgFootTarget(99, -99)
assert.ok(isRpgLand(clamped.x, clamped.z))
assert.equal(nearestRpgInteract(0, -8, 'meadow'), 'rpg-shrine')
assert.equal(nearestRpgInteract(HARBOR_RPG_VENDOR.x, HARBOR_RPG_VENDOR.z, 'town'), 'rpg-vendor')

const bag0 = emptyHarborRpgBag()
assert.equal(bag0.zone, 'meadow')
assert.ok(bag0.inventory.length >= 2)
assert.ok(harborRpgMaxHp(bag0) >= 40)
assert.ok(harborRpgAttackPower(bag0) >= 3)
assert.equal(harborRpgLevelFromXp(0), 1)

const rogue = sanitizeHarborRpgBag({
  characters: [
    { id: 'rpg-a1', name: 'Jade', createdAt: 1 },
    { id: 'rpg-b2', name: 'Ink', createdAt: 2 },
    { id: 'rpg-c3', name: 'Extra', createdAt: 3 },
  ],
  xp: 200,
  gold: 50,
  zone: 'hack',
  inventory: [
    { id: 'rpg-item-herb', qty: 3 },
    { id: 'rpg-weapon-blade', qty: 1 },
    { id: 'bogus', qty: 9 },
  ],
  equippedWeapon: 'rpg-weapon-blade',
  quests: [{ id: 'quest-slime-hunt', progress: 2 }],
  kills: { slime: 4, dragon: 9 },
})
assert.equal(rogue.characters.length, HARBOR_RPG_MAX_CHARS)
assert.equal(rogue.zone, 'meadow')
assert.ok(rogue.inventory.some((s) => s.id === 'rpg-item-herb'))
assert.ok(!rogue.inventory.some((s) => (s.id as string) === 'bogus'))
assert.equal(rogue.equippedWeapon, 'rpg-weapon-blade')
assert.equal(rogue.kills.slime, 4)
assert.equal(rogue.kills.dragon, undefined)
assert.equal(rogue.quests[0]?.progress, 2)

let bag = sanitizeHarborRpgBag({ gold: 40, inventory: [] })
bag = addRpgInventoryItem(bag, 'rpg-item-shard', 2)
const hire = hireRpgCompanion(bag)
assert.equal(hire.ok, true)
if (hire.ok) {
  assert.equal(hire.bag.gold, 40 - HARBOR_RPG_COMPANION_COST)
  assert.ok(hire.bag.companionUntil > Date.now())
}

resetRpgCombatSessionCd()
const mobs = spawnRpgMonsters('meadow', 0x48415242)
assert.ok(mobs.length >= HARBOR_RPG_ZONE_SPAWNS.meadow.reduce((n, p) => n + p.count, 0) - 1)
const combatBag = sanitizeHarborRpgBag({
  xp: 0,
  gold: 0,
  equippedWeapon: 'rpg-weapon-stick',
  equippedArmor: 'rpg-armor-cloth',
  inventory: [
    { id: 'rpg-weapon-stick', qty: 1 },
    { id: 'rpg-armor-cloth', qty: 1 },
  ],
  quests: [{ id: 'quest-slime-hunt', progress: 0, complete: false, claimed: false }],
})
// Park player on top of first slime and tick until kill
const target = mobs.find((m) => m.kind === 'slime')!
let state = { monsters: mobs, playerHp: 80, bag: combatBag }
for (let i = 0; i < 40; i++) {
  const res = tickRpgCombat({
    bag: state.bag,
    monsters: state.monsters,
    playerX: target.x,
    playerZ: target.z,
    playerHp: state.playerHp,
    attacking: true,
    dt: 0.2,
    now: Date.now() + i * 200,
    rng: () => 0.01,
  })
  state = { monsters: res.monsters, playerHp: res.playerHp, bag: res.bag }
  if (res.events.some((e) => e.type === 'kill')) break
}
assert.ok(state.bag.xp > 0 || state.bag.kills.slime, 'combat yields kill progress')
assert.equal(state.bag.xp > 0 ? true : (state.bag.kills.slime ?? 0) > 0, true)

const progress = sanitizeHarborProgress({
  ...emptyHarborProgress(),
  rpg: { xp: 25, gold: 6, zone: 'pinewood', kills: { wolf: 2 } },
})
assert.equal(progress.rpg.zone, 'pinewood')
assert.equal(progress.xp, 0, 'rpg xp must not bleed into pedagogy xp')
assert.equal(progress.rpg.kills.wolf, 2)

const merged = mergeHarborProgress(
  { ...emptyHarborProgress(), rpg: { xp: 10, gold: 1, kills: { slime: 1 } } },
  { ...emptyHarborProgress(), rpg: { xp: 50, gold: 8, kills: { slime: 4, wolf: 1 } } },
)
assert.equal(merged.rpg.xp, 50)
assert.equal(merged.rpg.kills.slime, 4)

const a = sanitizeHarborRpgBag({ characters: [createHarborRpgCharacter({ name: 'A' })], xp: 10 })
const b = sanitizeHarborRpgBag({ characters: [createHarborRpgCharacter({ name: 'B' })], xp: 40 })
assert.ok(mergeHarborRpgBag(a, b).characters.length <= 2)

const worldSrc = readFileSync(new URL('./harborWorld.ts', import.meta.url), 'utf8')
assert.match(worldSrc, /buildRpgZoneScene/, 'world remounts rpg zones')
assert.match(worldSrc, /tickRpgCombat/, 'world ticks soft combat')
assert.match(worldSrc, /getRpgCombatHud/, 'combat HUD probe')

const playSrc = readFileSync(new URL('./LearnPlay.tsx', import.meta.url), 'utf8')
assert.match(playSrc, /HarborRpgPanel/, 'isolated RPG panel')
assert.match(playSrc, /is-rpg/, 'voyage HUD isolation class')
assert.match(playSrc, /setRealmOverride\('rpg'\)/, 'teleport opens rpg')
assert.match(playSrc, /enterRpgZone|HARBOR_RPG_PORTALS/, 'zone portals wired')

const panelSrc = readFileSync(new URL('./HarborRpgPanel.tsx', import.meta.url), 'utf8')
assert.match(panelSrc, /Party finder|Hire companion/, 'soft party / finder UI')
assert.match(panelSrc, /Quest board|Turn in|Accept/, 'quest UI')

console.log('harborRpg.smoke: ok')
