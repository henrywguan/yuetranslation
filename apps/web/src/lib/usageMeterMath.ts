/** Clamp a 0–1 usage ratio for meters and rings. */
export function clampUsageRatio(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0
  if (n > 1) return 1
  return n
}

/**
 * Width % for usage detail bars.
 * Keeps tiny usage visible (cam seconds on an 8h plan) instead of rounding to 0%.
 */
export function usageBarWidthPct(
  ratio: number | null,
  unlimited: boolean,
  usedAmount: number,
): number {
  if (unlimited) return usedAmount > 0 ? 12 : 0
  if (!usedAmount || ratio == null || ratio <= 0) return 0
  const raw = clampUsageRatio(ratio) * 100
  return Math.min(100, Math.max(1.5, raw))
}

/** Fill fraction (0–1) for usage rings from a used/limit ratio. */
export function usageRingFill(
  ratio: number | null,
  unlimited: boolean,
  usedAmount: number,
): number {
  if (unlimited) return usedAmount > 0 ? 0.12 : 0
  return clampUsageRatio(ratio ?? 0)
}
