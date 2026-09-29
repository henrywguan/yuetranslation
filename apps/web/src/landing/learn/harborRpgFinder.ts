/**
 * HarborRPG Dungeon Finder — soft role queue (tank / heal / dps) + companion fill.
 */
import {
  HARBOR_RPG_ZONE_META,
  type HarborRpgZoneId,
} from './harborRpgData'
import {
  HARBOR_RPG_CLASS_DEFS,
  type HarborRpgClassId,
  type HarborRpgClassRole,
} from './harborRpgClasses'

export const HARBOR_RPG_FINDER_ROLES = ['tank', 'heal', 'dps'] as const
export type HarborRpgFinderRole = (typeof HARBOR_RPG_FINDER_ROLES)[number]

/** Instanced dungeons the finder can queue for. */
export const HARBOR_RPG_FINDER_DUNGEONS = [
  'crypt',
  'tidehollow',
  'chronicle',
  'echoisle',
  'tideraid',
] as const
export type HarborRpgFinderDungeon = (typeof HARBOR_RPG_FINDER_DUNGEONS)[number]

export function isHarborRpgFinderDungeon(raw: unknown): raw is HarborRpgFinderDungeon {
  return (
    typeof raw === 'string' &&
    (HARBOR_RPG_FINDER_DUNGEONS as readonly string[]).includes(raw)
  )
}

export function classRoleToFinderRole(role: HarborRpgClassRole): HarborRpgFinderRole {
  if (role === 'tank') return 'tank'
  if (role === 'healer') return 'heal'
  return 'dps'
}

export function finderRoleFromClassId(classId: HarborRpgClassId | null): HarborRpgFinderRole {
  if (!classId) return 'dps'
  return classRoleToFinderRole(HARBOR_RPG_CLASS_DEFS[classId].role)
}

export type HarborRpgFinderListing = {
  userId: string
  username: string
  role: HarborRpgFinderRole
  dungeon: HarborRpgFinderDungeon
  t: number
}

/** Ideal soft party: 1 tank · 1 heal · 3 dps (cap 5). */
export const HARBOR_RPG_FINDER_SOFT_COMP = {
  tank: 1,
  heal: 1,
  dps: 3,
} as const

export function countFinderRoles(
  roles: readonly HarborRpgFinderRole[],
): Record<HarborRpgFinderRole, number> {
  const out: Record<HarborRpgFinderRole, number> = { tank: 0, heal: 0, dps: 0 }
  for (const r of roles) out[r] += 1
  return out
}

/** Roles still needed to fill a soft dungeon party. */
export function missingFinderRoles(
  present: readonly HarborRpgFinderRole[],
): HarborRpgFinderRole[] {
  const have = countFinderRoles(present)
  const need: HarborRpgFinderRole[] = []
  for (const role of HARBOR_RPG_FINDER_ROLES) {
    const short = HARBOR_RPG_FINDER_SOFT_COMP[role] - have[role]
    for (let i = 0; i < short; i++) need.push(role)
  }
  return need
}

/**
 * Remotes looking for the same dungeon whose roles complement self.
 * Prefers tank/heal first when self is dps.
 */
export function matchRpgFinderListings(opts: {
  selfRole: HarborRpgFinderRole
  dungeon: HarborRpgFinderDungeon
  listings: readonly HarborRpgFinderListing[]
  selfUserId: string
  max?: number
}): HarborRpgFinderListing[] {
  const max = opts.max ?? 4
  const pool = opts.listings.filter(
    (l) =>
      l.userId !== opts.selfUserId &&
      l.dungeon === opts.dungeon &&
      Date.now() - l.t < 120_000,
  )
  const present: HarborRpgFinderRole[] = [opts.selfRole]
  const picked: HarborRpgFinderListing[] = []
  const takeRole = (want: HarborRpgFinderRole) => {
    const idx = pool.findIndex(
      (l) => l.role === want && !picked.some((p) => p.userId === l.userId),
    )
    if (idx < 0) return false
    const row = pool[idx]!
    picked.push(row)
    present.push(row.role)
    return true
  }
  // Fill tank → heal → dps until soft cap or max invites
  while (picked.length < max) {
    const missing = missingFinderRoles(present)
    if (missing.length === 0) break
    let got = false
    for (const role of missing) {
      if (takeRole(role)) {
        got = true
        break
      }
    }
    if (!got) break
  }
  return picked
}

export function companionNameForRole(role: HarborRpgFinderRole): string {
  if (role === 'tank') return 'Ferry Shield'
  if (role === 'heal') return 'Mist Aide'
  return 'Lantern Scout'
}

export function finderDungeonLabel(dungeon: HarborRpgFinderDungeon): {
  en: string
  zh: string
} {
  const meta = HARBOR_RPG_ZONE_META[dungeon as HarborRpgZoneId]
  return { en: meta.en, zh: meta.zh }
}

export function isHarborRpgFinderRole(raw: unknown): raw is HarborRpgFinderRole {
  return typeof raw === 'string' && (HARBOR_RPG_FINDER_ROLES as readonly string[]).includes(raw)
}
