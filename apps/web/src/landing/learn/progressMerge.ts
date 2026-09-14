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
}

export function emptyHarborProgress(): HarborProgress {
  // Lazy import-free defaults mirrored from harborGear starters
  return {
    cleared: [],
    stepCursor: {},
    correctCount: 0,
    gold: 0,
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
  const seen = new Set<string>()
  const clearedUnique: string[] = []
  for (const id of cleared) {
    if (seen.has(id)) continue
    seen.add(id)
    clearedUnique.push(id)
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
  return { cleared: clearedUnique, stepCursor, correctCount, gold, coins, owned, banked, look, lastSavedAt }
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
  'hat-straw','hat-bamboo','hat-scholar','hat-fisherman','hat-festival','top-harbor','top-jade','top-merchant','top-ferry','top-night','bottom-travel','bottom-slate','bottom-reed','bottom-crimson','bottom-ink','shoes-leather','shoes-straw','shoes-lacquer','shoes-jade','shoes-storm','hand-none','hand-fan','hand-lantern','hand-oar','hand-scroll','boat-canoe','boat-reed','boat-bamboo','boat-sampan','boat-barge','boat-junk','boat-scholar','boat-merchant','boat-jade','boat-dragon','boat-pearl','boat-imperial','lantern-paper-amber','lantern-paper-crimson','lantern-paper-jade','lantern-silk-gold','lantern-silk-azure','lantern-oil-iron','lantern-glass-ruby','lantern-glass-sapphire','lantern-porcelain','lantern-phoenix','lantern-dragon','lantern-starlight',
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
  return {
    cleared,
    stepCursor,
    correctCount: Math.max(A.correctCount, B.correctCount),
    gold: Math.max(A.gold ?? 0, B.gold ?? 0),
    coins: Math.max(A.coins ?? 0, B.coins ?? 0),
    owned,
    banked,
    look: look ?? A.look,
    lastSavedAt: Math.max(A.lastSavedAt ?? 0, B.lastSavedAt ?? 0),
  }
}

export function harborProgressEqual(a: HarborProgress, b: HarborProgress): boolean {
  if (a.correctCount !== b.correctCount) return false
  if ((a.gold ?? 0) !== (b.gold ?? 0)) return false
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
  const aBank = [...(a.banked ?? [])].sort()
  const bBank = [...(b.banked ?? [])].sort()
  if (aBank.length !== bBank.length) return false
  for (let i = 0; i < aBank.length; i++) if (aBank[i] !== bBank[i]) return false
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
