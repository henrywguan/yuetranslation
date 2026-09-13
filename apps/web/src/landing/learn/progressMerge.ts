/** Pure Harbor Quest progress helpers (no DOM / auth imports — smoke-safe). */

export type HarborProgress = {
  /** Level ids cleared (last step completed). */
  cleared: string[]
  /** Highest step index reached per level (inclusive, 0-based). */
  stepCursor: Record<string, number>
  /** Total correct answers (lifetime). */
  correctCount: number
  /** Ferry coins for the riverside outfitter. */
  coins: number
  /** Owned gear ids (hats, tops, bottoms, shoes, handhelds). */
  owned: string[]
  /** Equipped look / character outfit. */
  look: import('./harborGear').HarborLook
  /** Last Save Shack stamp (ms). */
  lastSavedAt: number
}

export function emptyHarborProgress(): HarborProgress {
  // Lazy import-free defaults mirrored from harborGear starters
  return {
    cleared: [],
    stepCursor: {},
    correctCount: 0,
    coins: 40,
    owned: [
      'hat-straw',
      'top-harbor',
      'bottom-travel',
      'shoes-leather',
      'hand-none',
    ],
    look: {
      hat: 'hat-straw',
      top: 'top-harbor',
      bottom: 'bottom-travel',
      shoes: 'shoes-leather',
      hand: 'hand-none',
    },
    lastSavedAt: 0,
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
  const seen = new Set<string>()
  const clearedUnique: string[] = []
  for (const id of cleared) {
    if (seen.has(id)) continue
    seen.add(id)
    clearedUnique.push(id)
  }
  let coins = 40
  if (typeof o.coins === 'number' && Number.isFinite(o.coins) && o.coins >= 0) {
    coins = Math.min(Math.floor(o.coins), 1_000_000)
  }
  const look = sanitizeLookInline(o.look)
  const owned = sanitizeOwnedInline(o.owned)
  const lastSavedAt =
    typeof o.lastSavedAt === 'number' && Number.isFinite(o.lastSavedAt) && o.lastSavedAt >= 0
      ? Math.floor(o.lastSavedAt)
      : 0
  return { cleared: clearedUnique, stepCursor, correctCount, coins, owned, look, lastSavedAt }
}

const LOOK_SLOTS = ['hat', 'top', 'bottom', 'shoes', 'hand'] as const
const STARTER_OWNED = [
  'hat-straw',
  'top-harbor',
  'bottom-travel',
  'shoes-leather',
  'hand-none',
] as const
const DEFAULT_LOOK = {
  hat: 'hat-straw',
  top: 'top-harbor',
  bottom: 'bottom-travel',
  shoes: 'shoes-leather',
  hand: 'hand-none',
} as const
const KNOWN_GEAR = new Set([
  'hat-straw','hat-bamboo','hat-scholar','hat-fisherman','hat-festival',
  'top-harbor','top-jade','top-merchant','top-ferry','top-night',
  'bottom-travel','bottom-slate','bottom-reed','bottom-crimson','bottom-ink',
  'shoes-leather','shoes-straw','shoes-lacquer','shoes-jade','shoes-storm',
  'hand-none','hand-fan','hand-lantern','hand-oar','hand-scroll',
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

function sanitizeOwnedInline(raw: unknown): string[] {
  const set = new Set<string>(STARTER_OWNED)
  if (Array.isArray(raw)) {
    for (const id of raw) {
      if (typeof id === 'string' && KNOWN_GEAR.has(id)) set.add(id)
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
  const owned = [...new Set([...A.owned, ...B.owned])]
  // Prefer the look from the fresher Save Shack stamp
  const look = (B.lastSavedAt ?? 0) >= (A.lastSavedAt ?? 0) ? B.look : A.look
  return {
    cleared,
    stepCursor,
    correctCount: Math.max(A.correctCount, B.correctCount),
    coins: Math.max(A.coins ?? 0, B.coins ?? 0),
    owned,
    look: look ?? A.look,
    lastSavedAt: Math.max(A.lastSavedAt ?? 0, B.lastSavedAt ?? 0),
  }
}

export function harborProgressEqual(a: HarborProgress, b: HarborProgress): boolean {
  if (a.correctCount !== b.correctCount) return false
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
  if ((a.coins ?? 0) !== (b.coins ?? 0)) return false
  if ((a.lastSavedAt ?? 0) !== (b.lastSavedAt ?? 0)) return false
  const aOwn = [...(a.owned ?? [])].sort()
  const bOwn = [...(b.owned ?? [])].sort()
  if (aOwn.length !== bOwn.length) return false
  for (let i = 0; i < aOwn.length; i++) if (aOwn[i] !== bOwn[i]) return false
  for (const slot of LOOK_SLOTS) {
    if ((a.look?.[slot] ?? '') !== (b.look?.[slot] ?? '')) return false
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
