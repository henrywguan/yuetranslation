/** Pure Harbor Quest progress helpers (no DOM / auth imports — smoke-safe). */

export type HarborProgress = {
  /** Level ids cleared (last step completed). */
  cleared: string[]
  /** Highest step index reached per level (inclusive, 0-based). */
  stepCursor: Record<string, number>
  /** Total correct answers (lifetime). */
  correctCount: number
  /** Gold earned from arena minigames (lifetime). */
  gold: number
}

export function emptyHarborProgress(): HarborProgress {
  return { cleared: [], stepCursor: {}, correctCount: 0, gold: 0 }
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
    typeof o.gold === 'number' && Number.isFinite(o.gold) && o.gold >= 0
      ? Math.floor(o.gold)
      : 0
  return { cleared: clearedUnique, stepCursor, correctCount, gold }
}

/** Merge two progress blobs without losing pier clears or step depth. */
export function mergeHarborProgress(a: HarborProgress, b: HarborProgress): HarborProgress {
  const cleared = [...new Set([...a.cleared, ...b.cleared])]
  const stepCursor: Record<string, number> = { ...a.stepCursor }
  for (const [k, v] of Object.entries(b.stepCursor)) {
    stepCursor[k] = Math.max(stepCursor[k] ?? 0, v)
  }
  return {
    cleared,
    stepCursor,
    correctCount: Math.max(a.correctCount, b.correctCount),
    gold: Math.max(a.gold, b.gold),
  }
}

export function harborProgressEqual(a: HarborProgress, b: HarborProgress): boolean {
  if (a.correctCount !== b.correctCount) return false
  if (a.gold !== b.gold) return false
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
