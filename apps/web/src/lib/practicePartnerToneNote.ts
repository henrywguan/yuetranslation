/**
 * Offline tone note for a Jyutping syllable already on the card.
 * Contours are the Chao letters the product already draws. No model call.
 */
import { chaoContourForTone, parseJyutpingTone, type JyutTone } from './jyutping'

const TONE_COPY: Record<JyutTone, { name: string; blurb: string }> = {
  '1': { name: 'High level', blurb: 'Stay high and flat.' },
  '2': { name: 'High rising', blurb: 'Start in the middle and rise.' },
  '3': { name: 'Mid level', blurb: 'Stay in the middle, flat.' },
  '4': { name: 'Low falling', blurb: 'Start low and fall.' },
  '5': { name: 'Low rising', blurb: 'Start low and rise.' },
  '6': { name: 'Low level', blurb: 'Stay low and flat.' },
}

export type PartnerToneNote = {
  syllable: string
  digit: JyutTone
  contour: string
  name: string
  blurb: string
}

export function toneNoteForSyllable(jp: string): PartnerToneNote | null {
  const parsed = parseJyutpingTone(jp.trim())
  if (!parsed) return null
  const copy = TONE_COPY[parsed.tone]
  const letters = parsed.roman.replace(/[1-6]$/, '')
  const stopped = /[ptk]$/i.test(letters)
  return {
    syllable: parsed.roman,
    digit: parsed.tone,
    contour: chaoContourForTone(parsed.tone),
    name: copy.name,
    blurb: stopped ? `${copy.blurb} This syllable stops short.` : copy.blurb,
  }
}
