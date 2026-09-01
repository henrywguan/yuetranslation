/** Format integer seconds as `1h 02m 03s` (always includes seconds). */
export function formatExactDuration(total: number): string {
  const s = Math.max(0, Math.floor(total))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`
  if (m > 0) return `${m}m ${String(sec).padStart(2, '0')}s`
  return `${sec}s`
}

/** Compact ring label: keep seconds so sub-minute use is never shown as 0. */
export function formatCompactDuration(total: number): string {
  const s = Math.max(0, Math.floor(total))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h${m > 0 ? ` ${m}m` : ''}`
  if (m > 0) return sec > 0 ? `${m}m ${sec}s` : `${m}m`
  return `${sec}s`
}
