/**
 * Practice Partner high-score log — local to this browser.
 * Admin · Practice Partner and `#/practice` share the same key.
 * Keep this module free of `adminApi` so smokes can run without Vite env.
 */

const SCORE_CATEGORY_IDS = ['animals', 'foods', 'common', 'expert'] as const

export type PracticePartnerScoreCategory = (typeof SCORE_CATEGORY_IDS)[number]

function resolveScoreCategory(raw: unknown): PracticePartnerScoreCategory {
  const id = String(raw || '').trim()
  return (SCORE_CATEGORY_IDS as readonly string[]).includes(id)
    ? (id as PracticePartnerScoreCategory)
    : 'common'
}

export const PRACTICE_PARTNER_SCORES_KEY = 'yue-practice-partner-scores-v1'
export const PRACTICE_PARTNER_SCORES_MAX = 40

export type PracticePartnerScoreEntry = {
  at: number
  streak: number
  category: PracticePartnerScoreCategory
  zh: string
  en: string
}

export type PracticePartnerScores = {
  bestStreak: number
  totalPasses: number
  recent: PracticePartnerScoreEntry[]
}

export function emptyPracticePartnerScores(): PracticePartnerScores {
  return { bestStreak: 0, totalPasses: 0, recent: [] }
}

function asInt(raw: unknown, fallback = 0): number {
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n)) return fallback
  return Math.max(0, Math.floor(n))
}

export function sanitizePracticePartnerScoreEntry(raw: unknown): PracticePartnerScoreEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const zh = String(row.zh ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200)
  const en = String(row.en ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200)
  if (!zh && !en) return null
  return {
    at: asInt(row.at, Date.now()) || Date.now(),
    streak: asInt(row.streak),
    category: resolveScoreCategory(row.category),
    zh,
    en,
  }
}

export function sanitizePracticePartnerScores(raw: unknown): PracticePartnerScores {
  if (!raw || typeof raw !== 'object') return emptyPracticePartnerScores()
  const row = raw as Record<string, unknown>
  const recent = Array.isArray(row.recent)
    ? row.recent
        .map(sanitizePracticePartnerScoreEntry)
        .filter((e): e is PracticePartnerScoreEntry => Boolean(e))
        .slice(0, PRACTICE_PARTNER_SCORES_MAX)
    : []
  const bestFromLog = recent.reduce((m, e) => Math.max(m, e.streak), 0)
  return {
    bestStreak: Math.max(asInt(row.bestStreak), bestFromLog),
    totalPasses: Math.max(asInt(row.totalPasses), recent.length),
    recent,
  }
}

export function applyPracticePartnerPass(
  current: PracticePartnerScores,
  entry: Omit<PracticePartnerScoreEntry, 'at'> & { at?: number },
): PracticePartnerScores {
  const clean = sanitizePracticePartnerScoreEntry({
    ...entry,
    at: entry.at ?? Date.now(),
  })
  if (!clean) return current
  const recent = [clean, ...current.recent].slice(0, PRACTICE_PARTNER_SCORES_MAX)
  return {
    bestStreak: Math.max(current.bestStreak, clean.streak),
    totalPasses: current.totalPasses + 1,
    recent,
  }
}

export function readPracticePartnerScores(): PracticePartnerScores {
  if (typeof window === 'undefined') return emptyPracticePartnerScores()
  try {
    const raw = localStorage.getItem(PRACTICE_PARTNER_SCORES_KEY)
    if (!raw) return emptyPracticePartnerScores()
    return sanitizePracticePartnerScores(JSON.parse(raw))
  } catch {
    return emptyPracticePartnerScores()
  }
}

export function writePracticePartnerScores(scores: PracticePartnerScores): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(PRACTICE_PARTNER_SCORES_KEY, JSON.stringify(sanitizePracticePartnerScores(scores)))
  } catch {
    /* private mode */
  }
}

export function recordPracticePartnerPass(
  entry: Omit<PracticePartnerScoreEntry, 'at'> & { at?: number },
): PracticePartnerScores {
  const next = applyPracticePartnerPass(readPracticePartnerScores(), entry)
  writePracticePartnerScores(next)
  return next
}

export function formatPracticePartnerScoreAt(at: number): string {
  try {
    return new Date(at).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}
