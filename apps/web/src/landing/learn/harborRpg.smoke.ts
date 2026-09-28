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
  HARBOR_RPG_MONSTER_DEFS,
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

assert.equal(HARBOR_RPG_ZONES.length, 10)
assert.ok(HARBOR_RPG_ZONE_META.crypt.instance, 'crypt is instanced')
assert.ok(HARBOR_RPG_ZONE_META.tidehollow.instance)
assert.ok(HARBOR_RPG_ZONE_META.chronicle.instance)
assert.ok(HARBOR_RPG_ZONE_META.echoisle.instance)
assert.ok(HARBOR_RPG_ZONE_META.tideraid.instance)
assert.ok(HARBOR_RPG_ABILITIES.length >= 4)
assert.ok(HARBOR_RPG_GEAR_SLOTS.length === 8)
assert.ok(HARBOR_RPG_ITEMS.length >= 20)
assert.ok(HARBOR_RPG_MONSTER_KINDS.includes('crypt-boss'))
assert.ok(HARBOR_RPG_MONSTER_KINDS.includes('tide-boss'))
assert.ok(HARBOR_RPG_MONSTER_KINDS.includes('chronicle-boss'))
assert.ok(HARBOR_RPG_MONSTER_KINDS.includes('echo-boss'))
assert.ok(HARBOR_RPG_MONSTER_KINDS.includes('raid-sovereign'))
assert.ok(HARBOR_RPG_QUESTS.length >= 35, `quests ${HARBOR_RPG_QUESTS.length}`)
assert.ok(HARBOR_RPG_PROFESSIONS.length === 4)
assert.ok(HARBOR_RPG_CRAFT_RECIPES.length >= 4)
assert.ok(HARBOR_RPG_GATHER_NODES.length >= 4)
assert.ok(HARBOR_RPG_PORTALS.some((p) => p.to === 'crypt'))
assert.ok(HARBOR_RPG_PORTALS.some((p) => p.to === 'tidehollow'))
assert.ok(HARBOR_RPG_PORTALS.some((p) => p.to === 'chronicle'))
assert.ok(HARBOR_RPG_PORTALS.some((p) => p.to === 'echoisle'))
assert.ok(HARBOR_RPG_PORTALS.some((p) => p.to === 'tideraid'))

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
  playerMp: 100,
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
assert.ok(typeof combat.playerMp === 'number')

resetRpgCombatSessionCd()
{
  const mobs = spawnRpgMonsters('meadow', 2).slice(0, 1).map((m) => ({ ...m, hp: 1 }))
  const contested = tickRpgCombat({
    bag,
    monsters: mobs,
    playerX: mobs[0]!.x,
    playerZ: mobs[0]!.z,
    playerHp: 40,
    playerMp: 100,
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

// Classes · skills · talents · prestige · 9×3 specs
import {
  HARBOR_RPG_CLASSES,
  HARBOR_RPG_CLASS_DEFS,
  HARBOR_RPG_CLASS_LEVEL_CAP,
  harborRpgClassLevelFromXp,
  harborRpgSkillRankFromXp,
  harborRpgTalentPointsEarned,
  harborRpgUnlockedSkills,
} from './harborRpgClasses.ts'
import {
  HARBOR_RPG_SPECS,
  harborRpgDefaultSpec,
  harborRpgSpecsForClass,
} from './harborRpgSpecs.ts'
import {
  selectHarborRpgClass,
  selectHarborRpgSpec,
  spendHarborRpgTalent,
  prestigeHarborRpgClass,
  awardHarborRpgClassKillXp,
  harborRpgTalentPointsLeft,
  harborRpgMaxMp,
} from './harborRpgProgress.ts'
import {
  electRpgZoneHost,
  isRpgZoneHost,
  snapshotRpgMonsters,
  applyRpgWorldSnapshot,
  sanitizeRpgWorldPacket,
} from './harborRpgWorldSync.ts'
import {
  applyRpgTradeComplete,
  createRpgTradeId,
  emptyRpgTradeSession,
  sanitizeRpgTradeOffer,
  HARBOR_RPG_TRADE_SLOTS,
} from './harborRpgTrade.ts'

assert.equal(HARBOR_RPG_CLASSES.length, 9)
assert.equal(HARBOR_RPG_SPECS.length, 27)
for (const id of HARBOR_RPG_CLASSES) {
  const def = HARBOR_RPG_CLASS_DEFS[id]
  assert.ok(def.skills.length >= 5, `${id} skills`)
  assert.ok(def.talents.length >= 6, `${id} talents`)
  assert.ok(def.passives.length >= 3, `${id} passives`)
  assert.equal(harborRpgSpecsForClass(id).length, 3, `${id} specs`)
}
assert.equal(harborRpgClassLevelFromXp(0), 1)
assert.ok(harborRpgClassLevelFromXp(10_000) >= 10)
assert.equal(harborRpgSkillRankFromXp(0), 1)
assert.equal(harborRpgSkillRankFromXp(18 * 81), 10)
assert.ok(harborRpgTalentPointsEarned(1, 0) >= 1)
assert.ok(harborRpgTalentPointsEarned(HARBOR_RPG_CLASS_LEVEL_CAP, 1) > harborRpgTalentPointsEarned(1, 0))

let classBag = selectHarborRpgClass(emptyHarborRpgBag(), 'tideblade')
assert.equal(classBag.classId, 'tideblade')
assert.equal(classBag.specId, harborRpgDefaultSpec('tideblade'))
assert.ok(classBag.skillBar.includes('tb-riptide'))
assert.ok(harborRpgMaxMp(classBag) > 0)
const specPick = selectHarborRpgSpec(classBag, 'tideblade-ward')
assert.ok(specPick)
assert.equal(specPick!.specId, 'tideblade-ward')
classBag = { ...classBag, classXp: 500 }
classBag = awardHarborRpgClassKillXp(classBag, 'tb-riptide', 20)
assert.ok(classBag.classXp >= 500)
assert.ok((classBag.skillXp['tb-riptide'] ?? 0) > 0)
const spent = spendHarborRpgTalent(classBag, 'tb-o1')
assert.ok(spent)
assert.equal(spent!.talents['tb-o1'], 1)
assert.ok(harborRpgTalentPointsLeft(spent!) < harborRpgTalentPointsLeft(classBag))
assert.equal(prestigeHarborRpgClass({ ...classBag, classXp: 0 }), null)
const unlocked = harborRpgUnlockedSkills('jadeheart', 30)
assert.ok(unlocked.some((s) => s.id === 'jh-lotus'))
assert.ok(HARBOR_RPG_CLASS_DEFS.ironoar.skills.some((s) => s.id === 'io-smash'))
assert.ok(HARBOR_RPG_CLASS_DEFS.mistweaver.skills.some((s) => s.id === 'mw-bolt'))
assert.ok(HARBOR_RPG_CLASS_DEFS.chopwright.skills.some((s) => s.id === 'cw-chop'))

// Shared world tick
assert.equal(electRpgZoneHost(['b', 'a', 'c']), 'a')
assert.ok(isRpgZoneHost('a', ['b', 'a']))
const snapMobs = spawnRpgMonsters('meadow', 3)
const packet = sanitizeRpgWorldPacket({
  hostId: 'a',
  zone: 'meadow',
  t: Date.now(),
  mobs: snapshotRpgMonsters(snapMobs).map((m) => ({ ...m, hp: 1, x: 9, z: 9 })),
})
assert.ok(packet)
const applied = applyRpgWorldSnapshot(snapMobs, packet!, Date.now())
assert.equal(applied[0]!.hp, 1)
assert.equal(applied[0]!.x, 9)

// Trade windows
assert.ok(HARBOR_RPG_TRADE_SLOTS >= 6)
const tradeId = createRpgTradeId('u1', 'u2')
assert.match(tradeId, /^trade-/)
const session = emptyRpgTradeSession('u2', 'Ink', tradeId)
assert.equal(session.selfItems.length, 0)
const offer = sanitizeRpgTradeOffer({
  type: 'offer',
  tradeId,
  fromId: 'u1',
  fromName: 'Jade',
  toId: 'u2',
  gold: 5,
  items: [{ id: 'rpg-item-herb', qty: 2 }],
  locked: true,
  t: Date.now(),
})
assert.ok(offer)
assert.equal(offer!.gold, 5)
let tradeBag = {
  ...emptyHarborRpgBag(),
  gold: 20,
  inventory: [{ id: 'rpg-item-herb' as const, qty: 3 }],
}
const traded = applyRpgTradeComplete(
  tradeBag,
  5,
  [{ id: 'rpg-item-herb', qty: 1 }],
  2,
  [{ id: 'rpg-item-ore', qty: 1 }],
)
assert.ok(traded)
assert.equal(traded!.gold, 17)
assert.ok(traded!.inventory.some((s) => s.id === 'rpg-item-ore'))

assert.ok(HARBOR_RPG_MONSTER_DEFS['tide-boss'].phases!.length >= 3)
assert.ok(HARBOR_RPG_MONSTER_DEFS['chronicle-boss'].phases!.length >= 3)
assert.ok(HARBOR_RPG_MONSTER_DEFS['echo-boss'].phases!.length >= 3)

resetRpgCombatSessionCd()
{
  const boss = spawnRpgMonsters('tidehollow', 9).find((m) => m.kind === 'tide-boss')!
  boss.hp = Math.floor(boss.maxHp * 0.3)
  const phased = tickRpgCombat({
    bag: emptyHarborRpgBag(),
    monsters: [boss],
    playerX: boss.x,
    playerZ: boss.z,
    playerHp: 80,
    playerMp: 100,
    userId: 'u1',
    partySize: 1,
    abilityId: 'bash',
    attacking: false,
    dt: 0.2,
    now: Date.now(),
    zone: 'tidehollow',
    guardBuffSec: 0,
    rng: () => 0.01,
  })
  assert.ok(
    phased.events.some((e) => e.type === 'boss-phase') || (phased.monsters[0]!.phase ?? 0) >= 1,
    'boss phase advances',
  )
}

import { HARBOR_RPG_CHAPTERS, HARBOR_RPG_CAMPAIGN } from './harborRpgLore.ts'
assert.match(HARBOR_RPG_CAMPAIGN.title.en, /Tide/)
assert.equal(HARBOR_RPG_CHAPTERS.length, 5)

import {
  classRoleToFinderRole,
  matchRpgFinderListings,
  missingFinderRoles,
} from './harborRpgFinder.ts'
assert.equal(classRoleToFinderRole('tank'), 'tank')
assert.equal(classRoleToFinderRole('healer'), 'heal')
assert.equal(classRoleToFinderRole('melee'), 'dps')
assert.deepEqual(missingFinderRoles(['dps']), ['tank', 'heal', 'dps', 'dps'])
{
  const matches = matchRpgFinderListings({
    selfRole: 'dps',
    dungeon: 'crypt',
    selfUserId: 'me',
    listings: [
      { userId: 't1', username: 'T', role: 'tank', dungeon: 'crypt', t: Date.now() },
      { userId: 'h1', username: 'H', role: 'heal', dungeon: 'crypt', t: Date.now() },
      { userId: 'd2', username: 'D', role: 'dps', dungeon: 'tidehollow', t: Date.now() },
    ],
  })
  assert.equal(matches.length, 2)
  assert.ok(matches.some((m) => m.role === 'tank'))
  assert.ok(matches.some((m) => m.role === 'heal'))
}

import { harborRpgQuestUnlocked } from './harborRpgQuests.ts'
{
  const empty = emptyHarborRpgBag()
  assert.equal(harborRpgQuestUnlocked(empty, 'quest-slime-hunt'), true)
  assert.equal(harborRpgQuestUnlocked(empty, 'quest-crypt-warden'), false)
  const gated = {
    ...empty,
    quests: [
      { id: 'quest-ruin-patrol' as const, progress: 4, complete: true, claimed: true },
    ],
  }
  assert.equal(harborRpgQuestUnlocked(gated, 'quest-crypt-warden'), true)
}

{
  const normal = spawnRpgMonsters('crypt', 1, 'normal')
  const heroic = spawnRpgMonsters('crypt', 1, 'heroic')
  const nb = normal.find((m) => m.kind === 'crypt-boss')!
  const hb = heroic.find((m) => m.kind === 'crypt-boss')!
  assert.ok(hb.maxHp > nb.maxHp, 'heroic boss HP scales')
  const raid = spawnRpgMonsters('tideraid', 2, 'heroic')
  assert.ok(raid.some((m) => m.kind === 'raid-herald'))
  assert.ok(raid.some((m) => m.kind === 'raid-depth'))
  assert.ok(raid.some((m) => m.kind === 'raid-sovereign'))
}

const worldSrc = readFileSync(new URL('./harborWorld.ts', import.meta.url), 'utf8')
assert.match(worldSrc, /tickRpgCombat/, 'world ticks soft combat')
assert.match(worldSrc, /queueRpgAbility/, 'ability queue on world handle')
assert.match(worldSrc, /onRpgContestedLoot/, 'contested loot callback')
assert.match(worldSrc, /onRpgWorldTick|applyRpgWorldSnapshot/, 'shared world tick')
assert.match(worldSrc, /onRpgBossPhase|boss-phase/, 'boss phase callback')
assert.match(worldSrc, /difficulty/, 'heroic spawn wired')

const playSrc = readFileSync(new URL('./LearnPlay.tsx', import.meta.url), 'utf8')
assert.match(playSrc, /HarborRpgPanel/, 'isolated RPG panel')
assert.match(playSrc, /craftHarborRpgRecipe|gatherHarborRpgNode/, 'professions wired')
assert.match(playSrc, /is-rpg/, 'HUD isolation class')
assert.match(playSrc, /onStartTrade|rpgTrade/, 'trade windows wired')
assert.match(playSrc, /inviteToRpgParty|onInviteParty/, 'party invites E2E')
assert.match(playSrc, /setRemotePlayers|rpgRemotes/, 'rpg remotes in world')
assert.match(playSrc, /onSetDifficulty|onFinderQueueChange/, 'heroic + finder wired')

const presenceSrc = readFileSync(new URL('./harborRpgPresence.ts', import.meta.url), 'utf8')
assert.match(presenceSrc, /harbor-rpg-realm/)
assert.match(presenceSrc, /HARBOR_RPG_LOOT_EVENT/)
assert.match(presenceSrc, /HARBOR_RPG_PARTY_EVENT/)
assert.match(presenceSrc, /HARBOR_RPG_WORLD_EVENT/)
assert.match(presenceSrc, /HARBOR_RPG_TRADE_EVENT/)
assert.match(presenceSrc, /lookingRole/)

const panelSrc = readFileSync(new URL('./HarborRpgPanel.tsx', import.meta.url), 'utf8')
assert.match(panelSrc, /spellbook|Spells/, 'spellbook UI')
assert.match(panelSrc, /Trade/, 'trade tab')
assert.match(panelSrc, /HARBOR_RPG_CHAPTERS|Tide That Remembers/, 'campaign chapters')
assert.match(panelSrc, /Heroic|finderRole|Looking as/, 'heroic + finder UI')

const docs = readFileSync(new URL('../../../../../docs/harbor-quest/HARBORRPG.md', import.meta.url), 'utf8')
assert.match(docs, /soft Realtime|no dedicated anti-cheat/i)
assert.match(docs, /Ash Crypt|Heroic|Tide Remembers|finder|quest density|9 classes/i)

assert.ok(HARBOR_RPG_ITEMS.length >= 30, 'expanded itemization')
assert.ok(HARBOR_RPG_ITEMS.includes('rpg-weapon-tide'))
assert.ok(HARBOR_RPG_ITEMS.includes('rpg-item-tide-coin'))
assert.ok(HARBOR_RPG_ITEMS.includes('rpg-weapon-sovereign'))

console.log('harborRpg.smoke: ok')
