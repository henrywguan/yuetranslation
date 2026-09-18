/**
 * Harbor Quest progress — localStorage + optional cloud sync when signed in.
 * Merge is monotonic (union cleared, max step/correct) so devices never lose progress.
 */

import { fetchHarborQuestProgress, putHarborQuestProgress } from '../../lib/api'
import { getSession } from '../../lib/auth'
import {
  emptyHarborProgress,
  harborProgressEqual,
  isLevelCleared as isLevelClearedPure,
  isLevelUnlocked as isLevelUnlockedPure,
  mergeHarborProgress,
  sanitizeHarborProgress,
  type HarborProgress,
} from './progressMerge'
import { sanitizeHarborFishingBag, type HarborFishingBag } from './harborFishing'
import { HARBOR_LEVELS } from './curriculum'
import {
  HARBOR_DEFAULT_LOOK,
  HARBOR_STARTER_OWNED,
  harborGearById,
  harborGearCanEquipToSlot,
  sanitizeBankedGear,
  sanitizeCarriedGear,
  sanitizeHarborLook,
  type HarborGearId,
  type HarborGearSlot,
  type HarborLook,
} from './harborGear'
import { missionXpAward } from './xpRewards'
import {
  sanitizeHarborAppearance,
  sanitizeHarborGender,
  type HarborAppearance,
  type HarborGender,
} from './harborAppearance'
import { HARBOR_GOLD_TO_COINS } from './matchDefinitionBank'

export type { HarborProgress }
export {
  emptyHarborProgress,
  harborProgressEqual,
  mergeHarborProgress,
  sanitizeHarborProgress,
}

/** Coins awarded per correct answer (quest + practice). */
export const HARBOR_COINS_PER_CORRECT = 8

const STORAGE_KEY = 'yue-harbor-quest-v1'

function read(): HarborProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyHarborProgress()
    return sanitizeHarborProgress(JSON.parse(raw))
  } catch {
    return emptyHarborProgress()
  }
}

function write(p: HarborProgress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  } catch {
    /* private mode */
  }
}

let persistLoggedIn = false
let persistTimer: ReturnType<typeof setTimeout> | null = null

export function setHarborPersistLoggedIn(loggedIn: boolean) {
  persistLoggedIn = loggedIn
}

function scheduleCloudPush(p: HarborProgress) {
  if (!persistLoggedIn) return
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    persistTimer = null
    void putHarborQuestProgress(p).catch(() => {
      /* offline — local still kept */
    })
  }, 700)
}

/** Push the full progress blob to Supabase now (Save Shack / critical writes). */
function flushHarborProgressCloud(p: HarborProgress) {
  if (!persistLoggedIn) return
  if (persistTimer) {
    clearTimeout(persistTimer)
    persistTimer = null
  }
  void putHarborQuestProgress(p).catch(() => {
    /* offline — local still kept */
  })
}

function commit(p: HarborProgress): HarborProgress {
  write(p)
  scheduleCloudPush(p)
  return p
}

export function loadHarborProgress(): HarborProgress {
  return read()
}

export function isLevelCleared(levelId: string, progress = read()): boolean {
  return isLevelClearedPure(levelId, progress)
}

export function isLevelUnlocked(levelId: string, orderedIds: string[], progress = read()): boolean {
  return isLevelUnlockedPure(levelId, orderedIds, progress)
}

/** Next pier to sail: first unlocked uncleared level, else the final chart stop. */
export function continueHarborLevelId(progress = read()): string {
  const ids = HARBOR_LEVELS.map((l) => l.id)
  for (const id of ids) {
    if (!isLevelCleared(id, progress) && isLevelUnlocked(id, ids, progress)) return id
  }
  return ids[ids.length - 1] ?? ids[0]!
}

export function markStepReached(levelId: string, stepIndex: number) {
  const p = read()
  const prev = p.stepCursor[levelId] ?? 0
  if (stepIndex > prev) p.stepCursor[levelId] = stepIndex
  return commit(p)
}

export function markCorrect() {
  const p = read()
  p.correctCount += 1
  p.coins = Math.max(0, Math.floor(p.coins)) + HARBOR_COINS_PER_CORRECT
  return commit(p)
}

/** Delve hit: +1 correctCount and delve coins (not pier coin amount). */
export function markDelveHit(coins: number): HarborProgress {
  const p = read()
  const n = Math.max(0, Math.floor(coins))
  p.correctCount += 1
  p.coins = Math.max(0, Math.floor(p.coins)) + n
  return commit(p)
}

/** Grant a cosmetic title if not already owned. */
export function awardHarborTitle(titleId: string): HarborProgress {
  const p = read()
  const owned = [...(p.ownedTitles ?? [])]
  if (!owned.includes(titleId)) owned.push(titleId)
  return commit({
    ...p,
    ownedTitles: owned,
    titleId: p.titleId ?? titleId,
  })
}

/** Replace local progress after a server gift response. */
export function replaceHarborProgress(next: HarborProgress): HarborProgress {
  return commit(sanitizeHarborProgress(next))
}

/** Persist Guan fishing bag (+ optional coin delta from buy/sell). */
export function updateHarborFishing(fishing: HarborFishingBag, coinsDelta = 0): HarborProgress {
  const p = read()
  const coins = Math.max(0, Math.floor((p.coins ?? 0) + coinsDelta))
  return commit({
    ...p,
    fishing: sanitizeHarborFishingBag(fishing),
    coins,
    lastSavedAt: Date.now(),
  })
}

export function markGoldEarned(amount: number) {
  const p = read()
  const n = Math.max(0, Math.floor(amount))
  if (n > 0) p.gold = Math.max(0, Math.floor(p.gold ?? 0)) + n
  return commit(p)
}

/** Arena gold → ferry coins for the River Outfitter. `goldAmount` of 0 exchanges all. */
export function exchangeGoldForCoins(
  goldAmount = 0,
):
  | { ok: true; progress: HarborProgress; coinsGained: number; goldSpent: number }
  | { ok: false; reason: string } {
  const p = read()
  const have = Math.max(0, Math.floor(p.gold ?? 0))
  if (have <= 0) return { ok: false, reason: 'No arena gold to exchange.' }
  const want = goldAmount > 0 ? Math.floor(goldAmount) : have
  const spend = Math.min(have, Math.max(0, want))
  if (spend <= 0) return { ok: false, reason: 'Pick an amount of gold to exchange.' }
  const coinsGained = spend * HARBOR_GOLD_TO_COINS
  const progress = commit({
    ...p,
    gold: have - spend,
    coins: Math.max(0, Math.floor(p.coins)) + coinsGained,
  })
  return { ok: true, progress, coinsGained, goldSpent: spend }
}

export { HARBOR_GOLD_TO_COINS }

/** Stamp a visit to the Save Shack (persists look + progress timestamp). */
export function visitSaveShack(): HarborProgress {
  const p = read()
  const banked = sanitizeBankedGear(p.banked)
  const next = commit({
    ...p,
    look: sanitizeHarborLook(p.look),
    owned: sanitizeCarriedGear(p.owned, banked),
    banked,
    lastSavedAt: Date.now(),
  })
  // Save Shack is an explicit cloud checkpoint — don't wait on the debounce.
  flushHarborProgressCloud(next)
  return next
}

export function buyHarborGear(
  id: HarborGearId,
): { ok: true; progress: HarborProgress } | { ok: false; reason: string } {
  const item = harborGearById(id)
  if (!item) return { ok: false, reason: 'Unknown item.' }
  const p = read()
  const banked = new Set(sanitizeBankedGear(p.banked))
  if (banked.has(id)) return { ok: false, reason: 'Already in the bank — withdraw it first.' }
  const owned = new Set(sanitizeCarriedGear(p.owned, banked))
  if (owned.has(id)) return { ok: false, reason: 'Already owned.' }
  const price = Math.max(0, Math.floor(item.price))
  const coins = Math.max(0, Math.floor(p.coins))
  if (coins < price) return { ok: false, reason: 'Not enough coins.' }
  owned.add(id)
  const look: HarborLook = { ...sanitizeHarborLook(p.look), [item.slot]: id }
  const progress = commit({
    ...p,
    coins: coins - price,
    owned: sanitizeCarriedGear([...owned], banked),
    banked: [...banked] as HarborGearId[],
    look: sanitizeHarborLook(look),
  })
  flushHarborProgressCloud(progress)
  return { ok: true, progress }
}

export function equipHarborGear(
  slot: HarborGearSlot,
  id: HarborGearId,
): { ok: true; progress: HarborProgress } | { ok: false; reason: string } {
  const item = harborGearById(id)
  if (!item) return { ok: false, reason: 'Unknown item.' }
  if (!harborGearCanEquipToSlot(item, slot)) return { ok: false, reason: 'Wrong slot.' }
  const p = read()
  const banked = sanitizeBankedGear(p.banked)
  const owned = new Set(
    sanitizeCarriedGear(p.owned.length ? p.owned : [...HARBOR_STARTER_OWNED], banked),
  )
  if (!owned.has(id)) return { ok: false, reason: 'Not in your pack — buy or withdraw it first.' }
  const look: HarborLook = { ...sanitizeHarborLook(p.look), [slot]: id }
  const progress = commit({
    ...p,
    owned: [...owned],
    banked,
    look: sanitizeHarborLook(look),
  })
  flushHarborProgressCloud(progress)
  return { ok: true, progress }
}


/** Move a carried piece into the Harbor Bank (starters stay on the Scout). */
export function depositHarborGear(
  id: HarborGearId,
): { ok: true; progress: HarborProgress } | { ok: false; reason: string } {
  const item = harborGearById(id)
  if (!item) return { ok: false, reason: 'Unknown item.' }
  if ((HARBOR_STARTER_OWNED as readonly string[]).includes(id)) {
    return { ok: false, reason: 'Starter gear stays with the Scout.' }
  }
  const p = read()
  const banked = new Set(sanitizeBankedGear(p.banked))
  if (banked.has(id)) return { ok: false, reason: 'Already banked.' }
  const owned = new Set(sanitizeCarriedGear(p.owned, banked))
  if (!owned.has(id)) return { ok: false, reason: 'Not in your pack.' }
  owned.delete(id)
  banked.add(id)
  let look = sanitizeHarborLook(p.look)
  if (look[item.slot] === id) {
    look = { ...look, [item.slot]: HARBOR_DEFAULT_LOOK[item.slot] }
  }
  // Lanterns may also be held — clear the hand if this piece was carried there.
  if (item.slot === 'lantern' && look.hand === id) {
    look = { ...look, hand: HARBOR_DEFAULT_LOOK.hand }
  }
  const progress = commit({
    ...p,
    owned: sanitizeCarriedGear([...owned], banked),
    banked: sanitizeBankedGear([...banked]),
    look,
  })
  flushHarborProgressCloud(progress)
  return { ok: true, progress }
}

/** Withdraw a banked piece back into the Scout's pack. */
export function withdrawHarborGear(
  id: HarborGearId,
): { ok: true; progress: HarborProgress } | { ok: false; reason: string } {
  const item = harborGearById(id)
  if (!item) return { ok: false, reason: 'Unknown item.' }
  const p = read()
  const banked = new Set(sanitizeBankedGear(p.banked))
  if (!banked.has(id)) return { ok: false, reason: 'Not in the bank.' }
  banked.delete(id)
  const owned = new Set(sanitizeCarriedGear(p.owned, banked))
  owned.add(id)
  const progress = commit({
    ...p,
    owned: sanitizeCarriedGear([...owned], banked),
    banked: sanitizeBankedGear([...banked]),
    look: sanitizeHarborLook(p.look),
  })
  flushHarborProgressCloud(progress)
  return { ok: true, progress }
}

export type MissionClearResult = {
  progress: HarborProgress
  /** XP granted for this clear (full on first, half on repeats). */
  xpGained: number
  /** True when this pier was already cleared before. */
  repeat: boolean
  /** Times completed after this clear. */
  clearCount: number
}

/**
 * Complete a pier mission.
 * First clear → full `baseXp`; every repeat → 50% of `baseXp` (floored).
 */
export function markLevelCleared(levelId: string, baseXp = 0): MissionClearResult {
  const p = read()
  const prior = p.missionClears[levelId] ?? 0
  const award = missionXpAward(baseXp, prior)
  p.missionClears[levelId] = prior + 1
  if (!p.cleared.includes(levelId)) p.cleared = [...p.cleared, levelId]
  if (award > 0) p.xp = Math.max(0, Math.floor(p.xp ?? 0)) + award
  return {
    progress: commit(p),
    xpGained: award,
    repeat: prior > 0,
    clearCount: prior + 1,
  }
}

export function resetHarborProgress() {
  return commit(emptyHarborProgress())
}

/**
 * Load local + account progress after Learn open / sign-in.
 * Always writes the merged result locally; pushes cloud when local was ahead.
 */

/** Persist first-time character creation (gender, looks, optional local username). */
export function completeHarborCharacter(input: {
  gender: HarborGender
  appearance: HarborAppearance
  look?: HarborLook
  localUsername?: string | null
}): HarborProgress {
  const p = read()
  const username =
    typeof input.localUsername === 'string' && input.localUsername.trim()
      ? input.localUsername.trim().slice(0, 24)
      : p.localUsername
  const titles = [...(p.ownedTitles ?? [])]
  if (!titles.includes('title-river-scout')) titles.push('title-river-scout')
  const next = commit({
    ...p,
    characterCreated: true,
    gender: sanitizeHarborGender(input.gender),
    appearance: sanitizeHarborAppearance(input.appearance),
    look: input.look ? sanitizeHarborLook(input.look) : sanitizeHarborLook(p.look),
    localUsername: username,
    ownedTitles: titles,
    titleId: p.titleId ?? 'title-river-scout',
    lastSavedAt: Date.now(),
  })
  flushHarborProgressCloud(next)
  return next
}

/** Save a guest display name without re-running full character create. */
export function setHarborLocalUsername(username: string): HarborProgress {
  const p = read()
  const next = commit({
    ...p,
    localUsername: username.trim().slice(0, 24) || null,
    lastSavedAt: Date.now(),
  })
  flushHarborProgressCloud(next)
  return next
}

export async function hydrateHarborProgress(loggedIn?: boolean): Promise<HarborProgress> {
  const session = loggedIn === undefined ? await getSession() : null
  const isLoggedIn = loggedIn ?? Boolean(session)
  setHarborPersistLoggedIn(isLoggedIn)

  const local = read()
  if (!isLoggedIn) return local

  try {
    const remoteRaw = await fetchHarborQuestProgress()
    if (!remoteRaw) return local
    const remote = sanitizeHarborProgress(remoteRaw)
    const merged = mergeHarborProgress(local, remote)
    write(merged)
    if (!harborProgressEqual(merged, remote)) {
      void putHarborQuestProgress(merged).catch(() => {
        /* offline */
      })
    }
    return merged
  } catch {
    return local
  }
}
