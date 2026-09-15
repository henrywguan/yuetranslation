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
import { missionXpAward } from './xpRewards'

export type { HarborProgress }
export {
  emptyHarborProgress,
  harborProgressEqual,
  mergeHarborProgress,
  sanitizeHarborProgress,
}

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

export function markStepReached(levelId: string, stepIndex: number) {
  const p = read()
  const prev = p.stepCursor[levelId] ?? 0
  if (stepIndex > prev) p.stepCursor[levelId] = stepIndex
  return commit(p)
}

export function markCorrect() {
  const p = read()
  p.correctCount += 1
  return commit(p)
}

export function markGoldEarned(amount: number) {
  const p = read()
  const n = Math.max(0, Math.floor(amount))
  if (n > 0) p.gold += n
  return commit(p)
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
  if (award > 0) p.xp += award
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
