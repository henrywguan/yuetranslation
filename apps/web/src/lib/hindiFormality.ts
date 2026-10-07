/**
 * Detect Hindi hearer-address / formality band from surface cues.
 * Labels are learner-facing; detection is heuristic (pronouns + endings).
 */

export type HindiFormality = 'aap' | 'tum' | 'tu'

export const HINDI_HONESTY_NOTE =
  'Spoken Hindi often drops the inherent schwa; Devanagari keeps the spelling. Compact shows Devanagari only — not Hinglish Latin or Urdu Nastaliq.'

const LABEL: Record<HindiFormality, string> = {
  aap: 'आप (respectful)',
  tum: 'तुम (familiar)',
  tu: 'तू (intimate)',
}

const CHIP: Record<HindiFormality, string> = {
  aap: 'आप',
  tum: 'तुम',
  tu: 'तू',
}

export function hindiFormalityLabel(level: HindiFormality): string {
  return LABEL[level]
}

export function hindiFormalityChip(level: HindiFormality): string {
  return CHIP[level]
}

/** Best-effort address detection; null when the line has no clear cue. */
export function detectHindiFormality(text: string): HindiFormality | null {
  const t = text.trim()
  if (!t || !/[\u0900-\u097F]/.test(t)) return null

  if (t.includes('आप') || /कीजिए|कीजिये|दिजिए|लाइए|आइए/.test(t)) return 'aap'
  if (/(हैं)([.!?…।॥)"']*)\s*$/u.test(t)) return 'aap'

  if (t.includes('तुम') || t.includes('तुम्ह')) return 'tum'
  if (/(करो|जाओ|आओ|हो)([.!?…।॥)"']*)\s*$/u.test(t)) return 'tum'

  if (t.includes('तू') || t.includes('तुझे') || /तेरा|तेरी|तेरे/.test(t)) return 'tu'

  return null
}
