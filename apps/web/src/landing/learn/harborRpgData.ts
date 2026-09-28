/**
 * HarborRPG catalogs — zones, monsters, items, abilities, quests, professions.
 * Pure data (smoke-safe). Completely separate from Harbor Quest pedagogy.
 */

export const HARBOR_RPG_ZONES = [
  'meadow',
  'pinewood',
  'ruins',
  'marsh',
  'town',
  'crypt',
  'tidehollow',
  'chronicle',
  'echoisle',
  'tideraid',
] as const
export type HarborRpgZoneId = (typeof HARBOR_RPG_ZONES)[number]

/** Soft instance difficulty — Heroic scales HP/ATK/loot. */
export const HARBOR_RPG_DIFFICULTIES = ['normal', 'heroic'] as const
export type HarborRpgDifficulty = (typeof HARBOR_RPG_DIFFICULTIES)[number]

export const HARBOR_RPG_HEROIC_HP_MULT = 1.65
export const HARBOR_RPG_HEROIC_ATK_MULT = 1.4
export const HARBOR_RPG_HEROIC_XP_MULT = 1.35
export const HARBOR_RPG_HEROIC_GOLD_MULT = 1.4
export const HARBOR_RPG_HEROIC_LOOT_BONUS = 0.18

export type HarborRpgZoneLook = {
  sky: number
  fog: number
  fogDensity: number
  grass: number
  dirt: number
  stone: number
  accent: number
}

export const HARBOR_RPG_ZONE_META: Record<
  HarborRpgZoneId,
  {
    en: string
    zh: string
    seed: number
    look: HarborRpgZoneLook
    /** Instanced dungeon — no open-world soft respawn until leave. */
    instance?: boolean
  }
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
  marsh: {
    en: 'Reed Marsh',
    zh: '蘆葦澤',
    seed: 0x4d415253,
    look: {
      sky: 0x6a8898,
      fog: 0xa8b8a8,
      fogDensity: 0.016,
      grass: 0x3a6a48,
      dirt: 0x4a4030,
      stone: 0x6a6860,
      accent: 0x508070,
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
  crypt: {
    en: 'Ash Crypt',
    zh: '灰燼地牢',
    seed: 0x43525950,
    instance: true,
    look: {
      sky: 0x2a2830,
      fog: 0x3a3840,
      fogDensity: 0.028,
      grass: 0x3a3830,
      dirt: 0x2a2820,
      stone: 0x5a5850,
      accent: 0xa07040,
    },
  },
  tidehollow: {
    en: 'Black Tide Hollow',
    zh: '黑潮窟',
    seed: 0x54494445,
    instance: true,
    look: {
      sky: 0x1a2838,
      fog: 0x2a4050,
      fogDensity: 0.032,
      grass: 0x2a3840,
      dirt: 0x1a2830,
      stone: 0x3a5060,
      accent: 0x3080a8,
    },
  },
  chronicle: {
    en: 'Chronicle Vault',
    zh: '紀年庫',
    seed: 0x4348524e,
    instance: true,
    look: {
      sky: 0x2a2038,
      fog: 0x3a3050,
      fogDensity: 0.03,
      grass: 0x2a2840,
      dirt: 0x221828,
      stone: 0x5a5070,
      accent: 0xc0a060,
    },
  },
  echoisle: {
    en: 'Echo Isle',
    zh: '回音島',
    seed: 0x4543484f,
    instance: true,
    look: {
      sky: 0x6a90c8,
      fog: 0xb0d0e8,
      fogDensity: 0.018,
      grass: 0x48a868,
      dirt: 0x7a9070,
      stone: 0x90a8b8,
      accent: 0xe8c070,
    },
  },
  tideraid: {
    en: 'Tide Remembers (Raid)',
    zh: '潮之記得（團本）',
    seed: 0x52414944,
    instance: true,
    look: {
      sky: 0x101828,
      fog: 0x203040,
      fogDensity: 0.036,
      grass: 0x1a2830,
      dirt: 0x121820,
      stone: 0x2a4050,
      accent: 0x40c0e8,
    },
  },
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
  marsh: { x: 0, z: 10 },
  town: { x: 0, z: 8 },
  crypt: { x: 0, z: 14 },
  tidehollow: { x: 0, z: 14 },
  chronicle: { x: 0, z: 14 },
  echoisle: { x: 0, z: 12 },
  tideraid: { x: 0, z: 16 },
}

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
    id: 'portal-meadow-marsh',
    from: 'meadow',
    to: 'marsh',
    x: -14,
    z: 22,
    radius: 2.4,
    label: { en: 'To Marsh', zh: '往澤地' },
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
    id: 'portal-ruins-crypt',
    from: 'ruins',
    to: 'crypt',
    x: 0,
    z: -20,
    radius: 2.6,
    label: { en: 'Enter Ash Crypt', zh: '進入灰燼地牢' },
  },
  {
    id: 'portal-marsh-meadow',
    from: 'marsh',
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
  {
    id: 'portal-crypt-ruins',
    from: 'crypt',
    to: 'ruins',
    x: 0,
    z: 24,
    radius: 2.6,
    label: { en: 'Leave Crypt', zh: '離開地牢' },
  },
  {
    id: 'portal-marsh-tide',
    from: 'marsh',
    to: 'tidehollow',
    x: 0,
    z: -20,
    radius: 2.6,
    label: { en: 'Enter Black Tide Hollow', zh: '進入黑潮窟' },
  },
  {
    id: 'portal-tide-marsh',
    from: 'tidehollow',
    to: 'marsh',
    x: 0,
    z: 24,
    radius: 2.6,
    label: { en: 'Leave Hollow', zh: '離開黑潮窟' },
  },
  {
    id: 'portal-town-chronicle',
    from: 'town',
    to: 'chronicle',
    x: -12,
    z: 10,
    radius: 2.6,
    label: { en: 'Enter Chronicle Vault', zh: '進入紀年庫' },
  },
  {
    id: 'portal-chronicle-town',
    from: 'chronicle',
    to: 'town',
    x: 0,
    z: 24,
    radius: 2.6,
    label: { en: 'Leave Vault', zh: '離開紀年庫' },
  },
  {
    id: 'portal-pine-echo',
    from: 'pinewood',
    to: 'echoisle',
    x: -18,
    z: -8,
    radius: 2.6,
    label: { en: 'Enter Echo Isle', zh: '進入回音島' },
  },
  {
    id: 'portal-echo-pine',
    from: 'echoisle',
    to: 'pinewood',
    x: 0,
    z: 24,
    radius: 2.6,
    label: { en: 'Leave Isle', zh: '離開回音島' },
  },
  {
    id: 'portal-town-raid',
    from: 'town',
    to: 'tideraid',
    x: 12,
    z: 10,
    radius: 2.8,
    label: { en: 'Enter Tide Remembers Raid', zh: '進入潮之記得團本' },
  },
  {
    id: 'portal-raid-town',
    from: 'tideraid',
    to: 'town',
    x: 0,
    z: 24,
    radius: 2.6,
    label: { en: 'Leave Raid', zh: '離開團本' },
  },
]

export const HARBOR_RPG_QUEST_EXIT = {
  id: 'rpg-return' as const,
  zone: 'meadow' as const,
  x: 0,
  z: -22,
  radius: 2.6,
}

export const HARBOR_RPG_GEAR_SLOTS = [
  'weapon',
  'offhand',
  'head',
  'chest',
  'legs',
  'feet',
  'ring',
  'trinket',
] as const
export type HarborRpgGearSlot = (typeof HARBOR_RPG_GEAR_SLOTS)[number]

export const HARBOR_RPG_RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const
export type HarborRpgRarity = (typeof HARBOR_RPG_RARITIES)[number]

export const HARBOR_RPG_ITEMS = [
  'rpg-item-herb',
  'rpg-item-bone',
  'rpg-item-shard',
  'rpg-item-hide',
  'rpg-item-ore',
  'rpg-item-reed',
  'rpg-item-ash-core',
  'rpg-item-pearl',
  'rpg-item-silk',
  'rpg-item-tide-coin',
  'rpg-potion-heal',
  'rpg-potion-might',
  'rpg-potion-mana',
  'rpg-weapon-stick',
  'rpg-weapon-blade',
  'rpg-weapon-ash',
  'rpg-weapon-tide',
  'rpg-offhand-buckler',
  'rpg-offhand-tome',
  'rpg-offhand-lantern',
  'rpg-armor-cloth',
  'rpg-armor-leather',
  'rpg-armor-mail',
  'rpg-armor-jade',
  'rpg-head-hood',
  'rpg-head-helm',
  'rpg-legs-wraps',
  'rpg-legs-greaves',
  'rpg-feet-sandals',
  'rpg-feet-boots',
  'rpg-ring-jade',
  'rpg-ring-tide',
  'rpg-trinket-lantern',
  'rpg-trinket-compass',
  'rpg-item-heroic-seal',
  'rpg-weapon-sovereign',
  'rpg-trinket-chronometer',
  'rpg-armor-sovereign',
] as const
export type HarborRpgItemId = (typeof HARBOR_RPG_ITEMS)[number]

export type HarborRpgItemDef = {
  id: HarborRpgItemId
  name: { en: string; zh: string }
  kind: 'loot' | 'reagent' | 'consumable' | HarborRpgGearSlot
  stackable: boolean
  rarity: HarborRpgRarity
  value: number
  /** Soft combat power (atk for weapons/offhand; def for armor slots; hybrid for jewelry). */
  power: number
  /** Profession that can craft this (optional). */
  craft?: HarborRpgProfessionId
}

export const HARBOR_RPG_ITEM_DEFS: Record<HarborRpgItemId, HarborRpgItemDef> = {
  'rpg-item-herb': {
    id: 'rpg-item-herb',
    name: { en: 'Wild Herb', zh: '野草藥' },
    kind: 'reagent',
    stackable: true,
    rarity: 'common',
    value: 2,
    power: 0,
  },
  'rpg-item-bone': {
    id: 'rpg-item-bone',
    name: { en: 'Beast Bone', zh: '獸骨' },
    kind: 'loot',
    stackable: true,
    rarity: 'common',
    value: 3,
    power: 0,
  },
  'rpg-item-shard': {
    id: 'rpg-item-shard',
    name: { en: 'Ruin Shard', zh: '遺址碎片' },
    kind: 'reagent',
    stackable: true,
    rarity: 'uncommon',
    value: 5,
    power: 0,
  },
  'rpg-item-hide': {
    id: 'rpg-item-hide',
    name: { en: 'Wolf Hide', zh: '狼皮' },
    kind: 'reagent',
    stackable: true,
    rarity: 'common',
    value: 4,
    power: 0,
  },
  'rpg-item-ore': {
    id: 'rpg-item-ore',
    name: { en: 'River Ore', zh: '河礦' },
    kind: 'reagent',
    stackable: true,
    rarity: 'common',
    value: 3,
    power: 0,
  },
  'rpg-item-reed': {
    id: 'rpg-item-reed',
    name: { en: 'Marsh Reed', zh: '澤蘆' },
    kind: 'reagent',
    stackable: true,
    rarity: 'common',
    value: 2,
    power: 0,
  },
  'rpg-item-ash-core': {
    id: 'rpg-item-ash-core',
    name: { en: 'Ash Core', zh: '灰燼核' },
    kind: 'loot',
    stackable: true,
    rarity: 'rare',
    value: 18,
    power: 0,
  },
  'rpg-item-pearl': {
    id: 'rpg-item-pearl',
    name: { en: 'River Pearl', zh: '河珍珠' },
    kind: 'loot',
    stackable: true,
    rarity: 'uncommon',
    value: 12,
    power: 0,
  },
  'rpg-item-silk': {
    id: 'rpg-item-silk',
    name: { en: 'Mist Silk', zh: '霧絲' },
    kind: 'reagent',
    stackable: true,
    rarity: 'uncommon',
    value: 9,
    power: 0,
  },
  'rpg-item-tide-coin': {
    id: 'rpg-item-tide-coin',
    name: { en: 'Tide Coin', zh: '潮幣' },
    kind: 'loot',
    stackable: true,
    rarity: 'rare',
    value: 25,
    power: 0,
  },
  'rpg-potion-heal': {
    id: 'rpg-potion-heal',
    name: { en: 'Reed Salve', zh: '蘆葦藥膏' },
    kind: 'consumable',
    stackable: true,
    rarity: 'common',
    value: 8,
    power: 0,
    craft: 'alchemy',
  },
  'rpg-potion-might': {
    id: 'rpg-potion-might',
    name: { en: 'Might Draught', zh: '力劑' },
    kind: 'consumable',
    stackable: true,
    rarity: 'uncommon',
    value: 14,
    power: 0,
    craft: 'alchemy',
  },
  'rpg-potion-mana': {
    id: 'rpg-potion-mana',
    name: { en: 'Mist Flask', zh: '霧瓶' },
    kind: 'consumable',
    stackable: true,
    rarity: 'uncommon',
    value: 12,
    power: 0,
    craft: 'alchemy',
  },
  'rpg-weapon-stick': {
    id: 'rpg-weapon-stick',
    name: { en: 'Travel Stick', zh: '行路杖' },
    kind: 'weapon',
    stackable: false,
    rarity: 'common',
    value: 8,
    power: 2,
  },
  'rpg-weapon-blade': {
    id: 'rpg-weapon-blade',
    name: { en: 'Jade Edge', zh: '玉刃' },
    kind: 'weapon',
    stackable: false,
    rarity: 'uncommon',
    value: 40,
    power: 6,
    craft: 'smithing',
  },
  'rpg-weapon-ash': {
    id: 'rpg-weapon-ash',
    name: { en: 'Ashbrand', zh: '灰燼刃' },
    kind: 'weapon',
    stackable: false,
    rarity: 'epic',
    value: 120,
    power: 12,
  },
  'rpg-weapon-tide': {
    id: 'rpg-weapon-tide',
    name: { en: 'Tidebrand', zh: '潮刃' },
    kind: 'weapon',
    stackable: false,
    rarity: 'legendary',
    value: 220,
    power: 16,
  },
  'rpg-offhand-buckler': {
    id: 'rpg-offhand-buckler',
    name: { en: 'Reed Buckler', zh: '蘆盾' },
    kind: 'offhand',
    stackable: false,
    rarity: 'common',
    value: 16,
    power: 2,
    craft: 'smithing',
  },
  'rpg-offhand-tome': {
    id: 'rpg-offhand-tome',
    name: { en: 'Harbor Tome', zh: '港灣典' },
    kind: 'offhand',
    stackable: false,
    rarity: 'uncommon',
    value: 28,
    power: 3,
  },
  'rpg-offhand-lantern': {
    id: 'rpg-offhand-lantern',
    name: { en: 'Pilot Lantern', zh: '領航燈' },
    kind: 'offhand',
    stackable: false,
    rarity: 'rare',
    value: 48,
    power: 5,
  },
  'rpg-armor-cloth': {
    id: 'rpg-armor-cloth',
    name: { en: 'Cloth Wrap', zh: '布甲' },
    kind: 'chest',
    stackable: false,
    rarity: 'common',
    value: 10,
    power: 1,
  },
  'rpg-armor-leather': {
    id: 'rpg-armor-leather',
    name: { en: 'Leather Guard', zh: '皮甲' },
    kind: 'chest',
    stackable: false,
    rarity: 'uncommon',
    value: 28,
    power: 3,
    craft: 'smithing',
  },
  'rpg-armor-mail': {
    id: 'rpg-armor-mail',
    name: { en: 'River Mail', zh: '河環甲' },
    kind: 'chest',
    stackable: false,
    rarity: 'rare',
    value: 55,
    power: 5,
    craft: 'smithing',
  },
  'rpg-armor-jade': {
    id: 'rpg-armor-jade',
    name: { en: 'Jade Plate', zh: '玉甲' },
    kind: 'chest',
    stackable: false,
    rarity: 'legendary',
    value: 180,
    power: 10,
  },
  'rpg-head-hood': {
    id: 'rpg-head-hood',
    name: { en: 'Traveler Hood', zh: '旅人兜' },
    kind: 'head',
    stackable: false,
    rarity: 'common',
    value: 12,
    power: 1,
  },
  'rpg-head-helm': {
    id: 'rpg-head-helm',
    name: { en: 'Bronze Helm', zh: '銅盔' },
    kind: 'head',
    stackable: false,
    rarity: 'uncommon',
    value: 32,
    power: 3,
    craft: 'smithing',
  },
  'rpg-legs-wraps': {
    id: 'rpg-legs-wraps',
    name: { en: 'Cloth Wraps', zh: '布褲' },
    kind: 'legs',
    stackable: false,
    rarity: 'common',
    value: 10,
    power: 1,
  },
  'rpg-legs-greaves': {
    id: 'rpg-legs-greaves',
    name: { en: 'Iron Greaves', zh: '鐵脛甲' },
    kind: 'legs',
    stackable: false,
    rarity: 'uncommon',
    value: 30,
    power: 3,
    craft: 'smithing',
  },
  'rpg-feet-sandals': {
    id: 'rpg-feet-sandals',
    name: { en: 'Reed Sandals', zh: '蘆涼鞋' },
    kind: 'feet',
    stackable: false,
    rarity: 'common',
    value: 8,
    power: 1,
  },
  'rpg-feet-boots': {
    id: 'rpg-feet-boots',
    name: { en: 'Trail Boots', zh: '旅靴' },
    kind: 'feet',
    stackable: false,
    rarity: 'uncommon',
    value: 22,
    power: 2,
    craft: 'smithing',
  },
  'rpg-ring-jade': {
    id: 'rpg-ring-jade',
    name: { en: 'Jade Band', zh: '玉戒' },
    kind: 'ring',
    stackable: false,
    rarity: 'rare',
    value: 45,
    power: 3,
  },
  'rpg-ring-tide': {
    id: 'rpg-ring-tide',
    name: { en: 'Tide Signet', zh: '潮印' },
    kind: 'ring',
    stackable: false,
    rarity: 'epic',
    value: 90,
    power: 5,
  },
  'rpg-trinket-lantern': {
    id: 'rpg-trinket-lantern',
    name: { en: 'Ferry Charm', zh: '渡船符' },
    kind: 'trinket',
    stackable: false,
    rarity: 'rare',
    value: 50,
    power: 3,
  },
  'rpg-trinket-compass': {
    id: 'rpg-trinket-compass',
    name: { en: 'Star Compass', zh: '星羅盤' },
    kind: 'trinket',
    stackable: false,
    rarity: 'epic',
    value: 95,
    power: 5,
  },
  'rpg-item-heroic-seal': {
    id: 'rpg-item-heroic-seal',
    name: { en: 'Heroic Ferry Seal', zh: '英雄渡印' },
    kind: 'loot',
    stackable: true,
    rarity: 'epic',
    value: 40,
    power: 0,
  },
  'rpg-weapon-sovereign': {
    id: 'rpg-weapon-sovereign',
    name: { en: 'Sovereign Oarblade', zh: '主潮槳刃' },
    kind: 'weapon',
    stackable: false,
    rarity: 'legendary',
    value: 220,
    power: 14,
  },
  'rpg-trinket-chronometer': {
    id: 'rpg-trinket-chronometer',
    name: { en: 'Cracked Chronometer', zh: '裂時計' },
    kind: 'trinket',
    stackable: false,
    rarity: 'legendary',
    value: 200,
    power: 8,
  },
  'rpg-armor-sovereign': {
    id: 'rpg-armor-sovereign',
    name: { en: 'Tide Sovereign Plate', zh: '主潮甲' },
    kind: 'chest',
    stackable: false,
    rarity: 'legendary',
    value: 210,
    power: 12,
  },
}

export const HARBOR_RPG_MONSTER_KINDS = [
  'slime',
  'wolf',
  'bandit',
  'golem',
  'toad',
  'wraith',
  'crypt-boss',
  'tide-thrall',
  'tide-boss',
  'ink-shade',
  'chronicle-boss',
  'echo-twin',
  'echo-boss',
  'raid-herald',
  'raid-depth',
  'raid-sovereign',
] as const
export type HarborRpgMonsterKind = (typeof HARBOR_RPG_MONSTER_KINDS)[number]

export type HarborRpgBossPhase = {
  /** Enter this phase when HP ratio drops to ≤ this value (1 = start). */
  atHpPct: number
  name: { en: string; zh: string }
  atkMult: number
  /** Soft attack cadence multiplier (higher = faster swings). */
  speedMult: number
  /** Optional toast when entering. */
  toast?: { en: string; zh: string }
}

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
  boss?: boolean
  phases?: HarborRpgBossPhase[]
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
      { item: 'rpg-item-ore', chance: 0.12, qty: 1 },
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
      { item: 'rpg-head-hood', chance: 0.05, qty: 1 },
      { item: 'rpg-feet-boots', chance: 0.06, qty: 1 },
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
      { item: 'rpg-item-ore', chance: 0.35, qty: 2 },
      { item: 'rpg-legs-greaves', chance: 0.05, qty: 1 },
    ],
  },
  toad: {
    kind: 'toad',
    name: { en: 'Marsh Toad', zh: '澤蟾' },
    hp: 24,
    atk: 3,
    xp: 11,
    gold: 2,
    aggro: 7,
    speed: 2.0,
    color: 0x4a8050,
    loot: [
      { item: 'rpg-item-reed', chance: 0.65, qty: 1 },
      { item: 'rpg-item-herb', chance: 0.35, qty: 1 },
    ],
  },
  wraith: {
    kind: 'wraith',
    name: { en: 'Crypt Wraith', zh: '地牢怨靈' },
    hp: 42,
    atk: 6,
    xp: 22,
    gold: 5,
    aggro: 9,
    speed: 2.6,
    color: 0x7080a0,
    loot: [
      { item: 'rpg-item-shard', chance: 0.45, qty: 1 },
      { item: 'rpg-ring-jade', chance: 0.04, qty: 1 },
    ],
  },
  'crypt-boss': {
    kind: 'crypt-boss',
    name: { en: 'Ash Warden', zh: '灰燼守衛' },
    hp: 180,
    atk: 11,
    xp: 120,
    gold: 40,
    aggro: 14,
    speed: 2.1,
    color: 0xc07040,
    boss: true,
    phases: [
      {
        atHpPct: 1,
        name: { en: 'Ember Vigil', zh: '餘燼守夜' },
        atkMult: 1,
        speedMult: 1,
      },
      {
        atHpPct: 0.55,
        name: { en: 'Ash Rise', zh: '灰再起' },
        atkMult: 1.25,
        speedMult: 1.2,
        toast: { en: 'Ash Warden — Ash Rise!', zh: '灰燼守衛——灰再起！' },
      },
      {
        atHpPct: 0.2,
        name: { en: 'Cinder Last Stand', zh: '燼末' },
        atkMult: 1.55,
        speedMult: 1.45,
        toast: { en: 'Ash Warden — Last Stand!', zh: '灰燼守衛——燼末！' },
      },
    ],
    loot: [
      { item: 'rpg-item-ash-core', chance: 1, qty: 1 },
      { item: 'rpg-weapon-ash', chance: 0.35, qty: 1 },
      { item: 'rpg-weapon-tide', chance: 0.08, qty: 1 },
      { item: 'rpg-trinket-lantern', chance: 0.25, qty: 1 },
      { item: 'rpg-trinket-compass', chance: 0.12, qty: 1 },
      { item: 'rpg-armor-mail', chance: 0.2, qty: 1 },
      { item: 'rpg-armor-jade', chance: 0.06, qty: 1 },
      { item: 'rpg-item-tide-coin', chance: 0.5, qty: 2 },
    ],
  },
  'tide-thrall': {
    kind: 'tide-thrall',
    name: { en: 'Tide Thrall', zh: '潮奴' },
    hp: 32,
    atk: 5,
    xp: 16,
    gold: 3,
    aggro: 8,
    speed: 2.7,
    color: 0x2a7088,
    loot: [
      { item: 'rpg-item-pearl', chance: 0.35, qty: 1 },
      { item: 'rpg-item-reed', chance: 0.4, qty: 1 },
    ],
  },
  'tide-boss': {
    kind: 'tide-boss',
    name: { en: 'Pearl Host', zh: '珠宿主' },
    hp: 240,
    atk: 13,
    xp: 160,
    gold: 55,
    aggro: 15,
    speed: 2.0,
    color: 0x40a0c8,
    boss: true,
    phases: [
      {
        atHpPct: 1,
        name: { en: 'Still Water', zh: '靜水' },
        atkMult: 1,
        speedMult: 1,
      },
      {
        atHpPct: 0.66,
        name: { en: 'Name Hunger', zh: '名之飢' },
        atkMult: 1.3,
        speedMult: 1.15,
        toast: { en: 'Pearl Host hungers for names!', zh: '珠宿主渴求名字！' },
      },
      {
        atHpPct: 0.33,
        name: { en: 'Black Tide', zh: '黑潮' },
        atkMult: 1.6,
        speedMult: 1.4,
        toast: { en: 'Black Tide crashes in!', zh: '黑潮湧至！' },
      },
    ],
    loot: [
      { item: 'rpg-item-pearl', chance: 1, qty: 3 },
      { item: 'rpg-item-tide-coin', chance: 0.8, qty: 3 },
      { item: 'rpg-weapon-tide', chance: 0.28, qty: 1 },
      { item: 'rpg-ring-tide', chance: 0.22, qty: 1 },
      { item: 'rpg-offhand-lantern', chance: 0.18, qty: 1 },
    ],
  },
  'ink-shade': {
    kind: 'ink-shade',
    name: { en: 'Ink Shade', zh: '墨影' },
    hp: 36,
    atk: 6,
    xp: 18,
    gold: 4,
    aggro: 9,
    speed: 2.5,
    color: 0x504070,
    loot: [
      { item: 'rpg-item-silk', chance: 0.4, qty: 1 },
      { item: 'rpg-item-shard', chance: 0.35, qty: 1 },
    ],
  },
  'chronicle-boss': {
    kind: 'chronicle-boss',
    name: { en: 'Ink Archivist', zh: '墨典吏' },
    hp: 260,
    atk: 12,
    xp: 180,
    gold: 60,
    aggro: 14,
    speed: 1.9,
    color: 0xc0a050,
    boss: true,
    phases: [
      {
        atHpPct: 1,
        name: { en: 'Ledger Open', zh: '開冊' },
        atkMult: 1,
        speedMult: 1,
      },
      {
        atHpPct: 0.6,
        name: { en: 'Self-Writing', zh: '自書' },
        atkMult: 1.2,
        speedMult: 1.25,
        toast: { en: 'Ink writes itself — Archivist accelerates!', zh: '墨水自書——典吏加速！' },
      },
      {
        atHpPct: 0.25,
        name: { en: 'Other-Side Reader', zh: '彼岸讀者' },
        atkMult: 1.7,
        speedMult: 1.5,
        toast: { en: 'Something reads from the other side!', zh: '彼岸有物在讀！' },
      },
    ],
    loot: [
      { item: 'rpg-item-silk', chance: 1, qty: 2 },
      { item: 'rpg-offhand-tome', chance: 0.4, qty: 1 },
      { item: 'rpg-trinket-compass', chance: 0.3, qty: 1 },
      { item: 'rpg-armor-jade', chance: 0.12, qty: 1 },
      { item: 'rpg-item-tide-coin', chance: 0.55, qty: 2 },
    ],
  },
  'echo-twin': {
    kind: 'echo-twin',
    name: { en: 'Echo Twin', zh: '回音分身' },
    hp: 40,
    atk: 6,
    xp: 20,
    gold: 4,
    aggro: 8,
    speed: 2.8,
    color: 0x70c090,
    loot: [
      { item: 'rpg-item-herb', chance: 0.4, qty: 1 },
      { item: 'rpg-item-pearl', chance: 0.2, qty: 1 },
    ],
  },
  'echo-boss': {
    kind: 'echo-boss',
    name: { en: 'Mirror Ferry', zh: '鏡渡' },
    hp: 220,
    atk: 12,
    xp: 170,
    gold: 58,
    aggro: 13,
    speed: 2.2,
    color: 0xe8c070,
    boss: true,
    phases: [
      {
        atHpPct: 1,
        name: { en: 'Kinder Twin', zh: '溫柔分身' },
        atkMult: 0.95,
        speedMult: 1,
      },
      {
        atHpPct: 0.5,
        name: { en: 'Who Keeps the Voyage', zh: '誰留航程' },
        atkMult: 1.35,
        speedMult: 1.3,
        toast: { en: 'Your twin claims the voyage!', zh: '分身要奪航程！' },
      },
      {
        atHpPct: 0.18,
        name: { en: 'One Name Left', zh: '只餘一名' },
        atkMult: 1.75,
        speedMult: 1.55,
        toast: { en: 'Only one name leaves Echo Isle!', zh: '回音島只許一名離去！' },
      },
    ],
    loot: [
      { item: 'rpg-item-pearl', chance: 0.7, qty: 2 },
      { item: 'rpg-ring-jade', chance: 0.25, qty: 1 },
      { item: 'rpg-trinket-lantern', chance: 0.28, qty: 1 },
      { item: 'rpg-weapon-blade', chance: 0.2, qty: 1 },
      { item: 'rpg-item-tide-coin', chance: 0.6, qty: 2 },
    ],
  },
  'raid-herald': {
    kind: 'raid-herald',
    name: { en: 'Tide Herald', zh: '潮使者' },
    hp: 280,
    atk: 14,
    xp: 200,
    gold: 70,
    aggro: 16,
    speed: 2.0,
    color: 0x3890b0,
    boss: true,
    phases: [
      {
        atHpPct: 1,
        name: { en: 'First Bell', zh: '初鐘' },
        atkMult: 1,
        speedMult: 1,
      },
      {
        atHpPct: 0.5,
        name: { en: 'Broken Chronometer', zh: '裂時計' },
        atkMult: 1.35,
        speedMult: 1.25,
        toast: { en: 'Tide Herald rings the cracked bell!', zh: '潮使者敲響裂鐘！' },
      },
    ],
    loot: [
      { item: 'rpg-item-pearl', chance: 0.8, qty: 2 },
      { item: 'rpg-item-heroic-seal', chance: 0.45, qty: 1 },
      { item: 'rpg-item-tide-coin', chance: 0.7, qty: 3 },
      { item: 'rpg-ring-tide', chance: 0.2, qty: 1 },
    ],
  },
  'raid-depth': {
    kind: 'raid-depth',
    name: { en: 'Depth Archivist', zh: '深淵典吏' },
    hp: 320,
    atk: 15,
    xp: 230,
    gold: 85,
    aggro: 15,
    speed: 1.85,
    color: 0x7060a0,
    boss: true,
    phases: [
      {
        atHpPct: 1,
        name: { en: 'Ledger of Depths', zh: '深淵賬' },
        atkMult: 1,
        speedMult: 1,
      },
      {
        atHpPct: 0.55,
        name: { en: 'Ink Flood', zh: '墨洪' },
        atkMult: 1.3,
        speedMult: 1.2,
        toast: { en: 'Depth Archivist floods the floor in ink!', zh: '深淵典吏以墨淹地！' },
      },
      {
        atHpPct: 0.22,
        name: { en: 'Other-Side Chorus', zh: '彼岸合唱' },
        atkMult: 1.65,
        speedMult: 1.45,
        toast: { en: 'Voices from the other side join the ledger!', zh: '彼岸聲音加入賬冊！' },
      },
    ],
    loot: [
      { item: 'rpg-item-silk', chance: 1, qty: 3 },
      { item: 'rpg-item-heroic-seal', chance: 0.55, qty: 1 },
      { item: 'rpg-offhand-tome', chance: 0.35, qty: 1 },
      { item: 'rpg-trinket-compass', chance: 0.28, qty: 1 },
      { item: 'rpg-armor-jade', chance: 0.15, qty: 1 },
    ],
  },
  'raid-sovereign': {
    kind: 'raid-sovereign',
    name: { en: 'Tide Sovereign', zh: '主潮' },
    hp: 420,
    atk: 18,
    xp: 320,
    gold: 120,
    aggro: 18,
    speed: 2.05,
    color: 0x50d0f0,
    boss: true,
    phases: [
      {
        atHpPct: 1,
        name: { en: 'Remembered Tide', zh: '記得的潮' },
        atkMult: 1,
        speedMult: 1,
      },
      {
        atHpPct: 0.66,
        name: { en: 'Name of Every Dock', zh: '每碼頭之名' },
        atkMult: 1.25,
        speedMult: 1.15,
        toast: { en: 'The Sovereign speaks every dock name at once!', zh: '主潮同時喊出每個碼頭之名！' },
      },
      {
        atHpPct: 0.33,
        name: { en: 'Who Rewrites the Hour', zh: '誰改時刻' },
        atkMult: 1.55,
        speedMult: 1.4,
        toast: { en: 'Chronometers shatter — final hour!', zh: '時計碎裂——最終時刻！' },
      },
      {
        atHpPct: 0.12,
        name: { en: 'Keep the Voyage', zh: '留下航程' },
        atkMult: 1.9,
        speedMult: 1.6,
        toast: { en: 'Tide Sovereign — Keep the Voyage!', zh: '主潮——留下航程！' },
      },
    ],
    loot: [
      { item: 'rpg-item-heroic-seal', chance: 1, qty: 2 },
      { item: 'rpg-weapon-sovereign', chance: 0.4, qty: 1 },
      { item: 'rpg-armor-sovereign', chance: 0.35, qty: 1 },
      { item: 'rpg-trinket-chronometer', chance: 0.45, qty: 1 },
      { item: 'rpg-item-tide-coin', chance: 1, qty: 5 },
      { item: 'rpg-ring-tide', chance: 0.3, qty: 1 },
    ],
  },
}

export const HARBOR_RPG_ZONE_SPAWNS: Record<
  HarborRpgZoneId,
  { kind: HarborRpgMonsterKind; count: number }[]
> = {
  meadow: [
    { kind: 'slime', count: 12 },
    { kind: 'wolf', count: 4 },
  ],
  pinewood: [
    { kind: 'wolf', count: 14 },
    { kind: 'slime', count: 4 },
  ],
  ruins: [
    { kind: 'bandit', count: 10 },
    { kind: 'golem', count: 4 },
  ],
  marsh: [
    { kind: 'toad', count: 12 },
    { kind: 'slime', count: 4 },
  ],
  town: [],
  crypt: [
    { kind: 'wraith', count: 8 },
    { kind: 'bandit', count: 3 },
    { kind: 'crypt-boss', count: 1 },
  ],
  tidehollow: [
    { kind: 'tide-thrall', count: 10 },
    { kind: 'toad', count: 3 },
    { kind: 'tide-boss', count: 1 },
  ],
  chronicle: [
    { kind: 'ink-shade', count: 10 },
    { kind: 'wraith', count: 3 },
    { kind: 'chronicle-boss', count: 1 },
  ],
  echoisle: [
    { kind: 'echo-twin', count: 8 },
    { kind: 'slime', count: 4 },
    { kind: 'echo-boss', count: 1 },
  ],
  tideraid: [
    { kind: 'tide-thrall', count: 8 },
    { kind: 'ink-shade', count: 4 },
    { kind: 'raid-herald', count: 1 },
    { kind: 'raid-depth', count: 1 },
    { kind: 'raid-sovereign', count: 1 },
  ],
}

/** Ability bar — soft classic GCD kit. */
export const HARBOR_RPG_ABILITIES = [
  {
    id: 'strike',
    name: { en: 'Strike', zh: '斬擊' },
    gcd: 1.2,
    cd: 0,
    range: 2.2,
    powerMult: 1,
    threatMult: 1,
    cost: 0,
  },
  {
    id: 'cleave',
    name: { en: 'Cleave', zh: '橫斬' },
    gcd: 1.4,
    cd: 6,
    range: 2.6,
    powerMult: 0.75,
    threatMult: 1.2,
    aoe: 2.4,
    cost: 0,
  },
  {
    id: 'bash',
    name: { en: 'Bash', zh: '猛擊' },
    gcd: 1.5,
    cd: 8,
    range: 2.0,
    powerMult: 1.6,
    threatMult: 2.2,
    cost: 0,
  },
  {
    id: 'guard',
    name: { en: 'Guard', zh: '守護' },
    gcd: 1.0,
    cd: 12,
    range: 0,
    powerMult: 0,
    threatMult: 0,
    /** Temporary defense buff seconds. */
    buffDefSec: 4,
    cost: 0,
  },
] as const

export type HarborRpgAbilityId = (typeof HARBOR_RPG_ABILITIES)[number]['id']

export function harborRpgAbilityById(id: string) {
  return HARBOR_RPG_ABILITIES.find((a) => a.id === id) ?? null
}

export const HARBOR_RPG_PROFESSIONS = ['herbalism', 'mining', 'alchemy', 'smithing'] as const
export type HarborRpgProfessionId = (typeof HARBOR_RPG_PROFESSIONS)[number]

export const HARBOR_RPG_PROFESSION_META: Record<
  HarborRpgProfessionId,
  { en: string; zh: string; kind: 'gather' | 'craft' }
> = {
  herbalism: { en: 'Herbalism', zh: '採藥', kind: 'gather' },
  mining: { en: 'Mining', zh: '採礦', kind: 'gather' },
  alchemy: { en: 'Alchemy', zh: '煉金', kind: 'craft' },
  smithing: { en: 'Smithing', zh: '鍛造', kind: 'craft' },
}

export type HarborRpgCraftRecipe = {
  id: string
  profession: HarborRpgProfessionId
  output: HarborRpgItemId
  qty: number
  inputs: { id: HarborRpgItemId; qty: number }[]
  xp: number
  skillNeed: number
}

export const HARBOR_RPG_CRAFT_RECIPES: readonly HarborRpgCraftRecipe[] = [
  {
    id: 'craft-heal',
    profession: 'alchemy',
    output: 'rpg-potion-heal',
    qty: 1,
    inputs: [
      { id: 'rpg-item-herb', qty: 2 },
      { id: 'rpg-item-reed', qty: 1 },
    ],
    xp: 12,
    skillNeed: 1,
  },
  {
    id: 'craft-might',
    profession: 'alchemy',
    output: 'rpg-potion-might',
    qty: 1,
    inputs: [
      { id: 'rpg-item-herb', qty: 3 },
      { id: 'rpg-item-shard', qty: 1 },
    ],
    xp: 20,
    skillNeed: 5,
  },
  {
    id: 'craft-blade',
    profession: 'smithing',
    output: 'rpg-weapon-blade',
    qty: 1,
    inputs: [
      { id: 'rpg-item-ore', qty: 4 },
      { id: 'rpg-item-shard', qty: 1 },
    ],
    xp: 28,
    skillNeed: 3,
  },
  {
    id: 'craft-buckler',
    profession: 'smithing',
    output: 'rpg-offhand-buckler',
    qty: 1,
    inputs: [
      { id: 'rpg-item-ore', qty: 2 },
      { id: 'rpg-item-hide', qty: 2 },
    ],
    xp: 18,
    skillNeed: 1,
  },
  {
    id: 'craft-leather',
    profession: 'smithing',
    output: 'rpg-armor-leather',
    qty: 1,
    inputs: [
      { id: 'rpg-item-hide', qty: 4 },
      { id: 'rpg-item-ore', qty: 1 },
    ],
    xp: 22,
    skillNeed: 2,
  },
  {
    id: 'craft-helm',
    profession: 'smithing',
    output: 'rpg-head-helm',
    qty: 1,
    inputs: [
      { id: 'rpg-item-ore', qty: 3 },
      { id: 'rpg-item-hide', qty: 1 },
    ],
    xp: 24,
    skillNeed: 4,
  },
  {
    id: 'craft-greaves',
    profession: 'smithing',
    output: 'rpg-legs-greaves',
    qty: 1,
    inputs: [
      { id: 'rpg-item-ore', qty: 4 },
      { id: 'rpg-item-hide', qty: 2 },
    ],
    xp: 26,
    skillNeed: 5,
  },
  {
    id: 'craft-boots',
    profession: 'smithing',
    output: 'rpg-feet-boots',
    qty: 1,
    inputs: [
      { id: 'rpg-item-hide', qty: 3 },
      { id: 'rpg-item-reed', qty: 2 },
    ],
    xp: 20,
    skillNeed: 3,
  },
]

export type HarborRpgGatherNode = {
  id: string
  zone: HarborRpgZoneId
  profession: 'herbalism' | 'mining'
  x: number
  z: number
  radius: number
  item: HarborRpgItemId
  xp: number
}

export const HARBOR_RPG_GATHER_NODES: readonly HarborRpgGatherNode[] = [
  { id: 'node-herb-1', zone: 'meadow', profession: 'herbalism', x: 8, z: 4, radius: 1.8, item: 'rpg-item-herb', xp: 6 },
  { id: 'node-herb-2', zone: 'meadow', profession: 'herbalism', x: -10, z: 2, radius: 1.8, item: 'rpg-item-herb', xp: 6 },
  { id: 'node-ore-1', zone: 'pinewood', profession: 'mining', x: 12, z: -6, radius: 1.8, item: 'rpg-item-ore', xp: 8 },
  { id: 'node-ore-2', zone: 'ruins', profession: 'mining', x: -8, z: -4, radius: 1.8, item: 'rpg-item-ore', xp: 8 },
  { id: 'node-reed-1', zone: 'marsh', profession: 'herbalism', x: 6, z: -2, radius: 1.8, item: 'rpg-item-reed', xp: 7 },
  { id: 'node-reed-2', zone: 'marsh', profession: 'herbalism', x: -8, z: 6, radius: 1.8, item: 'rpg-item-reed', xp: 7 },
]

export const HARBOR_RPG_QUESTS = [
  // —— Meadow hub ——
  {
    id: 'quest-slime-hunt',
    name: { en: 'Slime Sweep', zh: '史萊姆清掃' },
    zone: 'meadow' as HarborRpgZoneId,
    kind: 'kill' as const,
    target: 'slime' as HarborRpgMonsterKind,
    need: 5,
    xp: 40,
    gold: 12,
    chapter: 'hub' as const,
    blurb: { en: 'Clear 5 meadow slimes.', zh: '打倒5隻草原史萊姆。' },
  },
  {
    id: 'quest-meadow-bones',
    name: { en: 'Bone for the Shrine', zh: '神龕之骨' },
    zone: 'meadow' as HarborRpgZoneId,
    kind: 'gather' as const,
    targetItem: 'rpg-item-bone' as HarborRpgItemId,
    need: 4,
    xp: 35,
    gold: 10,
    chapter: 'hub' as const,
    requires: ['quest-slime-hunt'] as const,
    blurb: { en: 'Bring 4 beast bones to the meadow shrine path.', zh: '帶回4根獸骨到草原神龕小徑。' },
  },
  {
    id: 'quest-meadow-herbs',
    name: { en: 'Wild Bundle', zh: '野草一束' },
    zone: 'meadow' as HarborRpgZoneId,
    kind: 'gather' as const,
    targetItem: 'rpg-item-herb' as HarborRpgItemId,
    need: 6,
    xp: 38,
    gold: 11,
    chapter: 'hub' as const,
    requires: ['quest-slime-hunt'] as const,
    blurb: { en: 'Gather 6 wild herbs near the shrine.', zh: '在神龕附近採集6株野草藥。' },
  },
  {
    id: 'quest-meadow-wolves',
    name: { en: 'Edge Wolves', zh: '邊狼' },
    zone: 'meadow' as HarborRpgZoneId,
    kind: 'kill' as const,
    target: 'wolf' as HarborRpgMonsterKind,
    need: 3,
    xp: 48,
    gold: 14,
    chapter: 'hub' as const,
    requires: ['quest-meadow-bones', 'quest-meadow-herbs'] as const,
    blurb: { en: 'Drive off 3 wolves at the pinewood edge.', zh: '趕走松林邊的3隻狼。' },
  },
  // —— Pinewood ——
  {
    id: 'quest-wolf-pelts',
    name: { en: 'Pinewood Pelts', zh: '松林之皮' },
    zone: 'pinewood' as HarborRpgZoneId,
    kind: 'kill' as const,
    target: 'wolf' as HarborRpgMonsterKind,
    need: 4,
    xp: 55,
    gold: 18,
    chapter: 'hub' as const,
    requires: ['quest-meadow-wolves'] as const,
    blurb: { en: 'Hunt 4 pine wolves.', zh: '獵殺4隻松林狼。' },
  },
  {
    id: 'quest-pine-hide',
    name: { en: 'Hide for Boots', zh: '靴用之皮' },
    zone: 'pinewood' as HarborRpgZoneId,
    kind: 'gather' as const,
    targetItem: 'rpg-item-hide' as HarborRpgItemId,
    need: 5,
    xp: 50,
    gold: 16,
    chapter: 'hub' as const,
    requires: ['quest-wolf-pelts'] as const,
    blurb: { en: 'Collect 5 hides from the Reach.', zh: '自松林境收集5張獸皮。' },
  },
  {
    id: 'quest-pine-ore',
    name: { en: 'Vein Sample', zh: '礦脈樣' },
    zone: 'pinewood' as HarborRpgZoneId,
    kind: 'gather' as const,
    targetItem: 'rpg-item-ore' as HarborRpgItemId,
    need: 4,
    xp: 52,
    gold: 17,
    chapter: 'hub' as const,
    requires: ['quest-wolf-pelts'] as const,
    blurb: { en: 'Mine 4 ore from pinewood nodes.', zh: '自松林礦點採4塊礦石。' },
  },
  {
    id: 'quest-pine-slimes',
    name: { en: 'Sap Slimes', zh: '樹汁史萊姆' },
    zone: 'pinewood' as HarborRpgZoneId,
    kind: 'kill' as const,
    target: 'slime' as HarborRpgMonsterKind,
    need: 4,
    xp: 45,
    gold: 14,
    chapter: 'hub' as const,
    requires: ['quest-pine-hide'] as const,
    blurb: { en: 'Clear 4 slimes dripping in the pines.', zh: '清除松間4隻滴汁史萊姆。' },
  },
  {
    id: 'quest-pine-pack',
    name: { en: 'Alpha Trail', zh: '頭狼蹤' },
    zone: 'pinewood' as HarborRpgZoneId,
    kind: 'kill' as const,
    target: 'wolf' as HarborRpgMonsterKind,
    need: 6,
    xp: 70,
    gold: 22,
    chapter: 'hub' as const,
    requires: ['quest-pine-ore', 'quest-pine-slimes'] as const,
    blurb: { en: 'Cull 6 more wolves before the Echo portal wakes.', zh: '在回音傳送門醒來前再清6狼。' },
  },
  // —— Ruins ——
  {
    id: 'quest-ruin-shards',
    name: { en: 'Shard Gather', zh: '碎片收集' },
    zone: 'ruins' as HarborRpgZoneId,
    kind: 'gather' as const,
    targetItem: 'rpg-item-shard' as HarborRpgItemId,
    need: 6,
    xp: 70,
    gold: 24,
    chapter: 'hub' as const,
    requires: ['quest-meadow-wolves'] as const,
    blurb: { en: 'Bring 6 ruin shards to town.', zh: '帶回6塊遺址碎片。' },
  },
  {
    id: 'quest-ruin-bandits',
    name: { en: 'Ashen Cutthroats', zh: '灰刃匪' },
    zone: 'ruins' as HarborRpgZoneId,
    kind: 'kill' as const,
    target: 'bandit' as HarborRpgMonsterKind,
    need: 5,
    xp: 75,
    gold: 26,
    chapter: 'hub' as const,
    requires: ['quest-ruin-shards'] as const,
    blurb: { en: 'Defeat 5 ruin bandits.', zh: '打倒5名遺址盜匪。' },
  },
  {
    id: 'quest-ruin-golem',
    name: { en: 'Walking Ash', zh: '行灰' },
    zone: 'ruins' as HarborRpgZoneId,
    kind: 'kill' as const,
    target: 'golem' as HarborRpgMonsterKind,
    need: 3,
    xp: 90,
    gold: 30,
    chapter: 'hub' as const,
    requires: ['quest-ruin-bandits'] as const,
    blurb: { en: 'Fell 3 ash golems.', zh: '打倒3隻灰石魔像。' },
  },
  {
    id: 'quest-ruin-ore',
    name: { en: 'Broken Forge', zh: '斷鍛' },
    zone: 'ruins' as HarborRpgZoneId,
    kind: 'gather' as const,
    targetItem: 'rpg-item-ore' as HarborRpgItemId,
    need: 5,
    xp: 65,
    gold: 20,
    chapter: 'hub' as const,
    requires: ['quest-ruin-bandits'] as const,
    blurb: { en: 'Salvage 5 ore from ruin veins.', zh: '自遺址礦脈搶回5礦。' },
  },
  {
    id: 'quest-ruin-patrol',
    name: { en: 'Crypt Approach', zh: '地牢之前' },
    zone: 'ruins' as HarborRpgZoneId,
    kind: 'kill' as const,
    target: 'bandit' as HarborRpgMonsterKind,
    need: 4,
    xp: 80,
    gold: 28,
    chapter: 'hub' as const,
    requires: ['quest-ruin-golem', 'quest-ruin-ore'] as const,
    blurb: { en: 'Clear the last patrol before Ash Crypt.', zh: '清除灰燼地牢前最後一班巡邏。' },
  },
  // —— Marsh ——
  {
    id: 'quest-marsh-toads',
    name: { en: 'Reed Cull', zh: '澤蟾清剿' },
    zone: 'marsh' as HarborRpgZoneId,
    kind: 'kill' as const,
    target: 'toad' as HarborRpgMonsterKind,
    need: 6,
    xp: 60,
    gold: 20,
    chapter: 'hub' as const,
    requires: ['quest-meadow-wolves'] as const,
    blurb: { en: 'Defeat 6 marsh toads.', zh: '打倒6隻澤蟾。' },
  },
  {
    id: 'quest-marsh-reeds',
    name: { en: 'Reed Bundle', zh: '蘆葦束' },
    zone: 'marsh' as HarborRpgZoneId,
    kind: 'gather' as const,
    targetItem: 'rpg-item-reed' as HarborRpgItemId,
    need: 6,
    xp: 55,
    gold: 18,
    chapter: 'hub' as const,
    requires: ['quest-marsh-toads'] as const,
    blurb: { en: 'Cut 6 reeds for salves.', zh: '割6束蘆葦製藥。' },
  },
  {
    id: 'quest-marsh-slimes',
    name: { en: 'Bog Bloom', zh: '澤花' },
    zone: 'marsh' as HarborRpgZoneId,
    kind: 'kill' as const,
    target: 'slime' as HarborRpgMonsterKind,
    need: 4,
    xp: 50,
    gold: 16,
    chapter: 'hub' as const,
    requires: ['quest-marsh-toads'] as const,
    blurb: { en: 'Clear 4 bog slimes.', zh: '清除4隻澤史萊姆。' },
  },
  {
    id: 'quest-marsh-herbs',
    name: { en: 'Mist Herbs', zh: '霧藥' },
    zone: 'marsh' as HarborRpgZoneId,
    kind: 'gather' as const,
    targetItem: 'rpg-item-herb' as HarborRpgItemId,
    need: 5,
    xp: 48,
    gold: 15,
    chapter: 'hub' as const,
    requires: ['quest-marsh-reeds'] as const,
    blurb: { en: 'Pick 5 herbs from the mist banks.', zh: '自霧岸採5株草藥。' },
  },
  {
    id: 'quest-marsh-gate',
    name: { en: 'Hollow Gate', zh: '窟門' },
    zone: 'marsh' as HarborRpgZoneId,
    kind: 'kill' as const,
    target: 'toad' as HarborRpgMonsterKind,
    need: 5,
    xp: 85,
    gold: 28,
    chapter: 'hub' as const,
    requires: ['quest-marsh-herbs', 'quest-marsh-slimes'] as const,
    blurb: { en: 'Clear the thrall gate before Black Tide Hollow.', zh: '在黑潮窟前清掉守衛蟾群。' },
  },
  // —— Town crafts ——
  {
    id: 'quest-first-craft',
    name: { en: 'First Brew', zh: '初煉' },
    zone: 'town' as HarborRpgZoneId,
    kind: 'gather' as const,
    targetItem: 'rpg-potion-heal' as HarborRpgItemId,
    need: 1,
    xp: 45,
    gold: 15,
    chapter: 'hub' as const,
    requires: ['quest-marsh-reeds'] as const,
    blurb: { en: 'Craft one Reed Salve at the market.', zh: '在市集煉製一瓶蘆葦藥膏。' },
  },
  {
    id: 'quest-town-mana',
    name: { en: 'Lantern Draft', zh: '燈草劑' },
    zone: 'town' as HarborRpgZoneId,
    kind: 'gather' as const,
    targetItem: 'rpg-potion-mana' as HarborRpgItemId,
    need: 1,
    xp: 50,
    gold: 18,
    chapter: 'hub' as const,
    requires: ['quest-first-craft'] as const,
    blurb: { en: 'Brew a mana draft for night watches.', zh: '為夜哨煉一瓶法力劑。' },
  },
  {
    id: 'quest-town-smith',
    name: { en: 'Market Blade', zh: '市集刃' },
    zone: 'town' as HarborRpgZoneId,
    kind: 'gather' as const,
    targetItem: 'rpg-weapon-blade' as HarborRpgItemId,
    need: 1,
    xp: 70,
    gold: 25,
    chapter: 'hub' as const,
    requires: ['quest-pine-ore', 'quest-first-craft'] as const,
    blurb: { en: 'Smith or buy one River Blade.', zh: '鍛造或購買一把河刃。' },
  },
  {
    id: 'quest-town-mail',
    name: { en: 'Fit for Patrol', zh: '巡邏之甲' },
    zone: 'town' as HarborRpgZoneId,
    kind: 'gather' as const,
    targetItem: 'rpg-armor-mail' as HarborRpgItemId,
    need: 1,
    xp: 80,
    gold: 30,
    chapter: 'hub' as const,
    requires: ['quest-town-smith'] as const,
    blurb: { en: 'Obtain a set of mail for the finder board.', zh: '為組隊告示備一副鎖甲。' },
  },
  {
    id: 'quest-town-coins',
    name: { en: 'Tide Coin Purse', zh: '潮幣袋' },
    zone: 'town' as HarborRpgZoneId,
    kind: 'gather' as const,
    targetItem: 'rpg-item-tide-coin' as HarborRpgItemId,
    need: 3,
    xp: 60,
    gold: 20,
    chapter: 'hub' as const,
    requires: ['quest-first-craft'] as const,
    blurb: { en: 'Bring 3 Tide Coins from bosses or thralls.', zh: '自首領或潮奴帶回3枚潮幣。' },
  },
  // —— Chapter story ——
  {
    id: 'quest-crypt-warden',
    name: { en: 'Ash Remembers', zh: '灰燼記得' },
    zone: 'crypt' as HarborRpgZoneId,
    kind: 'kill' as const,
    target: 'crypt-boss' as HarborRpgMonsterKind,
    need: 1,
    xp: 200,
    gold: 80,
    chapter: 'ch-ash' as const,
    requires: ['quest-ruin-patrol'] as const,
    blurb: {
      en: 'Chapter I — Slay the Ash Warden. Embers that refuse to cool still patrol a war with no victors.',
      zh: '第一章——打倒灰燼守衛。不肯冷下的餘燼，仍在巡邏一場沒有勝者的舊戰。',
    },
  },
  {
    id: 'quest-crypt-wraiths',
    name: { en: 'Restless Embers', zh: '不安餘燼' },
    zone: 'crypt' as HarborRpgZoneId,
    kind: 'kill' as const,
    target: 'wraith' as HarborRpgMonsterKind,
    need: 6,
    xp: 110,
    gold: 36,
    chapter: 'ch-ash' as const,
    requires: ['quest-crypt-warden'] as const,
    blurb: { en: 'Put 6 crypt wraiths to rest after the Warden falls.', zh: '守衛倒下後，安息6隻地牢怨靈。' },
  },
  {
    id: 'quest-crypt-core',
    name: { en: 'Ash Core Offering', zh: '灰核獻' },
    zone: 'crypt' as HarborRpgZoneId,
    kind: 'gather' as const,
    targetItem: 'rpg-item-ash-core' as HarborRpgItemId,
    need: 1,
    xp: 90,
    gold: 40,
    chapter: 'ch-ash' as const,
    requires: ['quest-crypt-warden'] as const,
    blurb: { en: 'Deliver the Ash Core to the Town board.', zh: '把灰核交到小鎮任務板。' },
  },
  {
    id: 'quest-tide-pearl',
    name: { en: 'Name Hunger', zh: '名之飢' },
    zone: 'tidehollow' as HarborRpgZoneId,
    kind: 'kill' as const,
    target: 'tide-boss' as HarborRpgMonsterKind,
    need: 1,
    xp: 240,
    gold: 95,
    chapter: 'ch-tide' as const,
    requires: ['quest-crypt-warden', 'quest-marsh-gate'] as const,
    blurb: {
      en: 'Chapter II — Enter Black Tide Hollow via the Marsh. The Pearl Host hungers for names — keep yours.',
      zh: '第二章——由澤地進入黑潮窟。珠宿主渴求名字——守住你的。',
    },
  },
  {
    id: 'quest-tide-thralls',
    name: { en: 'Nameless Thralls', zh: '無名潮奴' },
    zone: 'tidehollow' as HarborRpgZoneId,
    kind: 'kill' as const,
    target: 'tide-thrall' as HarborRpgMonsterKind,
    need: 8,
    xp: 130,
    gold: 42,
    chapter: 'ch-tide' as const,
    requires: ['quest-tide-pearl'] as const,
    blurb: { en: 'Free 8 tide thralls after the Host falls.', zh: '宿主倒下後解放8名潮奴。' },
  },
  {
    id: 'quest-tide-pearls',
    name: { en: 'Pearl Tithe', zh: '珠稅' },
    zone: 'tidehollow' as HarborRpgZoneId,
    kind: 'gather' as const,
    targetItem: 'rpg-item-pearl' as HarborRpgItemId,
    need: 3,
    xp: 100,
    gold: 45,
    chapter: 'ch-tide' as const,
    requires: ['quest-tide-pearl'] as const,
    blurb: { en: 'Return 3 pearls before they learn your name.', zh: '在珠學會你的名字前回交3顆珠。' },
  },
  {
    id: 'quest-chronicle-ink',
    name: { en: 'Self-Writing', zh: '自書' },
    zone: 'chronicle' as HarborRpgZoneId,
    kind: 'kill' as const,
    target: 'chronicle-boss' as HarborRpgMonsterKind,
    need: 1,
    xp: 260,
    gold: 100,
    chapter: 'ch-chronicle' as const,
    requires: ['quest-tide-pearl', 'quest-town-mana'] as const,
    blurb: {
      en: 'Chapter III — From Town, open the Chronicle Vault. Stop the Ink Archivist before the Other-side finishes reading.',
      zh: '第三章——自小鎮開啟紀年庫。在彼岸讀完之前制止墨典吏。',
    },
  },
  {
    id: 'quest-chronicle-shades',
    name: { en: 'Ink Out of Place', zh: '錯位之墨' },
    zone: 'chronicle' as HarborRpgZoneId,
    kind: 'kill' as const,
    target: 'ink-shade' as HarborRpgMonsterKind,
    need: 8,
    xp: 140,
    gold: 48,
    chapter: 'ch-chronicle' as const,
    requires: ['quest-chronicle-ink'] as const,
    blurb: { en: 'Erase 8 ink shades from the vault floors.', zh: '抹去庫層8隻墨影。' },
  },
  {
    id: 'quest-chronicle-silk',
    name: { en: 'Ledger Binding', zh: '賬冊裝訂' },
    zone: 'chronicle' as HarborRpgZoneId,
    kind: 'gather' as const,
    targetItem: 'rpg-item-silk' as HarborRpgItemId,
    need: 2,
    xp: 110,
    gold: 50,
    chapter: 'ch-chronicle' as const,
    requires: ['quest-chronicle-ink'] as const,
    blurb: { en: 'Recover 2 silk bindings from the vault.', zh: '自紀年庫取回2份絲裝訂。' },
  },
  {
    id: 'quest-echo-mirror',
    name: { en: 'Who Keeps the Voyage', zh: '誰留航程' },
    zone: 'echoisle' as HarborRpgZoneId,
    kind: 'kill' as const,
    target: 'echo-boss' as HarborRpgMonsterKind,
    need: 1,
    xp: 250,
    gold: 98,
    chapter: 'ch-echo' as const,
    requires: ['quest-chronicle-ink', 'quest-pine-pack'] as const,
    blurb: {
      en: 'Chapter IV — From Pinewood, sail to Echo Isle. Face the Mirror Ferry — only one name leaves.',
      zh: '第四章——自松林前往回音島。面對鏡渡——只許一名離去。',
    },
  },
  {
    id: 'quest-echo-twins',
    name: { en: 'Kinder Cuts', zh: '溫柔一刀' },
    zone: 'echoisle' as HarborRpgZoneId,
    kind: 'kill' as const,
    target: 'echo-twin' as HarborRpgMonsterKind,
    need: 6,
    xp: 135,
    gold: 44,
    chapter: 'ch-echo' as const,
    requires: ['quest-echo-mirror'] as const,
    blurb: { en: 'Dismiss 6 echo twins that linger after the Ferry.', zh: '遣散鏡渡後殘留的6個回音分身。' },
  },
  {
    id: 'quest-echo-pearl',
    name: { en: 'Mirrored Pearl', zh: '鏡珠' },
    zone: 'echoisle' as HarborRpgZoneId,
    kind: 'gather' as const,
    targetItem: 'rpg-item-pearl' as HarborRpgItemId,
    need: 2,
    xp: 105,
    gold: 46,
    chapter: 'ch-echo' as const,
    requires: ['quest-echo-mirror'] as const,
    blurb: { en: 'Bring 2 pearls that still hum with your twin’s voice.', zh: '帶回仍帶分身聲音的2顆珠。' },
  },
  // —— Chapter V raid ——
  {
    id: 'quest-raid-herald',
    name: { en: 'First Bell', zh: '初鐘' },
    zone: 'tideraid' as HarborRpgZoneId,
    kind: 'kill' as const,
    target: 'raid-herald' as HarborRpgMonsterKind,
    need: 1,
    xp: 280,
    gold: 110,
    chapter: 'ch-raid' as const,
    requires: ['quest-echo-mirror', 'quest-town-mail'] as const,
    blurb: {
      en: 'Chapter V — Enter the Tide Remembers raid from Town. Silence the Tide Herald’s cracked bell.',
      zh: '第五章——自小鎮進入潮之記得團本。令潮使者的裂鐘沉默。',
    },
  },
  {
    id: 'quest-raid-depth',
    name: { en: 'Ink Flood', zh: '墨洪' },
    zone: 'tideraid' as HarborRpgZoneId,
    kind: 'kill' as const,
    target: 'raid-depth' as HarborRpgMonsterKind,
    need: 1,
    xp: 300,
    gold: 120,
    chapter: 'ch-raid' as const,
    requires: ['quest-raid-herald'] as const,
    blurb: { en: 'Defeat the Depth Archivist in the raid mid-wing.', zh: '打倒團本中翼的深淵典吏。' },
  },
  {
    id: 'quest-raid-sovereign',
    name: { en: 'Keep the Voyage', zh: '留下航程' },
    zone: 'tideraid' as HarborRpgZoneId,
    kind: 'kill' as const,
    target: 'raid-sovereign' as HarborRpgMonsterKind,
    need: 1,
    xp: 400,
    gold: 160,
    chapter: 'ch-raid' as const,
    requires: ['quest-raid-depth'] as const,
    blurb: {
      en: 'Finale — Face the Tide Sovereign. Decide who rewrites the Harbor’s hour.',
      zh: '終章——面對主潮。決定誰改寫港灣的時刻。',
    },
  },
  {
    id: 'quest-raid-seal',
    name: { en: 'Heroic Tithe', zh: '英雄稅' },
    zone: 'tideraid' as HarborRpgZoneId,
    kind: 'gather' as const,
    targetItem: 'rpg-item-heroic-seal' as HarborRpgItemId,
    need: 2,
    xp: 150,
    gold: 60,
    chapter: 'ch-raid' as const,
    requires: ['quest-raid-herald'] as const,
    blurb: { en: 'Return 2 Heroic Ferry Seals (Heroic drops more).', zh: '交回2枚英雄渡印（英雄難度掉落更多）。' },
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
    'rpg-offhand-buckler',
    'rpg-offhand-lantern',
    'rpg-armor-cloth',
    'rpg-armor-leather',
    'rpg-armor-mail',
    'rpg-head-hood',
    'rpg-legs-wraps',
    'rpg-feet-sandals',
    'rpg-potion-heal',
    'rpg-potion-mana',
    'rpg-ring-tide',
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

export const HARBOR_RPG_MARKET = {
  id: 'rpg-market' as const,
  zone: 'town' as const,
  x: 8,
  z: 6,
  radius: 2.2,
  name: { en: 'World Market', zh: '世界市集' },
}

export const HARBOR_RPG_CRAFT_BENCH = {
  id: 'rpg-craft' as const,
  zone: 'town' as const,
  x: -8,
  z: 6,
  radius: 2.2,
  name: { en: 'Craft Bench', zh: '工藝台' },
}

export const HARBOR_RPG_BANK = {
  id: 'rpg-bank' as const,
  zone: 'town' as const,
  x: 0,
  z: -10,
  radius: 2.2,
  name: { en: 'River Bank', zh: '河岸銀庫' },
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

export function isHarborRpgItemId(raw: unknown): raw is HarborRpgItemId {
  return typeof raw === 'string' && (HARBOR_RPG_ITEMS as readonly string[]).includes(raw)
}

export function harborRpgQuestById(id: string) {
  return HARBOR_RPG_QUESTS.find((q) => q.id === id) ?? null
}

export function harborRpgItemSlot(id: HarborRpgItemId): HarborRpgGearSlot | null {
  const kind = HARBOR_RPG_ITEM_DEFS[id].kind
  return (HARBOR_RPG_GEAR_SLOTS as readonly string[]).includes(kind)
    ? (kind as HarborRpgGearSlot)
    : null
}

/** Legacy armor kind → chest. */
export function isHarborRpgArmorItem(id: HarborRpgItemId): boolean {
  return HARBOR_RPG_ITEM_DEFS[id].kind === 'chest'
}

export function isHarborRpgWeaponItem(id: HarborRpgItemId): boolean {
  return HARBOR_RPG_ITEM_DEFS[id].kind === 'weapon'
}
