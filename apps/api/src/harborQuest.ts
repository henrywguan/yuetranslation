import type { Response } from 'express'
import type { AuthedRequest } from './auth.js'
import { requireAuth } from './auth.js'
import { env } from './env.js'
import { allowUserRateOrReject } from './guestRateLimit.js'
import { applyCosmeticGift, type HarborGiftKind } from './harborGift.js'
import { getMembershipForUser } from './household.js'
import { getAdmin, getProfile } from './supabase.js'
import { addHarborQuestCount } from './usage.js'

const HARBOR_ERR = 'Harbor Quest sync failed. Please try again.'

export type HarborQuestProgress = {
  cleared: string[]
  stepCursor: Record<string, number>
  correctCount: number
  /** Arena gold from Match the Definition (lifetime). */
  gold: number
  /** Experience points (lifetime). */
  xp: number
  /** Times each mission/pier has been completed. */
  missionClears: Record<string, number>
  coins: number
  owned: string[]
  banked: string[]
  look: {
    hat: string
    top: string
    bottom: string
    shoes: string
    hand: string
    boat: string
    lantern: string
  }
  lastSavedAt: number
  characterCreated?: boolean
  gender?: 'male' | 'female'
  appearance?: {
    skinTone: number
    hairStyle: string
    hairColor: number
  }
  localUsername?: string | null
  /** Cosmetic titles owned (giftable). */
  ownedTitles?: string[]
  /** Equipped title. */
  titleId?: string | null
  /** Guan fishing bag (tools, bait, fish, log, XP). */
  fishing?: {
    tools: string[]
    bait: Record<string, number>
    fish: Record<string, number>
    log: string[]
    fishingXp: number
    equippedTool: string
    equippedBait: string
  }
  /** Unlocked beauty salon SKUs (premium dyes / rare styles). */
  beautyOwned?: string[]
  /** Showoff cosmetics — nametag, bubble, chair, pet, emotes + event claims. */
  showoff?: {
    owned: string[]
    look: {
      nametag: string
      bubble: string
      chair: string
      pet: string
      emote: string | null
    }
    claimedEvents: string[]
  }
  /**
   * HarborRPG soft bag — max 2 chars, soft XP/gold/cosmetics.
   * Does not inflate pedagogy leaderboard XP.
   */
  rpg?: {
    characters: {
      id: string
      name: string
      gender: 'male' | 'female'
      appearance: { skinTone: number; hairStyle: string; hairColor: number }
      createdAt: number
    }[]
    activeCharacterId: string | null
    xp: number
    gold: number
    ownedCosmetics: string[]
    equippedCosmetic: string | null
    equippedLooks?: {
      body: string | null
      head: string | null
      shoulder: string | null
      back: string | null
    }
    boosts: { xpMultUntil: number; creditMultUntil: number }
    shrineClaims: number
    dummyKills: number
    zone?: string
    inventory?: { id: string; qty: number }[]
    bank?: { id: string; qty: number }[]
    gear?: Record<string, string | null>
    equippedWeapon?: string | null
    equippedArmor?: string | null
    quests?: { id: string; progress: number; complete: boolean; claimed: boolean }[]
    kills?: Record<string, number>
    companionUntil?: number
    companionName?: string | null
    professions?: Record<string, number>
    market?: {
      id: string
      sellerId: string
      sellerName: string
      itemId: string
      qty: number
      price: number
      createdAt: number
    }[]
    classId?: string | null
    specId?: string | null
    classXp?: number
    prestige?: number
    skillXp?: Record<string, number>
    talents?: Record<string, number>
    skillBar?: string[]
    difficulty?: string
    ownedMounts?: string[]
    activeMountId?: string | null
    unlockedTitles?: string[]
    activeTitleId?: string | null
    friends?: string[]
    afk?: boolean
    afkNote?: string
    fleetName?: string | null
    fleetMotto?: string
    inbox?: { id: string; from: string; subject: string; body: string; gold: number; read: boolean; t: number }[]
    claimedDeeds?: string[]
    delveFloor?: number
    delveBest?: number
    delveMark?: number
    riftClears?: number
    riftMark?: number
    raceBestMs?: number | null
    raceRuns?: number
    raceStep?: number
    fleetRank?: string
    fleetBank?: { id: string; qty: number }[]
    fleetPledges?: { id: string; text: string; by: string; t: number }[]
    whispers?: { id: string; from: string; body: string; t: number; read: boolean }[]
    duel?: { foe: string; phase: string; selfHp: number; foeHp: number } | null
    riftSeed?: number
    worldDay?: string
    worldWeek?: string
    worldKillMark?: Record<string, number>
    worldClaims?: string[]
    worldVisits?: string[]
    tideChart?: { zone: string; x: number; z: number; dug: boolean } | null
    loadoutB?: { specId: string | null; talents: Record<string, number>; skillBar: string[] } | null
    activeLoadout?: string
    buffs?: { id: string; until: number }[]
  }
}

export type HarborLeaderboardEntry = {
  rank: number
  userId: string
  displayName: string
  xp: number
  gold: number
  correctCount: number
  clearedCount: number
  isYou?: boolean
}

const DEFAULT_LOOK = {
  hat: 'hat-straw',
  top: 'top-harbor',
  bottom: 'bottom-travel',
  shoes: 'shoes-leather',
  hand: 'hand-none',
  boat: 'boat-canoe',
  lantern: 'lantern-paper-amber',
} as const

const STARTER_OWNED = Object.values(DEFAULT_LOOK)

const KNOWN_GEAR = new Set([
  'hat-straw','hat-bamboo','hat-scholar','hat-fisherman','hat-festival','top-harbor','top-jade','top-merchant','top-ferry','top-night','bottom-travel','bottom-slate','bottom-reed','bottom-crimson','bottom-ink','shoes-leather','shoes-straw','shoes-lacquer','shoes-jade','shoes-storm','hand-none','hand-fan','hand-lantern','hand-oar','hand-scroll','boat-canoe','boat-reed','boat-bamboo','boat-sampan','boat-barge','boat-junk','boat-scholar','boat-merchant','boat-jade','boat-dragon','boat-pearl','boat-imperial','lantern-paper-amber','lantern-paper-crimson','lantern-paper-jade','lantern-silk-gold','lantern-silk-azure','lantern-oil-iron','lantern-glass-ruby','lantern-glass-sapphire','lantern-porcelain','lantern-phoenix','lantern-dragon','lantern-starlight',
])

const EMPTY: HarborQuestProgress = {
  cleared: [],
  stepCursor: {},
  correctCount: 0,
  gold: 0,
  xp: 0,
  missionClears: {},
  coins: 40,
  owned: [...STARTER_OWNED],
  banked: [],
  look: { ...DEFAULT_LOOK },
  lastSavedAt: 0,
  fishing: {
    tools: ['tool-net'],
    bait: { 'bait-none': 0, 'bait-rice': 20 },
    fish: {},
    log: [],
    fishingXp: 0,
    equippedTool: 'tool-net',
    equippedBait: 'bait-rice',
  },
}

const KNOWN_FISH_TOOLS = new Set([
  'tool-net',
  'tool-rod',
  'tool-fly',
  'tool-harpoon',
  'tool-cage',
  'tool-heavy-cage',
])
const KNOWN_FISH_BAITS = new Set(['bait-none', 'bait-rice', 'bait-feather', 'bait-worm', 'bait-paste'])
const KNOWN_FISH = new Set([
  'fish-shrimp',
  'fish-anchovy',
  'fish-sardine',
  'fish-herring',
  'fish-trout',
  'fish-salmon',
  'fish-tuna',
  'fish-lobster',
  'fish-swordfish',
  'fish-shark',
  'fish-oyster',
  'fish-ash-crab',
  'fish-mist-eel',
  'fish-jade-carp',
  'fish-reed-perch',
  'fish-wreck-bass',
])

function sanitizeFishing(raw: unknown): NonNullable<HarborQuestProgress['fishing']> {
  const base = EMPTY.fishing!
  if (!raw || typeof raw !== 'object') return { ...base, bait: { ...base.bait }, fish: {}, log: [], tools: [...base.tools] }
  const o = raw as Record<string, unknown>
  const tools = ['tool-net']
  if (Array.isArray(o.tools)) {
    for (const id of o.tools) {
      if (typeof id === 'string' && KNOWN_FISH_TOOLS.has(id) && !tools.includes(id)) tools.push(id)
    }
  }
  const bait: Record<string, number> = { 'bait-none': 0 }
  if (o.bait && typeof o.bait === 'object' && !Array.isArray(o.bait)) {
    for (const [k, v] of Object.entries(o.bait as Record<string, unknown>)) {
      if (!KNOWN_FISH_BAITS.has(k)) continue
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) continue
      bait[k] = Math.min(Math.floor(v), 50_000)
    }
  }
  const fish: Record<string, number> = {}
  if (o.fish && typeof o.fish === 'object' && !Array.isArray(o.fish)) {
    for (const [k, v] of Object.entries(o.fish as Record<string, unknown>)) {
      if (!KNOWN_FISH.has(k)) continue
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) continue
      fish[k] = Math.min(Math.floor(v), 50_000)
    }
  }
  const log: string[] = []
  if (Array.isArray(o.log)) {
    for (const id of o.log) {
      if (typeof id === 'string' && KNOWN_FISH.has(id) && !log.includes(id)) log.push(id)
    }
  }
  const fishingXp =
    typeof o.fishingXp === 'number' && Number.isFinite(o.fishingXp) && o.fishingXp >= 0
      ? Math.min(Math.floor(o.fishingXp), 20_000_000)
      : 0
  const equippedTool =
    typeof o.equippedTool === 'string' && tools.includes(o.equippedTool) ? o.equippedTool : 'tool-net'
  const equippedBait =
    typeof o.equippedBait === 'string' && KNOWN_FISH_BAITS.has(o.equippedBait)
      ? o.equippedBait
      : 'bait-rice'
  return { tools, bait, fish, log, fishingXp, equippedTool, equippedBait }
}

const KNOWN_SHOWOFF = new Set([
  'tag-plain',
  'tag-jade',
  'tag-ink',
  'tag-phoenix',
  'tag-lantern-fest',
  'bubble-plain',
  'bubble-jade',
  'bubble-phoenix',
  'bubble-midautumn',
  'chair-stool',
  'chair-bamboo',
  'chair-jade-throne',
  'chair-dragonboat',
  'pet-none',
  'pet-river-cat',
  'pet-jade-carp',
  'pet-lantern-fox',
  'emote-wave',
  'emote-bow',
  'emote-clap',
  'emote-lantern-raise',
  'emote-phoenix-spin',
])
const KNOWN_EVENTS = new Set(['event-lantern-fest', 'event-midautumn', 'event-dragonboat'])
const DEFAULT_SHOWOFF_LOOK = {
  nametag: 'tag-plain',
  bubble: 'bubble-plain',
  chair: 'chair-stool',
  pet: 'pet-none',
  emote: null as string | null,
}
const STARTER_SHOWOFF = [
  'tag-plain',
  'bubble-plain',
  'chair-stool',
  'pet-none',
  'emote-wave',
  'emote-bow',
]

function isBeautySkuId(id: string): boolean {
  return (
    id.startsWith('beauty-hair-') ||
    id.startsWith('beauty-dye-hair-') ||
    id.startsWith('beauty-eye-') ||
    id.startsWith('beauty-dye-eye-') ||
    id.startsWith('beauty-face-')
  ) && id.length < 64
}

function sanitizeBeautyOwned(raw: unknown): string[] {
  const out = new Set<string>()
  if (!Array.isArray(raw)) return []
  for (const id of raw) {
    if (typeof id !== 'string' || !isBeautySkuId(id)) continue
    out.add(id)
    if (out.size >= 80) break
  }
  return [...out]
}

function sanitizeShowoff(raw: unknown): NonNullable<HarborQuestProgress['showoff']> {
  const owned = new Set<string>(STARTER_SHOWOFF)
  const look = { ...DEFAULT_SHOWOFF_LOOK }
  const claimedEvents: string[] = []
  if (!raw || typeof raw !== 'object') {
    return { owned: [...owned], look, claimedEvents }
  }
  const o = raw as Record<string, unknown>
  if (Array.isArray(o.owned)) {
    for (const id of o.owned) {
      if (typeof id === 'string' && KNOWN_SHOWOFF.has(id)) owned.add(id)
    }
  }
  if (o.look && typeof o.look === 'object' && !Array.isArray(o.look)) {
    const L = o.look as Record<string, unknown>
    for (const key of ['nametag', 'bubble', 'chair', 'pet'] as const) {
      const id = L[key]
      if (typeof id === 'string' && owned.has(id) && KNOWN_SHOWOFF.has(id)) look[key] = id
    }
    if (typeof L.emote === 'string' && KNOWN_SHOWOFF.has(L.emote) && owned.has(L.emote)) {
      look.emote = L.emote
    } else {
      look.emote = null
    }
  }
  if (Array.isArray(o.claimedEvents)) {
    for (const id of o.claimedEvents) {
      if (typeof id === 'string' && KNOWN_EVENTS.has(id) && !claimedEvents.includes(id)) {
        claimedEvents.push(id)
      }
    }
  }
  return { owned: [...owned], look, claimedEvents }
}

const HARBOR_RPG_MAX_CHARS = 2
const HARBOR_RPG_COSMETICS = new Set([
  'rpg-cloak-traveler',
  'rpg-cloak-jade',
  'rpg-helm-leather',
  'rpg-helm-bronze',
  'rpg-cape-ember',
  // Quaternius Modular Outfits Fantasy (CC0)
  'rpg-outfit-ranger-m',
  'rpg-outfit-ranger-f',
  'rpg-outfit-peasant-m',
  'rpg-outfit-peasant-f',
  'rpg-outfit-ranger-m-3',
  'rpg-outfit-ranger-f-3',
  'rpg-outfit-peasant-m-2',
  'rpg-outfit-peasant-f-2',
  'rpg-hood-ranger-m',
  'rpg-hood-ranger-f',
  'rpg-pauldron-ranger-m',
  'rpg-pauldrons-ranger-f',
])
const HARBOR_RPG_ITEMS = new Set([
  'rpg-item-herb','rpg-item-bone','rpg-item-shard','rpg-item-hide','rpg-item-ore','rpg-item-reed','rpg-item-ash-core',
  'rpg-item-pearl','rpg-item-silk','rpg-item-tide-coin','rpg-item-heroic-seal',
  'rpg-potion-heal','rpg-potion-might','rpg-potion-mana',
  'rpg-weapon-stick','rpg-weapon-blade','rpg-weapon-ash','rpg-weapon-tide','rpg-weapon-sovereign',
  'rpg-offhand-buckler','rpg-offhand-tome','rpg-offhand-lantern',
  'rpg-armor-cloth','rpg-armor-leather','rpg-armor-mail','rpg-armor-jade','rpg-armor-sovereign',
  'rpg-head-hood','rpg-head-helm','rpg-legs-wraps','rpg-legs-greaves','rpg-feet-sandals','rpg-feet-boots',
  'rpg-ring-jade','rpg-ring-tide','rpg-trinket-lantern','rpg-trinket-compass','rpg-trinket-chronometer',
])
const HARBOR_RPG_ZONES = new Set([
  'meadow','pinewood','ruins','marsh','town','crypt','tidehollow','chronicle','echoisle','tideraid',
  'ashreach','moonpier','rift','delve',
])
const HARBOR_RPG_QUEST_IDS = new Set([
  'quest-slime-hunt','quest-meadow-bones','quest-meadow-herbs','quest-meadow-wolves',
  'quest-wolf-pelts','quest-pine-hide','quest-pine-ore','quest-pine-slimes','quest-pine-pack',
  'quest-ruin-shards','quest-ruin-bandits','quest-ruin-golem','quest-ruin-ore','quest-ruin-patrol',
  'quest-marsh-toads','quest-marsh-reeds','quest-marsh-slimes','quest-marsh-herbs','quest-marsh-gate',
  'quest-first-craft','quest-town-mana','quest-town-smith','quest-town-mail','quest-town-coins',
  'quest-crypt-warden','quest-crypt-wraiths','quest-crypt-core',
  'quest-tide-pearl','quest-tide-thralls','quest-tide-pearls',
  'quest-chronicle-ink','quest-chronicle-shades','quest-chronicle-silk',
  'quest-echo-mirror','quest-echo-twins','quest-echo-pearl',
  'quest-raid-herald','quest-raid-depth','quest-raid-sovereign','quest-raid-seal',
])
const HARBOR_RPG_MONSTERS = new Set([
  'slime','wolf','bandit','golem','toad','wraith','crypt-boss',
  'tide-thrall','tide-boss','ink-shade','chronicle-boss','echo-twin','echo-boss',
  'raid-herald','raid-depth','raid-sovereign','world-colossus',
])
const HARBOR_RPG_DIFFICULTIES = new Set(['normal', 'heroic'])
const HARBOR_RPG_MOUNTS = new Set([
  'horse','horse-white','deer','donkey','stag','fox','husky','shiba','wolf','alpaca','bull','cow',
  'farm-horse','farm-dog','farm-pig','farm-sheep','farm-wolf','farm-cat','farm-chicken','farm-raccoon',
  'corgi','goat','boar','rhino','hippo','platypus','red-panda','duck','owl','seal',
])
const HARBOR_RPG_GEAR_SLOTS = ['weapon','offhand','head','chest','legs','feet','ring','trinket'] as const
const HARBOR_RPG_PROFESSIONS = ['herbalism','mining','alchemy','smithing'] as const
const HARBOR_RPG_CLASS_IDS = new Set([
  'tideblade','reedshadow','lanternmancer','jadeheart','ashbound','starferry',
  'ironoar','mistweaver','chopwright',
])
const HARBOR_RPG_SPEC_IDS = new Set([
  ...['tideblade','reedshadow','lanternmancer','jadeheart','ashbound','starferry','ironoar','mistweaver','chopwright'].flatMap(
    (c) => [`${c}-offense`, `${c}-ward`, `${c}-voyage`],
  ),
])
const HARBOR_RPG_SKILL_PREFIX = /^(tb|rs|lm|jh|ab|sf|io|mw|cw)-[a-z0-9-]+$/i
const HARBOR_RPG_TALENT_PREFIX = /^(tb|rs|lm|jh|ab|sf|io|mw|cw)-(o|w|v)\d$/i

function sanitizeRpgInv(raw: unknown, max: number): { id: string; qty: number }[] {
  const inventory: { id: string; qty: number }[] = []
  if (!Array.isArray(raw)) return inventory
  for (const row of raw) {
    if (inventory.length >= max) break
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    if (typeof r.id !== 'string' || !HARBOR_RPG_ITEMS.has(r.id)) continue
    const qty = typeof r.qty === 'number' && Number.isFinite(r.qty) && r.qty > 0 ? Math.min(Math.floor(r.qty), 999) : 0
    if (qty <= 0) continue
    inventory.push({ id: r.id, qty })
  }
  return inventory
}

function sanitizeRpg(raw: unknown): NonNullable<HarborQuestProgress['rpg']> {
  const empty = {
    characters: [] as NonNullable<HarborQuestProgress['rpg']>['characters'],
    activeCharacterId: null as string | null,
    xp: 0,
    gold: 0,
    ownedCosmetics: ['rpg-cloak-traveler'],
    equippedCosmetic: null as string | null,
    equippedLooks: {
      body: null as string | null,
      head: null as string | null,
      shoulder: null as string | null,
      back: 'rpg-cloak-traveler' as string | null,
    },
    boosts: { xpMultUntil: 0, creditMultUntil: 0 },
    shrineClaims: 0,
    dummyKills: 0,
    zone: 'meadow',
    inventory: [] as { id: string; qty: number }[],
    bank: [] as { id: string; qty: number }[],
    gear: {
      weapon: null,
      offhand: null,
      head: null,
      chest: null,
      legs: null,
      feet: null,
      ring: null,
      trinket: null,
    } as Record<string, string | null>,
    equippedWeapon: null as string | null,
    equippedArmor: null as string | null,
    quests: [] as { id: string; progress: number; complete: boolean; claimed: boolean }[],
    kills: {} as Record<string, number>,
    companionUntil: 0,
    companionName: null as string | null,
    professions: { herbalism: 0, mining: 0, alchemy: 0, smithing: 0 } as Record<string, number>,
    market: [] as NonNullable<NonNullable<HarborQuestProgress['rpg']>['market']>,
    classId: null as string | null,
    specId: null as string | null,
    classXp: 0,
    prestige: 0,
    skillXp: {} as Record<string, number>,
    talents: {} as Record<string, number>,
    skillBar: [] as string[],
    difficulty: 'normal' as 'normal' | 'heroic',
    ownedMounts: ['horse'] as string[],
    activeMountId: null as string | null,
    unlockedTitles: [] as string[],
    activeTitleId: null as string | null,
    friends: [] as string[],
    afk: false,
    afkNote: '',
    fleetName: null as string | null,
    fleetMotto: '',
    inbox: [] as { id: string; from: string; subject: string; body: string; gold: number; read: boolean; t: number }[],
    claimedDeeds: [] as string[],
    delveFloor: 1,
    delveBest: 0,
    delveMark: 0,
    riftClears: 0,
    riftMark: 0,
    raceBestMs: null as number | null,
    raceRuns: 0,
    raceStep: 0,
    fleetRank: 'member',
    fleetBank: [] as { id: string; qty: number }[],
    fleetPledges: [] as { id: string; text: string; by: string; t: number }[],
    whispers: [] as { id: string; from: string; body: string; t: number; read: boolean }[],
    duel: null as { foe: string; phase: string; selfHp: number; foeHp: number } | null,
    riftSeed: 1,
    worldDay: '',
    worldWeek: '',
    worldKillMark: {} as Record<string, number>,
    worldClaims: [] as string[],
    worldVisits: [] as string[],
    tideChart: null as { zone: string; x: number; z: number; dug: boolean } | null,
    loadoutB: null as { specId: string | null; talents: Record<string, number>; skillBar: string[] } | null,
    activeLoadout: 'a',
    buffs: [] as { id: string; until: number }[],
  }
  if (!raw || typeof raw !== 'object') return empty
  const o = raw as Record<string, unknown>
  const characters: NonNullable<HarborQuestProgress['rpg']>['characters'] = []
  const seen = new Set<string>()
  if (Array.isArray(o.characters)) {
    for (const row of o.characters) {
      if (characters.length >= HARBOR_RPG_MAX_CHARS) break
      if (!row || typeof row !== 'object') continue
      const c = row as Record<string, unknown>
      if (typeof c.id !== 'string' || !/^rpg-[a-z0-9-]+$/i.test(c.id.trim().slice(0, 40))) continue
      const id = c.id.trim().slice(0, 40)
      if (seen.has(id)) continue
      seen.add(id)
      const name =
        typeof c.name === 'string' && c.name.trim() ? c.name.trim().slice(0, 20) : 'Adventurer'
      const gender = c.gender === 'female' ? 'female' : 'male'
      const app =
        c.appearance && typeof c.appearance === 'object'
          ? (c.appearance as Record<string, unknown>)
          : {}
      const skinTone =
        typeof app.skinTone === 'number' && Number.isFinite(app.skinTone)
          ? Math.min(Math.max(Math.floor(app.skinTone), 0), 7)
          : 2
      const hairStyle =
        typeof app.hairStyle === 'string' && app.hairStyle.length < 40
          ? app.hairStyle
          : 'short'
      const hairColor =
        typeof app.hairColor === 'number' && Number.isFinite(app.hairColor)
          ? Math.floor(app.hairColor)
          : 0x3a2a1a
      const createdAt =
        typeof c.createdAt === 'number' && Number.isFinite(c.createdAt) && c.createdAt >= 0
          ? Math.floor(c.createdAt)
          : Date.now()
      characters.push({
        id,
        name,
        gender,
        appearance: { skinTone, hairStyle, hairColor },
        createdAt,
      })
    }
  }
  let activeCharacterId: string | null =
    typeof o.activeCharacterId === 'string' && /^rpg-[a-z0-9-]+$/i.test(o.activeCharacterId)
      ? o.activeCharacterId.trim().slice(0, 40)
      : null
  if (activeCharacterId && !characters.some((c) => c.id === activeCharacterId)) {
    activeCharacterId = null
  }
  if (!activeCharacterId && characters[0]) activeCharacterId = characters[0].id
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
      if (typeof id === 'string' && HARBOR_RPG_COSMETICS.has(id)) owned.add(id)
    }
  }
  const lookSlots = ['body', 'head', 'shoulder', 'back'] as const
  const lookSlotOf = (id: string) =>
    id.includes('hood') ? 'head'
    : id.includes('pauldron') ? 'shoulder'
    : id.includes('cloak') || id.includes('cape') ? 'back'
    : 'body'
  const equippedLooks = { body: null as string | null, head: null as string | null, shoulder: null as string | null, back: null as string | null }
  const rawLooks = o.equippedLooks && typeof o.equippedLooks === 'object' ? (o.equippedLooks as Record<string, unknown>) : null
  if (rawLooks) {
    for (const slot of lookSlots) {
      const id = rawLooks[slot]
      if (typeof id === 'string' && HARBOR_RPG_COSMETICS.has(id) && owned.has(id) && lookSlotOf(id) === slot) {
        equippedLooks[slot] = id
      }
    }
  }
  if (typeof o.equippedCosmetic === 'string' && HARBOR_RPG_COSMETICS.has(o.equippedCosmetic) && owned.has(o.equippedCosmetic)) {
    const slot = lookSlotOf(o.equippedCosmetic)
    if (!equippedLooks[slot]) equippedLooks[slot] = o.equippedCosmetic
  } else if (o.equippedCosmetic !== null && !rawLooks && owned.has('rpg-cloak-traveler')) {
    if (!equippedLooks.back) equippedLooks.back = 'rpg-cloak-traveler'
  }
  const equippedCosmetic = equippedLooks.body
  const boostsRaw =
    o.boosts && typeof o.boosts === 'object' ? (o.boosts as Record<string, unknown>) : {}
  const boosts = {
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
  const zone = typeof o.zone === 'string' && HARBOR_RPG_ZONES.has(o.zone) ? o.zone : 'meadow'
  const inventory = sanitizeRpgInv(o.inventory, 32)
  const bank = sanitizeRpgInv(o.bank, 40)
  const gear: Record<string, string | null> = {
    weapon: null,
    offhand: null,
    head: null,
    chest: null,
    legs: null,
    feet: null,
    ring: null,
    trinket: null,
  }
  if (o.gear && typeof o.gear === 'object') {
    const g = o.gear as Record<string, unknown>
    for (const slot of HARBOR_RPG_GEAR_SLOTS) {
      const v = g[slot]
      if (typeof v === 'string' && HARBOR_RPG_ITEMS.has(v) && inventory.some((s) => s.id === v)) {
        gear[slot] = v
      }
    }
  }
  const equippedWeapon =
    typeof o.equippedWeapon === 'string' && HARBOR_RPG_ITEMS.has(o.equippedWeapon) && inventory.some((s) => s.id === o.equippedWeapon)
      ? o.equippedWeapon
      : gear.weapon
  const equippedArmor =
    typeof o.equippedArmor === 'string' && HARBOR_RPG_ITEMS.has(o.equippedArmor) && inventory.some((s) => s.id === o.equippedArmor)
      ? o.equippedArmor
      : gear.chest
  if (!gear.weapon && equippedWeapon) gear.weapon = equippedWeapon
  if (!gear.chest && equippedArmor) gear.chest = equippedArmor
  const quests: { id: string; progress: number; complete: boolean; claimed: boolean }[] = []
  if (Array.isArray(o.quests)) {
    for (const row of o.quests) {
      if (!row || typeof row !== 'object') continue
      const r = row as Record<string, unknown>
      if (typeof r.id !== 'string' || !HARBOR_RPG_QUEST_IDS.has(r.id)) continue
      if (quests.some((q) => q.id === r.id)) continue
      const progress = typeof r.progress === 'number' && Number.isFinite(r.progress) && r.progress >= 0 ? Math.min(Math.floor(r.progress), 100) : 0
      quests.push({ id: r.id, progress, complete: r.complete === true, claimed: r.claimed === true })
    }
  }
  const kills: Record<string, number> = {}
  if (o.kills && typeof o.kills === 'object' && !Array.isArray(o.kills)) {
    for (const [k, v] of Object.entries(o.kills as Record<string, unknown>)) {
      if (!HARBOR_RPG_MONSTERS.has(k)) continue
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) continue
      kills[k] = Math.min(Math.floor(v), 1_000_000)
    }
  }
  const companionUntil =
    typeof o.companionUntil === 'number' && Number.isFinite(o.companionUntil)
      ? Math.max(0, Math.floor(o.companionUntil))
      : 0
  const companionName =
    typeof o.companionName === 'string' && o.companionName.trim()
      ? o.companionName.trim().slice(0, 20)
      : null
  const professions: Record<string, number> = { herbalism: 0, mining: 0, alchemy: 0, smithing: 0 }
  if (o.professions && typeof o.professions === 'object') {
    const p = o.professions as Record<string, unknown>
    for (const id of HARBOR_RPG_PROFESSIONS) {
      const v = p[id]
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
        professions[id] = Math.min(Math.floor(v), 500_000)
      }
    }
  }
  const market: NonNullable<NonNullable<HarborQuestProgress['rpg']>['market']> = []
  if (Array.isArray(o.market)) {
    for (const row of o.market) {
      if (market.length >= 12) break
      if (!row || typeof row !== 'object') continue
      const r = row as Record<string, unknown>
      if (typeof r.id !== 'string' || typeof r.sellerId !== 'string') continue
      if (typeof r.itemId !== 'string' || !HARBOR_RPG_ITEMS.has(r.itemId)) continue
      const qty = typeof r.qty === 'number' && Number.isFinite(r.qty) && r.qty > 0 ? Math.min(Math.floor(r.qty), 99) : 0
      const price = typeof r.price === 'number' && Number.isFinite(r.price) && r.price > 0 ? Math.min(Math.floor(r.price), 1_000_000) : 0
      if (qty <= 0 || price <= 0) continue
      market.push({
        id: r.id.trim().slice(0, 40),
        sellerId: r.sellerId.trim().slice(0, 64),
        sellerName: typeof r.sellerName === 'string' && r.sellerName.trim() ? r.sellerName.trim().slice(0, 20) : 'Trader',
        itemId: r.itemId,
        qty,
        price,
        createdAt: typeof r.createdAt === 'number' && Number.isFinite(r.createdAt) ? Math.floor(r.createdAt) : Date.now(),
      })
    }
  }
  const classId =
    typeof o.classId === 'string' && HARBOR_RPG_CLASS_IDS.has(o.classId) ? o.classId : null
  let specId: string | null =
    typeof o.specId === 'string' && HARBOR_RPG_SPEC_IDS.has(o.specId) ? o.specId : null
  if (classId && !specId) specId = `${classId}-offense`
  if (specId && classId && !specId.startsWith(`${classId}-`)) specId = `${classId}-offense`
  const classXp =
    typeof o.classXp === 'number' && Number.isFinite(o.classXp) && o.classXp >= 0
      ? Math.min(Math.floor(o.classXp), 50_000_000)
      : 0
  const prestige =
    typeof o.prestige === 'number' && Number.isFinite(o.prestige) && o.prestige >= 0
      ? Math.min(Math.floor(o.prestige), 5)
      : 0
  const skillXp: Record<string, number> = {}
  if (o.skillXp && typeof o.skillXp === 'object' && !Array.isArray(o.skillXp)) {
    for (const [k, v] of Object.entries(o.skillXp as Record<string, unknown>)) {
      if (!HARBOR_RPG_SKILL_PREFIX.test(k)) continue
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) continue
      skillXp[k] = Math.min(Math.floor(v), 500_000)
    }
  }
  const talents: Record<string, number> = {}
  if (o.talents && typeof o.talents === 'object' && !Array.isArray(o.talents)) {
    for (const [k, v] of Object.entries(o.talents as Record<string, unknown>)) {
      if (!HARBOR_RPG_TALENT_PREFIX.test(k)) continue
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) continue
      talents[k] = Math.min(Math.floor(v), 5)
    }
  }
  const skillBar: string[] = []
  if (Array.isArray(o.skillBar)) {
    for (const id of o.skillBar) {
      if (typeof id !== 'string' || !HARBOR_RPG_SKILL_PREFIX.test(id)) continue
      if (skillBar.includes(id)) continue
      skillBar.push(id)
      if (skillBar.length >= 5) break
    }
  }
  const ownedMounts = new Set<string>(['horse'])
  if (Array.isArray(o.ownedMounts)) {
    for (const id of o.ownedMounts) {
      if (typeof id === 'string' && HARBOR_RPG_MOUNTS.has(id)) ownedMounts.add(id)
    }
  }
  const activeMountId =
    typeof o.activeMountId === 'string' &&
    HARBOR_RPG_MOUNTS.has(o.activeMountId) &&
    ownedMounts.has(o.activeMountId)
      ? o.activeMountId
      : null
  const unlockedTitles: string[] = []
  const titleSeen = new Set<string>()
  if (Array.isArray(o.unlockedTitles)) {
    for (const id of o.unlockedTitles) {
      if (typeof id !== 'string') continue
      const clean = id.trim().slice(0, 40)
      if (!clean || titleSeen.has(clean)) continue
      titleSeen.add(clean)
      unlockedTitles.push(clean)
      if (unlockedTitles.length >= 64) break
    }
  }
  const activeTitleId =
    typeof o.activeTitleId === 'string' && titleSeen.has(o.activeTitleId.trim())
      ? o.activeTitleId.trim().slice(0, 40)
      : null
  return {
    characters,
    activeCharacterId,
    xp,
    gold,
    ownedCosmetics: [...owned],
    equippedCosmetic,
    equippedLooks,
    boosts,
    shrineClaims,
    dummyKills,
    zone,
    inventory,
    bank,
    gear,
    equippedWeapon,
    equippedArmor,
    quests,
    kills,
    companionUntil,
    companionName,
    professions,
    market,
    classId,
    specId,
    classXp,
    prestige,
    skillXp,
    talents,
    skillBar,
    difficulty:
      typeof o.difficulty === 'string' && HARBOR_RPG_DIFFICULTIES.has(o.difficulty)
        ? o.difficulty
        : 'normal',
    ownedMounts: [...ownedMounts],
    activeMountId,
    unlockedTitles,
    activeTitleId,
    friends: sanitizeRpgFriends(o.friends),
    afk: o.afk === true,
    afkNote: typeof o.afkNote === 'string' ? o.afkNote.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 80) : '',
    fleetName:
      typeof o.fleetName === 'string' && o.fleetName.trim()
        ? o.fleetName.trim().slice(0, 24)
        : null,
    fleetMotto: typeof o.fleetMotto === 'string' ? o.fleetMotto.trim().slice(0, 80) : '',
    inbox: sanitizeRpgInbox(o.inbox),
    claimedDeeds: sanitizeRpgDeedClaims(o.claimedDeeds),
    delveFloor:
      typeof o.delveFloor === 'number' && Number.isFinite(o.delveFloor)
        ? Math.min(8, Math.max(1, Math.floor(o.delveFloor)))
        : 1,
    delveBest: rpgSoftCount(o.delveBest, 8),
    delveMark: rpgSoftCount(o.delveMark, 1_000_000),
    riftClears: rpgSoftCount(o.riftClears, 1_000_000),
    riftMark: rpgSoftCount(o.riftMark, 1_000_000),
    raceBestMs:
      typeof o.raceBestMs === 'number' && Number.isFinite(o.raceBestMs) && o.raceBestMs > 0
        ? Math.min(600_000, Math.floor(o.raceBestMs))
        : null,
    raceRuns: rpgSoftCount(o.raceRuns, 1_000_000),
    ...sanitizeRpgDepth(o),
  }
}

function rpgSoftCount(raw: unknown, max: number): number {
  return typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 ? Math.min(max, Math.floor(raw)) : 0
}

const HARBOR_RPG_WORLD_IDS = new Set([
  'daily-slime', 'daily-wolf', 'daily-bandit', 'daily-town', 'daily-marsh', 'daily-ash',
  'week-golem', 'week-wraith', 'week-colossus', 'week-moon',
])

function sanitizeRpgDepth(o: Record<string, unknown>): {
  raceStep: number
  fleetRank: string
  fleetBank: { id: string; qty: number }[]
  fleetPledges: { id: string; text: string; by: string; t: number }[]
  whispers: { id: string; from: string; body: string; t: number; read: boolean }[]
  duel: { foe: string; phase: string; selfHp: number; foeHp: number } | null
  riftSeed: number
  worldDay: string
  worldWeek: string
  worldKillMark: Record<string, number>
  worldClaims: string[]
  worldVisits: string[]
  tideChart: { zone: string; x: number; z: number; dug: boolean } | null
  loadoutB: { specId: string | null; talents: Record<string, number>; skillBar: string[] } | null
  activeLoadout: string
  buffs: { id: string; until: number }[]
} {
  const dayOk = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '')
  const fleetBank = sanitizeRpgInv(o.fleetBank, 24)
  const fleetPledges: { id: string; text: string; by: string; t: number }[] = []
  if (Array.isArray(o.fleetPledges)) {
    for (const row of o.fleetPledges) {
      if (!row || typeof row !== 'object') continue
      const r = row as Record<string, unknown>
      if (typeof r.id !== 'string' || typeof r.text !== 'string') continue
      const text = r.text.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 80)
      if (!text) continue
      fleetPledges.push({
        id: r.id.slice(0, 40),
        text,
        by: typeof r.by === 'string' ? r.by.trim().slice(0, 24) : 'sailor',
        t: typeof r.t === 'number' && Number.isFinite(r.t) ? Math.floor(r.t) : 0,
      })
      if (fleetPledges.length >= 12) break
    }
  }
  const whispers: { id: string; from: string; body: string; t: number; read: boolean }[] = []
  if (Array.isArray(o.whispers)) {
    for (const row of o.whispers) {
      if (!row || typeof row !== 'object') continue
      const r = row as Record<string, unknown>
      if (typeof r.id !== 'string' || typeof r.from !== 'string' || typeof r.body !== 'string') continue
      const body = r.body.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 140)
      const from = r.from.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 24)
      if (!body || !from) continue
      whispers.push({
        id: r.id.slice(0, 40),
        from,
        body,
        t: typeof r.t === 'number' && Number.isFinite(r.t) ? Math.floor(r.t) : 0,
        read: r.read === true,
      })
      if (whispers.length >= 20) break
    }
  }
  let duel: { foe: string; phase: string; selfHp: number; foeHp: number } | null = null
  if (o.duel && typeof o.duel === 'object') {
    const d = o.duel as Record<string, unknown>
    const foe = typeof d.foe === 'string' ? d.foe.trim().slice(0, 24) : ''
    if (foe && (d.phase === 'challenge' || d.phase === 'active')) {
      const hp = (n: unknown) =>
        typeof n === 'number' && Number.isFinite(n) ? Math.min(500, Math.max(0, Math.floor(n))) : 0
      duel = { foe, phase: d.phase, selfHp: hp(d.selfHp), foeHp: hp(d.foeHp) }
    }
  }
  const worldKillMark: Record<string, number> = {}
  if (o.worldKillMark && typeof o.worldKillMark === 'object' && !Array.isArray(o.worldKillMark)) {
    for (const [k, v] of Object.entries(o.worldKillMark as Record<string, unknown>)) {
      if (!HARBOR_RPG_MONSTERS.has(k)) continue
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) continue
      worldKillMark[k] = Math.min(1_000_000, Math.floor(v))
    }
  }
  const worldClaims: string[] = []
  if (Array.isArray(o.worldClaims)) {
    for (const id of o.worldClaims) {
      if (typeof id === 'string' && HARBOR_RPG_WORLD_IDS.has(id) && !worldClaims.includes(id)) worldClaims.push(id)
    }
  }
  const worldVisits: string[] = []
  if (Array.isArray(o.worldVisits)) {
    for (const z of o.worldVisits) {
      if (typeof z === 'string' && HARBOR_RPG_ZONES.has(z) && !worldVisits.includes(z)) worldVisits.push(z)
    }
  }
  let tideChart: { zone: string; x: number; z: number; dug: boolean } | null = null
  if (o.tideChart && typeof o.tideChart === 'object') {
    const t = o.tideChart as Record<string, unknown>
    if (typeof t.zone === 'string' && HARBOR_RPG_ZONES.has(t.zone)) {
      const axis = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? Math.max(-40, Math.min(40, n)) : 0)
      tideChart = { zone: t.zone, x: axis(t.x), z: axis(t.z), dug: t.dug === true }
    }
  }
  let loadoutB: { specId: string | null; talents: Record<string, number>; skillBar: string[] } | null = null
  if (o.loadoutB && typeof o.loadoutB === 'object') {
    const l = o.loadoutB as Record<string, unknown>
    const talents: Record<string, number> = {}
    if (l.talents && typeof l.talents === 'object' && !Array.isArray(l.talents)) {
      for (const [k, v] of Object.entries(l.talents as Record<string, unknown>)) {
        if (!HARBOR_RPG_TALENT_PREFIX.test(k)) continue
        if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) continue
        talents[k] = Math.min(5, Math.floor(v))
      }
    }
    const skillBar: string[] = []
    if (Array.isArray(l.skillBar)) {
      for (const id of l.skillBar) {
        if (typeof id !== 'string' || !HARBOR_RPG_SKILL_PREFIX.test(id) || skillBar.includes(id)) continue
        skillBar.push(id)
        if (skillBar.length >= 5) break
      }
    }
    loadoutB = {
      specId: typeof l.specId === 'string' && HARBOR_RPG_SPEC_IDS.has(l.specId) ? l.specId : null,
      talents,
      skillBar,
    }
  }
  const buffs: { id: string; until: number }[] = []
  if (Array.isArray(o.buffs)) {
    for (const row of o.buffs) {
      if (!row || typeof row !== 'object') continue
      const r = row as Record<string, unknown>
      if (r.id !== 'might' || typeof r.until !== 'number' || !Number.isFinite(r.until)) continue
      buffs.push({ id: 'might', until: Math.floor(r.until) })
    }
  }
  const fleetRank = o.fleetRank === 'leader' || o.fleetRank === 'officer' ? o.fleetRank : 'member'
  return {
    raceStep: o.raceStep === 1 || o.raceStep === 2 ? o.raceStep : 0,
    fleetRank,
    fleetBank,
    fleetPledges,
    whispers,
    duel,
    riftSeed: Math.max(1, rpgSoftCount(o.riftSeed, 100_000)),
    worldDay: dayOk(o.worldDay),
    worldWeek: dayOk(o.worldWeek),
    worldKillMark,
    worldClaims,
    worldVisits,
    tideChart,
    loadoutB,
    activeLoadout: o.activeLoadout === 'b' ? 'b' : 'a',
    buffs: buffs.slice(0, 4),
  }
}

const HARBOR_RPG_DEED_IDS = new Set([
  'ach-first-char','ach-first-class','ach-slime-5','ach-slime-25','ach-boss-ash','ach-boss-pearl',
  'ach-boss-ink','ach-boss-mirror','ach-boss-sovereign','ach-heroic-seal','ach-quest-5','ach-quest-20',
  'ach-quest-all','ach-mount-starter','ach-mount-5','ach-mount-15','ach-mount-all','ach-gold-100',
  'ach-gold-1000','ach-craft-first','ach-companion','ach-prestige','ach-zone-crypt','ach-zone-raid',
  'ach-finder-ready',
])

function sanitizeRpgFriends(raw: unknown): string[] {
  const out: string[] = []
  if (!Array.isArray(raw)) return out
  for (const name of raw) {
    if (typeof name !== 'string') continue
    const n = name.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 24)
    if (!n || out.includes(n)) continue
    out.push(n)
    if (out.length >= 16) break
  }
  return out
}

function sanitizeRpgDeedClaims(raw: unknown): string[] {
  const out: string[] = []
  if (!Array.isArray(raw)) return out
  for (const id of raw) {
    if (typeof id === 'string' && HARBOR_RPG_DEED_IDS.has(id) && !out.includes(id)) out.push(id)
  }
  return out
}

function sanitizeRpgInbox(raw: unknown): { id: string; from: string; subject: string; body: string; gold: number; read: boolean; t: number }[] {
  const out: { id: string; from: string; subject: string; body: string; gold: number; read: boolean; t: number }[] = []
  if (!Array.isArray(raw)) return out
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const id = typeof r.id === 'string' ? r.id.slice(0, 40) : ''
    const from = typeof r.from === 'string' ? r.from.trim().slice(0, 24) : ''
    if (!id || !from) continue
    out.push({
      id,
      from,
      subject: typeof r.subject === 'string' ? r.subject.trim().slice(0, 40) : 'Letter',
      body: typeof r.body === 'string' ? r.body.replace(/[\u0000-\u001f]/g, '').slice(0, 180) : '',
      gold: typeof r.gold === 'number' && r.gold > 0 ? Math.min(5000, Math.floor(r.gold)) : 0,
      read: r.read === true,
      t: typeof r.t === 'number' && Number.isFinite(r.t) ? Math.floor(r.t) : 0,
    })
    if (out.length >= 20) break
  }
  return out
}

const LEADERBOARD_DEFAULT_LIMIT = 25
const LEADERBOARD_MAX_LIMIT = 50

/** Sanitize progress payloads from clients / DB. */
export function sanitizeHarborProgress(raw: unknown): HarborQuestProgress {
  if (!raw || typeof raw !== 'object') return { ...EMPTY, cleared: [], stepCursor: { ...EMPTY.stepCursor }, owned: [...EMPTY.owned], banked: [], look: { ...EMPTY.look } }
  const o = raw as Record<string, unknown>
  const cleared = Array.isArray(o.cleared)
    ? o.cleared.filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length < 80)
    : []
  const stepCursor: Record<string, number> = {}
  if (o.stepCursor && typeof o.stepCursor === 'object' && !Array.isArray(o.stepCursor)) {
    for (const [k, v] of Object.entries(o.stepCursor as Record<string, unknown>)) {
      if (typeof k !== 'string' || k.length === 0 || k.length >= 80) continue
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 10_000) continue
      stepCursor[k] = Math.floor(v)
    }
  }
  const correctCount =
    typeof o.correctCount === 'number' && Number.isFinite(o.correctCount) && o.correctCount >= 0
      ? Math.min(Math.floor(o.correctCount), 1_000_000)
      : 0
  const gold =
    typeof o.gold === 'number' && Number.isFinite(o.gold) && o.gold >= 0
      ? Math.min(Math.floor(o.gold), 10_000_000)
      : 0
  const xp =
    typeof o.xp === 'number' && Number.isFinite(o.xp) && o.xp >= 0
      ? Math.min(Math.floor(o.xp), 100_000_000)
      : 0
  const missionClears: Record<string, number> = {}
  if (o.missionClears && typeof o.missionClears === 'object' && !Array.isArray(o.missionClears)) {
    for (const [k, v] of Object.entries(o.missionClears as Record<string, unknown>)) {
      if (typeof k !== 'string' || !k || k.length >= 80) continue
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) continue
      missionClears[k] = Math.min(Math.floor(v), 100_000)
    }
  }
  const seen = new Set<string>()
  const clearedUnique: string[] = []
  for (const id of cleared.slice(0, 200)) {
    if (seen.has(id)) continue
    seen.add(id)
    clearedUnique.push(id)
  }
  for (const id of clearedUnique) {
    if ((missionClears[id] ?? 0) < 1) missionClears[id] = 1
  }
  // Missing coins on an existing blob → 0 (starter purse only on empty/null via EMPTY).
  let coins = 0
  if (typeof o.coins === 'number' && Number.isFinite(o.coins) && o.coins >= 0) {
    coins = Math.min(Math.floor(o.coins), 1_000_000)
  }
  const look: HarborQuestProgress['look'] = { ...DEFAULT_LOOK }
  if (o.look && typeof o.look === 'object') {
    const L = o.look as Record<string, unknown>
    for (const slot of ['hat', 'top', 'bottom', 'shoes', 'hand', 'boat', 'lantern'] as const) {
      const id = L[slot]
      const prefix = slot === 'shoes' ? 'shoes-' : `${slot}-`
      if (typeof id === 'string' && KNOWN_GEAR.has(id) && id.startsWith(prefix)) {
        look[slot] = id
      }
    }
  }
  const starterSet = new Set<string>(STARTER_OWNED)
  const bankedSet = new Set<string>()
  if (Array.isArray(o.banked)) {
    for (const id of o.banked) {
      if (typeof id === 'string' && KNOWN_GEAR.has(id) && !starterSet.has(id)) bankedSet.add(id)
    }
  }
  const ownedSet = new Set<string>(STARTER_OWNED)
  if (Array.isArray(o.owned)) {
    for (const id of o.owned) {
      if (typeof id === 'string' && KNOWN_GEAR.has(id) && !bankedSet.has(id)) ownedSet.add(id)
    }
  }
  const lastSavedAt =
    typeof o.lastSavedAt === 'number' && Number.isFinite(o.lastSavedAt) && o.lastSavedAt >= 0
      ? Math.floor(o.lastSavedAt)
      : 0
  const titleSet = new Set<string>()
  if (Array.isArray(o.ownedTitles)) {
    for (const id of o.ownedTitles) {
      if (
        typeof id === 'string' &&
        (id === 'title-river-scout' ||
          id === 'title-harbor-coach' ||
          id === 'title-generous' ||
          id === 'title-dock-mate')
      ) {
        titleSet.add(id)
      }
    }
  }
  const ownedTitles = [...titleSet]
  let titleId: string | null = null
  if (typeof o.titleId === 'string' && ownedTitles.includes(o.titleId)) {
    titleId = o.titleId
  }
  const fishing = sanitizeFishing(o.fishing)
  const beautyOwned = sanitizeBeautyOwned(o.beautyOwned)
  const showoff = sanitizeShowoff(o.showoff)
  const rpg = sanitizeRpg(o.rpg)
  return {
    cleared: clearedUnique,
    stepCursor,
    correctCount,
    gold,
    xp,
    missionClears,
    coins,
    owned: [...ownedSet],
    banked: [...bankedSet],
    look,
    lastSavedAt,
    ownedTitles,
    titleId,
    fishing,
    beautyOwned,
    showoff,
    rpg,
  }
}

function displayNameFromProfile(username: string | null | undefined, userId: string): string {
  const u = typeof username === 'string' ? username.trim() : ''
  if (u) return u.slice(0, 24)
  return `Sailor-${userId.replace(/-/g, '').slice(0, 4)}`
}

async function persistProgress(userId: string, progress: HarborQuestProgress) {
  const admin = getAdmin()
  if (!admin) return { error: new Error('Harbor Quest sync unavailable.') }
  const { error } = await admin.from('harbor_quest_progress').upsert(
    {
      user_id: userId,
      progress,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  return { error }
}

/** Upsert denormalized leaderboard row from sanitized progress. */
export async function syncHarborLeaderboard(userId: string, progress: HarborQuestProgress) {
  const admin = getAdmin()
  if (!admin) return { error: new Error('Harbor Quest sync unavailable.') }

  let displayName = displayNameFromProfile(null, userId)
  try {
    const profile = await getProfile(userId)
    displayName = displayNameFromProfile(profile?.username, userId)
  } catch {
    /* keep fallback name */
  }

  const { error } = await admin.from('harbor_quest_leaderboard').upsert(
    {
      user_id: userId,
      display_name: displayName,
      xp: progress.xp,
      gold: progress.gold,
      correct_count: progress.correctCount,
      cleared_count: progress.cleared.length,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  return { error }
}

type LeaderboardRow = {
  user_id: string
  display_name: string
  xp: number
  gold: number
  correct_count: number
  cleared_count: number
}

function rankRows(rows: LeaderboardRow[]): HarborLeaderboardEntry[] {
  return rows.map((row, i) => ({
    rank: i + 1,
    userId: row.user_id,
    displayName: row.display_name || 'Sailor',
    xp: row.xp,
    gold: row.gold,
    correctCount: row.correct_count,
    clearedCount: row.cleared_count,
  }))
}

/** Compare like the SQL index: xp → gold → correct → cleared. */
export function compareLeaderboardScores(
  a: { xp: number; gold: number; correctCount: number; clearedCount: number },
  b: { xp: number; gold: number; correctCount: number; clearedCount: number },
): number {
  if (a.xp !== b.xp) return b.xp - a.xp
  if (a.gold !== b.gold) return b.gold - a.gold
  if (a.correctCount !== b.correctCount) return b.correctCount - a.correctCount
  if (a.clearedCount !== b.clearedCount) return b.clearedCount - a.clearedCount
  return 0
}

function parseLimit(raw: unknown): number {
  const n = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : NaN
  if (!Number.isFinite(n)) return LEADERBOARD_DEFAULT_LIMIT
  return Math.min(LEADERBOARD_MAX_LIMIT, Math.max(1, Math.floor(n)))
}

/** GET /api/harbor-quest — signed-in Harbor Quest progress. */
export async function getHarborQuest(req: AuthedRequest, res: Response) {
  const auth = requireAuth(req, res)
  if (!auth) return

  if (env.openMode) {
    res.json({ progress: sanitizeHarborProgress(null) })
    return
  }

  const admin = getAdmin()
  if (!admin) {
    res.status(503).json({ message: 'Harbor Quest sync unavailable.' })
    return
  }

  const { data, error } = await admin
    .from('harbor_quest_progress')
    .select('progress')
    .eq('user_id', auth.userId)
    .maybeSingle()

  if (error) {
    console.warn('[harbor-quest] get failed', error.message)
    res.status(500).json({ message: HARBOR_ERR })
    return
  }

  res.json({ progress: sanitizeHarborProgress(data?.progress) })
}

/** PUT /api/harbor-quest — replace account Harbor Quest progress (+ leaderboard sync). */
export async function putHarborQuest(req: AuthedRequest, res: Response) {
  const auth = requireAuth(req, res)
  if (!auth) return

  if (!allowUserRateOrReject(res, auth.userId, 'harborPut', env.harborPutRlPerMin)) return

  const progress = sanitizeHarborProgress(req.body?.progress)

  if (env.openMode) {
    res.json({ ok: true, progress })
    return
  }

  const admin = getAdmin()
  if (!admin) {
    res.status(503).json({ message: 'Harbor Quest sync unavailable.' })
    return
  }

  // Meter engagement from correct-answer deltas (admin view-only).
  let prevCorrect = 0
  try {
    const { data: prevRow } = await admin
      .from('harbor_quest_progress')
      .select('progress')
      .eq('user_id', auth.userId)
      .maybeSingle()
    prevCorrect = sanitizeHarborProgress(prevRow?.progress).correctCount
  } catch {
    prevCorrect = 0
  }
  const correctDelta = Math.max(0, progress.correctCount - prevCorrect)

  const { error } = await persistProgress(auth.userId, progress)
  if (error) {
    console.warn('[harbor-quest] put failed', error.message)
    res.status(500).json({ message: HARBOR_ERR })
    return
  }

  if (correctDelta > 0) {
    void addHarborQuestCount(auth.userId, correctDelta).catch((e) => {
      console.warn('[harbor-quest] usage meter failed', e)
    })
  }

  // Best-effort leaderboard sync — progress save already succeeded.
  const board = await syncHarborLeaderboard(auth.userId, progress)
  if (board.error) {
    console.warn('[harbor-quest] leaderboard sync failed', board.error.message)
  }

  res.json({ ok: true, progress })
}

/**
 * GET /api/harbor-quest/leaderboard — global ranks (public).
 * Optional Bearer token marks the caller's row with `isYou` and returns `me`.
 */
export async function getHarborQuestLeaderboard(req: AuthedRequest, res: Response) {
  const limit = parseLimit(req.query?.limit)

  if (env.openMode) {
    res.json({ entries: [], me: null, limit })
    return
  }

  const admin = getAdmin()
  if (!admin) {
    res.status(503).json({ message: 'Harbor Quest leaderboard unavailable.' })
    return
  }

  const { data, error } = await admin
    .from('harbor_quest_leaderboard')
    .select('user_id, display_name, xp, gold, correct_count, cleared_count')
    .order('xp', { ascending: false })
    .order('gold', { ascending: false })
    .order('correct_count', { ascending: false })
    .order('cleared_count', { ascending: false })
    .order('updated_at', { ascending: true })
    .limit(limit)

  if (error) {
    console.warn('[harbor-quest] leaderboard failed', error.message)
    res.status(500).json({ message: 'Harbor Quest leaderboard unavailable.' })
    return
  }

  const rows = (data ?? []) as LeaderboardRow[]
  const viewerId = req.auth?.userId ?? null
  const entries = rankRows(rows).map((e) =>
    viewerId && e.userId === viewerId ? { ...e, isYou: true } : e,
  )

  let me: HarborLeaderboardEntry | null = null
  if (viewerId) {
    const onBoard = entries.find((e) => e.userId === viewerId)
    if (onBoard) {
      me = onBoard
    } else {
      const { data: wider } = await admin
        .from('harbor_quest_leaderboard')
        .select('user_id, display_name, xp, gold, correct_count, cleared_count')
        .order('xp', { ascending: false })
        .order('gold', { ascending: false })
        .order('correct_count', { ascending: false })
        .order('cleared_count', { ascending: false })
        .order('updated_at', { ascending: true })
        .limit(2000)
      const widerRows = (wider ?? []) as LeaderboardRow[]
      const idx = widerRows.findIndex((r) => r.user_id === viewerId)
      if (idx >= 0) {
        const row = widerRows[idx]!
        me = {
          rank: idx + 1,
          userId: row.user_id,
          displayName: row.display_name || 'Sailor',
          xp: row.xp,
          gold: row.gold,
          correctCount: row.correct_count,
          clearedCount: row.cleared_count,
          isYou: true,
        }
      }
    }
  }

  res.json({ entries, me, limit })
}

async function loadProgressBlob(userId: string): Promise<HarborQuestProgress> {
  const admin = getAdmin()
  if (!admin) return sanitizeHarborProgress(null)
  const { data } = await admin
    .from('harbor_quest_progress')
    .select('progress')
    .eq('user_id', userId)
    .maybeSingle()
  return sanitizeHarborProgress(data?.progress)
}

async function sameHousehold(a: string, b: string): Promise<boolean> {
  const [ma, mb] = await Promise.all([getMembershipForUser(a), getMembershipForUser(b)])
  if (!ma || !mb) return false
  return ma.household.id === mb.household.id
}

/**
 * POST /api/harbor-quest/gift — cosmetic lantern / title gift.
 * Prefer household (Family fleet seed); also allow dock gifts to any signed-in sailor.
 * Never transfers XP, coins, or answer credit.
 */
export async function postHarborQuestGift(req: AuthedRequest, res: Response) {
  const auth = requireAuth(req, res)
  if (!auth) return

  if (!allowUserRateOrReject(res, auth.userId, 'harborGift', env.harborGiftRlPerMin)) return

  const toUserId = typeof req.body?.toUserId === 'string' ? req.body.toUserId.trim() : ''
  const kindRaw = req.body?.kind
  const itemId = typeof req.body?.itemId === 'string' ? req.body.itemId.trim() : ''
  const kind: HarborGiftKind | null =
    kindRaw === 'lantern' || kindRaw === 'title' ? kindRaw : null

  if (!toUserId || toUserId.length > 80 || !kind || !itemId || itemId.length > 80) {
    res.status(400).json({ message: 'Invalid gift payload.' })
    return
  }
  if (toUserId === auth.userId) {
    res.status(400).json({ message: 'You cannot gift yourself.' })
    return
  }

  if (env.openMode) {
    res.status(503).json({ message: 'Gifts require signed-in sync (open mode has no accounts).' })
    return
  }

  const admin = getAdmin()
  if (!admin) {
    res.status(503).json({ message: 'Harbor Quest sync unavailable.' })
    return
  }

  const householdMate = await sameHousehold(auth.userId, toUserId)

  const [fromProg, toProg] = await Promise.all([
    loadProgressBlob(auth.userId),
    loadProgressBlob(toUserId),
  ])

  const applied = applyCosmeticGift({
    fromOwned: fromProg.owned,
    fromBanked: fromProg.banked,
    fromLookLantern: fromProg.look.lantern,
    fromTitles: fromProg.ownedTitles ?? [],
    toOwned: toProg.owned,
    toBanked: toProg.banked,
    toTitles: toProg.ownedTitles ?? [],
    kind,
    itemId,
  })

  if (!applied.ok) {
    res.status(400).json({ message: applied.reason })
    return
  }

  const nextFrom: HarborQuestProgress = {
    ...fromProg,
    owned: applied.fromOwned,
    banked: applied.fromBanked,
    look: { ...fromProg.look, lantern: applied.fromLookLantern },
    ownedTitles: applied.fromTitles,
    titleId:
      fromProg.titleId && applied.fromTitles.includes(fromProg.titleId)
        ? fromProg.titleId
        : applied.fromTitles[0] ?? null,
    lastSavedAt: Date.now(),
  }
  const nextTo: HarborQuestProgress = {
    ...toProg,
    owned: applied.toOwned,
    banked: applied.toBanked,
    ownedTitles: applied.toTitles,
    titleId:
      toProg.titleId && applied.toTitles.includes(toProg.titleId)
        ? toProg.titleId
        : toProg.titleId,
    lastSavedAt: Date.now(),
  }

  const saveFrom = await persistProgress(auth.userId, nextFrom)
  if (saveFrom.error) {
    console.warn('[harbor-quest] gift giver save failed', saveFrom.error.message)
    res.status(500).json({ message: HARBOR_ERR })
    return
  }
  const saveTo = await persistProgress(toUserId, nextTo)
  if (saveTo.error) {
    console.warn('[harbor-quest] gift receiver save failed', saveTo.error.message)
    res.status(500).json({ message: HARBOR_ERR })
    return
  }

  res.json({
    ok: true,
    progress: nextFrom,
    householdMate,
    giverTitleAward: applied.giverTitleAward ?? null,
    receiverTitleAward: applied.receiverTitleAward ?? null,
  })
}
