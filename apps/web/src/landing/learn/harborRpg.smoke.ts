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
import { applyRpgMedium, harborRpgWeatherForZone, sanitizeRpgMedium } from './harborRpgMedium.ts'
import { delvePack, harborRpgWorldBoard, lockpickMatches, lockpickPattern, riftPack } from './harborRpgDepth.ts'

assert.equal(HARBOR_RPG_ZONES.length, 14)
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
assert.ok(HARBOR_RPG_CRAFT_RECIPES.length >= 12)
assert.ok(HARBOR_RPG_GATHER_NODES.length >= 10)
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
  const withComp = {
    ...emptyHarborRpgBag(),
    companionUntil: Date.now() + 60_000,
    companionName: 'Lantern Fox',
  }
  const mobs = spawnRpgMonsters('meadow', 7).map((m) => ({ ...m }))
  const ally = tickRpgCombat({
    bag: withComp,
    monsters: mobs,
    playerX: mobs[0]!.x,
    playerZ: mobs[0]!.z,
    playerHp: 40,
    playerMp: 100,
    userId: 'u1',
    partySize: 1,
    abilityId: null,
    attacking: false,
    dt: 0.2,
    now: Date.now(),
    zone: 'meadow',
    guardBuffSec: 0,
    rng: () => 0.1,
  })
  assert.ok(
    ally.events.some((e) => e.type === 'companion-hit'),
    'companion auto-swings',
  )
}

resetRpgCombatSessionCd()
{
  const mobs = spawnRpgMonsters('meadow', 9).map((m) => ({
    ...m,
    atk: 999,
    attackCd: 0,
    x: 0,
    z: 0,
  }))
  // Force a hit: place player on first mob and let monster swing with low HP
  const downed = tickRpgCombat({
    bag: emptyHarborRpgBag(),
    monsters: mobs,
    playerX: 0,
    playerZ: 0,
    playerHp: 1,
    playerMp: 10,
    userId: 'u1',
    partySize: 1,
    abilityId: null,
    attacking: false,
    dt: 1.2,
    now: Date.now(),
    zone: 'meadow',
    guardBuffSec: 0,
    rng: () => 0.01,
  })
  // May or may not down depending on aggro/range; assert event shape if present
  const pd = downed.events.find((e) => e.type === 'player-down')
  if (pd && pd.type === 'player-down') {
    assert.equal(pd.instance, false)
    assert.equal(pd.zone, 'meadow')
  }
}

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
  HARBOR_RPG_SKILL_BAR_CAP,
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
  setHarborRpgSkillBar,
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
  assert.ok(def.skills.length >= 7, `${id} skills`)
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
assert.ok(classBag.skillBar.length <= HARBOR_RPG_SKILL_BAR_CAP)
{
  const capped = { ...classBag, classXp: 50_000_000, skillBar: ['tb-riptide'] }
  const filled = awardHarborRpgClassKillXp(capped, 'tb-riptide', 1)
  const unlockedIds = harborRpgUnlockedSkills(
    'tideblade',
    harborRpgClassLevelFromXp(filled.classXp),
  ).map((s) => s.id)
  assert.equal(unlockedIds.length, HARBOR_RPG_SKILL_BAR_CAP)
  assert.equal(filled.skillBar.length, HARBOR_RPG_SKILL_BAR_CAP)
  const barred = setHarborRpgSkillBar(filled, [...unlockedIds, unlockedIds[0]!])
  assert.deepEqual(barred?.skillBar, unlockedIds)
}
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
assert.match(worldSrc, /onRpgPlayerDown|player-down/, 'player-down callback')
assert.match(worldSrc, /rpg-companion|syncRpgCompanion/, 'companion mesh')
assert.match(worldSrc, /remoteRpgMounts|syncRemoteRpgMount/, 'remote mounts')
assert.match(worldSrc, /difficulty/, 'heroic spawn wired')

const playSrc = readFileSync(new URL('./LearnPlay.tsx', import.meta.url), 'utf8')
assert.match(playSrc, /HarborRpgPanel/, 'isolated RPG panel')
assert.match(playSrc, /craftHarborRpgRecipe|gatherHarborRpgNode/, 'professions wired')
assert.match(playSrc, /is-rpg/, 'HUD isolation class')
assert.match(playSrc, /onStartTrade|rpgTrade/, 'trade windows wired')
assert.match(playSrc, /inviteToRpgParty|onInviteParty/, 'party invites E2E')
assert.match(playSrc, /setRemotePlayers|rpgRemotes/, 'rpg remotes in world')
assert.match(playSrc, /activeMountId|rpgMountId/, 'remote mount pose')
assert.match(playSrc, /onRpgPlayerDown|playHarborRpgPlayerDown/, 'death UX wired')
assert.match(playSrc, /onSetTitle|syncHarborRpgAchievementTitles/, 'deeds titles wired')
assert.match(playSrc, /onSetDifficulty|onFinderQueueChange/, 'heroic + finder wired')

const presenceSrc = readFileSync(new URL('./harborRpgPresence.ts', import.meta.url), 'utf8')
assert.match(presenceSrc, /harbor-rpg-realm/)
assert.match(presenceSrc, /HARBOR_RPG_LOOT_EVENT/)
assert.match(presenceSrc, /HARBOR_RPG_PARTY_EVENT/)
assert.match(presenceSrc, /HARBOR_RPG_WORLD_EVENT/)
assert.match(presenceSrc, /HARBOR_RPG_TRADE_EVENT/)
assert.match(presenceSrc, /lookingRole/)
assert.match(presenceSrc, /activeMountId/, 'mount on presence')

const panelSrc = readFileSync(new URL('./HarborRpgPanel.tsx', import.meta.url), 'utf8')
assert.match(panelSrc, /spellbook|Spells/, 'spellbook UI')
assert.match(panelSrc, /Trade/, 'trade tab')
assert.match(panelSrc, /HARBOR_RPG_CHAPTERS|Tide That Remembers/, 'campaign chapters')
assert.match(panelSrc, /Heroic|finderRole|Looking as/, 'heroic + finder UI')
assert.match(panelSrc, /HarborRPG Wiki|onOpenWiki/, 'wiki entry on panel')
assert.match(panelSrc, /hq-rpg-hud/, 'rpg chrome is a hud, not a pinned sheet')
assert.match(panelSrc, /menuOpen, setMenuOpen\] = useState\(false\)/, 'harbor menu starts closed')
assert.match(panelSrc, /Close menu/, 'menu dismisses back to the world')
assert.match(panelSrc, /achievements|Deeds|Pin title/, 'deeds HUD')

const docs = readFileSync(new URL('../../../../../docs/harbor-quest/HARBORRPG.md', import.meta.url), 'utf8')
assert.match(docs, /soft Realtime|no dedicated anti-cheat/i)
assert.match(docs, /Ash Crypt|Heroic|Tide Remembers|finder|quest density|9 classes/i)
assert.match(docs, /Wiki|loot sources|achievement/i)
assert.match(docs, /v6\.2|Player-down|Remote mounts|Companion ally/i)

import {
  harborRpgItemLootSources,
  harborRpgItemsMissingSources,
  harborRpgMountObtainSources,
  harborRpgWikiList,
  harborRpgWikiStats,
} from './harborRpgWiki.ts'
import {
  HARBOR_RPG_ACHIEVEMENT_IDS,
  harborRpgAchievementProgress,
  setHarborRpgActiveTitle,
  syncHarborRpgAchievementTitles,
} from './harborRpgAchievements.ts'
import {
  HARBOR_RPG_MOUNT_DEFS,
  HARBOR_RPG_MOUNT_IDS,
  HARBOR_RPG_STABLE,
} from './harborRpgMounts.ts'
import { buyRpgMount, setRpgActiveMount } from './harborRpgProgress.ts'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

{
  const missing = harborRpgItemsMissingSources()
  assert.equal(missing.length, 0, `items missing loot sources: ${missing.join(',')}`)
  for (const id of HARBOR_RPG_ITEMS) {
    assert.ok(harborRpgItemLootSources(id).length > 0, `sources for ${id}`)
  }
  for (const id of HARBOR_RPG_MOUNT_IDS) {
    const src = harborRpgMountObtainSources(id)
    assert.equal(src.length, 1)
    assert.equal(src[0]!.kind, 'stable')
  }
  const stats = harborRpgWikiStats()
  assert.ok(stats.items >= 30)
  assert.ok(stats.mounts >= 30)
  assert.ok(stats.achievements >= 20)
  assert.equal(stats.missingItemSources, 0)
  assert.ok(harborRpgWikiList('items').length === stats.items)
  assert.ok(harborRpgWikiList('achievements').length === HARBOR_RPG_ACHIEVEMENT_IDS.length)
  const bag = emptyHarborRpgBag()
  assert.ok(harborRpgAchievementProgress(bag, 'ach-mount-starter') >= 1)
  assert.equal(harborRpgAchievementProgress(bag, 'ach-first-char'), 0)
  const titled = syncHarborRpgAchievementTitles(bag)
  assert.ok(titled.newlyUnlocked.includes('ach-mount-starter'))
  assert.ok(titled.bag.unlockedTitles.includes('ach-mount-starter'))
  const pinned = setHarborRpgActiveTitle(titled.bag, 'ach-mount-starter')
  assert.equal(pinned?.activeTitleId, 'ach-mount-starter')
  const wikiUi = readFileSync(new URL('./HarborRpgWiki.tsx', import.meta.url), 'utf8')
  assert.match(wikiUi, /Loot sources|How to obtain/, 'wiki shows obtain copy')
  assert.match(playSrc, /HarborRpgWiki|rpgWikiOpen|rpgWikiPage/, 'wiki mounted from LearnPlay')
  assert.match(panelSrc, /onOpenWiki\(\{ section: 'items'/, 'bag/vendor wiki deep-links')
  assert.match(panelSrc, /onOpenWiki\(\{ section: 'mounts'/, 'stable wiki deep-links')
  assert.match(panelSrc, /section: 'achievements'/, 'achievements wiki entry')
  const greaves = harborRpgItemLootSources('rpg-legs-greaves')
  const boots = harborRpgItemLootSources('rpg-feet-boots')
  assert.ok(greaves.some((s) => s.kind === 'craft'), 'greaves craft source')
  assert.ok(greaves.some((s) => s.kind === 'drop'), 'greaves drop source')
  assert.ok(boots.some((s) => s.kind === 'craft'), 'boots craft source')
  assert.ok(boots.some((s) => s.kind === 'drop'), 'boots drop source')
}

assert.ok(HARBOR_RPG_ITEMS.length >= 30, 'expanded itemization')
assert.ok(HARBOR_RPG_ITEMS.includes('rpg-weapon-tide'))
assert.ok(HARBOR_RPG_ITEMS.includes('rpg-item-tide-coin'))
assert.ok(HARBOR_RPG_ITEMS.includes('rpg-weapon-sovereign'))

{
  assert.ok(HARBOR_RPG_MOUNT_IDS.length >= 30, `mounts ${HARBOR_RPG_MOUNT_IDS.length}`)
  assert.equal(HARBOR_RPG_STABLE.id, 'rpg-stable')
  const empty = emptyHarborRpgBag()
  assert.ok(empty.ownedMounts.includes('horse'), 'starter horse owned')
  assert.equal(empty.activeMountId, null)
  const bought = buyRpgMount({ ...empty, gold: 500 }, 'corgi')
  assert.ok(bought)
  assert.ok(bought!.ownedMounts.includes('corgi'))
  assert.ok(bought!.gold < 500)
  const summoned = setRpgActiveMount(bought!, 'corgi')
  assert.equal(summoned?.activeMountId, 'corgi')
  const cleared = setRpgActiveMount(summoned!, null)
  assert.equal(cleared?.activeMountId, null)
  const poor = buyRpgMount({ ...empty, gold: 0 }, 'rhino')
  assert.equal(poor, null)
  const sanitized = sanitizeHarborRpgBag({
    ...empty,
    ownedMounts: ['horse', 'corgi', 'not-a-mount'],
    activeMountId: 'corgi',
  })
  assert.ok(sanitized.ownedMounts.includes('corgi'))
  assert.ok(!sanitized.ownedMounts.includes('not-a-mount' as never))
  assert.equal(sanitized.activeMountId, 'corgi')
  for (const id of HARBOR_RPG_MOUNT_IDS) {
    const def = HARBOR_RPG_MOUNT_DEFS[id]
    const fromPublic = join(
      dirname(fileURLToPath(import.meta.url)),
      '../../../public',
      def.src.replace(/^\//, ''),
    )
    assert.ok(existsSync(fromPublic), `missing mount glb ${def.src}`)
  }
  assert.ok(
    existsSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        '../../../public/assets/harbor-quest/mounts/CREDITS.md',
      ),
    ),
  )
}

assert.match(worldSrc, /loadHarborRpgMount|tickHarborRpgMount|syncRpgMountFromBag/, 'mount runtime wired')
assert.match(worldSrc, /speedMult/, 'mount speed mult on walk')
assert.match(playSrc, /buyHarborRpgMount|setHarborRpgActiveMount|onBuyMount|onSummonMount/, 'mount UI wired')
assert.match(panelSrc, /stable|Ferry Stable|onBuyMount/, 'stable tab')
const realmSrc = readFileSync(new URL('./harborRpgRealm.ts', import.meta.url), 'utf8')
assert.match(realmSrc, /HARBOR_RPG_STABLE/, 'stable stall + interact')
assert.match(docs, /mount|Ferry Stable|Quaternius|Gobkit/i)

import {
  buyRpgCosmetic,
  setRpgEquippedCosmetic,
} from './harborRpgProgress.ts'
import {
  HARBOR_RPG_COSMETIC_IDS,
  HARBOR_RPG_COSMETIC_DEFS,
  harborRpgCosmeticHasMesh,
} from './harborRpgCosmetics.ts'

{
  assert.ok(HARBOR_RPG_COSMETIC_IDS.length >= 17, `cosmetics ${HARBOR_RPG_COSMETIC_IDS.length}`)
  assert.ok(HARBOR_RPG_COSMETIC_IDS.includes('rpg-outfit-ranger-m'))
  assert.ok(HARBOR_RPG_COSMETIC_IDS.includes('rpg-hood-ranger-f'))
  assert.ok(HARBOR_RPG_COSMETIC_IDS.includes('rpg-outfit-ranger-m-3'))
  assert.ok(HARBOR_RPG_COSMETIC_IDS.includes('rpg-outfit-peasant-f-2'))
  const emptyCos = emptyHarborRpgBag()
  assert.ok(emptyCos.ownedCosmetics.includes('rpg-cloak-traveler'))
  const boughtCos = buyRpgCosmetic({ ...emptyCos, gold: 500 }, 'rpg-outfit-ranger-m')
  assert.ok(boughtCos)
  assert.ok(boughtCos!.ownedCosmetics.includes('rpg-outfit-ranger-m'))
  assert.ok(boughtCos!.gold < 500)
  assert.equal(emptyCos.equippedCosmetic, null)
  assert.equal(emptyCos.equippedLooks.back, 'rpg-cloak-traveler')
  assert.equal(emptyCos.equippedLooks.body, null)
  const equipped = setRpgEquippedCosmetic(boughtCos!, 'rpg-outfit-ranger-m')
  assert.equal(equipped?.equippedCosmetic, 'rpg-outfit-ranger-m')
  assert.equal(equipped?.equippedLooks.body, 'rpg-outfit-ranger-m')
  assert.equal(equipped?.equippedLooks.back, 'rpg-cloak-traveler')
  const withHood = buyRpgCosmetic(equipped!, 'rpg-hood-ranger-m')
  const layered = setRpgEquippedCosmetic(withHood!, 'rpg-hood-ranger-m')
  assert.equal(layered?.equippedLooks.body, 'rpg-outfit-ranger-m')
  assert.equal(layered?.equippedLooks.head, 'rpg-hood-ranger-m')
  assert.equal(layered?.equippedCosmetic, 'rpg-outfit-ranger-m')
  const headOff = setRpgEquippedCosmetic(layered!, 'rpg-hood-ranger-m')
  assert.equal(headOff?.equippedLooks.head, null)
  assert.equal(headOff?.equippedCosmetic, 'rpg-outfit-ranger-m')
  const clearedCos = setRpgEquippedCosmetic(headOff!, null)
  assert.equal(clearedCos?.equippedCosmetic, null)
  assert.equal(clearedCos?.equippedLooks.back, null)
  const poorCos = buyRpgCosmetic({ ...emptyCos, gold: 0 }, 'rpg-outfit-ranger-m')
  assert.equal(poorCos, null)
  const sanitizedCos = sanitizeHarborRpgBag({
    ...emptyCos,
    ownedCosmetics: ['rpg-cloak-traveler', 'rpg-outfit-peasant-f', 'hack-fit'],
    equippedCosmetic: 'rpg-outfit-peasant-f',
  })
  assert.ok(sanitizedCos.ownedCosmetics.includes('rpg-outfit-peasant-f'))
  assert.ok(!sanitizedCos.ownedCosmetics.includes('hack-fit'))
  assert.equal(sanitizedCos.equippedCosmetic, 'rpg-outfit-peasant-f')
  for (const id of HARBOR_RPG_COSMETIC_IDS) {
    const def = HARBOR_RPG_COSMETIC_DEFS[id]
    if (!harborRpgCosmeticHasMesh(id) || !def.src) continue
    const fromPublic = join(
      dirname(fileURLToPath(import.meta.url)),
      '../../../public',
      def.src.replace(/^\//, ''),
    )
    assert.ok(existsSync(fromPublic), `missing cosmetic glb ${def.src}`)
  }
  assert.ok(
    existsSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        '../../../public/assets/harbor-quest/cosmetics/CREDITS.md',
      ),
    ),
  )
}

assert.match(worldSrc, /loadHarborRpgCosmetic|syncRpgCosmeticFromBag/, 'cosmetic runtime wired')
assert.match(worldSrc, /tickHarborRpgCosmetic|playRpgPerform|Death01/, 'UAL outfit mixer wired')
{
  const runtimeSrc = readFileSync(new URL('./harborRpgCosmeticRuntime.ts', import.meta.url), 'utf8')
  assert.match(runtimeSrc, /AnimationMixer|SkeletonUtils|ual1\.glb|ual2\.glb/)
  const animSrc = readFileSync(new URL('./harborRpgAnims.ts', import.meta.url), 'utf8')
  assert.match(animSrc, /Pistol|Zombie|Swim|Driving/)
  const publicDir = join(dirname(fileURLToPath(import.meta.url)), '../../../public')
  const glbNames = (rel: string) => {
    const buf = readFileSync(join(publicDir, rel))
    const jsonLen = buf.readUInt32LE(12)
    const doc = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8')) as {
      animations?: { name?: string }[]
    }
    return new Set((doc.animations ?? []).map((a) => a.name ?? ''))
  }
  const ual1 = glbNames('assets/harbor-quest/cosmetics/quaternius/ual1.glb')
  const ual2 = glbNames('assets/harbor-quest/cosmetics/quaternius/ual2.glb')
  for (const name of ['Idle_Loop', 'Walk_Loop', 'Sprint_Loop', 'Sword_Attack', 'Death01', 'Interact']) {
    assert.ok(ual1.has(name), `ual1 missing ${name}`)
  }
  assert.ok(ual2.has('Yes'), 'ual2 missing Yes')
  const { HARBOR_RPG_PERFORMS, harborRpgEmoteClip, isHarborRpgPerformClip } = await import(
    './harborRpgAnims.ts'
  )
  for (const row of HARBOR_RPG_PERFORMS) {
    assert.ok(ual1.has(row.clip) || ual2.has(row.clip), `perform clip missing ${row.clip}`)
  }
  assert.equal(harborRpgEmoteClip('wave'), 'Yes')
  assert.equal(harborRpgEmoteClip('bow'), 'Interact')
  assert.equal(isHarborRpgPerformClip('Pistol_Shoot'), true)
  assert.equal(isHarborRpgPerformClip('Not_A_Clip'), false)
  const waved = applyRpgMedium(emptyHarborRpgBag(), { type: 'emote', id: 'wave' })
  assert.equal(waved?.toast, 'Wave')
  const played = applyRpgMedium(emptyHarborRpgBag(), { type: 'perform', clip: 'Yes' })
  assert.ok(played)
  assert.ok(applyRpgMedium(emptyHarborRpgBag(), { type: 'perform', clip: 'Pistol_Shoot' }))
  assert.equal(applyRpgMedium(emptyHarborRpgBag(), { type: 'perform', clip: 'Not_A_Clip' }), null)
  const { harborRpgVisualBodyId, starterHarborRpgLooks } = await import('./harborRpgLooks.ts')
  assert.equal(harborRpgVisualBodyId(starterHarborRpgLooks(), 'female'), 'rpg-outfit-peasant-f')
  assert.equal(
    harborRpgVisualBodyId(
      {
        body: 'rpg-outfit-ranger-m',
        head: 'rpg-hood-ranger-m',
        shoulder: null,
        back: null,
        top: null,
        bottom: null,
        feet: null,
      },
      'male',
    ),
    'rpg-outfit-ranger-m',
  )
  const minion = join(publicDir, 'assets/harbor-quest/companions/gobkit/minion-a01.glb')
  assert.ok(existsSync(minion), 'gobkit minion glb')
  const minionNames = glbNames('assets/harbor-quest/companions/gobkit/minion-a01.glb')
  assert.ok(minionNames.has('idle') && minionNames.has('attack'), 'minion clips')
}
assert.match(worldSrc, /setCharacter[\s\S]{0,280}syncRpgCosmeticFromBag/, 'join body swaps the rigged kit')
assert.match(playSrc, /HarborRpgJoin/, 'rpg lobby gates teleport')
assert.match(readFileSync(new URL('./HarborRpgJoin.tsx', import.meta.url), 'utf8'), /house-village\.glb/, 'join street uses harbor houses')
assert.match(readFileSync(new URL('./HarborRpgJoin.tsx', import.meta.url), 'utf8'), /joinLantern/, 'join street hangs paper lanterns')
assert.match(readFileSync(new URL('./HarborRpgJoin.tsx', import.meta.url), 'utf8'), /rpg-join-moon/, 'join backdrop has a moon')
assert.match(readFileSync(new URL('./HarborRpgJoin.tsx', import.meta.url), 'utf8'), /rpg-join-shrine/, 'join backdrop has a spirit shrine')
assert.match(readFileSync(new URL('./HarborRpgJoin.tsx', import.meta.url), 'utf8'), /Zoom in/, 'join preview can zoom')
assert.match(readFileSync(new URL('./HarborRpgJoin.tsx', import.meta.url), 'utf8'), /rpg-join-spot/, 'join preview spotlights the sailor')
assert.match(readFileSync(new URL('./HarborRpgJoin.tsx', import.meta.url), 'utf8'), /yawVel/, 'join preview drags left and right')
assert.match(readFileSync(new URL('./HarborRpgJoin.tsx', import.meta.url), 'utf8'), /hq-rpg-join-classes is-fit/, 'class list fits without a scrollbar')
assert.match(readFileSync(new URL('./HarborRpgJoin.tsx', import.meta.url), 'utf8'), /mountClassGear/, 'class choice dresses the sailor')
assert.match(readFileSync(new URL('./HarborRpgJoin.tsx', import.meta.url), 'utf8'), /hand_r/, 'class weapon attaches to the hand')
assert.match(
  readFileSync(new URL('./harborRpgCosmeticRuntime.ts', import.meta.url), 'utf8'),
  /tuckHarborBodySkin/,
  'modular body tucks under clothing',
)
assert.match(playSrc, /realmOverride !== 'rpg' \|\| !rpgEntered/, 'presence waits for enter')
assert.match(playSrc, /realmOverride === 'rpg' && !rpgEntered/, 'world stays paused until enter')
{
  const { harborRpgJoinPhase } = await import('./harborRpgJoin.ts')
  assert.equal(harborRpgJoinPhase(0), 'create')
  assert.equal(harborRpgJoinPhase(2), 'select')
  const {
    harborRpgStarterHair,
    harborRpgStarterTops,
    harborRpgStarterBottoms,
    harborRpgStarterFeet,
    harborRpgComposeStarterLook,
    harborRpgDefaultStarterPick,
    harborRpgWornLayerIds,
  } = await import('./harborRpgLooks.ts')
  for (const gender of ['male', 'female'] as const) {
    assert.ok(harborRpgStarterHair(gender).length >= 4, `${gender} haircuts`)
    assert.equal(harborRpgStarterTops(gender).length, 4, `${gender} tops`)
    assert.equal(harborRpgStarterBottoms(gender).length, 4, `${gender} bottoms`)
    assert.equal(harborRpgStarterFeet(gender).length, 4, `${gender} shoes`)
    const look = harborRpgComposeStarterLook(gender, harborRpgDefaultStarterPick(gender))
    assert.equal(look.body, gender === 'female' ? 'rpg-base-f' : 'rpg-base-m')
    assert.ok(look.head)
    assert.ok(look.top && look.bottom && look.feet)
    const layers = harborRpgWornLayerIds(look)
    assert.ok(layers.some((id) => id.startsWith('rpg-arms-')), 'sleeves follow the tunic')
    assert.ok(layers.some((id) => id === look.top))
  }
}
assert.match(worldSrc, /harborRpgFallbackBodyId/, 'UAL fallback body')
assert.match(worldSrc, /loadHarborRpgCompanion|HARBOR_RPG_COMPANION_SRC/, 'companion mesh')
assert.match(worldSrc, /onRpgPartyHeal/, 'party heal callback')
assert.match(worldSrc, /HARBOR_RPG_TOWN_FOLK/, 'town folk')
assert.match(worldSrc, /if \(!isRpg\) scoutAnim = tickHarborProtagonistAnim/, 'quest motion stays on Scout')
assert.match(playSrc, /buyHarborRpgCosmetic|setHarborRpgEquippedCosmetic|onBuyCosmetic|onEquipCosmetic/, 'cosmetic UI wired')
assert.match(panelSrc, /wardrobe|Wardrobe|onBuyCosmetic/, 'wardrobe tab')
assert.match(presenceSrc, /equippedCosmetic/, 'cosmetic on presence')
assert.match(docs, /Wardrobe|Modular Outfits|cosmetics\/CREDITS/i)

{
  const fresh = emptyHarborRpgBag()
  const friended = applyRpgMedium(fresh, { type: 'add-friend', name: 'Jade' })
  assert.ok(friended?.bag.friends.includes('Jade'))
  const fleet = applyRpgMedium(friended!.bag, { type: 'fleet', name: 'Ferry', motto: 'soft' })
  assert.equal(fleet?.bag.fleetName, 'Ferry')
  const mailed = applyRpgMedium({ ...fresh, gold: 10 }, {
    type: 'mail',
    to: 'Jade',
    subject: 'Hi',
    body: 'Tide',
    gold: 3,
  })
  assert.equal(mailed?.bag.gold, 7)
  assert.equal(mailed?.bag.inbox.length, 1)
  const delve = applyRpgMedium(fresh, { type: 'enter-delve', floor: 3 })
  assert.equal(delve?.zone, 'delve')
  assert.equal(delve?.bag.delveFloor, 3)
  const rift = applyRpgMedium(fresh, { type: 'enter-rift' })
  assert.equal(rift?.zone, 'rift')
  const raced = applyRpgMedium(fresh, { type: 'race', elapsedMs: 12000, mounted: true })
  assert.equal(raced?.bag.raceRuns, 1)
  assert.ok((raced?.bag.gold ?? 0) > fresh.gold)
  const unmounted = applyRpgMedium(fresh, { type: 'race', elapsedMs: 12000, mounted: false })
  assert.equal(unmounted, null)
  const cleaned = sanitizeRpgMedium({ friends: ['Jade', 'nope\n', 'Jade'], afk: true, fleetName: 'Ferry' })
  assert.deepEqual(cleaned.friends, ['Jade', 'nope'])
  assert.equal(cleaned.fleetName, 'Ferry')
  assert.ok(['sunny', 'cloudy', 'rainy', 'night'].includes(harborRpgWeatherForZone('ashreach')))
  assert.ok(HARBOR_RPG_ZONES.includes('ashreach'))
  assert.ok(HARBOR_RPG_ZONES.includes('moonpier'))
  assert.ok(HARBOR_RPG_ZONES.includes('rift'))
  assert.ok(HARBOR_RPG_ZONES.includes('delve'))
  assert.ok(HARBOR_RPG_MONSTER_KINDS.includes('world-colossus'))
}

assert.match(panelSrc, /social|Ravenpost|onMedium/, 'social tab')
assert.match(panelSrc, /frontiers|Reliquary|delve/, 'frontiers tab')
assert.match(worldSrc, /harborRpgWeatherForZone/, 'rpg weather')
assert.match(docs, /v6\.5|Ravenpost|Ash Reach/)

{
  const pack = delvePack(3)
  assert.equal(pack[0]?.kind, 'bandit')
  assert.equal(pack[0]?.count, 5)
  assert.notDeepEqual(riftPack(1), riftPack(2))
  assert.equal(lockpickMatches(4, lockpickPattern(4)), true)
  assert.equal(lockpickMatches(4, [0, 0, 0]), false)
  const fresh = emptyHarborRpgBag()
  const post = applyRpgMedium(fresh, { type: 'duel', foe: 'training-post' })
  assert.equal(post?.bag.duel?.phase, 'active')
  const strike = applyRpgMedium(post!.bag, { type: 'duel-hit' })
  assert.ok((strike?.bag.duel?.foeHp ?? 40) < 40)
  assert.equal(strike?.bag.gold, fresh.gold)
  const mailed = applyRpgMedium({ ...fresh, gold: 10 }, {
    type: 'mail',
    to: 'Jade',
    subject: 'Hi',
    body: 'Tide',
    gold: 3,
  })
  assert.equal(mailed?.social?.kind, 'mail')
  assert.equal(mailed?.social?.to, 'Jade')
  const gated = applyRpgMedium(fresh, { type: 'race', elapsedMs: 12000, mounted: true, checkpoint: true })
  assert.equal(gated, null)
  const marked = applyRpgMedium(fresh, { type: 'race-mark', gate: 'start' })
  const mid = applyRpgMedium(marked!.bag, { type: 'race-mark', gate: 'mid' })
  assert.equal(mid?.bag.raceStep, 2)
  const chart = applyRpgMedium(fresh, { type: 'draw-chart' }, Date.UTC(2026, 0, 15))
  assert.ok(chart?.bag.tideChart)
  const dug = applyRpgMedium(
    { ...chart!.bag, zone: chart!.bag.tideChart!.zone },
    { type: 'dig-chart', x: chart!.bag.tideChart!.x, z: chart!.bag.tideChart!.z },
  )
  assert.equal(dug?.bag.gold, fresh.gold + 12)
  const saved = applyRpgMedium({ ...fresh, skillBar: ['tb-strike'] }, { type: 'save-loadout' })
  assert.deepEqual(saved?.bag.loadoutB?.skillBar, ['tb-strike'])
  const day = Date.UTC(2026, 0, 15)
  const board = harborRpgWorldBoard(day)
  assert.equal(board.length, 4)
  const quest = board.find((q) => q.kind === 'kill' && q.monster) ?? board[0]!
  const synced = applyRpgMedium(fresh, { type: 'sync-world' }, day)
  assert.ok(synced)
  let progressed = synced!.bag
  if (quest.kind === 'kill' && quest.monster) {
    progressed = {
      ...progressed,
      kills: { ...progressed.kills, [quest.monster]: (progressed.worldKillMark[quest.monster] ?? 0) + quest.need },
    }
  } else if (quest.zone) {
    progressed = applyRpgMedium(progressed, { type: 'zone', zone: quest.zone }, day)!.bag
  }
  const claimed = applyRpgMedium(progressed, { type: 'claim-world', id: quest.id }, day)
  assert.ok((claimed?.bag.gold ?? 0) >= fresh.gold + quest.gold)
  const delveMobs = spawnRpgMonsters('delve', 1, 'normal', delvePack(3))
  assert.equal(delveMobs.length, 5)
  assert.equal(
    spawnRpgMonsters('meadow', 1).length,
    HARBOR_RPG_ZONE_SPAWNS.meadow.reduce((n, p) => n + p.count, 0),
  )
}

assert.match(panelSrc, /Whisper|Ready check|Lock pattern|Draw tide chart|Save as B|FieldTracker|WorldBoard/)
assert.match(worldSrc, /spawnRpgFloat/)
assert.match(worldSrc, /dressHarborRpgWorldKit/)
assert.match(docs, /14 zones/)
assert.match(docs, /World kit/)
{
  const { HARBOR_RPG_WORLD_KIT_FILES } = await import('./harborRpgWorldKit.ts')
  const kitDir = join(
    dirname(fileURLToPath(import.meta.url)),
    '../../../public/assets/harbor-quest/world/quaternius',
  )
  for (const file of HARBOR_RPG_WORLD_KIT_FILES) {
    assert.ok(existsSync(join(kitDir, file)), `missing world kit ${file}`)
  }
  assert.ok(existsSync(join(kitDir, 'CREDITS.md')))
}

console.log('harborRpg.smoke: ok')
