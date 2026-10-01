/**
 * A written reason under a miss when the model did not send one.
 * Tone notes and the English check are offline.
 */
import { toneNoteForSyllable } from './practicePartnerToneNote'

export function missReasonFallback(said: string, jyutping: string): string {
  const heard = said.trim()
  const han = /\p{Script=Han}/u.test(heard)
  if (heard && !han && /[A-Za-z]/.test(heard)) return 'That came through in English.'
  const syllable = jyutping.trim().split(/\s+/)[0] || ''
  const note = toneNoteForSyllable(syllable)
  if (!note) return ''
  return `${note.syllable} is ${note.name.toLowerCase()} (${note.contour}).`
}
