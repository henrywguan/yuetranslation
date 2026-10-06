/**
 * German Details helpers — du/Sie address honesty for learners.
 * Compact panes stay standard German orthography only (no IPA / Chao).
 */

export type GermanAddress = 'du' | 'sie' | 'mixed'

export const GERMAN_HONESTY_NOTE =
  'German capitalizes all nouns; spoken German often reduces endings. Writing keeps umlauts (ä, ö, ü) and ß where standard German spelling requires them.'

const DU_MARKERS =
  /\b(du|dich|dir|dein|deine|deiner|deines|deinem|deinen|deinige|deinigen)\b/iu

/** Formal Sie (and polite possessives) — capitalization distinguishes Sie from sie “they/she”. */
const SIE_MARKERS =
  /\b(Sie|Ihnen|Ihr|Ihre|Ihrer|Ihres|Ihrem|Ihren)\b/u

const SIE_SOFT =
  /\b(sehr geehrte[r]?|mit freundlichen grüßen|hochachtungsvoll|bitte reichen sie|würden sie|könnten sie|gestatten sie)\b/iu

function foldDe(s: string): string {
  return s
    .normalize('NFKC')
    .replace(/[«»„""''…—–-]/g, ' ')
    .replace(/[?!.,;:()[\]]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Best-effort du / Sie detection for Details chips. */
export function detectGermanAddress(text: string): GermanAddress | null {
  const raw = text.trim()
  const t = foldDe(raw)
  if (!t || !/[\p{L}]/u.test(t)) return null
  const hasDu = DU_MARKERS.test(t)
  const hasSie = SIE_MARKERS.test(raw) || SIE_SOFT.test(t)
  if (hasDu && hasSie) return 'mixed'
  if (hasDu) return 'du'
  if (hasSie) return 'sie'
  return null
}

export function germanAddressLabel(kind: GermanAddress): string {
  switch (kind) {
    case 'du':
      return 'du (informal)'
    case 'sie':
      return 'Sie (formal)'
    case 'mixed':
      return 'du + Sie'
  }
}

export function germanAddressChip(kind: GermanAddress): string {
  switch (kind) {
    case 'du':
      return 'du'
    case 'sie':
      return 'Sie'
    case 'mixed':
      return 'du / Sie'
  }
}
