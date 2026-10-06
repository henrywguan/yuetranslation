/**
 * French Details helpers — tu/vous address honesty for learners.
 * Compact panes stay accented Metropolitan French only (no IPA / Chao).
 */

export type FrenchAddress = 'tu' | 'vous' | 'mixed'

export const FRENCH_HONESTY_NOTE =
  'Spoken French links words (liaison) and often drops mute e; writing keeps the accents and full spelling.'

const TU_MARKERS =
  /\b(tu|t['’]as|t['’]es|t['’]y|te|toi|ton|ta|tes|tien|tienne|tiens|tiennes)\b/iu

const VOUS_MARKERS =
  /\b(vous|votre|vos|vôtre|vôtres)\b/iu

function foldFr(s: string): string {
  return s
    .normalize('NFKC')
    .replace(/[«»„""''…—–-]/g, ' ')
    .replace(/[?!.,;:()[\]]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Best-effort tu / vous detection for Details chips. */
export function detectFrenchAddress(text: string): FrenchAddress | null {
  const t = foldFr(text)
  if (!t || !/[\p{L}]/u.test(t)) return null
  const hasTu = TU_MARKERS.test(t)
  const hasVous = VOUS_MARKERS.test(t)
  if (hasTu && hasVous) return 'mixed'
  if (hasTu) return 'tu'
  if (hasVous) return 'vous'
  return null
}

export function frenchAddressLabel(kind: FrenchAddress): string {
  switch (kind) {
    case 'tu':
      return 'tu (informal)'
    case 'vous':
      return 'vous (formal / plural)'
    case 'mixed':
      return 'tu + vous'
  }
}

export function frenchAddressChip(kind: FrenchAddress): string {
  switch (kind) {
    case 'tu':
      return 'tu'
    case 'vous':
      return 'vous'
    case 'mixed':
      return 'tu / vous'
  }
}
