import { currentMonthKey, type UsageSnapshot } from './usage.js'

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/

function formatYmdUtc(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export type AdminUsageRange = {
  from: string
  to: string
  /** Calendar month keys (`YYYY_MM`) overlapping the range; usage sums whole months. */
  months: string[]
}

export function todayYmdUtc(): string {
  return formatYmdUtc(new Date())
}

export function startOfCurrentMonthYmdUtc(): string {
  const d = new Date()
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

export function defaultAdminUsageRange(): AdminUsageRange {
  const from = startOfCurrentMonthYmdUtc()
  const to = todayYmdUtc()
  return { from, to, months: monthKeysInRange(from, to) }
}

function parseYmd(value: string): Date | null {
  const m = YMD_RE.exec(value.trim())
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  const date = new Date(Date.UTC(y, mo - 1, d))
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== mo - 1 ||
    date.getUTCDate() !== d
  ) {
    return null
  }
  return date
}

/** All `YYYY_MM` keys for calendar months overlapping [from, to] (inclusive, UTC dates). */
export function monthKeysInRange(fromYmd: string, toYmd: string): string[] {
  const from = parseYmd(fromYmd)
  const to = parseYmd(toYmd)
  if (!from || !to || from.getTime() > to.getTime()) return []

  const months: string[] = []
  let y = from.getUTCFullYear()
  let m = from.getUTCMonth()
  const endY = to.getUTCFullYear()
  const endM = to.getUTCMonth()

  while (y < endY || (y === endY && m <= endM)) {
    months.push(`${y}_${String(m + 1).padStart(2, '0')}`)
    m += 1
    if (m > 11) {
      m = 0
      y += 1
    }
  }
  return months
}

function monthKeyToFullRange(monthKey: string): AdminUsageRange | null {
  const parts = monthKey.trim().split('_')
  if (parts.length !== 2) return null
  const y = Number(parts[0])
  const mo = Number(parts[1])
  if (!Number.isFinite(y) || !Number.isFinite(mo) || mo < 1 || mo > 12) return null
  const from = `${y}-${String(mo).padStart(2, '0')}-01`
  const lastDay = formatYmdUtc(new Date(Date.UTC(y, mo, 0)))
  const today = todayYmdUtc()
  const to = lastDay > today ? today : lastDay
  return { from, to, months: [`${y}_${String(mo).padStart(2, '0')}`] }
}

/** Parse `from`/`to` query params; legacy `month=YYYY_MM` still supported. */
export function parseAdminUsageRange(query: {
  from?: unknown
  to?: unknown
  month?: unknown
}): AdminUsageRange {
  const fromRaw = typeof query.from === 'string' ? query.from.trim() : ''
  const toRaw = typeof query.to === 'string' ? query.to.trim() : ''

  if (fromRaw || toRaw) {
    const from = fromRaw || startOfCurrentMonthYmdUtc()
    const to = toRaw || todayYmdUtc()
    const fromDate = parseYmd(from)
    const toDate = parseYmd(to)
    if (!fromDate || !toDate) return defaultAdminUsageRange()
    if (fromDate.getTime() > toDate.getTime()) return defaultAdminUsageRange()
    return { from, to, months: monthKeysInRange(from, to) }
  }

  const monthKey =
    typeof query.month === 'string' && query.month.trim()
      ? query.month.trim()
      : currentMonthKey()
  return monthKeyToFullRange(monthKey) ?? defaultAdminUsageRange()
}

export function sumUsageSnapshots(snapshots: UsageSnapshot[]): UsageSnapshot {
  const total = {
    month: snapshots[0]?.month ?? currentMonthKey(),
    liveSeconds: 0,
    ttsChars: 0,
    translateCount: 0,
    cameraSeconds: 0,
    cameraTranslateCount: 0,
    docsPages: 0,
    aiVisionCount: 0,
  }
  for (const row of snapshots) {
    total.liveSeconds += row.liveSeconds
    total.ttsChars += row.ttsChars
    total.translateCount += row.translateCount
    total.cameraSeconds += row.cameraSeconds
    total.cameraTranslateCount += row.cameraTranslateCount
    total.docsPages += row.docsPages
    total.aiVisionCount += row.aiVisionCount
  }
  return total
}

export function filterSnapshotsByMonths(
  snapshots: UsageSnapshot[],
  months: string[],
): UsageSnapshot[] {
  const allowed = new Set(months)
  return snapshots.filter((s) => allowed.has(s.month))
}
