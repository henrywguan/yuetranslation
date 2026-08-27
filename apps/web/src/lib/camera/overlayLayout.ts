/** Screen-space rect layout helpers for Cam OCR overlays. */

export type LayoutRect = {
  id: string
  x: number
  y: number
  w: number
  h: number
}

export type NudgeOptions = {
  /** Minimum gap between rect edges (px). Default 6. */
  gap?: number
  /** Separation passes. Default 10. */
  iterations?: number
  /** Soft pull back toward original positions each pass (0–1). Default 0.08. */
  homePull?: number
  /** Prefer separating stacked text vertically. Default true. */
  preferVertical?: boolean
  /** Optional clamp bounds (frame). */
  bounds?: { x: number; y: number; w: number; h: number }
}

function overlapAmount(a0: number, a1: number, b0: number, b1: number): number {
  return Math.min(a1, b1) - Math.max(a0, b0)
}

function clampRect(
  r: LayoutRect,
  bounds: { x: number; y: number; w: number; h: number },
): LayoutRect {
  const x = Math.min(bounds.x + bounds.w - r.w, Math.max(bounds.x, r.x))
  const y = Math.min(bounds.y + bounds.h - r.h, Math.max(bounds.y, r.y))
  return { ...r, x, y }
}

/**
 * Push overlapping rects apart while staying near their preferred (home) positions.
 * Used for AR float chips and upload glass panels so dense OCR stays tappable.
 */
export function nudgeOverlappingRects(
  rects: LayoutRect[],
  opts: NudgeOptions = {},
): LayoutRect[] {
  if (rects.length < 2) return rects.map((r) => ({ ...r }))

  const gap = opts.gap ?? 6
  const iterations = opts.iterations ?? 10
  const homePull = opts.homePull ?? 0.08
  const preferVertical = opts.preferVertical ?? true
  const home = rects.map((r) => ({ ...r }))
  const out = rects.map((r) => ({ ...r }))

  for (let pass = 0; pass < iterations; pass++) {
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const a = out[i]!
        const b = out[j]!
        // Positive = overlap; negative = gap between edges.
        const ox = overlapAmount(a.x, a.x + a.w, b.x, b.x + b.w)
        const oy = overlapAmount(a.y, a.y + a.h, b.y, b.y + b.h)
        // Separate when closer than `gap` on both axes (includes true overlaps).
        if (ox <= -gap || oy <= -gap) continue

        const separateVert = preferVertical
          ? oy <= ox * 1.35 ||
            Math.abs(a.y + a.h / 2 - (b.y + b.h / 2)) < Math.max(a.h, b.h)
          : oy < ox

        if (separateVert) {
          const push = Math.max(0.5, (oy + gap) / 2)
          if (a.y + a.h / 2 <= b.y + b.h / 2) {
            a.y -= push
            b.y += push
          } else {
            a.y += push
            b.y -= push
          }
        } else {
          const push = Math.max(0.5, (ox + gap) / 2)
          if (a.x + a.w / 2 <= b.x + b.w / 2) {
            a.x -= push
            b.x += push
          } else {
            a.x += push
            b.x -= push
          }
        }
      }
    }

    // Home pull only on early passes so the final gap can settle.
    const pull = pass < iterations - 3 ? homePull : 0
    for (let i = 0; i < out.length; i++) {
      const r = out[i]!
      const h = home[i]!
      if (pull > 0) {
        r.x += (h.x - r.x) * pull
        r.y += (h.y - r.y) * pull
      }
      if (opts.bounds) {
        const clamped = clampRect(r, opts.bounds)
        r.x = clamped.x
        r.y = clamped.y
      }
    }
  }

  return out
}

/** Preferred float-chip rect anchored above (or below) a source cover. */
export function preferredChipRect(
  cover: { x: number; y: number; w: number; h: number },
  chipW: number,
  chipH: number,
  opts?: { gap?: number; frameW?: number; frameH?: number },
): { x: number; y: number; w: number; h: number } {
  const gap = opts?.gap ?? 6
  const frameW = opts?.frameW ?? Number.POSITIVE_INFINITY
  const frameH = opts?.frameH ?? Number.POSITIVE_INFINITY
  let x = cover.x + cover.w / 2 - chipW / 2
  let y = cover.y - chipH - gap
  // Flip below if it would clip the top.
  if (y < 4) y = cover.y + cover.h + gap
  x = Math.min(frameW - chipW - 4, Math.max(4, x))
  y = Math.min(frameH - chipH - 4, Math.max(4, y))
  return { x, y, w: chipW, h: chipH }
}
