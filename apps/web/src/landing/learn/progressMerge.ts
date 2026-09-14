/** Pure Harbor Quest progress helpers (no DOM / auth imports — smoke-safe). */

export type HarborProgress = {
  /** Level ids cleared at least once (last step completed). */
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
}

export function emptyHarborProgress(): HarborProgress {
  return { cleared: [], stepCursor: {}, correctCount: 0, gold: 0, xp: 0, missionClears: {} }
}

function sanitizeMissionClears(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof k !== 'string' || !k || k.length >= 80) continue
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) continue
    out[k] = Math.min(Math.floor(v), 100_000)
  }
  return out
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
  const seen = new Set<string>()
  const clearedUnique: string[] = []
  for (const id of cleared) {
    if (seen.has(id)) continue
    seen.add(id)
    clearedUnique.push(id)
  }
  const gold =
    typeof o.gold === 'number' && Number.isFinite(o.gold) && o.gold >= 0 ? Math.floor(o.gold) : 0
  const xp = typeof o.xp === 'number' && Number.isFinite(o.xp) && o.xp >= 0 ? Math.floor(o.xp) : 0
  const missionClears = sanitizeMissionClears(o.missionClears)
  // Backfill: if a pier is cleared but has no clear count, treat as 1.
  for (const id of clearedUnique) {
    if ((missionClears[id] ?? 0) < 1) missionClears[id] = 1
  }
  return { cleared: clearedUnique, stepCursor, correctCount, gold, xp, missionClears }
}

/** Merge two progress blobs without losing pier clears, XP, or clear counts. */
export function mergeHarborProgress(a: HarborProgress, b: HarborProgress): HarborProgress {
  const cleared = [...new Set([...a.cleared, ...b.cleared])]
  const stepCursor: Record<string, number> = { ...a.stepCursor }
  for (const [k, v] of Object.entries(b.stepCursor)) {
    stepCursor[k] = Math.max(stepCursor[k] ?? 0, v)
  }
  const missionClears: Record<string, number> = { ...a.missionClears }
  for (const [k, v] of Object.entries(b.missionClears)) {
    missionClears[k] = Math.max(missionClears[k] ?? 0, v)
  }
  for (const id of cleared) {
    if ((missionClears[id] ?? 0) < 1) missionClears[id] = 1
  }
  return {
    cleared,
    stepCursor,
    correctCount: Math.max(a.correctCount, b.correctCount),
    gold: Math.max(a.gold, b.gold),
    xp: Math.max(a.xp, b.xp),
    missionClears,
  }
}

export function harborProgressEqual(a: HarborProgress, b: HarborProgress): boolean {
  if (a.correctCount !== b.correctCount) return false
  if (a.gold !== b.gold) return false
  if (a.xp !== b.xp) return false
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
  const aM = Object.keys(a.missionClears)
  const bM = Object.keys(b.missionClears)
  if (aM.length !== bM.length) return false
  for (const k of aM) {
    if ((a.missionClears[k] ?? 0) !== (b.missionClears[k] ?? 0)) return false
  }
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
