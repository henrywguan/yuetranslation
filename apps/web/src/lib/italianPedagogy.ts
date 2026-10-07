/**
 * Italian Details helpers — tu/Lei address honesty for learners.
 * Compact panes stay accented standard Italian only (no IPA / Chao).
 */

export type ItalianAddress = 'tu' | 'lei' | 'mixed'

export const ITALIAN_HONESTY_NOTE =
  'Spoken Italian often drops final vowels and links with apostrophes (l’, un’); writing keeps accents (è, à, ì…) and full spelling.'

const TU_MARKERS =
  /\b(tu|te|ti|tuo|tua|tuoi|tue)\b/iu

/** Formal Lei (and polite possessives) — capitalization distinguishes Lei from lei “she”. */
const LEI_MARKERS =
  /\b(Lei|Suo|Sua|Suoi|Sue|Le\s+(do|dico|chiedo|mando|porto))\b/u

const LEI_SOFT =
  /\b(mi scusi|la prego|vorrebbe|potrebbe|gentilmente|cordiali saluti|distinti saluti)\b/iu

function foldIt(s: string): string {
  return s
    .normalize('NFKC')
    .replace(/[«»„""''…—–-]/g, ' ')
    .replace(/[?!.,;:()[\]]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Best-effort tu / Lei detection for Details chips. */
export function detectItalianAddress(text: string): ItalianAddress | null {
  const raw = text.trim()
  const t = foldIt(raw)
  if (!t || !/[\p{L}]/u.test(t)) return null
  const hasTu = TU_MARKERS.test(t)
  const hasLei = LEI_MARKERS.test(raw) || LEI_SOFT.test(t)
  if (hasTu && hasLei) return 'mixed'
  if (hasTu) return 'tu'
  if (hasLei) return 'lei'
  return null
}

export function italianAddressLabel(kind: ItalianAddress): string {
  switch (kind) {
    case 'tu':
      return 'tu (informal)'
    case 'lei':
      return 'Lei (formal)'
    case 'mixed':
      return 'tu + Lei'
  }
}

export function italianAddressChip(kind: ItalianAddress): string {
  switch (kind) {
    case 'tu':
      return 'tu'
    case 'lei':
      return 'Lei'
    case 'mixed':
      return 'tu / Lei'
  }
}
