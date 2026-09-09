/** Match web `HISTORY_TTL_MS` — each turn expires 14 days after `at`. */
export const HISTORY_TTL_MS = 14 * 24 * 60 * 60 * 1000

const MAX_TURNS = 80

export type HistoryTurn = Record<string, unknown> & {
  id: string
  from: string
  to: string
  source: string
  translation: string
  at: number
}

/** Sanitize + drop turns older than the retention window (or missing `at`). */
export function sanitizeTurns(raw: unknown, now = Date.now()): HistoryTurn[] {
  if (!Array.isArray(raw)) return []
  const cutoff = now - HISTORY_TTL_MS
  const out: HistoryTurn[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const t = item as Record<string, unknown>
    if (typeof t.id !== 'string' || !t.id) continue
    if (typeof t.from !== 'string' || typeof t.to !== 'string') continue
    if (typeof t.source !== 'string' || typeof t.translation !== 'string') continue
    if (typeof t.at !== 'number' || !Number.isFinite(t.at)) continue
    if (t.at < cutoff) continue
    out.push(t as HistoryTurn)
    if (out.length >= MAX_TURNS) break
  }
  return out
}

export function turnsChanged(before: unknown, after: HistoryTurn[]): boolean {
  if (!Array.isArray(before)) return after.length > 0
  if (before.length !== after.length) return true
  for (let i = 0; i < after.length; i++) {
    const a = after[i]
    const b = before[i] as Record<string, unknown> | undefined
    if (!b || b.id !== a.id || b.at !== a.at) return true
  }
  return false
}

export { MAX_TURNS }
