/**
 * Lines kept from Practice Partner.
 * The bank stays on the device so a later visit can review it.
 * The sitting list is only the lines and misses from the drill they just left.
 */

export const PRACTICE_PARTNER_LINES_KEY = 'yue-practice-partner-lines-v1'
export const PARTNER_LINES_MAX = 48
export const PARTNER_SESSION_MAX = 24
export const PARTNER_MISSES_MAX = 16

export type PartnerKeptLine = {
  en: string
  zh: string
  jyutping: string
  category: string
  at: number
}

export type PartnerSittingMiss = {
  said: string
  zh: string
  en: string
  at: number
}

export type PartnerSitting = {
  lines: PartnerKeptLine[]
  sessionLines: PartnerKeptLine[]
  misses: PartnerSittingMiss[]
}

export function emptyPartnerSitting(): PartnerSitting {
  return { lines: [], sessionLines: [], misses: [] }
}

function cleanLine(raw: unknown): PartnerKeptLine | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Partial<PartnerKeptLine>
  const zh = String(row.zh || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200)
  const en = String(row.en || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200)
  if (!zh || !en) return null
  const at = typeof row.at === 'number' && Number.isFinite(row.at) ? row.at : Date.now()
  return {
    zh,
    en,
    jyutping: String(row.jyutping || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 300),
    category: String(row.category || 'common')
      .trim()
      .slice(0, 24) || 'common',
    at,
  }
}

function cleanMiss(raw: unknown): PartnerSittingMiss | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Partial<PartnerSittingMiss>
  const said = String(row.said || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 400)
  const zh = String(row.zh || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200)
  const en = String(row.en || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200)
  if (!said || !zh) return null
  const at = typeof row.at === 'number' && Number.isFinite(row.at) ? row.at : Date.now()
  return { said, zh, en, at }
}

export function sanitizePartnerSitting(raw: unknown): PartnerSitting {
  const src = raw && typeof raw === 'object' ? (raw as Partial<PartnerSitting>) : {}
  const lines = (Array.isArray(src.lines) ? src.lines : [])
    .map(cleanLine)
    .filter((row): row is PartnerKeptLine => Boolean(row))
  const sessionLines = (Array.isArray(src.sessionLines) ? src.sessionLines : [])
    .map(cleanLine)
    .filter((row): row is PartnerKeptLine => Boolean(row))
  const misses = (Array.isArray(src.misses) ? src.misses : [])
    .map(cleanMiss)
    .filter((row): row is PartnerSittingMiss => Boolean(row))
  return {
    lines: lines.slice(-PARTNER_LINES_MAX),
    sessionLines: sessionLines.slice(-PARTNER_SESSION_MAX),
    misses: misses.slice(-PARTNER_MISSES_MAX),
  }
}

export function rememberPartnerLine(
  sitting: PartnerSitting,
  line: Omit<PartnerKeptLine, 'at'> & { at?: number },
  opts?: { session?: boolean },
): PartnerSitting {
  const next = cleanLine({ ...line, at: line.at ?? Date.now() })
  if (!next) return sitting
  const lines = [...sitting.lines.filter((row) => row.zh !== next.zh), next].slice(-PARTNER_LINES_MAX)
  const sessionLines =
    opts?.session === false
      ? sitting.sessionLines
      : [...sitting.sessionLines.filter((row) => row.zh !== next.zh), next].slice(-PARTNER_SESSION_MAX)
  return { ...sitting, lines, sessionLines }
}

export function rememberPartnerMiss(
  sitting: PartnerSitting,
  miss: Omit<PartnerSittingMiss, 'at'> & { at?: number },
): PartnerSitting {
  const next = cleanMiss({ ...miss, at: miss.at ?? Date.now() })
  if (!next) return sitting
  return {
    ...sitting,
    misses: [...sitting.misses, next].slice(-PARTNER_MISSES_MAX),
  }
}

/** Drop the recap lists. The kept bank stays. */
export function beginPartnerSitting(sitting: PartnerSitting): PartnerSitting {
  return { ...sitting, sessionLines: [], misses: [] }
}

export function linesForCategory(
  lines: readonly PartnerKeptLine[],
  category: string,
  limit = 12,
): PartnerKeptLine[] {
  return lines.filter((row) => row.category === category).slice(-limit)
}

/** Recent lines for the review rung. Oldest of that window is reviewed first. */
export function reviewBankForCategory(
  lines: readonly PartnerKeptLine[],
  category: string,
  limit = 8,
): PartnerKeptLine[] {
  return linesForCategory(lines, category, limit)
}

export function readPartnerSitting(): PartnerSitting {
  if (typeof window === 'undefined') return emptyPartnerSitting()
  try {
    const raw = localStorage.getItem(PRACTICE_PARTNER_LINES_KEY)
    if (!raw) return emptyPartnerSitting()
    return sanitizePartnerSitting(JSON.parse(raw))
  } catch {
    return emptyPartnerSitting()
  }
}

export function writePartnerSitting(sitting: PartnerSitting): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(
      PRACTICE_PARTNER_LINES_KEY,
      JSON.stringify(sanitizePartnerSitting(sitting)),
    )
  } catch {
    /* private mode */
  }
}
