/**
 * HarborRPG progress bag — nested under HarborProgress for storage only.
 * Soft client meters; max 2 characters; never touches pedagogy XP/leaderboard.
 */
import {
  HARBOR_DEFAULT_APPEARANCE,
  sanitizeHarborAppearance,
  sanitizeHarborGender,
  type HarborAppearance,
  type HarborGender,
} from './harborAppearance'
import {
  HARBOR_RPG_DIFFICULTIES,
  HARBOR_RPG_GEAR_SLOTS,
  HARBOR_RPG_ITEMS,
  HARBOR_RPG_ITEM_DEFS,
  HARBOR_RPG_MONSTER_KINDS,
  HARBOR_RPG_QUESTS,
  HARBOR_RPG_ZONES,
  harborRpgItemSlot,
  harborRpgQuestById,
  isHarborRpgZoneId,
  type HarborRpgDifficulty,
  type HarborRpgGearSlot,
  type HarborRpgItemId,
  type HarborRpgMonsterKind,
  type HarborRpgProfessionId,
  type HarborRpgQuestId,
  type HarborRpgZoneId,
} from './harborRpgData'
import {
  emptyRpgProfessions,
  sanitizeRpgMarketListings,
  sanitizeRpgProfessions,
  type HarborRpgMarketListing,
} from './harborRpgProfessions'
import {
  HARBOR_RPG_MOUNT_DEFS,
  HARBOR_RPG_MOUNT_IDS,
  isHarborRpgMountId,
  type HarborRpgMountId,
} from './harborRpgMounts'
import { mergeRpgMedium, sanitizeRpgMedium } from './harborRpgMedium'
import {
  HARBOR_RPG_CLASS_DEFS,
  HARBOR_RPG_CLASS_LEVEL_CAP,
  HARBOR_RPG_PRESTIGE_CAP,
  harborRpgAllSkillIds,
  harborRpgAllTalentIds,
  harborRpgClassById,
  harborRpgClassLevelFromXp,
  harborRpgSkillById,
  harborRpgSkillRankFromXp,
  harborRpgTalentPointsEarned,
  harborRpgUnlockedSkills,
  isHarborRpgClassId,
  type HarborRpgClassId,
} from './harborRpgClasses'
import {
  harborRpgDefaultSpec,
  harborRpgMaxResource,
  harborRpgSpecById,
  isHarborRpgSpecId,
  type HarborRpgSpecId,
} from './harborRpgSpecs'

export const HARBOR_RPG_MAX_CHARS = 2
export const HARBOR_RPG_MAX_INV_STACKS = 32
export const HARBOR_RPG_MAX_BANK_STACKS = 40
export const HARBOR_RPG_SHRINE_XP = 25
export const HARBOR_RPG_DUMMY_GOLD = 3
export const HARBOR_RPG_BASE_HP = 40
export const HARBOR_RPG_HP_PER_LEVEL = 8

import {
  HARBOR_RPG_COSMETIC_IDS as HARBOR_RPG_COSMETICS,
  HARBOR_RPG_COSMETIC_DEFS,
  isHarborRpgCosmeticId,
  type HarborRpgCosmeticId,
} from './harborRpgCosmetics'

export {
  HARBOR_RPG_COSMETICS,
  HARBOR_RPG_COSMETIC_DEFS,
  isHarborRpgCosmeticId,
  type HarborRpgCosmeticId,
}
export { harborRpgCosmeticById } from './harborRpgCosmetics'

export type HarborRpgCharacter = {
  id: string
  name: string
  gender: HarborGender
  appearance: HarborAppearance
  createdAt: number
}

export type HarborRpgBoosts = {
  xpMultUntil: number
  creditMultUntil: number
}

export type HarborRpgInvStack = { id: HarborRpgItemId; qty: number }

export type HarborRpgQuestProgress = {
  id: HarborRpgQuestId
  progress: number
  complete: boolean
  claimed: boolean
}

export type HarborRpgKillCounts = Partial<Record<HarborRpgMonsterKind, number>>

export type HarborRpgGear = Record<HarborRpgGearSlot, HarborRpgItemId | null>

export type HarborRpgBag = {
  characters: HarborRpgCharacter[]
  activeCharacterId: string | null
  xp: number
  gold: number
  ownedCosmetics: string[]
  equippedCosmetic: string | null
  boosts: HarborRpgBoosts
  shrineClaims: number
  dummyKills: number
  zone: HarborRpgZoneId
  inventory: HarborRpgInvStack[]
  bank: HarborRpgInvStack[]
  gear: HarborRpgGear
  /** @deprecated mirrors gear.weapon */
  equippedWeapon: HarborRpgItemId | null
  /** @deprecated mirrors gear.chest */
  equippedArmor: HarborRpgItemId | null
  quests: HarborRpgQuestProgress[]
  kills: HarborRpgKillCounts
  companionUntil: number
  companionName: string | null
  professions: Record<HarborRpgProfessionId, number>
  market: HarborRpgMarketListing[]
  /** Active adventuring class (null until chosen). */
  classId: HarborRpgClassId | null
  /** Active spec within the class (9×3). */
  specId: HarborRpgSpecId | null
  /** XP toward class level (separate from soft adventure XP). */
  classXp: number
  /** Prestige stars after hitting level cap. */
  prestige: number
  /** Per-skill XP → rank. */
  skillXp: Record<string, number>
  /** Talent node id → points spent. */
  talents: Record<string, number>
  /** Equipped skill bar (up to 5 skill ids). */
  skillBar: string[]
  /** Soft dungeon difficulty for instances. */
  difficulty: HarborRpgDifficulty
  /** Owned rideable mount ids (Ferry Stable). */
  ownedMounts: HarborRpgMountId[]
  /** Currently summoned mount (null = on foot). */
  activeMountId: HarborRpgMountId | null
  /** Soft achievement title ids unlocked (cosmetic only). */
  unlockedTitles: string[]
  /** Equipped achievement title shown on Field (null = none). */
  activeTitleId: string | null
  /** Soft friend list (usernames). */
  friends: string[]
  afk: boolean
  afkNote: string
  fleetName: string | null
  fleetMotto: string
  inbox: import('./harborRpgMedium').HarborRpgMail[]
  /** Deed ids whose Reliquary reward was claimed. */
  claimedDeeds: string[]
  delveFloor: number
  delveBest: number
  delveMark: number
  riftClears: number
  riftMark: number
  raceBestMs: number | null
  raceRuns: number
}

const COSMETIC_SET = new Set<string>(HARBOR_RPG_COSMETICS)
const ITEM_SET = new Set<string>(HARBOR_RPG_ITEMS)
const QUEST_SET = new Set<string>(HARBOR_RPG_QUESTS.map((q) => q.id))
const MONSTER_SET = new Set<string>(HARBOR_RPG_MONSTER_KINDS)

export function emptyRpgGear(): HarborRpgGear {
  return {
    weapon: null,
    offhand: null,
    head: null,
    chest: null,
    legs: null,
    feet: null,
    ring: null,
    trinket: null,
  }
}

export function emptyHarborRpgBag(): HarborRpgBag {
  const gear = emptyRpgGear()
  gear.weapon = 'rpg-weapon-stick'
  gear.chest = 'rpg-armor-cloth'
  return {
    characters: [],
    activeCharacterId: null,
    xp: 0,
    gold: 12,
    ownedCosmetics: ['rpg-cloak-traveler'],
    equippedCosmetic: 'rpg-cloak-traveler',
    boosts: { xpMultUntil: 0, creditMultUntil: 0 },
    shrineClaims: 0,
    dummyKills: 0,
    zone: 'meadow',
    inventory: [
      { id: 'rpg-weapon-stick', qty: 1 },
      { id: 'rpg-armor-cloth', qty: 1 },
    ],
    bank: [],
    gear,
    equippedWeapon: 'rpg-weapon-stick',
    equippedArmor: 'rpg-armor-cloth',
    quests: [],
    kills: {},
    companionUntil: 0,
    companionName: null,
    professions: emptyRpgProfessions(),
    market: [],
    classId: null,
    specId: null,
    classXp: 0,
    prestige: 0,
    skillXp: {},
    talents: {},
    skillBar: [],
    difficulty: 'normal',
    ownedMounts: ['horse'],
    activeMountId: null,
    unlockedTitles: [],
    activeTitleId: null,
    friends: [],
    afk: false,
    afkNote: '',
    fleetName: null,
    fleetMotto: '',
    inbox: [],
    claimedDeeds: [],
    delveFloor: 1,
    delveBest: 0,
    delveMark: 0,
    riftClears: 0,
    riftMark: 0,
    raceBestMs: null,
    raceRuns: 0,
  }
}

export function harborRpgLevelFromXp(xp: number): number {
  const n = Math.max(0, Math.floor(xp))
  return 1 + Math.floor(Math.sqrt(n / 25))
}

function gearPower(bag: HarborRpgBag, slots: HarborRpgGearSlot[]): number {
  let n = 0
  for (const slot of slots) {
    const id = bag.gear[slot]
    if (id && HARBOR_RPG_ITEM_DEFS[id]) n += HARBOR_RPG_ITEM_DEFS[id].power
  }
  return n
}

export function harborRpgMaxHp(bag: HarborRpgBag): number {
  const lv = harborRpgLevelFromXp(bag.xp)
  const armor = gearPower(bag, ['chest', 'head', 'legs', 'feet', 'offhand'])
  const cls = bag.classId ? HARBOR_RPG_CLASS_DEFS[bag.classId] : null
  const bias = cls ? cls.hpBias : 1
  const talentHp = sumTalentStat(bag, 'hp')
  return Math.floor(
    (HARBOR_RPG_BASE_HP + (lv - 1) * HARBOR_RPG_HP_PER_LEVEL + armor * 3 + talentHp) * bias,
  )
}

export function harborRpgMaxMp(bag: HarborRpgBag): number {
  const classLv = harborRpgClassLevelFromXp(bag.classXp)
  const spec = bag.specId ? harborRpgSpecById(bag.specId) : null
  const resource = spec?.resource ?? 'focus'
  let max = harborRpgMaxResource(classLv, resource)
  if (bag.classId === 'mistweaver' && classLv >= 10) max = Math.floor(max * 1.12)
  return max
}

/** Soft crit chance bonus from offense talents + prestige. */
export function harborRpgCritBonus(bag: HarborRpgBag): number {
  if (!bag.classId) return 0
  let n = bag.prestige * 0.01
  for (const node of HARBOR_RPG_CLASS_DEFS[bag.classId].talents) {
    if (node.tree !== 'offense') continue
    const pts = bag.talents[node.id] ?? 0
    if (pts > 0) n += 0.008 * pts
  }
  return n
}

/** Soft hit chance bonus from voyage talents. */
export function harborRpgHitBonus(bag: HarborRpgBag): number {
  if (!bag.classId) return 0
  let n = 0
  for (const node of HARBOR_RPG_CLASS_DEFS[bag.classId].talents) {
    if (node.tree !== 'voyage') continue
    const pts = bag.talents[node.id] ?? 0
    if (pts > 0) n += 0.005 * pts
  }
  return n
}

export function harborRpgAttackPower(bag: HarborRpgBag): number {
  const lv = harborRpgLevelFromXp(bag.xp)
  const weapon = gearPower(bag, ['weapon', 'ring', 'trinket'])
  const cls = bag.classId ? HARBOR_RPG_CLASS_DEFS[bag.classId] : null
  const bias = cls ? cls.atkBias : 1
  const talentAtk = sumTalentStat(bag, 'atk')
  const classLv = harborRpgClassLevelFromXp(bag.classXp)
  return Math.floor(
    (3 + Math.floor(lv * 0.8) + weapon + talentAtk + classLv * 0.15) * bias,
  )
}

export function harborRpgDefense(bag: HarborRpgBag): number {
  const armor = gearPower(bag, ['chest', 'head', 'legs', 'feet', 'offhand'])
  const cls = bag.classId ? HARBOR_RPG_CLASS_DEFS[bag.classId] : null
  const bias = cls ? cls.defBias : 1
  const talentDef = sumTalentStat(bag, 'def')
  return Math.floor((armor + talentDef) * bias)
}

function sumTalentStat(bag: HarborRpgBag, key: 'atk' | 'def' | 'hp'): number {
  if (!bag.classId) return 0
  const def = HARBOR_RPG_CLASS_DEFS[bag.classId]
  let n = 0
  for (const node of def.talents) {
    const pts = bag.talents[node.id] ?? 0
    if (pts <= 0) continue
    if (key === 'atk') n += (node.atk ?? 0) * pts
    if (key === 'def') n += (node.def ?? 0) * pts
    if (key === 'hp') n += (node.hp ?? 0) * pts
  }
  return n
}

export function harborRpgCdMultiplier(bag: HarborRpgBag): number {
  if (!bag.classId) return 1
  let reduce = 0
  for (const node of HARBOR_RPG_CLASS_DEFS[bag.classId].talents) {
    const pts = bag.talents[node.id] ?? 0
    if (pts > 0 && node.cdReduce) reduce += node.cdReduce * pts
  }
  // Tideblade passive cadence at 40
  const classLv = harborRpgClassLevelFromXp(bag.classXp)
  if (bag.classId === 'tideblade' && classLv >= 40) reduce += 0.05
  return Math.max(0.7, 1 - reduce)
}

export function harborRpgClassXpBonus(bag: HarborRpgBag): number {
  if (!bag.classId) return 1
  let bonus = 0
  for (const node of HARBOR_RPG_CLASS_DEFS[bag.classId].talents) {
    const pts = bag.talents[node.id] ?? 0
    if (pts > 0 && node.xpBonus) bonus += node.xpBonus * pts
  }
  return 1 + bonus
}

function sanitizeName(raw: unknown): string {
  if (typeof raw !== 'string') return 'Adventurer'
  const t = raw.trim().slice(0, 20)
  return t || 'Adventurer'
}

function sanitizeCharId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const t = raw.trim().slice(0, 40)
  if (!t || !/^rpg-[a-z0-9-]+$/i.test(t)) return null
  return t
}

function sanitizeCharacter(raw: unknown): HarborRpgCharacter | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = sanitizeCharId(o.id)
  if (!id) return null
  const createdAt =
    typeof o.createdAt === 'number' && Number.isFinite(o.createdAt) && o.createdAt >= 0
      ? Math.floor(o.createdAt)
      : Date.now()
  return {
    id,
    name: sanitizeName(o.name),
    gender: sanitizeHarborGender(o.gender),
    appearance: sanitizeHarborAppearance(o.appearance),
    createdAt,
  }
}

function sanitizeInventory(
  raw: unknown,
  max = HARBOR_RPG_MAX_INV_STACKS,
): HarborRpgInvStack[] {
  const out: HarborRpgInvStack[] = []
  if (!Array.isArray(raw)) return out
  for (const row of raw) {
    if (out.length >= max) break
    if (!row || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    if (typeof o.id !== 'string' || !ITEM_SET.has(o.id)) continue
    const id = o.id as HarborRpgItemId
    const qty =
      typeof o.qty === 'number' && Number.isFinite(o.qty) && o.qty > 0
        ? Math.min(Math.floor(o.qty), HARBOR_RPG_ITEM_DEFS[id].stackable ? 999 : 1)
        : 0
    if (qty <= 0) continue
    const existing = out.find((s) => s.id === id)
    if (existing && HARBOR_RPG_ITEM_DEFS[id].stackable) {
      existing.qty = Math.min(999, existing.qty + qty)
    } else if (!existing) {
      out.push({ id, qty: HARBOR_RPG_ITEM_DEFS[id].stackable ? qty : 1 })
    }
  }
  return out
}

function sanitizeQuests(raw: unknown): HarborRpgQuestProgress[] {
  const out: HarborRpgQuestProgress[] = []
  const seen = new Set<string>()
  if (!Array.isArray(raw)) return out
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    if (typeof o.id !== 'string' || !QUEST_SET.has(o.id) || seen.has(o.id)) continue
    seen.add(o.id)
    const def = harborRpgQuestById(o.id)
    if (!def) continue
    const progress =
      typeof o.progress === 'number' && Number.isFinite(o.progress) && o.progress >= 0
        ? Math.min(Math.floor(o.progress), def.need)
        : 0
    out.push({
      id: o.id as HarborRpgQuestId,
      progress,
      complete: o.complete === true || progress >= def.need,
      claimed: o.claimed === true,
    })
  }
  return out
}

function sanitizeKills(raw: unknown): HarborRpgKillCounts {
  const out: HarborRpgKillCounts = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!MONSTER_SET.has(k)) continue
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) continue
    out[k as HarborRpgMonsterKind] = Math.min(Math.floor(v), 1_000_000)
  }
  return out
}

function syncLegacyEquip(gear: HarborRpgGear): {
  equippedWeapon: HarborRpgItemId | null
  equippedArmor: HarborRpgItemId | null
} {
  return {
    equippedWeapon: gear.weapon,
    equippedArmor: gear.chest,
  }
}

function sanitizeGear(
  raw: unknown,
  inventory: HarborRpgInvStack[],
  legacyWeapon: unknown,
  legacyArmor: unknown,
): HarborRpgGear {
  const gear = emptyRpgGear()
  const owned = (id: HarborRpgItemId) => inventory.some((s) => s.id === id)
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>
    for (const slot of HARBOR_RPG_GEAR_SLOTS) {
      const v = o[slot]
      if (typeof v !== 'string' || !ITEM_SET.has(v)) continue
      const id = v as HarborRpgItemId
      if (harborRpgItemSlot(id) !== slot) continue
      if (!owned(id)) continue
      gear[slot] = id
    }
  }
  // Legacy fields
  if (!gear.weapon && typeof legacyWeapon === 'string' && ITEM_SET.has(legacyWeapon)) {
    const id = legacyWeapon as HarborRpgItemId
    if (harborRpgItemSlot(id) === 'weapon' && owned(id)) gear.weapon = id
  }
  if (!gear.chest && typeof legacyArmor === 'string' && ITEM_SET.has(legacyArmor)) {
    const id = legacyArmor as HarborRpgItemId
    if (harborRpgItemSlot(id) === 'chest' && owned(id)) gear.chest = id
  }
  return gear
}

export function sanitizeHarborRpgBag(raw: unknown): HarborRpgBag {
  const empty = emptyHarborRpgBag()
  if (!raw || typeof raw !== 'object') return empty
  const o = raw as Record<string, unknown>
  const chars: HarborRpgCharacter[] = []
  const seen = new Set<string>()
  if (Array.isArray(o.characters)) {
    for (const row of o.characters) {
      if (chars.length >= HARBOR_RPG_MAX_CHARS) break
      const c = sanitizeCharacter(row)
      if (!c || seen.has(c.id)) continue
      seen.add(c.id)
      chars.push(c)
    }
  }
  let activeCharacterId: string | null = sanitizeCharId(o.activeCharacterId)
  if (activeCharacterId && !chars.some((c) => c.id === activeCharacterId)) {
    activeCharacterId = null
  }
  if (!activeCharacterId && chars[0]) activeCharacterId = chars[0].id

  const xp =
    typeof o.xp === 'number' && Number.isFinite(o.xp) && o.xp >= 0
      ? Math.min(Math.floor(o.xp), 50_000_000)
      : 0
  const gold =
    typeof o.gold === 'number' && Number.isFinite(o.gold) && o.gold >= 0
      ? Math.min(Math.floor(o.gold), 10_000_000)
      : 0

  const owned = new Set<string>(['rpg-cloak-traveler'])
  if (Array.isArray(o.ownedCosmetics)) {
    for (const id of o.ownedCosmetics) {
      if (typeof id === 'string' && COSMETIC_SET.has(id)) owned.add(id)
    }
  }
  const equippedCosmetic: string | null =
    o.equippedCosmetic === null
      ? null
      : typeof o.equippedCosmetic === 'string' && owned.has(o.equippedCosmetic)
        ? o.equippedCosmetic
        : owned.has('rpg-cloak-traveler')
          ? 'rpg-cloak-traveler'
          : null

  const boostsRaw =
    o.boosts && typeof o.boosts === 'object' ? (o.boosts as Record<string, unknown>) : {}
  const boosts: HarborRpgBoosts = {
    xpMultUntil:
      typeof boostsRaw.xpMultUntil === 'number' && Number.isFinite(boostsRaw.xpMultUntil)
        ? Math.max(0, Math.floor(boostsRaw.xpMultUntil))
        : 0,
    creditMultUntil:
      typeof boostsRaw.creditMultUntil === 'number' && Number.isFinite(boostsRaw.creditMultUntil)
        ? Math.max(0, Math.floor(boostsRaw.creditMultUntil))
        : 0,
  }

  const shrineClaims =
    typeof o.shrineClaims === 'number' && Number.isFinite(o.shrineClaims) && o.shrineClaims >= 0
      ? Math.min(Math.floor(o.shrineClaims), 1_000_000)
      : 0
  const dummyKills =
    typeof o.dummyKills === 'number' && Number.isFinite(o.dummyKills) && o.dummyKills >= 0
      ? Math.min(Math.floor(o.dummyKills), 1_000_000)
      : 0

  let inventory = sanitizeInventory(o.inventory)
  if (!Array.isArray(o.inventory)) {
    inventory = empty.inventory.map((s) => ({ ...s }))
  }
  const bank = sanitizeInventory(o.bank, HARBOR_RPG_MAX_BANK_STACKS)
  const gear = sanitizeGear(o.gear, inventory, o.equippedWeapon, o.equippedArmor)
  const legacy = syncLegacyEquip(gear)

  const zone = isHarborRpgZoneId(o.zone) ? o.zone : 'meadow'
  const companionUntil =
    typeof o.companionUntil === 'number' && Number.isFinite(o.companionUntil)
      ? Math.max(0, Math.floor(o.companionUntil))
      : 0
  let companionName: string | null = null
  if (typeof o.companionName === 'string') {
    const n = o.companionName.trim().slice(0, 20)
    if (n) companionName = n
  }

  return {
    characters: chars,
    activeCharacterId,
    xp,
    gold,
    ownedCosmetics: [...owned],
    equippedCosmetic,
    boosts,
    shrineClaims,
    dummyKills,
    zone,
    inventory,
    bank,
    gear,
    equippedWeapon: legacy.equippedWeapon,
    equippedArmor: legacy.equippedArmor,
    quests: sanitizeQuests(o.quests),
    kills: sanitizeKills(o.kills),
    companionUntil,
    companionName: companionUntil > Date.now() ? companionName : null,
    professions: sanitizeRpgProfessions(o.professions),
    market: sanitizeRpgMarketListings(o.market),
    ...sanitizeClassProgress(o),
    difficulty:
      typeof o.difficulty === 'string' &&
      (HARBOR_RPG_DIFFICULTIES as readonly string[]).includes(o.difficulty)
        ? (o.difficulty as HarborRpgDifficulty)
        : 'normal',
    ...sanitizeMountProgress(o),
    ...sanitizeTitleProgress(o),
    ...sanitizeRpgMedium(o),
  }
}

function sanitizeMountProgress(o: Record<string, unknown>): {
  ownedMounts: HarborRpgMountId[]
  activeMountId: HarborRpgMountId | null
} {
  const owned = new Set<HarborRpgMountId>(['horse'])
  if (Array.isArray(o.ownedMounts)) {
    for (const id of o.ownedMounts) {
      if (isHarborRpgMountId(id)) owned.add(id)
    }
  }
  const ownedMounts = HARBOR_RPG_MOUNT_IDS.filter((id) => owned.has(id))
  let activeMountId: HarborRpgMountId | null = null
  if (isHarborRpgMountId(o.activeMountId) && owned.has(o.activeMountId)) {
    activeMountId = o.activeMountId
  }
  return { ownedMounts, activeMountId }
}

function sanitizeTitleProgress(o: Record<string, unknown>): {
  unlockedTitles: string[]
  activeTitleId: string | null
} {
  const unlocked: string[] = []
  const seen = new Set<string>()
  if (Array.isArray(o.unlockedTitles)) {
    for (const id of o.unlockedTitles) {
      if (typeof id !== 'string') continue
      const clean = id.trim().slice(0, 40)
      if (!clean || seen.has(clean)) continue
      seen.add(clean)
      unlocked.push(clean)
      if (unlocked.length >= 64) break
    }
  }
  const activeTitleId =
    typeof o.activeTitleId === 'string' && seen.has(o.activeTitleId.trim())
      ? o.activeTitleId.trim().slice(0, 40)
      : null
  return { unlockedTitles: unlocked, activeTitleId }
}

const SKILL_ID_SET = new Set(harborRpgAllSkillIds())
const TALENT_ID_SET = new Set(harborRpgAllTalentIds())

function sanitizeClassProgress(o: Record<string, unknown>): {
  classId: HarborRpgClassId | null
  specId: HarborRpgSpecId | null
  classXp: number
  prestige: number
  skillXp: Record<string, number>
  talents: Record<string, number>
  skillBar: string[]
} {
  const classId = isHarborRpgClassId(o.classId) ? o.classId : null
  let specId: HarborRpgSpecId | null = null
  if (isHarborRpgSpecId(o.specId)) {
    const spec = harborRpgSpecById(o.specId)
    if (spec && (!classId || spec.classId === classId)) specId = o.specId
  }
  if (classId && !specId) specId = harborRpgDefaultSpec(classId)
  const classXp =
    typeof o.classXp === 'number' && Number.isFinite(o.classXp) && o.classXp >= 0
      ? Math.min(Math.floor(o.classXp), 50_000_000)
      : 0
  const prestige =
    typeof o.prestige === 'number' && Number.isFinite(o.prestige) && o.prestige >= 0
      ? Math.min(Math.floor(o.prestige), HARBOR_RPG_PRESTIGE_CAP)
      : 0
  const skillXp: Record<string, number> = {}
  if (o.skillXp && typeof o.skillXp === 'object' && !Array.isArray(o.skillXp)) {
    for (const [k, v] of Object.entries(o.skillXp as Record<string, unknown>)) {
      if (!SKILL_ID_SET.has(k)) continue
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) continue
      skillXp[k] = Math.min(Math.floor(v), 500_000)
    }
  }
  const talents: Record<string, number> = {}
  if (o.talents && typeof o.talents === 'object' && !Array.isArray(o.talents)) {
    for (const [k, v] of Object.entries(o.talents as Record<string, unknown>)) {
      if (!TALENT_ID_SET.has(k)) continue
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) continue
      const nodeMax =
        classId
          ? HARBOR_RPG_CLASS_DEFS[classId].talents.find((t) => t.id === k)?.max ?? 5
          : 5
      talents[k] = Math.min(Math.floor(v), nodeMax)
    }
  }
  const skillBar: string[] = []
  if (Array.isArray(o.skillBar)) {
    for (const id of o.skillBar) {
      if (typeof id !== 'string' || !SKILL_ID_SET.has(id)) continue
      if (classId) {
        const sk = harborRpgSkillById(id)
        if (!sk || sk.classId !== classId) continue
      }
      if (skillBar.includes(id)) continue
      skillBar.push(id)
      if (skillBar.length >= 5) break
    }
  }
  return { classId, specId, classXp, prestige, skillXp, talents, skillBar }
}

function mergeInv(
  a: HarborRpgInvStack[],
  b: HarborRpgInvStack[],
  max: number,
): HarborRpgInvStack[] {
  const map = new Map<HarborRpgItemId, number>()
  for (const s of [...a, ...b]) {
    map.set(s.id, Math.min(999, (map.get(s.id) ?? 0) + s.qty))
  }
  const out: HarborRpgInvStack[] = []
  for (const [id, qty] of map) {
    if (out.length >= max) break
    out.push({ id, qty: HARBOR_RPG_ITEM_DEFS[id].stackable ? qty : 1 })
  }
  return out
}

export function mergeHarborRpgBag(a: HarborRpgBag, b: HarborRpgBag): HarborRpgBag {
  const byId = new Map<string, HarborRpgCharacter>()
  for (const c of [...a.characters, ...b.characters]) {
    const prev = byId.get(c.id)
    if (!prev || c.createdAt >= prev.createdAt) byId.set(c.id, c)
  }
  const characters = [...byId.values()]
    .sort((x, y) => x.createdAt - y.createdAt)
    .slice(0, HARBOR_RPG_MAX_CHARS)
  const owned = new Set([...a.ownedCosmetics, ...b.ownedCosmetics])
  for (const id of owned) {
    if (!COSMETIC_SET.has(id)) owned.delete(id)
  }
  owned.add('rpg-cloak-traveler')
  const active =
    (b.activeCharacterId && characters.some((c) => c.id === b.activeCharacterId)
      ? b.activeCharacterId
      : null) ||
    (a.activeCharacterId && characters.some((c) => c.id === a.activeCharacterId)
      ? a.activeCharacterId
      : null) ||
    characters[0]?.id ||
    null
  const equipped =
    (b.equippedCosmetic && owned.has(b.equippedCosmetic) && b.equippedCosmetic) ||
    (a.equippedCosmetic && owned.has(a.equippedCosmetic) && a.equippedCosmetic) ||
    'rpg-cloak-traveler'
  const inventory = mergeInv(a.inventory, b.inventory, HARBOR_RPG_MAX_INV_STACKS)
  const bank = mergeInv(a.bank, b.bank, HARBOR_RPG_MAX_BANK_STACKS)
  const kills: HarborRpgKillCounts = { ...a.kills }
  for (const kind of HARBOR_RPG_MONSTER_KINDS) {
    kills[kind] = Math.max(a.kills[kind] ?? 0, b.kills[kind] ?? 0)
  }
  const questMap = new Map<string, HarborRpgQuestProgress>()
  for (const q of [...a.quests, ...b.quests]) {
    const prev = questMap.get(q.id)
    if (!prev || q.progress > prev.progress || (q.claimed && !prev.claimed)) {
      questMap.set(q.id, {
        id: q.id,
        progress: Math.max(prev?.progress ?? 0, q.progress),
        complete: Boolean(prev?.complete || q.complete),
        claimed: Boolean(prev?.claimed || q.claimed),
      })
    }
  }
  const fresherZone = b.zone && HARBOR_RPG_ZONES.includes(b.zone) ? b.zone : a.zone
  const companionUntil = Math.max(a.companionUntil, b.companionUntil)
  const gear = emptyRpgGear()
  for (const slot of HARBOR_RPG_GEAR_SLOTS) {
    const pick = b.gear[slot] || a.gear[slot]
    if (pick && inventory.some((s) => s.id === pick) && harborRpgItemSlot(pick) === slot) {
      gear[slot] = pick
    }
  }
  const legacy = syncLegacyEquip(gear)
  const professions = emptyRpgProfessions()
  for (const id of Object.keys(professions) as HarborRpgProfessionId[]) {
    professions[id] = Math.max(a.professions[id] ?? 0, b.professions[id] ?? 0)
  }
  const marketMap = new Map<string, HarborRpgMarketListing>()
  for (const l of [...a.market, ...b.market]) marketMap.set(l.id, l)
  return {
    characters,
    activeCharacterId: active,
    xp: Math.max(a.xp, b.xp),
    gold: Math.max(a.gold, b.gold),
    ownedCosmetics: [...owned],
    equippedCosmetic: equipped,
    boosts: {
      xpMultUntil: Math.max(a.boosts.xpMultUntil, b.boosts.xpMultUntil),
      creditMultUntil: Math.max(a.boosts.creditMultUntil, b.boosts.creditMultUntil),
    },
    shrineClaims: Math.max(a.shrineClaims, b.shrineClaims),
    dummyKills: Math.max(a.dummyKills, b.dummyKills),
    zone: fresherZone,
    inventory,
    bank,
    gear,
    equippedWeapon: legacy.equippedWeapon,
    equippedArmor: legacy.equippedArmor,
    quests: [...questMap.values()],
    kills,
    companionUntil,
    companionName:
      companionUntil > Date.now() ? b.companionName || a.companionName : null,
    professions,
    market: [...marketMap.values()].slice(0, 12),
    classId: b.classId ?? a.classId,
    specId: b.specId ?? a.specId,
    classXp: Math.max(a.classXp, b.classXp),
    prestige: Math.max(a.prestige, b.prestige),
    skillXp: (() => {
      const out: Record<string, number> = { ...a.skillXp }
      for (const [k, v] of Object.entries(b.skillXp)) {
        out[k] = Math.max(out[k] ?? 0, v)
      }
      return out
    })(),
    talents: (() => {
      const out: Record<string, number> = { ...a.talents }
      for (const [k, v] of Object.entries(b.talents)) {
        out[k] = Math.max(out[k] ?? 0, v)
      }
      return out
    })(),
    skillBar: b.skillBar.length ? b.skillBar : a.skillBar,
    difficulty: b.difficulty,
    ownedMounts: (() => {
      const owned = new Set<HarborRpgMountId>([...a.ownedMounts, ...b.ownedMounts, 'horse'])
      return HARBOR_RPG_MOUNT_IDS.filter((id) => owned.has(id))
    })(),
    activeMountId: (() => {
      const pick = b.activeMountId ?? a.activeMountId
      const owned = new Set([...a.ownedMounts, ...b.ownedMounts, 'horse'])
      return pick && owned.has(pick) ? pick : null
    })(),
    unlockedTitles: (() => {
      const seen = new Set<string>()
      const out: string[] = []
      for (const id of [...a.unlockedTitles, ...b.unlockedTitles]) {
        if (seen.has(id)) continue
        seen.add(id)
        out.push(id)
      }
      return out.slice(0, 64)
    })(),
    activeTitleId: (() => {
      const titles = new Set([...a.unlockedTitles, ...b.unlockedTitles])
      const pick = b.activeTitleId ?? a.activeTitleId
      return pick && titles.has(pick) ? pick : null
    })(),
    ...mergeRpgMedium(a, b),
  }
}

/** Buy a mount at the Ferry Stable (soft gold). Starter horse is free. */
export function buyRpgMount(
  bag: HarborRpgBag,
  mountId: HarborRpgMountId,
): HarborRpgBag | null {
  if (!isHarborRpgMountId(mountId)) return null
  if (bag.ownedMounts.includes(mountId)) return bag
  const def = HARBOR_RPG_MOUNT_DEFS[mountId]
  if (bag.gold < def.cost) return null
  return {
    ...bag,
    gold: bag.gold - def.cost,
    ownedMounts: HARBOR_RPG_MOUNT_IDS.filter(
      (id) => id === mountId || bag.ownedMounts.includes(id),
    ),
  }
}

/** Summon (or clear) the active mount. Must be owned. */
export function setRpgActiveMount(
  bag: HarborRpgBag,
  mountId: HarborRpgMountId | null,
): HarborRpgBag | null {
  if (mountId == null) return { ...bag, activeMountId: null }
  if (!bag.ownedMounts.includes(mountId)) return null
  return { ...bag, activeMountId: mountId }
}

/** Buy a wardrobe cosmetic (soft gold). Traveler cloak is free. */
export function buyRpgCosmetic(
  bag: HarborRpgBag,
  cosmeticId: HarborRpgCosmeticId,
): HarborRpgBag | null {
  if (!isHarborRpgCosmeticId(cosmeticId)) return null
  if (bag.ownedCosmetics.includes(cosmeticId)) return bag
  const def = HARBOR_RPG_COSMETIC_DEFS[cosmeticId]
  if (bag.gold < def.cost) return null
  const owned = new Set([...bag.ownedCosmetics, cosmeticId, 'rpg-cloak-traveler'])
  return {
    ...bag,
    gold: bag.gold - def.cost,
    ownedCosmetics: HARBOR_RPG_COSMETICS.filter((id) => owned.has(id)),
  }
}

/** Equip (or clear) a wardrobe cosmetic. Must be owned. */
export function setRpgEquippedCosmetic(
  bag: HarborRpgBag,
  cosmeticId: HarborRpgCosmeticId | null,
): HarborRpgBag | null {
  if (cosmeticId == null) return { ...bag, equippedCosmetic: null }
  if (!bag.ownedCosmetics.includes(cosmeticId)) return null
  return { ...bag, equippedCosmetic: cosmeticId }
}

export function createHarborRpgCharacter(input: {
  name: string
  gender?: HarborGender
  appearance?: HarborAppearance
}): HarborRpgCharacter {
  const id = `rpg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return {
    id,
    name: sanitizeName(input.name),
    gender: sanitizeHarborGender(input.gender),
    appearance: sanitizeHarborAppearance(input.appearance ?? HARBOR_DEFAULT_APPEARANCE),
    createdAt: Date.now(),
  }
}

export function rpgXpMultiplier(bag: HarborRpgBag, now = Date.now()): number {
  return bag.boosts.xpMultUntil > now ? 2 : 1
}

export function rpgCreditMultiplier(bag: HarborRpgBag, now = Date.now()): number {
  return bag.boosts.creditMultUntil > now ? 2 : 1
}

export function rpgHasCompanion(bag: HarborRpgBag, now = Date.now()): boolean {
  return bag.companionUntil > now
}

export function addRpgInventoryItem(
  bag: HarborRpgBag,
  itemId: HarborRpgItemId,
  qty = 1,
): HarborRpgBag {
  const inventory = bag.inventory.map((s) => ({ ...s }))
  const def = HARBOR_RPG_ITEM_DEFS[itemId]
  const n = Math.max(1, Math.floor(qty))
  const existing = inventory.find((s) => s.id === itemId)
  if (existing && def.stackable) {
    existing.qty = Math.min(999, existing.qty + n)
  } else if (!existing) {
    if (inventory.length >= HARBOR_RPG_MAX_INV_STACKS) return bag
    inventory.push({ id: itemId, qty: def.stackable ? n : 1 })
  }
  return { ...bag, inventory }
}

export function removeRpgInventoryItem(
  bag: HarborRpgBag,
  itemId: HarborRpgItemId,
  qty = 1,
): HarborRpgBag | null {
  const inventory = bag.inventory.map((s) => ({ ...s }))
  const idx = inventory.findIndex((s) => s.id === itemId)
  if (idx < 0) return null
  const n = Math.max(1, Math.floor(qty))
  if (inventory[idx]!.qty < n) return null
  inventory[idx]!.qty -= n
  if (inventory[idx]!.qty <= 0) inventory.splice(idx, 1)
  const gear = { ...bag.gear }
  for (const slot of HARBOR_RPG_GEAR_SLOTS) {
    if (gear[slot] === itemId && !inventory.some((s) => s.id === itemId)) {
      gear[slot] = null
    }
  }
  const legacy = syncLegacyEquip(gear)
  return { ...bag, inventory, gear, ...legacy }
}

export function countRpgItem(bag: HarborRpgBag, itemId: HarborRpgItemId): number {
  return bag.inventory.find((s) => s.id === itemId)?.qty ?? 0
}

export function equipRpgGearSlot(
  bag: HarborRpgBag,
  itemId: HarborRpgItemId,
): HarborRpgBag | null {
  if (countRpgItem(bag, itemId) < 1) return null
  const slot = harborRpgItemSlot(itemId)
  if (!slot) return null
  const gear = { ...bag.gear, [slot]: itemId }
  const legacy = syncLegacyEquip(gear)
  return { ...bag, gear, ...legacy }
}

export function depositRpgBank(
  bag: HarborRpgBag,
  itemId: HarborRpgItemId,
  qty = 1,
): HarborRpgBag | null {
  const removed = removeRpgInventoryItem(bag, itemId, qty)
  if (!removed) return null
  const bank = removed.bank.map((s) => ({ ...s }))
  const def = HARBOR_RPG_ITEM_DEFS[itemId]
  const existing = bank.find((s) => s.id === itemId)
  if (existing && def.stackable) {
    existing.qty = Math.min(999, existing.qty + qty)
  } else if (!existing) {
    if (bank.length >= HARBOR_RPG_MAX_BANK_STACKS) return null
    bank.push({ id: itemId, qty: def.stackable ? qty : 1 })
  }
  return { ...removed, bank }
}

export function withdrawRpgBank(
  bag: HarborRpgBag,
  itemId: HarborRpgItemId,
  qty = 1,
): HarborRpgBag | null {
  const bank = bag.bank.map((s) => ({ ...s }))
  const idx = bank.findIndex((s) => s.id === itemId)
  if (idx < 0 || bank[idx]!.qty < qty) return null
  bank[idx]!.qty -= qty
  if (bank[idx]!.qty <= 0) bank.splice(idx, 1)
  return addRpgInventoryItem({ ...bag, bank }, itemId, qty)
}

/** Choose / switch class — resets skill bar to unlocked starters, keeps gold/gear. */
export function selectHarborRpgClass(
  bag: HarborRpgBag,
  classId: HarborRpgClassId,
): HarborRpgBag {
  const def = harborRpgClassById(classId)
  if (!def) return bag
  const classLevel = Math.max(1, harborRpgClassLevelFromXp(bag.classId === classId ? bag.classXp : 0))
  const unlocked = harborRpgUnlockedSkills(classId, classLevel).slice(0, 5)
  const same = bag.classId === classId
  return {
    ...bag,
    classId,
    specId: same && bag.specId ? bag.specId : harborRpgDefaultSpec(classId),
    classXp: same ? bag.classXp : 0,
    prestige: same ? bag.prestige : 0,
    talents: same ? bag.talents : {},
    skillBar: unlocked.map((s) => s.id),
  }
}

export function selectHarborRpgSpec(
  bag: HarborRpgBag,
  specId: HarborRpgSpecId,
): HarborRpgBag | null {
  if (!bag.classId) return null
  const spec = harborRpgSpecById(specId)
  if (!spec || spec.classId !== bag.classId) return null
  return { ...bag, specId }
}

export function setHarborRpgSkillBar(
  bag: HarborRpgBag,
  skillIds: string[],
): HarborRpgBag | null {
  if (!bag.classId) return null
  const classLevel = harborRpgClassLevelFromXp(bag.classXp)
  const unlocked = new Set(harborRpgUnlockedSkills(bag.classId, classLevel).map((s) => s.id))
  const bar: string[] = []
  for (const id of skillIds) {
    if (!unlocked.has(id)) continue
    if (bar.includes(id)) continue
    bar.push(id)
    if (bar.length >= 5) break
  }
  return { ...bag, skillBar: bar }
}

export function spendHarborRpgTalent(
  bag: HarborRpgBag,
  talentId: string,
): HarborRpgBag | null {
  if (!bag.classId) return null
  const node = HARBOR_RPG_CLASS_DEFS[bag.classId].talents.find((t) => t.id === talentId)
  if (!node) return null
  const classLevel = harborRpgClassLevelFromXp(bag.classXp)
  const earned = harborRpgTalentPointsEarned(classLevel, bag.prestige)
  let spent = 0
  for (const t of HARBOR_RPG_CLASS_DEFS[bag.classId].talents) {
    spent += bag.talents[t.id] ?? 0
  }
  if (spent >= earned) return null
  const cur = bag.talents[talentId] ?? 0
  if (cur >= node.max) return null
  return {
    ...bag,
    talents: { ...bag.talents, [talentId]: cur + 1 },
  }
}

/** Soft prestige: requires class level cap; resets class XP/talents, keeps skill XP. */
export function prestigeHarborRpgClass(bag: HarborRpgBag): HarborRpgBag | null {
  if (!bag.classId) return null
  const classLevel = harborRpgClassLevelFromXp(bag.classXp)
  if (classLevel < HARBOR_RPG_CLASS_LEVEL_CAP) return null
  if (bag.prestige >= HARBOR_RPG_PRESTIGE_CAP) return null
  const unlocked = harborRpgUnlockedSkills(bag.classId, 1).slice(0, 5)
  return {
    ...bag,
    classXp: 0,
    prestige: bag.prestige + 1,
    talents: {},
    skillBar: unlocked.map((s) => s.id),
  }
}

/** Award class XP + skill XP after a kill (called from combat). */
export function awardHarborRpgClassKillXp(
  bag: HarborRpgBag,
  skillId: string | null,
  baseXp: number,
): HarborRpgBag {
  if (!bag.classId) return bag
  const gain = Math.max(1, Math.floor(baseXp * harborRpgClassXpBonus(bag)))
  let next: HarborRpgBag = {
    ...bag,
    classXp: Math.min(50_000_000, bag.classXp + gain),
  }
  if (skillId && harborRpgSkillById(skillId)?.classId === bag.classId) {
    next = {
      ...next,
      skillXp: {
        ...next.skillXp,
        [skillId]: Math.min(500_000, (next.skillXp[skillId] ?? 0) + Math.max(1, Math.floor(gain * 0.6))),
      },
    }
  }
  // Auto-expand skill bar when new skills unlock
  const classLevel = harborRpgClassLevelFromXp(next.classXp)
  const unlocked = harborRpgUnlockedSkills(bag.classId, classLevel)
  if (next.skillBar.length < 5) {
    const bar = [...next.skillBar]
    for (const s of unlocked) {
      if (bar.includes(s.id)) continue
      bar.push(s.id)
      if (bar.length >= 5) break
    }
    next = { ...next, skillBar: bar }
  }
  return next
}

export function harborRpgTalentPointsLeft(bag: HarborRpgBag): number {
  if (!bag.classId) return 0
  const classLevel = harborRpgClassLevelFromXp(bag.classXp)
  const earned = harborRpgTalentPointsEarned(classLevel, bag.prestige)
  let spent = 0
  for (const t of HARBOR_RPG_CLASS_DEFS[bag.classId].talents) {
    spent += bag.talents[t.id] ?? 0
  }
  return Math.max(0, earned - spent)
}

export function harborRpgActiveSkillRank(bag: HarborRpgBag, skillId: string): number {
  return harborRpgSkillRankFromXp(bag.skillXp[skillId] ?? 0)
}

export function setHarborRpgDifficulty(
  bag: HarborRpgBag,
  difficulty: HarborRpgDifficulty,
): HarborRpgBag {
  return { ...bag, difficulty }
}

export type { HarborRpgClassId }
