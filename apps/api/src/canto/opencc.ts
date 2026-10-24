/**
 * OpenCC helpers (pure JS via opencc-js) for HK Traditional ↔ Simplified.
 * Used on scrub / attestation / Cam Chinese paths — not a paid API.
 */
import * as OpenCC from 'opencc-js'

type Converter = (text: string) => string

let s2hk: Converter | null = null
let hk2s: Converter | null = null

function getS2hk(): Converter {
  if (!s2hk) {
    s2hk = OpenCC.Converter({ from: 'cn', to: 'hk' })
  }
  return s2hk
}

function getHk2s(): Converter {
  if (!hk2s) {
    hk2s = OpenCC.Converter({ from: 'hk', to: 'cn' })
  }
  return hk2s
}

/** Simplified (or mixed) → Hong Kong Traditional. Idempotent on already-HK text. */
export function toHkTraditional(text: string): string {
  if (!text) return text
  try {
    return getS2hk()(text)
  } catch {
    return text
  }
}

/** Hong Kong Traditional → Simplified. Used for Mandarin (cmn) display preference. */
export function toSimplified(text: string): string {
  if (!text) return text
  try {
    return getHk2s()(text)
  } catch {
    return text
  }
}

/** True when OpenCC changes the string (useful for smoke / notes). */
export function hkTraditionalChanged(text: string): boolean {
  return toHkTraditional(text) !== text
}
