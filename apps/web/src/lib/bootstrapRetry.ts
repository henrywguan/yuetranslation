/** Delay before another /api/health attempt while the plan chip is still Connecting. */
export function bootstrapRetryDelayMs(attempt: number): number {
  const n = Math.max(1, Math.floor(attempt))
  return Math.min(8_000, 600 * 2 ** Math.min(n - 1, 4))
}
