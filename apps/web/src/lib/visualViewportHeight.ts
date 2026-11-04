/**
 * Layout viewport height in CSS pixels.
 * Prefer `visualViewport.height` when it's a real reading (keyboard shrink).
 * When vv is 0/missing (iOS sheet dismiss), fall back to inner/client — do not
 * `Math.max(vv, inner)` or a zero vv is ignored while a live keyboard vv wins.
 */
export function readVisualViewportHeight(): number {
  if (typeof window === 'undefined') return 0
  const vv = Math.round(Number(window.visualViewport?.height) || 0)
  const inner = Math.round(Number(window.innerHeight) || 0)
  const client = Math.round(Number(document.documentElement?.clientHeight) || 0)
  if (vv >= 120) return vv
  return Math.max(inner, client, 0)
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
