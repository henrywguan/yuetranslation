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
import { HARBOR_LEVELS } from './curriculum'
import {
  HARBOR_STARTER_OWNED,
  harborGearById,
  sanitizeHarborLook,
  sanitizeOwnedGear,
  type HarborGearId,
  type HarborGearSlot,
  type HarborLook,
} from './harborGear'

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

/** Stamp a visit to the Save Shack (persists look + progress timestamp). */
export function visitSaveShack(): HarborProgress {
  const p = read()
  const next = commit({
    ...p,
    look: sanitizeHarborLook(p.look),
    owned: sanitizeOwnedGear(p.owned),
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
  const owned = new Set(sanitizeOwnedGear(p.owned))
  if (owned.has(id)) return { ok: false, reason: 'Already owned.' }
  const price = Math.max(0, Math.floor(item.price))
  const coins = Math.max(0, Math.floor(p.coins))
  if (coins < price) return { ok: false, reason: 'Not enough coins.' }
  owned.add(id)
  const look: HarborLook = { ...sanitizeHarborLook(p.look), [item.slot]: id }
  const progress = commit({
    ...p,
    coins: coins - price,
    owned: sanitizeOwnedGear([...owned]),
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
  if (item.slot !== slot) return { ok: false, reason: 'Wrong slot.' }
  const p = read()
  const owned = new Set(sanitizeOwnedGear(p.owned.length ? p.owned : [...HARBOR_STARTER_OWNED]))
  if (!owned.has(id)) return { ok: false, reason: 'Not owned — buy it first.' }
  const look: HarborLook = { ...sanitizeHarborLook(p.look), [slot]: id }
  const progress = commit({
    ...p,
    owned: [...owned],
    look: sanitizeHarborLook(look),
  })
  flushHarborProgressCloud(progress)
  return { ok: true, progress }
}

export function markLevelCleared(levelId: string) {
  const p = read()
  if (!p.cleared.includes(levelId)) p.cleared = [...p.cleared, levelId]
  return commit(p)
}

export function resetHarborProgress() {
  return commit(emptyHarborProgress())
}

/**
 * Load local + account progress after Learn open / sign-in.
 * Always writes the merged result locally; pushes cloud when local was ahead.
 */
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
