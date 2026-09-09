import type { Response } from 'express'
import type { AuthedRequest } from './auth.js'
import { requireAuth } from './auth.js'
import { env } from './env.js'
import { sanitizeTurns, turnsChanged, type HistoryTurn } from './historyExpiry.js'
import { getAdmin } from './supabase.js'

export { HISTORY_TTL_MS } from './historyExpiry.js'

async function persistTurns(userId: string, turns: HistoryTurn[]) {
  const admin = getAdmin()
  if (!admin) return { error: new Error('History sync unavailable.') }
  const { error } = await admin.from('translation_history').upsert(
    {
      user_id: userId,
      turns,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  return { error }
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

  const turns = sanitizeTurns(data?.turns)
  // Rewrite pruned payload so expired turns leave the cloud copy immediately.
  if (data && turnsChanged(data.turns, turns)) {
    const { error: writeErr } = await persistTurns(auth.userId, turns)
    if (writeErr) {
      res.status(500).json({ message: writeErr.message })
      return
    }
  }

  res.json({ turns })
}

/** PUT /api/history — replace account translation history. */
export async function putHistory(req: AuthedRequest, res: Response) {
  const auth = requireAuth(req, res)
  if (!auth) return

  const turns = sanitizeTurns(req.body?.turns)

  if (env.openMode) {
    res.json({ ok: true, turns })
    return
  }

  const admin = getAdmin()
  if (!admin) {
    res.status(503).json({ message: 'History sync unavailable.' })
    return
  }

  const { error } = await persistTurns(auth.userId, turns)
  if (error) {
    res.status(500).json({ message: error.message })
    return
  }

  res.json({ ok: true, turns })
}
