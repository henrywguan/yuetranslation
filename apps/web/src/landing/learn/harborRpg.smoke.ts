/**
 * HarborRPG v2 smoke — zones, combat depth, professions, party/loot, presence channel.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  HARBOR_RPG_ABILITIES,
  HARBOR_RPG_CRAFT_RECIPES,
  HARBOR_RPG_GATHER_NODES,
  HARBOR_RPG_GEAR_SLOTS,
  HARBOR_RPG_ITEMS,
  HARBOR_RPG_MONSTER_KINDS,
  HARBOR_RPG_PORTALS,
  HARBOR_RPG_PROFESSIONS,
  HARBOR_RPG_QUESTS,
  HARBOR_RPG_ZONE_META,
  HARBOR_RPG_ZONE_SPAWNS,
  HARBOR_RPG_ZONES,
} from './harborRpgData.ts'
import {
  awardRpgContestedLoot,
  resetRpgCombatSessionCd,
  spawnRpgMonsters,
  tickRpgCombat,
} from './harborRpgCombat.ts'
import {
  craftRpgRecipe,
  gatherRpgNode,
  listRpgMarketItem,
  professionLevelFromXp,
} from './harborRpgProfessions.ts'
import {
  createRpgParty,
  openRpgLootRoll,
  castRpgLootVote,
  resolveRpgLootRoll,
  acceptRpgPartyInvite,
  inviteToRpgParty,
} from './harborRpgSocial.ts'
import { HARBOR_RPG_PRESENCE_CHANNEL } from './harborRpgPresence.ts'
import {
  emptyHarborRpgBag,
  equipRpgGearSlot,
  harborRpgAttackPower,
  mergeHarborRpgBag,
  sanitizeHarborRpgBag,
} from './harborRpgProgress.ts'
import { buildRpgZoneScene } from './harborRpgRealm.ts'

assert.equal(HARBOR_RPG_ZONES.length, 6)
assert.ok(HARBOR_RPG_ZONE_META.crypt.instance, 'crypt is instanced')
assert.ok(HARBOR_RPG_ABILITIES.length >= 4)
assert.ok(HARBOR_RPG_GEAR_SLOTS.length === 8)
assert.ok(HARBOR_RPG_ITEMS.length >= 20)
assert.ok(HARBOR_RPG_MONSTER_KINDS.includes('crypt-boss'))
assert.ok(HARBOR_RPG_QUESTS.length >= 6)
assert.ok(HARBOR_RPG_PROFESSIONS.length === 4)
assert.ok(HARBOR_RPG_CRAFT_RECIPES.length >= 4)
assert.ok(HARBOR_RPG_GATHER_NODES.length >= 4)
assert.ok(HARBOR_RPG_PORTALS.some((p) => p.to === 'crypt'))

for (const zone of HARBOR_RPG_ZONES) {
  const scene = buildRpgZoneScene(zone)
  assert.equal(scene.name, 'harbor-rpg')
  assert.equal(scene.userData.rpgZone, zone)
  const packs = HARBOR_RPG_ZONE_SPAWNS[zone]
  const mobs = spawnRpgMonsters(zone, HARBOR_RPG_ZONE_META[zone].seed)
  assert.equal(
    mobs.length,
    packs.reduce((n, p) => n + p.count, 0),
    `${zone} spawn count`,
  )
}

resetRpgCombatSessionCd()
let bag = emptyHarborRpgBag()
const meadowMobs = spawnRpgMonsters('meadow', 1)
const combat = tickRpgCombat({
  bag,
  monsters: meadowMobs,
  playerX: meadowMobs[0]!.x,
  playerZ: meadowMobs[0]!.z,
  playerHp: 40,
  userId: 'u1',
  partySize: 1,
  abilityId: 'bash',
  attacking: false,
  dt: 0.2,
  now: Date.now(),
  zone: 'meadow',
  guardBuffSec: 0,
  rng: () => 0.1,
})
assert.ok(combat.events.some((e) => e.type === 'player-hit' || e.type === 'ability-gcd'))
assert.ok(combat.gcdRemaining > 0)

resetRpgCombatSessionCd()
{
  const mobs = spawnRpgMonsters('meadow', 2).slice(0, 1).map((m) => ({ ...m, hp: 1 }))
  const contested = tickRpgCombat({
    bag,
    monsters: mobs,
    playerX: mobs[0]!.x,
    playerZ: mobs[0]!.z,
    playerHp: 40,
    userId: 'u1',
    partySize: 2,
    abilityId: 'strike',
    attacking: false,
    dt: 0.2,
    now: Date.now(),
    zone: 'meadow',
    guardBuffSec: 0,
    rng: () => 0.01,
  })
  const kill = contested.events.find((e) => e.type === 'kill')
  assert.ok(kill && kill.type === 'kill' && kill.contested, 'party loot contested')
}

const party = createRpgParty('u1', 'Jade')
const invite = inviteToRpgParty(party, 'Jade', 'u2')
const joined = acceptRpgPartyInvite(party, invite, 'u2', 'Ink')
assert.ok(joined && joined.members.length === 2)

let roll = openRpgLootRoll({
  monsterId: 'm1',
  loot: [{ id: 'rpg-item-herb', qty: 1 }],
  partyId: party.id,
  memberIds: ['u1', 'u2'],
})
roll = castRpgLootVote(roll, 'u1', 'need', () => 0.9)
roll = castRpgLootVote(roll, 'u2', 'greed', () => 0.2)
roll = resolveRpgLootRoll(roll)
assert.equal(roll.winnerId, 'u1')
bag = awardRpgContestedLoot(bag, roll.loot)
assert.ok(bag.inventory.some((s) => s.id === 'rpg-item-herb'))

const gathered = gatherRpgNode(bag, 'node-herb-1')
assert.ok(gathered.ok)
if (gathered.ok) {
  bag = gathered.bag
  assert.ok(bag.professions.herbalism > 0)
  assert.ok(professionLevelFromXp(bag.professions.herbalism) >= 1)
}

// Ensure reagents for craft-heal
bag = {
  ...bag,
  inventory: [
    ...bag.inventory.filter((s) => s.id !== 'rpg-item-herb' && s.id !== 'rpg-item-reed'),
    { id: 'rpg-item-herb', qty: 5 },
    { id: 'rpg-item-reed', qty: 2 },
  ],
}
const crafted = craftRpgRecipe(bag, 'craft-heal')
assert.ok(crafted.ok, crafted.ok ? '' : crafted.reason)
if (crafted.ok) {
  bag = crafted.bag
  assert.ok(bag.inventory.some((s) => s.id === 'rpg-potion-heal'))
}

const listed = listRpgMarketItem(bag, {
  sellerId: 'u1',
  sellerName: 'Jade',
  itemId: 'rpg-potion-heal',
  qty: 1,
  price: 8,
})
assert.ok(listed.ok)
if (listed.ok) {
  assert.equal(listed.bag.market.length, 1)
  bag = listed.bag
}

const equipped = equipRpgGearSlot(bag, 'rpg-weapon-stick')
assert.ok(equipped)
assert.equal(equipped!.gear.weapon, 'rpg-weapon-stick')
assert.ok(harborRpgAttackPower(equipped!) >= harborRpgAttackPower(emptyHarborRpgBag()))

const merged = mergeHarborRpgBag(emptyHarborRpgBag(), sanitizeHarborRpgBag(bag))
assert.ok(merged.professions.herbalism >= 0)
assert.ok(Array.isArray(merged.bank))
assert.ok(merged.gear)

assert.equal(HARBOR_RPG_PRESENCE_CHANNEL, 'harbor-rpg-realm')

const worldSrc = readFileSync(new URL('./harborWorld.ts', import.meta.url), 'utf8')
assert.match(worldSrc, /tickRpgCombat/, 'world ticks soft combat')
assert.match(worldSrc, /queueRpgAbility/, 'ability queue on world handle')
assert.match(worldSrc, /onRpgContestedLoot/, 'contested loot callback')

const playSrc = readFileSync(new URL('./LearnPlay.tsx', import.meta.url), 'utf8')
assert.match(playSrc, /HarborRpgPanel/, 'isolated RPG panel')
assert.match(playSrc, /craftHarborRpgRecipe|gatherHarborRpgNode/, 'professions wired')
assert.match(playSrc, /is-rpg/, 'HUD isolation class')

const presenceSrc = readFileSync(new URL('./harborRpgPresence.ts', import.meta.url), 'utf8')
assert.match(presenceSrc, /harbor-rpg-realm/)
assert.match(presenceSrc, /HARBOR_RPG_LOOT_EVENT/)
assert.match(presenceSrc, /HARBOR_RPG_PARTY_EVENT/)

const docs = readFileSync(new URL('../../../../../docs/harbor-quest/HARBORRPG.md', import.meta.url), 'utf8')
assert.match(docs, /soft Realtime|no dedicated anti-cheat/i)
assert.match(docs, /Ash Crypt|combat depth|World Market/i)

console.log('harborRpg.smoke: ok')
