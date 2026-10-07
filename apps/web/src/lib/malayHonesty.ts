/**
 * Light Malay learner honesty for Details — pronouns + casual particles.
 * Compact UI stays Malay Latin only (no chips, no IPA, no tone digits).
 */

export type MalayRegisterCue = 'informal' | 'formal' | 'mixed'

export const MALAY_HONESTY_NOTE =
  'Malaysia (ms-MY) colloquial by default. Formal anda/saya when the source is official; particles like lah/je/kan mark casual speech. Not Indonesian.'

/** Informal / peer pronouns & address. */
const INFORMAL_PRONOUN =
  /(^|[^\p{L}])(kau|aku|awak|hang|bro|sis|korang)(?=[^\p{L}]|$)/iu

/** Formal / respectful pronouns & address. */
const FORMAL_PRONOUN =
  /(^|[^\p{L}])(anda|saya|tuan|puan|encik|cik|saudara)(?=[^\p{L}]|$)/iu

/** Everyday Malaysia discourse particles. */
const CASUAL_PARTICLE =
  /(^|[^\p{L}])(lah|je|kan|kot|bah|wei|weh|ni|tu|ah|eh|meh|tak|takde|jom)(?=[^\p{L}]|$)/iu

export function malayBareWord(word: string): string {
  return word.trim().replace(/^[^A-Za-zÀ-ÿ]+|[^A-Za-zÀ-ÿ]+$/g, '')
}

/** Heuristic register cue from Malay surface forms. */
export function detectMalayRegisterCue(text: string): MalayRegisterCue | null {
  const t = text.trim()
  if (!t || !/[\p{L}]/u.test(t)) return null
  const informal = INFORMAL_PRONOUN.test(t) || CASUAL_PARTICLE.test(t)
  const formal = FORMAL_PRONOUN.test(t)
  if (informal && formal) return 'mixed'
  if (formal) return 'formal'
  if (informal) return 'informal'
  return null
}

export function malayRegisterCueLabel(cue: MalayRegisterCue): string {
  switch (cue) {
    case 'informal':
      return 'Informal / peer'
    case 'formal':
      return 'Formal / polite'
    case 'mixed':
      return 'Mixed register'
  }
}

export function malayRegisterCueChip(cue: MalayRegisterCue): string {
  switch (cue) {
    case 'informal':
      return 'Casual'
    case 'formal':
      return 'Formal'
    case 'mixed':
      return 'Mixed'
  }
}

/** List casual particles present (for lean Details chips). */
export function malayParticleHints(text: string): string[] {
  const t = text.trim()
  if (!t) return []
  const found = new Set<string>()
  const re =
    /(^|[^\p{L}])(lah|je|kan|kot|bah|wei|weh|ni|tu|ah|eh|meh|tak|takde|jom)(?=[^\p{L}]|$)/giu
  let m: RegExpExecArray | null
  while ((m = re.exec(t))) {
    const w = (m[2] || '').toLowerCase()
    if (w) found.add(w)
    if (found.size >= 6) break
  }
  return [...found]
}
