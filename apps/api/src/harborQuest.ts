import type { Response } from 'express'
import type { AuthedRequest } from './auth.js'
import { requireAuth } from './auth.js'
import { env } from './env.js'
import { getAdmin } from './supabase.js'

export type HarborQuestProgress = {
  cleared: string[]
  stepCursor: Record<string, number>
  correctCount: number
  coins: number
  owned: string[]
  look: {
    hat: string
    top: string
    bottom: string
    shoes: string
    hand: string
  }
  lastSavedAt: number
}

const DEFAULT_LOOK = {
  hat: 'hat-straw',
  top: 'top-harbor',
  bottom: 'bottom-travel',
  shoes: 'shoes-leather',
  hand: 'hand-none',
} as const

const STARTER_OWNED = Object.values(DEFAULT_LOOK)

const KNOWN_GEAR = new Set([
  'hat-straw','hat-bamboo','hat-scholar','hat-fisherman','hat-festival',
  'top-harbor','top-jade','top-merchant','top-ferry','top-night',
  'bottom-travel','bottom-slate','bottom-reed','bottom-crimson','bottom-ink',
  'shoes-leather','shoes-straw','shoes-lacquer','shoes-jade','shoes-storm',
  'hand-none','hand-fan','hand-lantern','hand-oar','hand-scroll',
])

const EMPTY: HarborQuestProgress = {
  cleared: [],
  stepCursor: {},
  correctCount: 0,
  coins: 40,
  owned: [...STARTER_OWNED],
  look: { ...DEFAULT_LOOK },
  lastSavedAt: 0,
}

/** Sanitize progress payloads from clients / DB. */
export function sanitizeHarborProgress(raw: unknown): HarborQuestProgress {
  if (!raw || typeof raw !== 'object') return { ...EMPTY, cleared: [], stepCursor: { ...EMPTY.stepCursor }, owned: [...EMPTY.owned], look: { ...EMPTY.look } }
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
  const seen = new Set<string>()
  const clearedUnique: string[] = []
  for (const id of cleared.slice(0, 200)) {
    if (seen.has(id)) continue
    seen.add(id)
    clearedUnique.push(id)
  }
  // Missing coins on an existing blob → 0 (starter purse only on empty/null via EMPTY).
  let coins = 0
  if (typeof o.coins === 'number' && Number.isFinite(o.coins) && o.coins >= 0) {
    coins = Math.min(Math.floor(o.coins), 1_000_000)
  }
  const look: HarborQuestProgress['look'] = { ...DEFAULT_LOOK }
  if (o.look && typeof o.look === 'object') {
    const L = o.look as Record<string, unknown>
    for (const slot of ['hat', 'top', 'bottom', 'shoes', 'hand'] as const) {
      const id = L[slot]
      const prefix = slot === 'shoes' ? 'shoes-' : `${slot}-`
      if (typeof id === 'string' && KNOWN_GEAR.has(id) && id.startsWith(prefix)) {
        look[slot] = id
      }
    }
  }
  const ownedSet = new Set<string>(STARTER_OWNED)
  if (Array.isArray(o.owned)) {
    for (const id of o.owned) {
      if (typeof id === 'string' && KNOWN_GEAR.has(id)) ownedSet.add(id)
    }
  }
  const lastSavedAt =
    typeof o.lastSavedAt === 'number' && Number.isFinite(o.lastSavedAt) && o.lastSavedAt >= 0
      ? Math.floor(o.lastSavedAt)
      : 0
  return {
    cleared: clearedUnique,
    stepCursor,
    correctCount,
    coins,
    owned: [...ownedSet],
    look,
    lastSavedAt,
  }
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

/** PUT /api/harbor-quest — replace account Harbor Quest progress. */
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

  const { error } = await persistProgress(auth.userId, progress)
  if (error) {
    res.status(500).json({ message: error.message })
    return
  }

  res.json({ ok: true, progress })
}
