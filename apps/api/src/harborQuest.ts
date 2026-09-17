import type { Response } from 'express'
import type { AuthedRequest } from './auth.js'
import { requireAuth } from './auth.js'
import { env } from './env.js'
import { applyCosmeticGift, type HarborGiftKind } from './harborGift.js'
import { getMembershipForUser } from './household.js'
import { getAdmin, getProfile } from './supabase.js'
import { addHarborQuestCount } from './usage.js'

export type HarborQuestProgress = {
  cleared: string[]
  stepCursor: Record<string, number>
  correctCount: number
  /** Arena gold from Match the Definition (lifetime). */
  gold: number
  /** Experience points (lifetime). */
  xp: number
  /** Times each mission/pier has been completed. */
  missionClears: Record<string, number>
  coins: number
  owned: string[]
  banked: string[]
  look: {
    hat: string
    top: string
    bottom: string
    shoes: string
    hand: string
    boat: string
    lantern: string
  }
  lastSavedAt: number
  characterCreated?: boolean
  gender?: 'male' | 'female'
  appearance?: {
    skinTone: number
    hairStyle: string
    hairColor: number
  }
  localUsername?: string | null
  /** Cosmetic titles owned (giftable). */
  ownedTitles?: string[]
  /** Equipped title. */
  titleId?: string | null
}

export type HarborLeaderboardEntry = {
  rank: number
  userId: string
  displayName: string
  xp: number
  gold: number
  correctCount: number
  clearedCount: number
  isYou?: boolean
}

const DEFAULT_LOOK = {
  hat: 'hat-straw',
  top: 'top-harbor',
  bottom: 'bottom-travel',
  shoes: 'shoes-leather',
  hand: 'hand-none',
  boat: 'boat-canoe',
  lantern: 'lantern-paper-amber',
} as const

const STARTER_OWNED = Object.values(DEFAULT_LOOK)

const KNOWN_GEAR = new Set([
  'hat-straw','hat-bamboo','hat-scholar','hat-fisherman','hat-festival','top-harbor','top-jade','top-merchant','top-ferry','top-night','bottom-travel','bottom-slate','bottom-reed','bottom-crimson','bottom-ink','shoes-leather','shoes-straw','shoes-lacquer','shoes-jade','shoes-storm','hand-none','hand-fan','hand-lantern','hand-oar','hand-scroll','boat-canoe','boat-reed','boat-bamboo','boat-sampan','boat-barge','boat-junk','boat-scholar','boat-merchant','boat-jade','boat-dragon','boat-pearl','boat-imperial','lantern-paper-amber','lantern-paper-crimson','lantern-paper-jade','lantern-silk-gold','lantern-silk-azure','lantern-oil-iron','lantern-glass-ruby','lantern-glass-sapphire','lantern-porcelain','lantern-phoenix','lantern-dragon','lantern-starlight',
])

const EMPTY: HarborQuestProgress = {
  cleared: [],
  stepCursor: {},
  correctCount: 0,
  gold: 0,
  xp: 0,
  missionClears: {},
  coins: 40,
  owned: [...STARTER_OWNED],
  banked: [],
  look: { ...DEFAULT_LOOK },
  lastSavedAt: 0,
}

const LEADERBOARD_DEFAULT_LIMIT = 25
const LEADERBOARD_MAX_LIMIT = 50

/** Sanitize progress payloads from clients / DB. */
export function sanitizeHarborProgress(raw: unknown): HarborQuestProgress {
  if (!raw || typeof raw !== 'object') return { ...EMPTY, cleared: [], stepCursor: { ...EMPTY.stepCursor }, owned: [...EMPTY.owned], banked: [], look: { ...EMPTY.look } }
  const o = raw as Record<string, unknown>
  const cleared = Array.isArray(o.cleared)
    ? o.cleared.filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length < 80)
    : []
  const stepCursor: Record<string, number> = {}
  if (o.stepCursor && typeof o.stepCursor === 'object' && !Array.isArray(o.stepCursor)) {
    for (const [k, v] of Object.entries(o.stepCursor as Record<string, unknown>)) {
      if (typeof k !== 'string' || k.length === 0 || k.length >= 80) continue
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 10_000) continue
      stepCursor[k] = Math.floor(v)
    }
  }
  const correctCount =
    typeof o.correctCount === 'number' && Number.isFinite(o.correctCount) && o.correctCount >= 0
      ? Math.min(Math.floor(o.correctCount), 1_000_000)
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
  for (const id of cleared.slice(0, 200)) {
    if (seen.has(id)) continue
    seen.add(id)
    clearedUnique.push(id)
  }
  for (const id of clearedUnique) {
    if ((missionClears[id] ?? 0) < 1) missionClears[id] = 1
  }
  // Missing coins on an existing blob → 0 (starter purse only on empty/null via EMPTY).
  let coins = 0
  if (typeof o.coins === 'number' && Number.isFinite(o.coins) && o.coins >= 0) {
    coins = Math.min(Math.floor(o.coins), 1_000_000)
  }
  const look: HarborQuestProgress['look'] = { ...DEFAULT_LOOK }
  if (o.look && typeof o.look === 'object') {
    const L = o.look as Record<string, unknown>
    for (const slot of ['hat', 'top', 'bottom', 'shoes', 'hand', 'boat', 'lantern'] as const) {
      const id = L[slot]
      const prefix = slot === 'shoes' ? 'shoes-' : `${slot}-`
      if (typeof id === 'string' && KNOWN_GEAR.has(id) && id.startsWith(prefix)) {
        look[slot] = id
      }
    }
  }
  const starterSet = new Set<string>(STARTER_OWNED)
  const bankedSet = new Set<string>()
  if (Array.isArray(o.banked)) {
    for (const id of o.banked) {
      if (typeof id === 'string' && KNOWN_GEAR.has(id) && !starterSet.has(id)) bankedSet.add(id)
    }
  }
  const ownedSet = new Set<string>(STARTER_OWNED)
  if (Array.isArray(o.owned)) {
    for (const id of o.owned) {
      if (typeof id === 'string' && KNOWN_GEAR.has(id) && !bankedSet.has(id)) ownedSet.add(id)
    }
  }
  const lastSavedAt =
    typeof o.lastSavedAt === 'number' && Number.isFinite(o.lastSavedAt) && o.lastSavedAt >= 0
      ? Math.floor(o.lastSavedAt)
      : 0
  const titleSet = new Set<string>()
  if (Array.isArray(o.ownedTitles)) {
    for (const id of o.ownedTitles) {
      if (
        typeof id === 'string' &&
        (id === 'title-river-scout' ||
          id === 'title-harbor-coach' ||
          id === 'title-generous' ||
          id === 'title-dock-mate')
      ) {
        titleSet.add(id)
      }
    }
  }
  const ownedTitles = [...titleSet]
  let titleId: string | null = null
  if (typeof o.titleId === 'string' && ownedTitles.includes(o.titleId)) {
    titleId = o.titleId
  }
  return {
    cleared: clearedUnique,
    stepCursor,
    correctCount,
    gold,
    xp,
    missionClears,
    coins,
    owned: [...ownedSet],
    banked: [...bankedSet],
    look,
    lastSavedAt,
    ownedTitles,
    titleId,
  }
}

function displayNameFromProfile(username: string | null | undefined, userId: string): string {
  const u = typeof username === 'string' ? username.trim() : ''
  if (u) return u.slice(0, 24)
  return `Sailor-${userId.replace(/-/g, '').slice(0, 4)}`
}

async function persistProgress(userId: string, progress: HarborQuestProgress) {
  const admin = getAdmin()
  if (!admin) return { error: new Error('Harbor Quest sync unavailable.') }
  const { error } = await admin.from('harbor_quest_progress').upsert(
    {
      user_id: userId,
      progress,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  return { error }
}

/** Upsert denormalized leaderboard row from sanitized progress. */
export async function syncHarborLeaderboard(userId: string, progress: HarborQuestProgress) {
  const admin = getAdmin()
  if (!admin) return { error: new Error('Harbor Quest sync unavailable.') }

  let displayName = displayNameFromProfile(null, userId)
  try {
    const profile = await getProfile(userId)
    displayName = displayNameFromProfile(profile?.username, userId)
  } catch {
    /* keep fallback name */
  }

  const { error } = await admin.from('harbor_quest_leaderboard').upsert(
    {
      user_id: userId,
      display_name: displayName,
      xp: progress.xp,
      gold: progress.gold,
      correct_count: progress.correctCount,
      cleared_count: progress.cleared.length,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  return { error }
}

type LeaderboardRow = {
  user_id: string
  display_name: string
  xp: number
  gold: number
  correct_count: number
  cleared_count: number
}

function rankRows(rows: LeaderboardRow[]): HarborLeaderboardEntry[] {
  return rows.map((row, i) => ({
    rank: i + 1,
    userId: row.user_id,
    displayName: row.display_name || 'Sailor',
    xp: row.xp,
    gold: row.gold,
    correctCount: row.correct_count,
    clearedCount: row.cleared_count,
  }))
}

/** Compare like the SQL index: xp → gold → correct → cleared. */
export function compareLeaderboardScores(
  a: { xp: number; gold: number; correctCount: number; clearedCount: number },
  b: { xp: number; gold: number; correctCount: number; clearedCount: number },
): number {
  if (a.xp !== b.xp) return b.xp - a.xp
  if (a.gold !== b.gold) return b.gold - a.gold
  if (a.correctCount !== b.correctCount) return b.correctCount - a.correctCount
  if (a.clearedCount !== b.clearedCount) return b.clearedCount - a.clearedCount
  return 0
}

function parseLimit(raw: unknown): number {
  const n = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : NaN
  if (!Number.isFinite(n)) return LEADERBOARD_DEFAULT_LIMIT
  return Math.min(LEADERBOARD_MAX_LIMIT, Math.max(1, Math.floor(n)))
}

/** GET /api/harbor-quest — signed-in Harbor Quest progress. */
export async function getHarborQuest(req: AuthedRequest, res: Response) {
  const auth = requireAuth(req, res)
  if (!auth) return

  if (env.openMode) {
    res.json({ progress: sanitizeHarborProgress(null) })
    return
  }

  const admin = getAdmin()
  if (!admin) {
    res.status(503).json({ message: 'Harbor Quest sync unavailable.' })
    return
  }

  const { data, error } = await admin
    .from('harbor_quest_progress')
    .select('progress')
    .eq('user_id', auth.userId)
    .maybeSingle()

  if (error) {
    res.status(500).json({ message: error.message })
    return
  }

  res.json({ progress: sanitizeHarborProgress(data?.progress) })
}

/** PUT /api/harbor-quest — replace account Harbor Quest progress (+ leaderboard sync). */
export async function putHarborQuest(req: AuthedRequest, res: Response) {
  const auth = requireAuth(req, res)
  if (!auth) return

  const progress = sanitizeHarborProgress(req.body?.progress)

  if (env.openMode) {
    res.json({ ok: true, progress })
    return
  }

  const admin = getAdmin()
  if (!admin) {
    res.status(503).json({ message: 'Harbor Quest sync unavailable.' })
    return
  }

  // Meter engagement from correct-answer deltas (admin view-only).
  let prevCorrect = 0
  try {
    const { data: prevRow } = await admin
      .from('harbor_quest_progress')
      .select('progress')
      .eq('user_id', auth.userId)
      .maybeSingle()
    prevCorrect = sanitizeHarborProgress(prevRow?.progress).correctCount
  } catch {
    prevCorrect = 0
  }
  const correctDelta = Math.max(0, progress.correctCount - prevCorrect)

  const { error } = await persistProgress(auth.userId, progress)
  if (error) {
    res.status(500).json({ message: error.message })
    return
  }

  if (correctDelta > 0) {
    void addHarborQuestCount(auth.userId, correctDelta).catch((e) => {
      console.warn('[harbor-quest] usage meter failed', e)
    })
  }

  // Best-effort leaderboard sync — progress save already succeeded.
  const board = await syncHarborLeaderboard(auth.userId, progress)
  if (board.error) {
    console.warn('[harbor-quest] leaderboard sync failed', board.error.message)
  }

  res.json({ ok: true, progress })
}

/**
 * GET /api/harbor-quest/leaderboard — global ranks (public).
 * Optional Bearer token marks the caller's row with `isYou` and returns `me`.
 */
export async function getHarborQuestLeaderboard(req: AuthedRequest, res: Response) {
  const limit = parseLimit(req.query?.limit)

  if (env.openMode) {
    res.json({ entries: [], me: null, limit })
    return
  }

  const admin = getAdmin()
  if (!admin) {
    res.status(503).json({ message: 'Harbor Quest leaderboard unavailable.' })
    return
  }

  const { data, error } = await admin
    .from('harbor_quest_leaderboard')
    .select('user_id, display_name, xp, gold, correct_count, cleared_count')
    .order('xp', { ascending: false })
    .order('gold', { ascending: false })
    .order('correct_count', { ascending: false })
    .order('cleared_count', { ascending: false })
    .order('updated_at', { ascending: true })
    .limit(limit)

  if (error) {
    res.status(500).json({ message: error.message })
    return
  }

  const rows = (data ?? []) as LeaderboardRow[]
  const viewerId = req.auth?.userId ?? null
  const entries = rankRows(rows).map((e) =>
    viewerId && e.userId === viewerId ? { ...e, isYou: true } : e,
  )

  let me: HarborLeaderboardEntry | null = null
  if (viewerId) {
    const onBoard = entries.find((e) => e.userId === viewerId)
    if (onBoard) {
      me = onBoard
    } else {
      const { data: wider } = await admin
        .from('harbor_quest_leaderboard')
        .select('user_id, display_name, xp, gold, correct_count, cleared_count')
        .order('xp', { ascending: false })
        .order('gold', { ascending: false })
        .order('correct_count', { ascending: false })
        .order('cleared_count', { ascending: false })
        .order('updated_at', { ascending: true })
        .limit(2000)
      const widerRows = (wider ?? []) as LeaderboardRow[]
      const idx = widerRows.findIndex((r) => r.user_id === viewerId)
      if (idx >= 0) {
        const row = widerRows[idx]!
        me = {
          rank: idx + 1,
          userId: row.user_id,
          displayName: row.display_name || 'Sailor',
          xp: row.xp,
          gold: row.gold,
          correctCount: row.correct_count,
          clearedCount: row.cleared_count,
          isYou: true,
        }
      }
    }
  }

  res.json({ entries, me, limit })
}

async function loadProgressBlob(userId: string): Promise<HarborQuestProgress> {
  const admin = getAdmin()
  if (!admin) return sanitizeHarborProgress(null)
  const { data } = await admin
    .from('harbor_quest_progress')
    .select('progress')
    .eq('user_id', userId)
    .maybeSingle()
  return sanitizeHarborProgress(data?.progress)
}

async function sameHousehold(a: string, b: string): Promise<boolean> {
  const [ma, mb] = await Promise.all([getMembershipForUser(a), getMembershipForUser(b)])
  if (!ma || !mb) return false
  return ma.household.id === mb.household.id
}

/**
 * POST /api/harbor-quest/gift — cosmetic lantern / title gift.
 * Prefer household (Family fleet seed); also allow dock gifts to any signed-in sailor.
 * Never transfers XP, coins, or answer credit.
 */
export async function postHarborQuestGift(req: AuthedRequest, res: Response) {
  const auth = requireAuth(req, res)
  if (!auth) return

  const toUserId = typeof req.body?.toUserId === 'string' ? req.body.toUserId.trim() : ''
  const kindRaw = req.body?.kind
  const itemId = typeof req.body?.itemId === 'string' ? req.body.itemId.trim() : ''
  const kind: HarborGiftKind | null =
    kindRaw === 'lantern' || kindRaw === 'title' ? kindRaw : null

  if (!toUserId || toUserId.length > 80 || !kind || !itemId || itemId.length > 80) {
    res.status(400).json({ message: 'Invalid gift payload.' })
    return
  }
  if (toUserId === auth.userId) {
    res.status(400).json({ message: 'You cannot gift yourself.' })
    return
  }

  if (env.openMode) {
    res.status(503).json({ message: 'Gifts require signed-in sync (open mode has no accounts).' })
    return
  }

  const admin = getAdmin()
  if (!admin) {
    res.status(503).json({ message: 'Harbor Quest sync unavailable.' })
    return
  }

  const householdMate = await sameHousehold(auth.userId, toUserId)

  const [fromProg, toProg] = await Promise.all([
    loadProgressBlob(auth.userId),
    loadProgressBlob(toUserId),
  ])

  const applied = applyCosmeticGift({
    fromOwned: fromProg.owned,
    fromBanked: fromProg.banked,
    fromLookLantern: fromProg.look.lantern,
    fromTitles: fromProg.ownedTitles ?? [],
    toOwned: toProg.owned,
    toBanked: toProg.banked,
    toTitles: toProg.ownedTitles ?? [],
    kind,
    itemId,
  })

  if (!applied.ok) {
    res.status(400).json({ message: applied.reason })
    return
  }

  const nextFrom: HarborQuestProgress = {
    ...fromProg,
    owned: applied.fromOwned,
    banked: applied.fromBanked,
    look: { ...fromProg.look, lantern: applied.fromLookLantern },
    ownedTitles: applied.fromTitles,
    titleId:
      fromProg.titleId && applied.fromTitles.includes(fromProg.titleId)
        ? fromProg.titleId
        : applied.fromTitles[0] ?? null,
    lastSavedAt: Date.now(),
  }
  const nextTo: HarborQuestProgress = {
    ...toProg,
    owned: applied.toOwned,
    banked: applied.toBanked,
    ownedTitles: applied.toTitles,
    titleId:
      toProg.titleId && applied.toTitles.includes(toProg.titleId)
        ? toProg.titleId
        : toProg.titleId,
    lastSavedAt: Date.now(),
  }

  const saveFrom = await persistProgress(auth.userId, nextFrom)
  if (saveFrom.error) {
    res.status(500).json({ message: saveFrom.error.message })
    return
  }
  const saveTo = await persistProgress(toUserId, nextTo)
  if (saveTo.error) {
    res.status(500).json({ message: saveTo.error.message })
    return
  }

  res.json({
    ok: true,
    progress: nextFrom,
    householdMate,
    giverTitleAward: applied.giverTitleAward ?? null,
    receiverTitleAward: applied.receiverTitleAward ?? null,
  })
}
