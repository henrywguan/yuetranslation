/**
 * HarborRPG catalogs — zones, monsters, items, quests.
 * Pure data (smoke-safe). Completely separate from Harbor Quest pedagogy.
 */
export const HARBOR_RPG_ZONES = ['meadow', 'pinewood', 'ruins', 'town'] as const
export type HarborRpgZoneId = (typeof HARBOR_RPG_ZONES)[number]

export const HARBOR_RPG_ZONE_META: Record<
  HarborRpgZoneId,
  { en: string; zh: string; seed: number; look: HarborRpgZoneLook }
> = {
  meadow: {
    en: 'Sunlit Meadow',
    zh: '日照草原',
    seed: 0x48415242,
    look: {
      sky: 0x8eb8e8,
      fog: 0xc8d8e8,
      fogDensity: 0.0085,
      grass: 0x3a9a4a,
      dirt: 0x6a5030,
      stone: 0x8a8680,
      accent: 0xc8b898,
    },
  },
  pinewood: {
    en: 'Pinewood Reach',
    zh: '松林境',
    seed: 0x50494e45,
    look: {
      sky: 0x6a90b0,
      fog: 0xa8c0b0,
      fogDensity: 0.012,
      grass: 0x2a6a38,
      dirt: 0x4a3820,
      stone: 0x6a6860,
      accent: 0x3a5a30,
    },
  },
  ruins: {
    en: 'Ashen Ruins',
    zh: '灰燼遺址',
    seed: 0x5255494e,
    look: {
      sky: 0x908898,
      fog: 0xb0a8a0,
      fogDensity: 0.014,
      grass: 0x5a5848,
      dirt: 0x5a4030,
      stone: 0x7a7870,
      accent: 0xa06050,
    },
  },
  town: {
    en: 'Crossroads Town',
    zh: '十字鎮',
    seed: 0x544f574e,
    look: {
      sky: 0x9ab8d8,
      fog: 0xd0d8e0,
      fogDensity: 0.007,
      grass: 0x4a8a4a,
      dirt: 0x7a6040,
      stone: 0x9a9688,
      accent: 0xc09050,
    },
  },
}

export type HarborRpgZoneLook = {
  sky: number
  fog: number
  fogDensity: number
  grass: number
  dirt: number
  stone: number
  accent: number
}

/** Zone AABB in local space (each zone remounts at origin). */
export const HARBOR_RPG_ZONE_BOUNDS = {
  minX: -32,
  maxX: 32,
  minZ: -32,
  maxZ: 32,
} as const

export const HARBOR_RPG_ZONE_SPAWN: Record<HarborRpgZoneId, { x: number; z: number }> = {
  meadow: { x: 0, z: 10 },
  pinewood: { x: 0, z: 12 },
  ruins: { x: 0, z: 10 },
  town: { x: 0, z: 8 },
}

/** Portal pads that leave a zone (target zone + local pad). */
export type HarborRpgPortalDef = {
  id: string
  from: HarborRpgZoneId
  to: HarborRpgZoneId
  x: number
  z: number
  radius: number
  label: { en: string; zh: string }
}

export const HARBOR_RPG_PORTALS: readonly HarborRpgPortalDef[] = [
  {
    id: 'portal-meadow-pine',
    from: 'meadow',
    to: 'pinewood',
    x: 22,
    z: -8,
    radius: 2.4,
    label: { en: 'To Pinewood', zh: '往松林' },
  },
  {
    id: 'portal-meadow-ruins',
    from: 'meadow',
    to: 'ruins',
    x: -22,
    z: -8,
    radius: 2.4,
    label: { en: 'To Ruins', zh: '往遺址' },
  },
  {
    id: 'portal-meadow-town',
    from: 'meadow',
    to: 'town',
    x: 0,
    z: 24,
    radius: 2.6,
    label: { en: 'To Town', zh: '往小鎮' },
  },
  {
    id: 'portal-pine-meadow',
    from: 'pinewood',
    to: 'meadow',
    x: 0,
    z: 24,
    radius: 2.4,
    label: { en: 'To Meadow', zh: '往草原' },
  },
  {
    id: 'portal-ruins-meadow',
    from: 'ruins',
    to: 'meadow',
    x: 0,
    z: 24,
    radius: 2.4,
    label: { en: 'To Meadow', zh: '往草原' },
  },
  {
    id: 'portal-town-meadow',
    from: 'town',
    to: 'meadow',
    x: 0,
    z: -24,
    radius: 2.6,
    label: { en: 'To Meadow', zh: '往草原' },
  },
]

/** Exit HarborRPG back to Harbor Quest voyage (meadow only). */
export const HARBOR_RPG_QUEST_EXIT = {
  id: 'rpg-return' as const,
  zone: 'meadow' as const,
  x: 0,
  z: -22,
  radius: 2.6,
}

export const HARBOR_RPG_ITEMS = [
  'rpg-item-herb',
  'rpg-item-bone',
  'rpg-item-shard',
  'rpg-item-hide',
  'rpg-weapon-stick',
  'rpg-weapon-blade',
  'rpg-armor-cloth',
  'rpg-armor-leather',
  'rpg-armor-mail',
] as const
export type HarborRpgItemId = (typeof HARBOR_RPG_ITEMS)[number]

export type HarborRpgItemDef = {
  id: HarborRpgItemId
  name: { en: string; zh: string }
  kind: 'loot' | 'weapon' | 'armor'
  stackable: boolean
  /** Soft gold value at vendor. */
  value: number
  /** Soft combat bonus (weapon atk / armor def). */
  power: number
}

export const HARBOR_RPG_ITEM_DEFS: Record<HarborRpgItemId, HarborRpgItemDef> = {
  'rpg-item-herb': {
    id: 'rpg-item-herb',
    name: { en: 'Wild Herb', zh: '野草藥' },
    kind: 'loot',
    stackable: true,
    value: 2,
    power: 0,
  },
  'rpg-item-bone': {
    id: 'rpg-item-bone',
    name: { en: 'Beast Bone', zh: '獸骨' },
    kind: 'loot',
    stackable: true,
    value: 3,
    power: 0,
  },
  'rpg-item-shard': {
    id: 'rpg-item-shard',
    name: { en: 'Ruin Shard', zh: '遺址碎片' },
    kind: 'loot',
    stackable: true,
    value: 5,
    power: 0,
  },
  'rpg-item-hide': {
    id: 'rpg-item-hide',
    name: { en: 'Wolf Hide', zh: '狼皮' },
    kind: 'loot',
    stackable: true,
    value: 4,
    power: 0,
  },
  'rpg-weapon-stick': {
    id: 'rpg-weapon-stick',
    name: { en: 'Travel Stick', zh: '行路杖' },
    kind: 'weapon',
    stackable: false,
    value: 8,
    power: 2,
  },
  'rpg-weapon-blade': {
    id: 'rpg-weapon-blade',
    name: { en: 'Jade Edge', zh: '玉刃' },
    kind: 'weapon',
    stackable: false,
    value: 40,
    power: 6,
  },
  'rpg-armor-cloth': {
    id: 'rpg-armor-cloth',
    name: { en: 'Cloth Wrap', zh: '布甲' },
    kind: 'armor',
    stackable: false,
    value: 10,
    power: 1,
  },
  'rpg-armor-leather': {
    id: 'rpg-armor-leather',
    name: { en: 'Leather Guard', zh: '皮甲' },
    kind: 'armor',
    stackable: false,
    value: 28,
    power: 3,
  },
  'rpg-armor-mail': {
    id: 'rpg-armor-mail',
    name: { en: 'River Mail', zh: '河環甲' },
    kind: 'armor',
    stackable: false,
    value: 55,
    power: 5,
  },
}

export const HARBOR_RPG_MONSTER_KINDS = ['slime', 'wolf', 'bandit', 'golem'] as const
export type HarborRpgMonsterKind = (typeof HARBOR_RPG_MONSTER_KINDS)[number]

export type HarborRpgMonsterDef = {
  kind: HarborRpgMonsterKind
  name: { en: string; zh: string }
  hp: number
  atk: number
  xp: number
  gold: number
  aggro: number
  speed: number
  color: number
  loot: { item: HarborRpgItemId; chance: number; qty: number }[]
}

export const HARBOR_RPG_MONSTER_DEFS: Record<HarborRpgMonsterKind, HarborRpgMonsterDef> = {
  slime: {
    kind: 'slime',
    name: { en: 'Meadow Slime', zh: '草原史萊姆' },
    hp: 18,
    atk: 2,
    xp: 8,
    gold: 1,
    aggro: 6,
    speed: 2.2,
    color: 0x5ecf7a,
    loot: [
      { item: 'rpg-item-herb', chance: 0.55, qty: 1 },
      { item: 'rpg-item-bone', chance: 0.15, qty: 1 },
    ],
  },
  wolf: {
    kind: 'wolf',
    name: { en: 'Pine Wolf', zh: '松林狼' },
    hp: 28,
    atk: 4,
    xp: 14,
    gold: 2,
    aggro: 8,
    speed: 3.4,
    color: 0x6a5a48,
    loot: [
      { item: 'rpg-item-hide', chance: 0.6, qty: 1 },
      { item: 'rpg-item-bone', chance: 0.4, qty: 1 },
    ],
  },
  bandit: {
    kind: 'bandit',
    name: { en: 'Ruin Bandit', zh: '遺址盜匪' },
    hp: 36,
    atk: 5,
    xp: 18,
    gold: 4,
    aggro: 7,
    speed: 2.8,
    color: 0xa05040,
    loot: [
      { item: 'rpg-item-shard', chance: 0.5, qty: 1 },
      { item: 'rpg-weapon-stick', chance: 0.08, qty: 1 },
    ],
  },
  golem: {
    kind: 'golem',
    name: { en: 'Ash Golem', zh: '灰石魔像' },
    hp: 55,
    atk: 7,
    xp: 28,
    gold: 6,
    aggro: 5,
    speed: 1.6,
    color: 0x888078,
    loot: [
      { item: 'rpg-item-shard', chance: 0.7, qty: 2 },
      { item: 'rpg-armor-leather', chance: 0.06, qty: 1 },
    ],
  },
}

/** Spawn packs per zone (count of each kind). */
export const HARBOR_RPG_ZONE_SPAWNS: Record<
  HarborRpgZoneId,
  { kind: HarborRpgMonsterKind; count: number }[]
> = {
  meadow: [
    { kind: 'slime', count: 8 },
    { kind: 'wolf', count: 2 },
  ],
  pinewood: [
    { kind: 'wolf', count: 10 },
    { kind: 'slime', count: 3 },
  ],
  ruins: [
    { kind: 'bandit', count: 7 },
    { kind: 'golem', count: 3 },
  ],
  town: [], // safe zone
}

export const HARBOR_RPG_QUESTS = [
  {
    id: 'quest-slime-hunt',
    name: { en: 'Slime Sweep', zh: '史萊姆清掃' },
    zone: 'meadow' as HarborRpgZoneId,
    kind: 'kill' as const,
    target: 'slime' as HarborRpgMonsterKind,
    need: 5,
    xp: 40,
    gold: 12,
    blurb: { en: 'Clear 5 meadow slimes.', zh: '打倒5隻草原史萊姆。' },
  },
  {
    id: 'quest-wolf-pelts',
    name: { en: 'Pinewood Pelts', zh: '松林之皮' },
    zone: 'pinewood' as HarborRpgZoneId,
    kind: 'kill' as const,
    target: 'wolf' as HarborRpgMonsterKind,
    need: 4,
    xp: 55,
    gold: 18,
    blurb: { en: 'Hunt 4 pine wolves.', zh: '獵殺4隻松林狼。' },
  },
  {
    id: 'quest-ruin-shards',
    name: { en: 'Shard Gather', zh: '碎片收集' },
    zone: 'ruins' as HarborRpgZoneId,
    kind: 'gather' as const,
    targetItem: 'rpg-item-shard' as HarborRpgItemId,
    need: 6,
    xp: 70,
    gold: 24,
    blurb: { en: 'Bring 6 ruin shards to town.', zh: '帶回6塊遺址碎片。' },
  },
] as const

export type HarborRpgQuestId = (typeof HARBOR_RPG_QUESTS)[number]['id']

export const HARBOR_RPG_VENDOR = {
  id: 'rpg-vendor' as const,
  zone: 'town' as const,
  x: 6,
  z: -4,
  radius: 2.2,
  name: { en: 'Crossroads Outfitter', zh: '十字旅裝' },
  stock: [
    'rpg-weapon-stick',
    'rpg-weapon-blade',
    'rpg-armor-cloth',
    'rpg-armor-leather',
    'rpg-armor-mail',
  ] as HarborRpgItemId[],
}

export const HARBOR_RPG_QUEST_BOARD = {
  id: 'rpg-quest-board' as const,
  zone: 'town' as const,
  x: -6,
  z: -4,
  radius: 2.2,
  name: { en: 'Quest Board', zh: '任務板' },
}

export const HARBOR_RPG_FINDER = {
  id: 'rpg-finder' as const,
  zone: 'town' as const,
  x: 0,
  z: 4,
  radius: 2.2,
  name: { en: 'Party Finder', zh: '組隊告示' },
}

export const HARBOR_RPG_SHRINE = {
  id: 'rpg-shrine' as const,
  zone: 'meadow' as const,
  x: 0,
  z: -8,
  radius: 2.4,
}

export function isHarborRpgZoneId(raw: unknown): raw is HarborRpgZoneId {
  return typeof raw === 'string' && (HARBOR_RPG_ZONES as readonly string[]).includes(raw)
}

export function harborRpgQuestById(id: string) {
  return HARBOR_RPG_QUESTS.find((q) => q.id === id) ?? null
}
