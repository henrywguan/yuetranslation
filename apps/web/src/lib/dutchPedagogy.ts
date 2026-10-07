/**
 * Dutch Details helpers — je/u address honesty for learners.
 * Compact panes stay Dutch orthography only (no IPA / Chao).
 */

export type DutchAddress = 'je' | 'u' | 'mixed'

export const DUTCH_HONESTY_NOTE =
  'Spoken Dutch often reduces unstressed vowels; writing keeps full spelling (ij, oe, ui, diaeresis).'

const JE_MARKERS =
  /\b(je|jij|jou|jouw|jullie)\b/iu

const U_MARKERS =
  /\b(u|uw|uwe)\b/iu

function foldNl(s: string): string {
  return s
    .normalize('NFKC')
    .replace(/[«»„""''…—–-]/g, ' ')
    .replace(/[?!.,;:()[\]]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Best-effort je / u detection for Details chips. */
export function detectDutchAddress(text: string): DutchAddress | null {
  const t = foldNl(text)
  if (!t || !/[\p{L}]/u.test(t)) return null
  const hasJe = JE_MARKERS.test(t)
  const hasU = U_MARKERS.test(t)
  if (hasJe && hasU) return 'mixed'
  if (hasJe) return 'je'
  if (hasU) return 'u'
  return null
}

export function dutchAddressLabel(kind: DutchAddress): string {
  switch (kind) {
    case 'je':
      return 'je (informal)'
    case 'u':
      return 'u (formal)'
    case 'mixed':
      return 'je + u'
  }
}

export function dutchAddressChip(kind: DutchAddress): string {
  switch (kind) {
    case 'je':
      return 'je'
    case 'u':
      return 'u'
    case 'mixed':
      return 'je / u'
  }
}
