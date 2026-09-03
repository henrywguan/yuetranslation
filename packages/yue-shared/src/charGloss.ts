/** Shared character-gloss constants (web offline map + API breakdown). */

export const GENERIC_CHAR_GLOSS = 'Cantonese character'

export function isGenericCharGloss(gloss: string | null | undefined): boolean {
  return (gloss || '').trim() === GENERIC_CHAR_GLOSS
}
