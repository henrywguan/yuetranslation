/**
 * HarborRPG progress bag — nested under HarborProgress.
 * Soft client meters; max 2 characters; does not touch pedagogy XP/leaderboard.
 */
import {
  HARBOR_DEFAULT_APPEARANCE,
  sanitizeHarborAppearance,
  sanitizeHarborGender,
  type HarborAppearance,
  type HarborGender,
} from './harborAppearance'

export const HARBOR_RPG_MAX_CHARS = 2
export const HARBOR_RPG_SHRINE_XP = 25
export const HARBOR_RPG_DUMMY_GOLD = 3

/** Starter cosmetic ids (procedural / kit placeholders). */
export const HARBOR_RPG_COSMETICS = [
  'rpg-cloak-traveler',
  'rpg-cloak-jade',
  'rpg-helm-leather',
  'rpg-helm-bronze',
  'rpg-cape-ember',
] as const

export type HarborRpgCosmeticId = (typeof HARBOR_RPG_COSMETICS)[number]

export type HarborRpgCharacter = {
  id: string
  name: string
  gender: HarborGender
  appearance: HarborAppearance
  createdAt: number
}

export type HarborRpgBoosts = {
  /** Soft XP multiplier expiry (ms epoch). 0 = inactive. */
  xpMultUntil: number
  /** Soft credit/gold multiplier expiry (ms epoch). 0 = inactive. */
  creditMultUntil: number
}

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
}

const COSMETIC_SET = new Set<string>(HARBOR_RPG_COSMETICS)

export function emptyHarborRpgBag(): HarborRpgBag {
  return {
    characters: [],
    activeCharacterId: null,
    xp: 0,
    gold: 0,
    ownedCosmetics: ['rpg-cloak-traveler'],
    equippedCosmetic: 'rpg-cloak-traveler',
    boosts: { xpMultUntil: 0, creditMultUntil: 0 },
    shrineClaims: 0,
    dummyKills: 0,
  }
}

export function harborRpgLevelFromXp(xp: number): number {
  const n = Math.max(0, Math.floor(xp))
  // Soft curve — Lv1 at 0, +1 every ~100 XP early game
  return 1 + Math.floor(Math.sqrt(n / 25))
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
  let equippedCosmetic: string | null =
    typeof o.equippedCosmetic === 'string' && owned.has(o.equippedCosmetic)
      ? o.equippedCosmetic
      : 'rpg-cloak-traveler'

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
  }
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
  }
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
