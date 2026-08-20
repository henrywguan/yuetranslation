import { lookupGloss } from './gloss.js'

const HAN = /[\u3400-\u9fff\uf900-\ufaff]/

export type AttestationResult = {
  /** 0–1 share of Han characters covered by known CC-Canto/seed tokens. */
  coverage: number
  hanChars: number
  attestedChars: number
  unknownSpans: string[]
}

/**
 * Verify a Cantonese string against the local CC-Canto (+ seed) headword set.
 * Used as a reference layer on finals — not shown to users as definitions.
 */
export function attestAgainstLexicon(text: string): AttestationResult {
  const chars = Array.from(text.trim()).filter((ch) => HAN.test(ch))
  if (!chars.length) {
    return { coverage: 0, hanChars: 0, attestedChars: 0, unknownSpans: [] }
  }

  let attested = 0
  const unknownSpans: string[] = []
  const full = Array.from(text.trim())

  let fi = 0
  while (fi < full.length) {
    const ch = full[fi]
    if (!HAN.test(ch)) {
      fi++
      continue
    }
    let matchedLen = 0
    const max = Math.min(4, full.length - fi)
    for (let L = max; L >= 1; L--) {
      const slice = full.slice(fi, fi + L)
      if (!slice.every((c) => HAN.test(c))) continue
      const surface = slice.join('')
      if (lookupGloss(surface)) {
        matchedLen = L
        attested += L
        break
      }
    }
    if (matchedLen === 0) {
      unknownSpans.push(ch)
      matchedLen = 1
    }
    fi += matchedLen
  }

  const hanChars = chars.length
  return {
    coverage: hanChars ? attested / hanChars : 1,
    hanChars,
    attestedChars: attested,
    unknownSpans: unknownSpans.slice(0, 8),
  }
}

/** Below this coverage on finals, request a constrained rewrite when a model is available. */
export const ATTESTATION_REWRITE_THRESHOLD = 0.55
