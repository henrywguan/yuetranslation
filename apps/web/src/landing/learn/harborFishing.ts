/**
 * Harbor Quest · Guan Fishing (systems inspired by classic fishing loops;
 * original fish / gear / place names — no Jagex IP).
 */
export type HarborFishId =
  | 'fish-shrimp'
  | 'fish-anchovy'
  | 'fish-sardine'
  | 'fish-herring'
  | 'fish-trout'
  | 'fish-salmon'
  | 'fish-tuna'
  | 'fish-lobster'
  | 'fish-swordfish'
  | 'fish-shark'
  | 'fish-oyster'
  | 'fish-ash-crab'
  | 'fish-mist-eel'
  | 'fish-jade-carp'
  | 'fish-reed-perch'
  | 'fish-wreck-bass'

export type HarborBaitId = 'bait-none' | 'bait-rice' | 'bait-feather' | 'bait-worm' | 'bait-paste'

export type HarborFishToolId =
  | 'tool-net'
  | 'tool-rod'
  | 'tool-fly'
  | 'tool-harpoon'
  | 'tool-cage'
  | 'tool-heavy-cage'

export type HarborFishMethod = 'net' | 'bait' | 'lure' | 'harpoon' | 'cage'

export type HarborFishSpotId =
  | 'spot-musa-pier'
  | 'spot-brim-dock'
  | 'spot-cairn-shore'
  | 'spot-pearl-cay'
  | 'spot-mist-atoll'
  | 'spot-jade-skerry'
  | 'spot-ember-shoal'
  | 'spot-shipyard-bay'
  | 'spot-reed-key'
  | 'spot-wreck-cay'

export type HarborFishDef = {
  id: HarborFishId
  name: { en: string; zh: string }
  /** Ferry-coin sell value. */
  value: number
  /** Fishing XP on catch. */
  xp: number
  level: number
  method: HarborFishMethod
  bait: HarborBaitId
  /** Soft rarity weight (higher = more common at eligible spots). */
  weight: number
}

export type HarborFishToolDef = {
  id: HarborFishToolId
  name: { en: string; zh: string }
  method: HarborFishMethod
  price: number
  level: number
}

export type HarborBaitDef = {
  id: HarborBaitId
  name: { en: string; zh: string }
  price: number
  /** Stacks sold per purchase. */
  pack: number
}

export type HarborFishSpotDef = {
  id: HarborFishSpotId
  name: { en: string; zh: string }
  x: number
  z: number
  radius: number
  /** Island / region tag for UI. */
  region: string
  methods: readonly HarborFishMethod[]
  fish: readonly HarborFishId[]
}

export const HARBOR_FISH_CATALOG: readonly HarborFishDef[] = [
  { id: 'fish-shrimp', name: { en: 'Harbor shrimp', zh: '港蝦' }, value: 3, xp: 12, level: 1, method: 'net', bait: 'bait-none', weight: 12 },
  { id: 'fish-anchovy', name: { en: 'Silver anchovy', zh: '銀鯷' }, value: 5, xp: 18, level: 5, method: 'net', bait: 'bait-none', weight: 8 },
  { id: 'fish-sardine', name: { en: 'Amber sardine', zh: '琥珀沙甸' }, value: 6, xp: 22, level: 5, method: 'bait', bait: 'bait-rice', weight: 10 },
  { id: 'fish-herring', name: { en: 'Jade herring', zh: '玉青魚' }, value: 8, xp: 28, level: 10, method: 'bait', bait: 'bait-rice', weight: 8 },
  { id: 'fish-trout', name: { en: 'Brook trout', zh: '溪鱒' }, value: 12, xp: 40, level: 20, method: 'lure', bait: 'bait-feather', weight: 9 },
  { id: 'fish-salmon', name: { en: 'Pier salmon', zh: '碼頭鮭' }, value: 18, xp: 55, level: 30, method: 'lure', bait: 'bait-feather', weight: 7 },
  { id: 'fish-jade-carp', name: { en: 'Jade skerry carp', zh: '玉磯鯉' }, value: 22, xp: 62, level: 28, method: 'bait', bait: 'bait-paste', weight: 6 },
  { id: 'fish-reed-perch', name: { en: 'Reed Key perch', zh: '蘆鑰鱸' }, value: 16, xp: 48, level: 18, method: 'lure', bait: 'bait-feather', weight: 7 },
  { id: 'fish-wreck-bass', name: { en: 'Wreck Cay bass', zh: '沉舟鱸' }, value: 70, xp: 110, level: 52, method: 'harpoon', bait: 'bait-none', weight: 3 },
  { id: 'fish-tuna', name: { en: 'Blue tuna', zh: '藍鮪' }, value: 35, xp: 80, level: 35, method: 'harpoon', bait: 'bait-none', weight: 6 },
  { id: 'fish-lobster', name: { en: 'Harbor lobster', zh: '港龍蝦' }, value: 42, xp: 90, level: 40, method: 'cage', bait: 'bait-none', weight: 5 },
  { id: 'fish-oyster', name: { en: 'Pearl cay oyster', zh: '珠嶼蠔' }, value: 48, xp: 70, level: 25, method: 'net', bait: 'bait-none', weight: 4 },
  { id: 'fish-mist-eel', name: { en: 'Mist atoll eel', zh: '霧嶼鱔' }, value: 55, xp: 95, level: 45, method: 'bait', bait: 'bait-worm', weight: 4 },
  { id: 'fish-ash-crab', name: { en: 'Ember shoal crab', zh: '焰灘蟹' }, value: 60, xp: 100, level: 48, method: 'cage', bait: 'bait-none', weight: 4 },
  { id: 'fish-swordfish', name: { en: 'Moon swordfish', zh: '月劍魚' }, value: 85, xp: 120, level: 50, method: 'harpoon', bait: 'bait-none', weight: 3 },
  { id: 'fish-shark', name: { en: 'Typhoon shark', zh: '颱鯊' }, value: 140, xp: 180, level: 70, method: 'harpoon', bait: 'bait-none', weight: 2 },
] as const

export const HARBOR_FISH_TOOLS: readonly HarborFishToolDef[] = [
  { id: 'tool-net', name: { en: 'Bamboo small net', zh: '竹小網' }, method: 'net', price: 0, level: 1 },
  { id: 'tool-rod', name: { en: 'Jade fishing rod', zh: '玉釣竿' }, method: 'bait', price: 24, level: 5 },
  { id: 'tool-fly', name: { en: 'Silk fly rod', zh: '絲蠅竿' }, method: 'lure', price: 48, level: 20 },
  { id: 'tool-cage', name: { en: 'Bamboo lobster cage', zh: '竹蝦籠' }, method: 'cage', price: 72, level: 40 },
  { id: 'tool-harpoon', name: { en: 'Iron sea harpoon', zh: '鐵海叉' }, method: 'harpoon', price: 96, level: 35 },
  { id: 'tool-heavy-cage', name: { en: 'Iron heavy cage', zh: '鐵重籠' }, method: 'cage', price: 140, level: 48 },
] as const

export const HARBOR_FISH_BAITS: readonly HarborBaitDef[] = [
  { id: 'bait-none', name: { en: 'No bait', zh: '不用餌' }, price: 0, pack: 0 },
  { id: 'bait-rice', name: { en: 'Rice bait', zh: '米餌' }, price: 2, pack: 20 },
  { id: 'bait-feather', name: { en: 'Reed feather', zh: '蘆羽' }, price: 3, pack: 15 },
  { id: 'bait-worm', name: { en: 'Night worm', zh: '夜蟲' }, price: 4, pack: 12 },
  { id: 'bait-paste', name: { en: 'Shrimp paste', zh: '蝦醬餌' }, price: 5, pack: 10 },
] as const

/** Fishing overseer hut — Musa Point shore (north of banana grove). */
export const GUAN_FISHING_HUT = {
  id: 'fishing-hut' as const,
  name: { en: 'Fishing Lodge', zh: '漁寮' },
  x: 10.6,
  z: 15.1,
  radius: 1.35,
} as const

export const GUAN_FISHING_OVERSEER_NAME = '漁監 · Fisher Overseer' as const

/**
 * Satellite islands + shore spots (expanded Guan ocean).
 * Coordinates are world xz; spots sit in shallow water off land.
 */
export const GUAN_FISH_SPOTS: readonly HarborFishSpotDef[] = [
  {
    id: 'spot-musa-pier',
    name: { en: 'Musa pier nets', zh: '巫沙網位' },
    x: 11.8,
    z: 17.2,
    radius: 1.4,
    region: 'Musa Point',
    methods: ['net', 'bait'],
    fish: ['fish-shrimp', 'fish-anchovy', 'fish-sardine', 'fish-herring'],
  },
  {
    id: 'spot-brim-dock',
    name: { en: 'Brimhaven cages', zh: '焰灣籠位' },
    x: -15.2,
    z: 15.0,
    radius: 1.4,
    region: 'Brimhaven',
    methods: ['cage', 'bait'],
    fish: ['fish-lobster', 'fish-sardine', 'fish-herring'],
  },
  {
    id: 'spot-cairn-shore',
    name: { en: 'Cairn rock pools', zh: '石塚岩潭' },
    x: -14.2,
    z: -12.8,
    radius: 1.3,
    region: 'Cairn Isle',
    methods: ['net', 'lure'],
    fish: ['fish-shrimp', 'fish-trout', 'fish-anchovy'],
  },
  {
    id: 'spot-pearl-cay',
    name: { en: 'Pearl Cay lagoon', zh: '珠嶼潟湖' },
    x: 22.5,
    z: 8.0,
    radius: 1.5,
    region: 'Pearl Cay',
    methods: ['net', 'harpoon'],
    fish: ['fish-oyster', 'fish-tuna', 'fish-anchovy', 'fish-swordfish'],
  },
  {
    id: 'spot-mist-atoll',
    name: { en: 'Mist Atoll deeps', zh: '霧嶼深水' },
    x: -24.0,
    z: 6.5,
    radius: 1.5,
    region: 'Mist Atoll',
    methods: ['bait', 'harpoon'],
    fish: ['fish-mist-eel', 'fish-tuna', 'fish-swordfish', 'fish-shark'],
  },
  {
    id: 'spot-jade-skerry',
    name: { en: 'Jade Skerry reeds', zh: '玉磯蘆岸' },
    x: 20.0,
    z: -18.0,
    radius: 1.45,
    region: 'Jade Skerry',
    methods: ['lure', 'bait'],
    fish: ['fish-jade-carp', 'fish-trout', 'fish-salmon', 'fish-herring'],
  },
  {
    id: 'spot-ember-shoal',
    name: { en: 'Ember Shoal vents', zh: '焰灘噴口' },
    x: -22.0,
    z: -20.0,
    radius: 1.45,
    region: 'Ember Shoal',
    methods: ['cage', 'harpoon'],
    fish: ['fish-ash-crab', 'fish-lobster', 'fish-tuna'],
  },
  {
    id: 'spot-shipyard-bay',
    name: { en: 'Shipyard bay', zh: '船塢灣' },
    x: 13.5,
    z: -2.5,
    radius: 1.35,
    region: 'Ship Yard',
    methods: ['bait', 'cage'],
    fish: ['fish-sardine', 'fish-herring', 'fish-lobster', 'fish-salmon'],
  },
  {
    id: 'spot-reed-key',
    name: { en: 'Reed Key shallows', zh: '蘆鑰淺灘' },
    x: 5.5,
    z: 28.2,
    radius: 1.4,
    region: 'Reed Key',
    methods: ['lure', 'net'],
    fish: ['fish-reed-perch', 'fish-trout', 'fish-shrimp', 'fish-anchovy'],
  },
  {
    id: 'spot-wreck-cay',
    name: { en: 'Wreck Cay reefs', zh: '沉舟礁' },
    x: -7.2,
    z: -29.5,
    radius: 1.5,
    region: 'Wreck Cay',
    methods: ['harpoon', 'cage'],
    fish: ['fish-wreck-bass', 'fish-swordfish', 'fish-lobster', 'fish-tuna'],
  },
] as const

const FISH_BY_ID = new Map(HARBOR_FISH_CATALOG.map((f) => [f.id, f]))
const TOOL_BY_ID = new Map(HARBOR_FISH_TOOLS.map((t) => [t.id, t]))
const BAIT_BY_ID = new Map(HARBOR_FISH_BAITS.map((b) => [b.id, b]))
const SPOT_BY_ID = new Map(GUAN_FISH_SPOTS.map((s) => [s.id, s]))

export function harborFishById(id: string): HarborFishDef | undefined {
  return FISH_BY_ID.get(id as HarborFishId)
}
export function harborFishToolById(id: string): HarborFishToolDef | undefined {
  return TOOL_BY_ID.get(id as HarborFishToolId)
}
export function harborFishBaitById(id: string): HarborBaitDef | undefined {
  return BAIT_BY_ID.get(id as HarborBaitId)
}
export function harborFishSpotById(id: string): HarborFishSpotDef | undefined {
  return SPOT_BY_ID.get(id as HarborFishSpotId)
}

/** Classic-ish curve: ~week to high 70s with daily casts; soft cap toward 99. */
export function fishingXpToLevel(xp: number): number {
  const x = Math.max(0, xp)
  // Inverse of ~45 * L^2
  return Math.min(99, Math.max(1, Math.floor(Math.sqrt(x / 45) + 1)))
}

export function fishingXpForLevel(level: number): number {
  const L = Math.max(1, Math.min(99, Math.floor(level)))
  return Math.floor(45 * (L - 1) * (L - 1))
}

export type HarborFishingBag = {
  tools: HarborFishToolId[]
  bait: Partial<Record<HarborBaitId, number>>
  fish: Partial<Record<HarborFishId, number>>
  /** First-catch collection log. */
  log: HarborFishId[]
  fishingXp: number
  equippedTool: HarborFishToolId
  equippedBait: HarborBaitId
}

export function emptyHarborFishingBag(): HarborFishingBag {
  return {
    tools: ['tool-net'],
    bait: { 'bait-none': 0, 'bait-rice': 20 },
    fish: {},
    log: [],
    fishingXp: 0,
    equippedTool: 'tool-net',
    equippedBait: 'bait-rice',
  }
}

export function sanitizeHarborFishingBag(raw: unknown): HarborFishingBag {
  const base = emptyHarborFishingBag()
  if (!raw || typeof raw !== 'object') return base
  const o = raw as Record<string, unknown>
  const tools: HarborFishToolId[] = ['tool-net']
  if (Array.isArray(o.tools)) {
    for (const id of o.tools) {
      if (typeof id === 'string' && TOOL_BY_ID.has(id as HarborFishToolId) && !tools.includes(id as HarborFishToolId)) {
        tools.push(id as HarborFishToolId)
      }
    }
  }
  const bait: Partial<Record<HarborBaitId, number>> = { 'bait-none': 0 }
  if (o.bait && typeof o.bait === 'object' && !Array.isArray(o.bait)) {
    for (const [k, v] of Object.entries(o.bait as Record<string, unknown>)) {
      if (!BAIT_BY_ID.has(k as HarborBaitId)) continue
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) continue
      bait[k as HarborBaitId] = Math.min(Math.floor(v), 50_000)
    }
  }
  const fish: Partial<Record<HarborFishId, number>> = {}
  if (o.fish && typeof o.fish === 'object' && !Array.isArray(o.fish)) {
    for (const [k, v] of Object.entries(o.fish as Record<string, unknown>)) {
      if (!FISH_BY_ID.has(k as HarborFishId)) continue
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) continue
      fish[k as HarborFishId] = Math.min(Math.floor(v), 50_000)
    }
  }
  const log: HarborFishId[] = []
  if (Array.isArray(o.log)) {
    for (const id of o.log) {
      if (typeof id === 'string' && FISH_BY_ID.has(id as HarborFishId) && !log.includes(id as HarborFishId)) {
        log.push(id as HarborFishId)
      }
    }
  }
  const fishingXp =
    typeof o.fishingXp === 'number' && Number.isFinite(o.fishingXp) && o.fishingXp >= 0
      ? Math.min(Math.floor(o.fishingXp), 20_000_000)
      : 0
  const equippedTool =
    typeof o.equippedTool === 'string' && tools.includes(o.equippedTool as HarborFishToolId)
      ? (o.equippedTool as HarborFishToolId)
      : 'tool-net'
  let equippedBait: HarborBaitId = 'bait-rice'
  if (typeof o.equippedBait === 'string' && BAIT_BY_ID.has(o.equippedBait as HarborBaitId)) {
    equippedBait = o.equippedBait as HarborBaitId
  }
  return { tools, bait, fish, log, fishingXp, equippedTool, equippedBait }
}

export function mergeHarborFishingBag(a: HarborFishingBag, b: HarborFishingBag): HarborFishingBag {
  const tools = [...new Set([...a.tools, ...b.tools])] as HarborFishToolId[]
  const bait: Partial<Record<HarborBaitId, number>> = { ...a.bait }
  for (const [k, v] of Object.entries(b.bait)) {
    const id = k as HarborBaitId
    bait[id] = Math.max(bait[id] ?? 0, v ?? 0)
  }
  const fish: Partial<Record<HarborFishId, number>> = { ...a.fish }
  for (const [k, v] of Object.entries(b.fish)) {
    const id = k as HarborFishId
    fish[id] = Math.max(fish[id] ?? 0, v ?? 0)
  }
  const log = [...new Set([...a.log, ...b.log])] as HarborFishId[]
  const fishingXp = Math.max(a.fishingXp, b.fishingXp)
  const equippedTool = tools.includes(b.equippedTool) ? b.equippedTool : a.equippedTool
  const equippedBait = b.equippedBait || a.equippedBait
  return { tools, bait, fish, log, fishingXp, equippedTool, equippedBait }
}

export function nearestGuanFishSpot(x: number, z: number, maxDist = 2.2): HarborFishSpotDef | null {
  let best: HarborFishSpotDef | null = null
  let bestD = maxDist
  for (const s of GUAN_FISH_SPOTS) {
    const d = Math.hypot(s.x - x, s.z - z)
    if (d < Math.max(bestD, s.radius)) {
      bestD = d
      best = s
    }
  }
  return best
}

export type HarborFishCastResult =
  | { ok: true; fish: HarborFishDef; bag: HarborFishingBag; message: string }
  | { ok: false; bag: HarborFishingBag; message: string }

/** Attempt one cast at a spot. Mutates a copy of bag. */
export function attemptHarborFishCast(
  bagIn: HarborFishingBag,
  spotId: HarborFishSpotId,
  rng: () => number = Math.random,
): HarborFishCastResult {
  const bag = sanitizeHarborFishingBag(structuredClone(bagIn))
  const spot = harborFishSpotById(spotId)
  if (!spot) return { ok: false, bag, message: 'No fishing spot here.' }
  const tool = harborFishToolById(bag.equippedTool)
  if (!tool) return { ok: false, bag, message: 'Equip a fishing tool at the lodge.' }
  if (!spot.methods.includes(tool.method)) {
    return { ok: false, bag, message: `${tool.name.en} cannot work this spot.` }
  }
  const level = fishingXpToLevel(bag.fishingXp)
  if (level < tool.level) {
    return { ok: false, bag, message: `Need Fishing ${tool.level} for ${tool.name.en}.` }
  }

  const needBait = tool.method === 'bait' || tool.method === 'lure'
  const baitId = needBait ? bag.equippedBait : 'bait-none'
  if (needBait) {
    const bait = harborFishBaitById(baitId)
    if (!bait || baitId === 'bait-none') {
      return { ok: false, bag, message: 'Select bait at the lodge.' }
    }
    const have = bag.bait[baitId] ?? 0
    if (have < 1) return { ok: false, bag, message: `Out of ${bait.name.en}.` }
  }

  const candidates = spot.fish
    .map((id) => harborFishById(id))
    .filter((f): f is HarborFishDef => Boolean(f))
    .filter((f) => f.method === tool.method)
    .filter((f) => (needBait ? f.bait === baitId : f.bait === 'bait-none' || f.bait === baitId))
    .filter((f) => level >= f.level)

  if (!candidates.length) {
    return { ok: false, bag, message: 'Nothing bites with this setup.' }
  }

  // Consume bait on attempt
  if (needBait && baitId !== 'bait-none') {
    bag.bait[baitId] = Math.max(0, (bag.bait[baitId] ?? 0) - 1)
  }

  // ~70% success at level; rises toward 92%
  const chance = Math.min(0.92, 0.55 + level * 0.005)
  if (rng() > chance) {
    return { ok: false, bag, message: 'The line goes slack…' }
  }

  const totalW = candidates.reduce((s, f) => s + f.weight, 0)
  let roll = rng() * totalW
  let caught = candidates[0]!
  for (const f of candidates) {
    roll -= f.weight
    if (roll <= 0) {
      caught = f
      break
    }
  }

  bag.fish[caught.id] = (bag.fish[caught.id] ?? 0) + 1
  bag.fishingXp += caught.xp
  if (!bag.log.includes(caught.id)) bag.log.push(caught.id)

  return {
    ok: true,
    fish: caught,
    bag,
    message: `Caught ${caught.name.en} · +${caught.xp} Fishing XP`,
  }
}

export function sellHarborFish(
  bagIn: HarborFishingBag,
  fishId: HarborFishId,
  qty: number,
): { bag: HarborFishingBag; coins: number; sold: number } {
  const bag = sanitizeHarborFishingBag(structuredClone(bagIn))
  const def = harborFishById(fishId)
  if (!def) return { bag, coins: 0, sold: 0 }
  const have = bag.fish[fishId] ?? 0
  const sold = Math.max(0, Math.min(have, Math.floor(qty)))
  if (sold < 1) return { bag, coins: 0, sold: 0 }
  bag.fish[fishId] = have - sold
  if ((bag.fish[fishId] ?? 0) <= 0) delete bag.fish[fishId]
  return { bag, coins: sold * def.value, sold }
}

export function buyHarborFishTool(
  bagIn: HarborFishingBag,
  toolId: HarborFishToolId,
  coins: number,
): { ok: true; bag: HarborFishingBag; coins: number } | { ok: false; message: string } {
  const bag = sanitizeHarborFishingBag(structuredClone(bagIn))
  const tool = harborFishToolById(toolId)
  if (!tool) return { ok: false, message: 'Unknown tool.' }
  if (bag.tools.includes(toolId)) return { ok: false, message: 'Already owned.' }
  const level = fishingXpToLevel(bag.fishingXp)
  if (level < tool.level) return { ok: false, message: `Need Fishing ${tool.level}.` }
  if (coins < tool.price) return { ok: false, message: 'Not enough ferry coins.' }
  bag.tools.push(toolId)
  bag.equippedTool = toolId
  return { ok: true, bag, coins: coins - tool.price }
}

export function buyHarborFishBait(
  bagIn: HarborFishingBag,
  baitId: HarborBaitId,
  coins: number,
): { ok: true; bag: HarborFishingBag; coins: number } | { ok: false; message: string } {
  const bag = sanitizeHarborFishingBag(structuredClone(bagIn))
  const bait = harborFishBaitById(baitId)
  if (!bait || baitId === 'bait-none') return { ok: false, message: 'Cannot buy that.' }
  if (coins < bait.price) return { ok: false, message: 'Not enough ferry coins.' }
  bag.bait[baitId] = (bag.bait[baitId] ?? 0) + bait.pack
  bag.equippedBait = baitId
  return { ok: true, bag, coins: coins - bait.price }
}

/** Satellite island defs for Guan expansion (unique biomes). */
export const GUAN_SATELLITE_ISLANDS = [
  {
    id: 'pearl-cay',
    name: { en: 'Pearl Cay', zh: '珠嶼' },
    x: 22.0,
    z: 6.5,
    r: 3.4,
    biome: 'coral' as const,
  },
  {
    id: 'mist-atoll',
    name: { en: 'Mist Atoll', zh: '霧嶼' },
    x: -23.5,
    z: 5.0,
    r: 3.6,
    biome: 'mist' as const,
  },
  {
    id: 'jade-skerry',
    name: { en: 'Jade Skerry', zh: '玉磯' },
    x: 19.5,
    z: -16.5,
    r: 3.2,
    biome: 'jade' as const,
  },
  {
    id: 'ember-shoal',
    name: { en: 'Ember Shoal', zh: '焰灘' },
    x: -21.0,
    z: -18.5,
    r: 3.3,
    biome: 'ember' as const,
  },
  {
    id: 'reed-key',
    name: { en: 'Reed Key', zh: '蘆鑰' },
    x: 4.5,
    z: 26.5,
    r: 3.0,
    biome: 'reed' as const,
  },
  {
    id: 'wreck-cay',
    name: { en: 'Wreck Cay', zh: '沉舟嶼' },
    x: -6.0,
    z: -28.0,
    r: 3.1,
    biome: 'wreck' as const,
  },
] as const
