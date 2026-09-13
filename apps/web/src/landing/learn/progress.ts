/** Local progress for Harbor Quest (`#/learn`). */

const STORAGE_KEY = 'yue-harbor-quest-v1'

export type HarborProgress = {
  /** Level ids cleared (last step completed). */
  cleared: string[]
  /** Highest step index reached per level (inclusive, 0-based). */
  stepCursor: Record<string, number>
  /** Total correct answers (lifetime). */
  correctCount: number
}

const EMPTY: HarborProgress = {
  cleared: [],
  stepCursor: {},
  correctCount: 0,
}

function read(): HarborProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...EMPTY, cleared: [], stepCursor: {} }
    const parsed = JSON.parse(raw) as Partial<HarborProgress>
    return {
      cleared: Array.isArray(parsed.cleared) ? parsed.cleared.filter((x) => typeof x === 'string') : [],
      stepCursor:
        parsed.stepCursor && typeof parsed.stepCursor === 'object' ? { ...parsed.stepCursor } : {},
      correctCount: typeof parsed.correctCount === 'number' ? parsed.correctCount : 0,
    }
  } catch {
    return { ...EMPTY, cleared: [], stepCursor: {} }
  }
}

function write(p: HarborProgress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  } catch {
    /* private mode */
  }
}

export function loadHarborProgress(): HarborProgress {
  return read()
}

export function isLevelCleared(levelId: string, progress = read()): boolean {
  return progress.cleared.includes(levelId)
}

export function isLevelUnlocked(levelId: string, orderedIds: string[], progress = read()): boolean {
  const i = orderedIds.indexOf(levelId)
  if (i <= 0) return true
  const prev = orderedIds[i - 1]!
  return progress.cleared.includes(prev)
}

export function markStepReached(levelId: string, stepIndex: number) {
  const p = read()
  const prev = p.stepCursor[levelId] ?? 0
  if (stepIndex > prev) p.stepCursor[levelId] = stepIndex
  write(p)
  return p
}

export function markCorrect() {
  const p = read()
  p.correctCount += 1
  write(p)
  return p
}

export function markLevelCleared(levelId: string) {
  const p = read()
  if (!p.cleared.includes(levelId)) p.cleared = [...p.cleared, levelId]
  write(p)
  return p
}

export function resetHarborProgress() {
  write({ cleared: [], stepCursor: {}, correctCount: 0 })
}
