import type { VHSOptions } from './createVHS'

/** Tape lock length after Begin drill. Short enough to stay a handoff. */
export const VHS_TRANSITION_MS = 1400
export const VHS_FADE_MS = 280

const KEYS = [
  'speed',
  'wave',
  'jitter',
  'crease',
  'switching',
  'switchingHeight',
  'bloom',
  'aberration',
  'acBeat',
  'grain',
  'scanlines',
  'vignette',
  'barrel',
  'saturation',
  'exposure',
] as const satisfies readonly (keyof VHSOptions)[]

/** Heavy tracking at the first frame of the handoff. */
export const VHS_HANDOFF_FROM: Required<VHSOptions> = {
  speed: 1.15,
  wave: 2.2,
  jitter: 1.6,
  crease: 1.1,
  switching: 0.9,
  switchingHeight: 0.08,
  bloom: 0.65,
  aberration: 5,
  acBeat: 0.7,
  grain: 0.45,
  scanlines: 0.35,
  vignette: 0.28,
  barrel: 0,
  saturation: 0.9,
  exposure: 0.72,
}

/** Nearly clean frame just before the overlay dissolves. */
export const VHS_HANDOFF_TO: Required<VHSOptions> = {
  speed: 0.35,
  wave: 0.2,
  jitter: 0.05,
  crease: 0,
  switching: 0,
  switchingHeight: 0.02,
  bloom: 0.2,
  aberration: 0.8,
  acBeat: 0.15,
  grain: 0.05,
  scanlines: 0.06,
  vignette: 0.05,
  barrel: 0,
  saturation: 1,
  exposure: 1.05,
}

export function easeOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return 1 - (1 - x) ** 3
}

export function mixVhsOptions(from: VHSOptions, to: VHSOptions, t: number): VHSOptions {
  const e = easeOutCubic(t)
  const out: VHSOptions = {}
  for (const key of KEYS) {
    const a = from[key] ?? 0
    const b = to[key] ?? 0
    out[key] = a + (b - a) * e
  }
  return out
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}
