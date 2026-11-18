/**
 * Tamil Details helpers — நீங்கள் / நீ address honesty for learners.
 * Compact panes stay Tamil script only (no ISO 15919 / Tanglish Latin).
 */

export type TamilAddress = 'neengal' | 'nee'

export const TAMIL_HONESTY_NOTE =
  'Spoken Tamil differs a lot from written Tamil, and the script does not mark voicing (க can sound k, g, or h). The ISO 15919 reading follows spelling, not speech. Tamil is not tonal.'

const LABEL: Record<TamilAddress, string> = {
  neengal: 'நீங்கள் (respectful)',
  nee: 'நீ (familiar)',
}

const CHIP: Record<TamilAddress, string> = {
  neengal: 'நீங்கள்',
  nee: 'நீ',
}

export function tamilAddressLabel(kind: TamilAddress): string {
  return LABEL[kind]
}

export function tamilAddressChip(kind: TamilAddress): string {
  return CHIP[kind]
}

const TAMIL = /[\u0B80-\u0BFF]/
const WORD_END = '(?=[\\s.,!?…"\')]|$)'

/** Respectful pronoun forms (நீங்கள், நீங்க, உங்கள், உங்க…) or polite -ங்க verb endings. */
const NEENGAL_RE = new RegExp(`நீங்க|உங்க|ங்க(ள்)?${WORD_END}`, 'u')
/** Familiar pronoun forms (நீ, உன், உனக்கு, உன்னை…). */
const NEE_RE = new RegExp(`(^|\\s)நீ${WORD_END}|(^|\\s)உன(்|க்கு|்னை|்னோட|்னுடைய)`, 'u')

/** Best-effort address detection; null when the line has no clear cue. */
export function detectTamilAddress(text: string): TamilAddress | null {
  const t = text.normalize('NFC').trim()
  if (!t || !TAMIL.test(t)) return null
  if (NEENGAL_RE.test(t)) return 'neengal'
  if (NEE_RE.test(t)) return 'nee'
  return null
}
