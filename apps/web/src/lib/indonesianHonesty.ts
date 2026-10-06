/**
 * Light Indonesian learner honesty for Details — pronouns + casual particles.
 * Compact UI stays Indonesian Latin only (no chips, no IPA, no tone digits).
 */

export type IndonesianRegisterCue = 'informal' | 'formal' | 'mixed'

export const INDONESIAN_HONESTY_NOTE =
  'Jakarta/media colloquial by default. Formal Anda/saya when the source is official; particles like dong/deh/sih mark casual speech.'

/** Informal / peer pronouns & address. */
const INFORMAL_PRONOUN =
  /(^|[^\p{L}])(kamu|aku|lo|gue|elu|lu|bro|sis)(?=[^\p{L}]|$)/iu

/** Formal / respectful pronouns & address. */
const FORMAL_PRONOUN =
  /(^|[^\p{L}])(anda|saya|bapak|ibu|saudara|pak|bu)(?=[^\p{L}]|$)/iu

/** Everyday Jakarta/media discourse particles. */
const CASUAL_PARTICLE =
  /(^|[^\p{L}])(dong|deh|sih|nih|yah|lah|kok|banget|nggak|gak|aja|doang)(?=[^\p{L}]|$)/iu

export function indonesianBareWord(word: string): string {
  return word.trim().replace(/^[^A-Za-zÀ-ÿ]+|[^A-Za-zÀ-ÿ]+$/g, '')
}

/** Heuristic register cue from Indonesian surface forms. */
export function detectIndonesianRegisterCue(text: string): IndonesianRegisterCue | null {
  const t = text.trim()
  if (!t || !/[\p{L}]/u.test(t)) return null
  const informal = INFORMAL_PRONOUN.test(t) || CASUAL_PARTICLE.test(t)
  const formal = FORMAL_PRONOUN.test(t)
  if (informal && formal) return 'mixed'
  if (formal) return 'formal'
  if (informal) return 'informal'
  return null
}

export function indonesianRegisterCueLabel(cue: IndonesianRegisterCue): string {
  switch (cue) {
    case 'informal':
      return 'Informal / peer'
    case 'formal':
      return 'Formal / polite'
    case 'mixed':
      return 'Mixed register'
  }
}

export function indonesianRegisterCueChip(cue: IndonesianRegisterCue): string {
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
export function indonesianParticleHints(text: string): string[] {
  const t = text.trim()
  if (!t) return []
  const found = new Set<string>()
  const re =
    /(^|[^\p{L}])(dong|deh|sih|nih|yah|lah|kok|banget|nggak|gak|aja|doang)(?=[^\p{L}]|$)/giu
  let m: RegExpExecArray | null
  while ((m = re.exec(t))) {
    const w = (m[2] || '').toLowerCase()
    if (w) found.add(w)
    if (found.size >= 6) break
  }
  return [...found]
}
