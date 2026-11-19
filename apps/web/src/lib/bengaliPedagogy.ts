/**
 * Bengali Details helpers — আপনি / তুমি / তুই address honesty for learners.
 * Compact panes stay Bangla script only (no ISO 15919 / Banglish Latin).
 */

export type BengaliAddress = 'apni' | 'tumi' | 'tui'

export const BENGALI_HONESTY_NOTE =
  'Bangla speech often says the inherent vowel as “o” and drops it at word end; the ISO 15919 reading follows spelling, not speech. Compact shows Bangla script only — not Banglish Latin or Devanagari. Bengali is not tonal.'

const LABEL: Record<BengaliAddress, string> = {
  apni: 'আপনি (respectful)',
  tumi: 'তুমি (familiar)',
  tui: 'তুই (intimate)',
}

const CHIP: Record<BengaliAddress, string> = {
  apni: 'আপনি',
  tumi: 'তুমি',
  tui: 'তুই',
}

export function bengaliAddressLabel(kind: BengaliAddress): string {
  return LABEL[kind]
}

export function bengaliAddressChip(kind: BengaliAddress): string {
  return CHIP[kind]
}

const BENGALI = /[\u0980-\u09FF]/

/** Best-effort address detection from pronoun forms; null when there is no clear cue. */
export function detectBengaliAddress(text: string): BengaliAddress | null {
  const t = text.normalize('NFC').trim()
  if (!t || !BENGALI.test(t)) return null
  if (/আপনি|আপনার|আপনাকে|আপনারা|আপনাদের/u.test(t)) return 'apni'
  if (/তুমি|তোমার|তোমাকে|তোমরা|তোমাদের/u.test(t)) return 'tumi'
  if (/তুই|তোর|তোকে|তোরা|তোদের/u.test(t)) return 'tui'
  return null
}
