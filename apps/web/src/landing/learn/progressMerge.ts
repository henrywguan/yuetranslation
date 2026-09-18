/** Pure Harbor Quest progress helpers (no DOM / auth imports — smoke-safe). */

import {
  HARBOR_DEFAULT_APPEARANCE,
  appearanceEqual,
  sanitizeHarborAppearance,
  sanitizeHarborGender,
  type HarborAppearance,
  type HarborGender,
} from './harborAppearance'
import {
  emptyHarborFishingBag,
  mergeHarborFishingBag,
  sanitizeHarborFishingBag,
  type HarborFishingBag,
} from './harborFishing'
import { harborBeautyStarterOwned, sanitizeHarborBeautyOwned } from './harborBeauty'
import {
  emptyHarborShowoffBag,
  mergeHarborShowoffBag,
  sanitizeHarborShowoffBag,
  type HarborShowoffBag,
} from './harborShowoff'
import { sanitizeOwnedTitles, sanitizeTitleId } from './harborTitles'

export type HarborProgress = {
  /** Level ids cleared (last step completed). */
  cleared: string[]
  /** Highest step index reached per level (inclusive, 0-based). */
  stepCursor: Record<string, number>
  /** Total correct answers (lifetime). */
  correctCount: number
  /** Gold earned from arena minigames (lifetime). */
  gold: number
  /** Experience points (lifetime). */
  xp: number
  /** Times each mission/pier has been completed (for half-XP repeats). */
  missionClears: Record<string, number>
  /** Ferry coins for the riverside outfitter. */
  coins: number
  /** Carried gear ids (inventory — hats, tops, bottoms, shoes, handhelds). */
  owned: string[]
  /** Gear stored at the Harbor Bank (not carried). */
  banked: string[]
  /** Equipped look / character outfit. */
  look: import('./harborGear').HarborLook
  /** Last Save Shack stamp (ms). */
  lastSavedAt: number
  /** True once the sailor finishes first-time character creation. */
  characterCreated: boolean
  /** Body type chosen at creation. */
  gender: HarborGender
  /** Skin / hair cosmetics. */
  appearance: HarborAppearance
  /**
   * Display name for guests (or before Account Hub username is set).
   * Signed-in Account Hub username still wins in multiplayer nametags.
   */
  localUsername: string | null
  /** Cosmetic titles owned (giftable). */
  ownedTitles: string[]
  /** Equipped title id (must be in ownedTitles). */
  titleId: string | null
  /** Guan fishing bag — tools, bait, catches, log, Fishing XP. */
  fishing: HarborFishingBag
  /** Unlocked beauty salon SKUs (premium dyes / rare styles). */
  beautyOwned: string[]
  /** Showoff cosmetics — nametag, bubble, chair, pet, emotes + event claims. */
  showoff: HarborShowoffBag
}

export function emptyHarborProgress(): HarborProgress {
  // Lazy import-free defaults mirrored from harborGear starters
  return {
    cleared: [],
    stepCursor: {},
    correctCount: 0,
    gold: 0,
    xp: 0,
    missionClears: {},
    coins: 40,
    owned: [
      'hat-straw',
      'top-harbor',
      'bottom-travel',
      'shoes-leather',
      'hand-none',
      'boat-canoe',
      'lantern-paper-amber',
    ],
    banked: [],
    look: {
      hat: 'hat-straw',
      top: 'top-harbor',
      bottom: 'bottom-travel',
      shoes: 'shoes-leather',
      hand: 'hand-none',
      boat: 'boat-canoe',
      lantern: 'lantern-paper-amber',
    },
    lastSavedAt: 0,
    characterCreated: false,
    gender: 'male',
    appearance: { ...HARBOR_DEFAULT_APPEARANCE },
    localUsername: null,
    ownedTitles: ['title-river-scout'],
    titleId: 'title-river-scout',
    fishing: emptyHarborFishingBag(),
    beautyOwned: harborBeautyStarterOwned(),
    showoff: emptyHarborShowoffBag(),
  }
}

export function sanitizeHarborProgress(raw: unknown): HarborProgress {
  if (!raw || typeof raw !== 'object') return emptyHarborProgress()
  const o = raw as Record<string, unknown>
  const cleared = Array.isArray(o.cleared)
    ? o.cleared.filter((x): x is string => typeof x === 'string' && Boolean(x))
    : []
  const stepCursor: Record<string, number> = {}
  if (o.stepCursor && typeof o.stepCursor === 'object' && !Array.isArray(o.stepCursor)) {
    for (const [k, v] of Object.entries(o.stepCursor as Record<string, unknown>)) {
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0) stepCursor[k] = Math.floor(v)
    }
  }
  const correctCount =
    typeof o.correctCount === 'number' && Number.isFinite(o.correctCount) && o.correctCount >= 0
      ? Math.floor(o.correctCount)
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
  for (const id of cleared) {
    if (seen.has(id)) continue
    seen.add(id)
    clearedUnique.push(id)
  }
  // Backfill: if a pier is cleared but has no clear count, treat as 1.
  for (const id of clearedUnique) {
    if ((missionClears[id] ?? 0) < 1) missionClears[id] = 1
  }
  // Missing coins on an existing blob → 0 (not a starter grant). Starter 40 only via emptyHarborProgress().
  let coins = 0
  if (typeof o.coins === 'number' && Number.isFinite(o.coins) && o.coins >= 0) {
    coins = Math.min(Math.floor(o.coins), 1_000_000)
  }
  const look = sanitizeLookInline(o.look)
  const banked = sanitizeBankedInline(o.banked)
  const owned = sanitizeOwnedInline(o.owned, banked)
  const lastSavedAt =
    typeof o.lastSavedAt === 'number' && Number.isFinite(o.lastSavedAt) && o.lastSavedAt >= 0
      ? Math.floor(o.lastSavedAt)
      : 0
  // Legacy sailors who already played before character create → treat as created.
  const legacyPlayed =
    clearedUnique.length > 0 ||
    correctCount > 0 ||
    gold > 0 ||
    xp > 0 ||
    lastSavedAt > 0
  const characterCreated =
    o.characterCreated === true || o.characterCreated === false
      ? Boolean(o.characterCreated)
      : legacyPlayed
  const gender = sanitizeHarborGender(o.gender)
  const appearance = sanitizeHarborAppearance(o.appearance)
  let localUsername: string | null = null
  if (typeof o.localUsername === 'string') {
    const u = o.localUsername.trim().slice(0, 24)
    if (u) localUsername = u
  }
  let ownedTitles = sanitizeOwnedTitles(o.ownedTitles)
  // Legacy / new sailors get River Scout once they have a character.
  if (characterCreated && !ownedTitles.includes('title-river-scout')) {
    ownedTitles = [...ownedTitles, 'title-river-scout']
  }
  const titleId = sanitizeTitleId(o.titleId, ownedTitles)
  const fishing = sanitizeHarborFishingBag(o.fishing)
  const beautyOwned = sanitizeHarborBeautyOwned(o.beautyOwned)
  const showoff = sanitizeHarborShowoffBag(o.showoff)
  return {
    cleared: clearedUnique,
    stepCursor,
    correctCount,
    gold,
    xp,
    missionClears,
    coins,
    owned,
    banked,
    look,
    lastSavedAt,
    characterCreated,
    gender,
    appearance,
    localUsername,
    ownedTitles,
    titleId,
    fishing,
    beautyOwned,
    showoff,
  }
}

const LOOK_SLOTS = ['hat', 'top', 'bottom', 'shoes', 'hand', 'boat', 'lantern'] as const
const STARTER_OWNED = [
  'hat-straw',
  'top-harbor',
  'bottom-travel',
  'shoes-leather',
  'hand-none',
  'boat-canoe',
  'lantern-paper-amber',
] as const
const DEFAULT_LOOK = {
  hat: 'hat-straw',
  top: 'top-harbor',
  bottom: 'bottom-travel',
  shoes: 'shoes-leather',
  hand: 'hand-none',
  boat: 'boat-canoe',
  lantern: 'lantern-paper-amber',
} as const
const KNOWN_GEAR = new Set([
  'hat-straw','hat-bamboo','hat-scholar','hat-fisherman','hat-festival','hat-jade-diadem','hat-starlit-helm',
  'top-harbor','top-jade','top-merchant','top-ferry','top-night','top-jade-immortal','top-starlit-coat',
  'bottom-travel','bottom-slate','bottom-reed','bottom-crimson','bottom-ink','bottom-phoenix','bottom-jade-flow','bottom-starlit-greaves',
  'shoes-leather','shoes-straw','shoes-lacquer','shoes-jade','shoes-storm','shoes-jade-cloud','shoes-starlit-boots',
  'hand-none','hand-fan','hand-lantern','hand-oar','hand-scroll','hand-phoenix-fan','hand-jade-orb','hand-starlit-compass',
  'boat-canoe','boat-reed','boat-bamboo','boat-sampan','boat-barge','boat-junk','boat-scholar','boat-merchant','boat-jade','boat-dragon','boat-pearl','boat-imperial',
  'lantern-paper-amber','lantern-paper-crimson','lantern-paper-jade','lantern-silk-gold','lantern-silk-azure','lantern-oil-iron','lantern-glass-ruby','lantern-glass-sapphire','lantern-porcelain','lantern-phoenix','lantern-dragon','lantern-starlight',
])

function sanitizeLookInline(raw: unknown): HarborProgress['look'] {
  const base: HarborProgress['look'] = { ...DEFAULT_LOOK }
  if (!raw || typeof raw !== 'object') return base
  const o = raw as Record<string, unknown>
  for (const slot of LOOK_SLOTS) {
    const id = o[slot]
    const prefix = slot === 'shoes' ? 'shoes-' : `${slot}-`
    if (typeof id === 'string' && KNOWN_GEAR.has(id) && id.startsWith(prefix)) {
      base[slot] = id as HarborProgress['look'][typeof slot]
    }
  }
  return base
}

function sanitizeOwnedInline(raw: unknown, banked: string[] = []): string[] {
  const bankedSet = new Set(banked)
  const set = new Set<string>(STARTER_OWNED)
  if (Array.isArray(raw)) {
    for (const id of raw) {
      if (typeof id === 'string' && KNOWN_GEAR.has(id) && !bankedSet.has(id)) set.add(id)
    }
  }
  return [...set]
}

/** Bank stores non-starter gear only (starters always stay on the Scout). */
function sanitizeBankedInline(raw: unknown): string[] {
  const set = new Set<string>()
  const starters = new Set<string>(STARTER_OWNED)
  if (Array.isArray(raw)) {
    for (const id of raw) {
      if (typeof id === 'string' && KNOWN_GEAR.has(id) && !starters.has(id)) set.add(id)
    }
  }
  return [...set]
}

/** Merge two progress blobs without losing pier clears or step depth. */
export function mergeHarborProgress(a: unknown, b: unknown): HarborProgress {
  const A = sanitizeHarborProgress(a)
  const B = sanitizeHarborProgress(b)
  const cleared = [...new Set([...A.cleared, ...B.cleared])]
  const stepCursor: Record<string, number> = { ...A.stepCursor }
  for (const [k, v] of Object.entries(B.stepCursor)) {
    stepCursor[k] = Math.max(stepCursor[k] ?? 0, v)
  }
  // Prefer banked when either side has it stored — then drop from carried.
  const banked = sanitizeBankedInline([...A.banked, ...B.banked])
  const owned = sanitizeOwnedInline([...A.owned, ...B.owned], banked)
  // Prefer the look from the fresher Save Shack stamp (local wins on equal stamps)
  const look = (B.lastSavedAt ?? 0) > (A.lastSavedAt ?? 0) ? B.look : A.look
  const missionClears: Record<string, number> = { ...A.missionClears }
  for (const [k, v] of Object.entries(B.missionClears)) {
    missionClears[k] = Math.max(missionClears[k] ?? 0, v)
  }
  for (const id of cleared) {
    if ((missionClears[id] ?? 0) < 1) missionClears[id] = 1
  }
  const fresher = (B.lastSavedAt ?? 0) > (A.lastSavedAt ?? 0) ? B : A
  const ownedTitles = [...new Set([...A.ownedTitles, ...B.ownedTitles])]
  const titleId =
    fresher.titleId && ownedTitles.includes(fresher.titleId)
      ? fresher.titleId
      : A.titleId && ownedTitles.includes(A.titleId)
        ? A.titleId
        : B.titleId && ownedTitles.includes(B.titleId)
          ? B.titleId
          : ownedTitles.includes('title-river-scout')
            ? 'title-river-scout'
            : null
  return {
    cleared,
    stepCursor,
    correctCount: Math.max(A.correctCount, B.correctCount),
    gold: Math.max(A.gold ?? 0, B.gold ?? 0),
    xp: Math.max(A.xp ?? 0, B.xp ?? 0),
    missionClears,
    coins: Math.max(A.coins ?? 0, B.coins ?? 0),
    owned,
    banked,
    look: look ?? A.look,
    lastSavedAt: Math.max(A.lastSavedAt ?? 0, B.lastSavedAt ?? 0),
    characterCreated: A.characterCreated || B.characterCreated,
    gender: fresher.gender,
    appearance: fresher.appearance,
    localUsername: fresher.localUsername ?? A.localUsername ?? B.localUsername,
    ownedTitles,
    titleId,
    fishing: mergeHarborFishingBag(A.fishing ?? emptyHarborFishingBag(), B.fishing ?? emptyHarborFishingBag()),
    beautyOwned: sanitizeHarborBeautyOwned([...(A.beautyOwned ?? []), ...(B.beautyOwned ?? [])]),
    showoff: mergeHarborShowoffBag(
      A.showoff ?? emptyHarborShowoffBag(),
      B.showoff ?? emptyHarborShowoffBag(),
    ),
  }
}

export function harborProgressEqual(a: HarborProgress, b: HarborProgress): boolean {
  if (a.correctCount !== b.correctCount) return false
  if ((a.gold ?? 0) !== (b.gold ?? 0)) return false
  if ((a.xp ?? 0) !== (b.xp ?? 0)) return false
  if (a.cleared.length !== b.cleared.length) return false
  const aClear = [...a.cleared].sort()
  const bClear = [...b.cleared].sort()
  for (let i = 0; i < aClear.length; i++) if (aClear[i] !== bClear[i]) return false
  const aKeys = Object.keys(a.stepCursor)
  const bKeys = Object.keys(b.stepCursor)
  if (aKeys.length !== bKeys.length) return false
  for (const k of aKeys) {
    if ((a.stepCursor[k] ?? 0) !== (b.stepCursor[k] ?? 0)) return false
  }
  const aM = Object.keys(a.missionClears ?? {})
  const bM = Object.keys(b.missionClears ?? {})
  if (aM.length !== bM.length) return false
  for (const k of aM) {
    if ((a.missionClears[k] ?? 0) !== (b.missionClears[k] ?? 0)) return false
  }
  if ((a.coins ?? 0) !== (b.coins ?? 0)) return false
  if ((a.lastSavedAt ?? 0) !== (b.lastSavedAt ?? 0)) return false
  const aOwn = [...(a.owned ?? [])].sort()
  const bOwn = [...(b.owned ?? [])].sort()
  if (aOwn.length !== bOwn.length) return false
  for (let i = 0; i < aOwn.length; i++) if (aOwn[i] !== bOwn[i]) return false
  const aBank = [...(a.banked ?? [])].sort()
  const bBank = [...(b.banked ?? [])].sort()
  if (aBank.length !== bBank.length) return false
  for (let i = 0; i < aBank.length; i++) if (aBank[i] !== bBank[i]) return false
  for (const slot of LOOK_SLOTS) {
    if ((a.look?.[slot] ?? '') !== (b.look?.[slot] ?? '')) return false
  }
  if (Boolean(a.characterCreated) !== Boolean(b.characterCreated)) return false
  if (a.gender !== b.gender) return false
  if (!appearanceEqual(a.appearance, b.appearance)) return false
  if ((a.localUsername ?? null) !== (b.localUsername ?? null)) return false
  const aT = [...(a.ownedTitles ?? [])].sort()
  const bT = [...(b.ownedTitles ?? [])].sort()
  if (aT.length !== bT.length) return false
  for (let i = 0; i < aT.length; i++) if (aT[i] !== bT[i]) return false
  if ((a.titleId ?? null) !== (b.titleId ?? null)) return false
  const aB = [...(a.beautyOwned ?? [])].sort()
  const bB = [...(b.beautyOwned ?? [])].sort()
  if (aB.length !== bB.length) return false
  for (let i = 0; i < aB.length; i++) if (aB[i] !== bB[i]) return false
  const aS = [...(a.showoff?.owned ?? [])].sort()
  const bS = [...(b.showoff?.owned ?? [])].sort()
  if (aS.length !== bS.length) return false
  for (let i = 0; i < aS.length; i++) if (aS[i] !== bS[i]) return false
  if ((a.showoff?.look.nametag ?? '') !== (b.showoff?.look.nametag ?? '')) return false
  return true
}

export function isLevelCleared(levelId: string, progress: HarborProgress): boolean {
  return progress.cleared.includes(levelId)
}

export function isLevelUnlocked(
  levelId: string,
  orderedIds: string[],
  progress: HarborProgress,
): boolean {
  const i = orderedIds.indexOf(levelId)
  if (i <= 0) return true
  const prev = orderedIds[i - 1]!
  return progress.cleared.includes(prev)
}
