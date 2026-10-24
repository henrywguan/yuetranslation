/**
 * OpenCC helpers (pure JS via opencc-js) for HK Traditional ↔ Simplified.
 * Used on scrub / attestation / Cam Chinese paths — not a paid API.
 *
 * Cam OCR: only Yue + Mandarin use HK Traditional. Wu / Sichuanese must not
 * be forced through s2hk (Hong Kong regional variants).
 */
import * as OpenCC from 'opencc-js'

type Converter = (text: string) => string

let s2hk: Converter | null = null
let hk2s: Converter | null = null

function getS2hk(): Converter {
  if (!s2hk) s2hk = OpenCC.Converter({ from: 'cn', to: 'hk' })
  return s2hk
}

function getHk2s(): Converter {
  if (!hk2s) hk2s = OpenCC.Converter({ from: 'hk', to: 'cn' })
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

/** Cam langs whose OCR/source should normalize via HK OpenCC (not wuu / sichuan). */
export function usesHkCamOrthography(lang: string): boolean {
  return lang === 'yue' || lang === 'cmn'
}

/** Normalize Cam Chinese source for cache/prompt stability — HK only for yue/cmn. */
export function normalizeCamChineseSource(lang: string, text: string): string {
  if (!text || !usesHkCamOrthography(lang)) return text
  return toHkTraditional(text)
}

/** Polish Cam Chinese *output* for Yue targets (HK Traditional). */
export function polishCamYueOutput(text: string): string {
  return toHkTraditional(text)
}
