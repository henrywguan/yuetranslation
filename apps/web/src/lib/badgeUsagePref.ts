/** Which usage metric appears under the plan badge (device-local). */

export type BadgeUsageMetric = 'live' | 'voice' | 'camera'

const STORAGE_KEY = 'yue-badge-usage-metric'
const VALID = new Set<BadgeUsageMetric>(['live', 'voice', 'camera'])

export function readBadgeUsageMetric(): BadgeUsageMetric {
  if (typeof window === 'undefined') return 'live'
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && VALID.has(stored as BadgeUsageMetric)) return stored as BadgeUsageMetric
  } catch {
    /* ignore */
  }
  return 'live'
}

export function writeBadgeUsageMetric(metric: BadgeUsageMetric) {
  try {
    localStorage.setItem(STORAGE_KEY, metric)
  } catch {
    /* ignore */
  }
}
