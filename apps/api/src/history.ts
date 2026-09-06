import type { Response } from 'express'
import type { AuthedRequest } from './auth.js'
import { requireAuth } from './auth.js'
import { env } from './env.js'
import { getAdmin } from './supabase.js'

const MAX_TURNS = 80

function sanitizeTurns(raw: unknown): unknown[] {
  if (!Array.isArray(raw)) return []
  const out: unknown[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const t = item as Record<string, unknown>
    if (typeof t.id !== 'string' || !t.id) continue
    if (typeof t.from !== 'string' || typeof t.to !== 'string') continue
    if (typeof t.source !== 'string' || typeof t.translation !== 'string') continue
    out.push(item)
    if (out.length >= MAX_TURNS) break
  }
  return out
}

/** GET /api/history — signed-in account translation history. */
export async function getHistory(req: AuthedRequest, res: Response) {
  const auth = requireAuth(req, res)
  if (!auth) return

  if (env.openMode) {
    res.json({ turns: [] })
    return
  }

  const admin = getAdmin()
  if (!admin) {
    res.status(503).json({ message: 'History sync unavailable.' })
    return
  }

  const { data, error } = await admin
    .from('translation_history')
    .select('turns')
    .eq('user_id', auth.userId)
    .maybeSingle()

  if (error) {
    res.status(500).json({ message: error.message })
    return
  }

  res.json({ turns: sanitizeTurns(data?.turns) })
}

/** PUT /api/history — replace account translation history. */
export async function putHistory(req: AuthedRequest, res: Response) {
  const auth = requireAuth(req, res)
  if (!auth) return

  if (env.openMode) {
    res.json({ ok: true, turns: sanitizeTurns(req.body?.turns) })
    return
  }

  const admin = getAdmin()
  if (!admin) {
    res.status(503).json({ message: 'History sync unavailable.' })
    return
  }

  const turns = sanitizeTurns(req.body?.turns)
  const { error } = await admin.from('translation_history').upsert(
    {
      user_id: auth.userId,
      turns,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )

  if (error) {
    res.status(500).json({ message: error.message })
    return
  }

  res.json({ ok: true, turns })
}
