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
] as const
export type HarborRpgZoneId = (typeof HARBOR_RPG_ZONES)[number]

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

export const HARBOR_RPG_RARITIES = ['common', 'uncommon', 'rare', 'epic'] as const
export type HarborRpgRarity = (typeof HARBOR_RPG_RARITIES)[number]

export const HARBOR_RPG_ITEMS = [
  'rpg-item-herb',
  'rpg-item-bone',
  'rpg-item-shard',
  'rpg-item-hide',
  'rpg-item-ore',
  'rpg-item-reed',
  'rpg-item-ash-core',
  'rpg-potion-heal',
  'rpg-potion-might',
  'rpg-weapon-stick',
  'rpg-weapon-blade',
  'rpg-weapon-ash',
  'rpg-offhand-buckler',
  'rpg-offhand-tome',
  'rpg-armor-cloth',
  'rpg-armor-leather',
  'rpg-armor-mail',
  'rpg-head-hood',
  'rpg-head-helm',
  'rpg-legs-wraps',
  'rpg-legs-greaves',
  'rpg-feet-sandals',
  'rpg-feet-boots',
  'rpg-ring-jade',
  'rpg-trinket-lantern',
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
  'rpg-trinket-lantern': {
    id: 'rpg-trinket-lantern',
    name: { en: 'Ferry Charm', zh: '渡船符' },
    kind: 'trinket',
    stackable: false,
    rarity: 'rare',
    value: 50,
    power: 3,
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
] as const
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
  boss?: boolean
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
    loot: [
      { item: 'rpg-item-ash-core', chance: 1, qty: 1 },
      { item: 'rpg-weapon-ash', chance: 0.35, qty: 1 },
      { item: 'rpg-trinket-lantern', chance: 0.25, qty: 1 },
      { item: 'rpg-armor-mail', chance: 0.2, qty: 1 },
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
  {
    id: 'quest-marsh-toads',
    name: { en: 'Reed Cull', zh: '澤蟾清剿' },
    zone: 'marsh' as HarborRpgZoneId,
    kind: 'kill' as const,
    target: 'toad' as HarborRpgMonsterKind,
    need: 6,
    xp: 60,
    gold: 20,
    blurb: { en: 'Defeat 6 marsh toads.', zh: '打倒6隻澤蟾。' },
  },
  {
    id: 'quest-crypt-warden',
    name: { en: 'Ash Warden', zh: '灰燼守衛' },
    zone: 'crypt' as HarborRpgZoneId,
    kind: 'kill' as const,
    target: 'crypt-boss' as HarborRpgMonsterKind,
    need: 1,
    xp: 200,
    gold: 80,
    blurb: { en: 'Slay the Ash Warden in the Crypt.', zh: '在地牢打倒灰燼守衛。' },
  },
  {
    id: 'quest-first-craft',
    name: { en: 'First Brew', zh: '初煉' },
    zone: 'town' as HarborRpgZoneId,
    kind: 'gather' as const,
    targetItem: 'rpg-potion-heal' as HarborRpgItemId,
    need: 1,
    xp: 45,
    gold: 15,
    blurb: { en: 'Craft one Reed Salve at the market.', zh: '在市集煉製一瓶蘆葦藥膏。' },
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
    'rpg-armor-cloth',
    'rpg-armor-leather',
    'rpg-armor-mail',
    'rpg-head-hood',
    'rpg-legs-wraps',
    'rpg-feet-sandals',
    'rpg-potion-heal',
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
