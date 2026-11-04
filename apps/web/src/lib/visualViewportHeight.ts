/** Largest plausible layout viewport height in CSS pixels. */
export function readVisualViewportHeight(): number {
  if (typeof window === 'undefined') return 0
  const vv = window.visualViewport?.height
  const inner = window.innerHeight
  const client = document.documentElement?.clientHeight
  const candidates = [vv, inner, client].map((n) => Math.round(Number(n) || 0))
  return Math.max(0, ...candidates)
}

/**
 * Safe height for full-screen shells (`#/chat`, `#/practice`).
 * iPhone can briefly report `visualViewport.height === 0` when leaving a
 * body-portal sheet (Account Hub); writing that into `--*-vh` collapses
 * `height: var(--…)` shells to an empty screen.
 */
export function safeShellViewportHeight(minPx = 120): number | null {
  const height = readVisualViewportHeight()
  if (height < minPx) return null
  return height
}
