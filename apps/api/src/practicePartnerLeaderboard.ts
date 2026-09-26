import type { Response } from 'express'
import type { AuthedRequest } from './auth.js'
import { requireAuth } from './auth.js'
import { env } from './env.js'
import { allowIpRateOrReject, allowUserRateOrReject } from './guestRateLimit.js'
import { getAdmin, getProfile } from './supabase.js'

const BOARD_ERR = 'Practice Partner leaderboard unavailable.'
const LEADERBOARD_DEFAULT_LIMIT = 25
const LEADERBOARD_MAX_LIMIT = 50
const PUT_PER_MIN = 60
const GET_PER_MIN = 180

export const PRACTICE_PARTNER_SCORE_CAPS = {
  xp: 2_000_000,
  bestStreak: 10_000,
  totalPasses: 1_000_000,
} as const

export type PracticePartnerBoardScore = {
  xp: number
  bestStreak: number
  totalPasses: number
}

export type PracticePartnerLeaderboardEntry = {
  rank: number
  userId: string
  displayName: string
  xp: number
  bestStreak: number
  totalPasses: number
  isYou?: boolean
}

function asInt(raw: unknown, cap: number): number {
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n)) return 0
  return Math.min(cap, Math.max(0, Math.floor(n)))
}

/** Client-reported totals. Caps keep a bad payload off the board. */
export function sanitizePracticePartnerBoardScore(raw: unknown): PracticePartnerBoardScore {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    xp: asInt(row.xp, PRACTICE_PARTNER_SCORE_CAPS.xp),
    bestStreak: asInt(row.bestStreak, PRACTICE_PARTNER_SCORE_CAPS.bestStreak),
    totalPasses: asInt(row.totalPasses, PRACTICE_PARTNER_SCORE_CAPS.totalPasses),
  }
}

/** Monotonic merge — a later sync cannot lower a stored high score. */
export function mergePracticePartnerBoardScore(
  prev: PracticePartnerBoardScore | null,
  claimed: PracticePartnerBoardScore,
): PracticePartnerBoardScore {
  return {
    xp: Math.max(prev?.xp ?? 0, claimed.xp),
    bestStreak: Math.max(prev?.bestStreak ?? 0, claimed.bestStreak),
    totalPasses: Math.max(prev?.totalPasses ?? 0, claimed.totalPasses),
  }
}

/** Compare like the SQL index: xp → best streak → total passes. */
export function comparePracticePartnerBoardScores(
  a: PracticePartnerBoardScore,
  b: PracticePartnerBoardScore,
): number {
  if (a.xp !== b.xp) return b.xp - a.xp
  if (a.bestStreak !== b.bestStreak) return b.bestStreak - a.bestStreak
  if (a.totalPasses !== b.totalPasses) return b.totalPasses - a.totalPasses
  return 0
}

export function practicePartnerDisplayName(
  username: string | null | undefined,
  userId: string,
): string {
  const u = typeof username === 'string' ? username.replace(/[\u0000-\u001f]/g, '').trim() : ''
  if (u) return u.slice(0, 24)
  const tail = userId.replace(/-/g, '').slice(0, 4)
  return tail ? `Partner-${tail}` : 'Partner'
}

function parseLimit(raw: unknown): number {
  const n = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : NaN
  if (!Number.isFinite(n)) return LEADERBOARD_DEFAULT_LIMIT
  return Math.min(LEADERBOARD_MAX_LIMIT, Math.max(1, Math.floor(n)))
}

type BoardRow = {
  user_id: string
  display_name: string
  xp: number
  best_streak: number
  total_passes: number
}

function toEntry(row: BoardRow, rank: number): PracticePartnerLeaderboardEntry {
  return {
    rank,
    userId: row.user_id,
    displayName: practicePartnerDisplayName(row.display_name, row.user_id),
    xp: asInt(row.xp, PRACTICE_PARTNER_SCORE_CAPS.xp),
    bestStreak: asInt(row.best_streak, PRACTICE_PARTNER_SCORE_CAPS.bestStreak),
    totalPasses: asInt(row.total_passes, PRACTICE_PARTNER_SCORE_CAPS.totalPasses),
  }
}

function rankRows(rows: BoardRow[]): PracticePartnerLeaderboardEntry[] {
  return rows.map((row, i) => toEntry(row, i + 1))
}

/**
 * GET /api/practice-partner/leaderboard — global ranks (public).
 * Optional Bearer token marks the caller's row with `isYou` and returns `me`.
 */
export async function getPracticePartnerLeaderboard(req: AuthedRequest, res: Response) {
  const limit = parseLimit(req.query?.limit)
  if (!allowIpRateOrReject(req, res, 'partnerBoardGet', GET_PER_MIN)) return

  if (env.openMode) {
    res.json({ entries: [], me: null, limit })
    return
  }

  const admin = getAdmin()
  if (!admin) {
    res.status(503).json({ message: BOARD_ERR })
    return
  }

  const { data, error } = await admin
    .from('practice_partner_leaderboard')
    .select('user_id, display_name, xp, best_streak, total_passes')
    .order('xp', { ascending: false })
    .order('best_streak', { ascending: false })
    .order('total_passes', { ascending: false })
    .order('updated_at', { ascending: true })
    .limit(limit)

  if (error) {
    console.warn('[practice-partner] leaderboard failed', error.message)
    res.status(500).json({ message: BOARD_ERR })
    return
  }

  const rows = (data ?? []) as BoardRow[]
  const viewerId = req.auth?.userId ?? null
  const entries = rankRows(rows).map((e) =>
    viewerId && e.userId === viewerId ? { ...e, isYou: true } : e,
  )

  let me: PracticePartnerLeaderboardEntry | null = null
  if (viewerId) {
    const onBoard = entries.find((e) => e.userId === viewerId)
    if (onBoard) {
      me = onBoard
    } else {
      const { data: wider } = await admin
        .from('practice_partner_leaderboard')
        .select('user_id, display_name, xp, best_streak, total_passes')
        .order('xp', { ascending: false })
        .order('best_streak', { ascending: false })
        .order('total_passes', { ascending: false })
        .order('updated_at', { ascending: true })
        .limit(500)
      const widerRows = (wider ?? []) as BoardRow[]
      const idx = widerRows.findIndex((r) => r.user_id === viewerId)
      if (idx >= 0) {
        me = { ...toEntry(widerRows[idx]!, idx + 1), isYou: true }
      }
    }
  }

  res.json({ entries, me, limit })
}

/**
 * PUT /api/practice-partner/leaderboard — signed-in monotonic score sync.
 * Display name comes from the Account Hub username, not the request body.
 */
export async function putPracticePartnerLeaderboard(req: AuthedRequest, res: Response) {
  const auth = requireAuth(req, res)
  if (!auth) return
  if (!allowUserRateOrReject(res, auth.userId, 'partnerBoardPut', PUT_PER_MIN)) return

  const claimed = sanitizePracticePartnerBoardScore(req.body)

  if (env.openMode) {
    res.json({ ok: true, score: claimed })
    return
  }

  const admin = getAdmin()
  if (!admin) {
    res.status(503).json({ message: BOARD_ERR })
    return
  }

  let prev: PracticePartnerBoardScore | null = null
  const { data: prevRow, error: prevError } = await admin
    .from('practice_partner_leaderboard')
    .select('xp, best_streak, total_passes')
    .eq('user_id', auth.userId)
    .maybeSingle()
  if (prevError) {
    console.warn('[practice-partner] leaderboard read failed', prevError.message)
    res.status(500).json({ message: BOARD_ERR })
    return
  }
  if (prevRow) {
    prev = sanitizePracticePartnerBoardScore({
      xp: prevRow.xp,
      bestStreak: prevRow.best_streak,
      totalPasses: prevRow.total_passes,
    })
  }

  const score = mergePracticePartnerBoardScore(prev, claimed)
  if (practicePartnerBoardScoreIsEmpty(score)) {
    res.json({ ok: true, score })
    return
  }

  let displayName = practicePartnerDisplayName(null, auth.userId)
  try {
    const profile = await getProfile(auth.userId)
    displayName = practicePartnerDisplayName(profile?.username, auth.userId)
  } catch {
    /* keep fallback name */
  }

  const { error } = await admin.from('practice_partner_leaderboard').upsert(
    {
      user_id: auth.userId,
      display_name: displayName,
      xp: score.xp,
      best_streak: score.bestStreak,
      total_passes: score.totalPasses,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  if (error) {
    console.warn('[practice-partner] leaderboard sync failed', error.message)
    res.status(500).json({ message: BOARD_ERR })
    return
  }

  res.json({ ok: true, score })
}

function practicePartnerBoardScoreIsEmpty(score: PracticePartnerBoardScore): boolean {
  return score.xp === 0 && score.bestStreak === 0 && score.totalPasses === 0
}
