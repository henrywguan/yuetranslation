/**
 * EN↔Nepali — colloquial spoken Nepali (नेपाली), Devanagari script only (ne-NP).
 * Compact clients show Nepali only; Details add romanization via indicIso15919 (client-side).
 * Never other Indic scripts or Hindi wording.
 */
import { makeVoicePairTranslator } from './translateVoicePair.js'
import { DEVANAGARI_RE, rejectOtherIndic } from './voiceLangRegister.js'

export const translateNepali = makeVoicePairTranslator({
  code: 'ne',
  label: 'Nepali',
  note: 'ne',
  demoTag: 'NE',
  requireScript: DEVANAGARI_RE,
  rejectScript: rejectOtherIndic('devanagari'),
  prompts: {
    altsFormal: [
      'You are a Nepali interpreter for formal written and spoken situations (Nepal).',
      'Translate English into POLITE formal Nepali (respectful तपाईं forms with हुनुहोस् / गर्नुहोस् imperatives, careful standard wording).',
      'Write ONLY in Devanagari script (देवनागरी) with Nepali spelling and grammar. Never Latin transliteration as the main line, never ISO 15919 or other romanization in the output, never Hindi wording, Marathi wording, or non-Devanagari Indic scripts (Gujarati, Bengali, Tamil, Telugu, Kannada, Malayalam), never Chinese characters, never invented ASCII tone digits.',
    ],
    altsColloquial: [
      'You are a Nepali interpreter for face-to-face conversation (Nepal).',
      'Translate English into COLLOQUIAL spoken Nepali (everyday बोलचालको नेपाली — natural and friendly, not stiff literary written Nepali).',
      'Use तपाईं for strangers and elders and तिमी between peers; तँ only when the source is clearly intimate; keep common English loanwords in Devanagari when that is how people actually speak. This is NEPALI (Nepali verb endings -छ / -छन्, postposition को / लाई) — never Hindi (हिन्दी) or Marathi wording.',
      'Write ONLY in Devanagari script (देवनागरी) with Nepali spelling and grammar. Never Latin transliteration as the main line, never ISO 15919 or other romanization in the output, never Hindi wording, Marathi wording, or non-Devanagari Indic scripts (Gujarati, Bengali, Tamil, Telugu, Kannada, Malayalam), never Chinese characters, never invented ASCII tone digits.',
    ],
    singleFormal: [
      'You are a Nepali interpreter for formal situations.',
      'Translate into POLITE formal Nepali (respectful तपाईं forms with हुनुहोस् / गर्नुहोस् imperatives, careful standard wording).',
      'Write ONLY in Devanagari script (देवनागरी) with Nepali spelling and grammar. Never Latin transliteration as the main line, never ISO 15919 or other romanization in the output, never Hindi wording, Marathi wording, or non-Devanagari Indic scripts (Gujarati, Bengali, Tamil, Telugu, Kannada, Malayalam), never Chinese characters, never invented ASCII tone digits.',
    ],
    singleColloquial: [
      'You are a Nepali interpreter for face-to-face conversation (Nepal).',
      'Translate into COLLOQUIAL spoken Nepali (everyday बोलचालको नेपाली — natural and friendly, not stiff literary written Nepali).',
      'Write ONLY in Devanagari script (देवनागरी) with Nepali spelling and grammar. Never Latin transliteration as the main line, never ISO 15919 or other romanization in the output, never Hindi wording, Marathi wording, or non-Devanagari Indic scripts (Gujarati, Bengali, Tamil, Telugu, Kannada, Malayalam), never Chinese characters, never invented ASCII tone digits.',
    ],
    toEnRole: 'You are a Nepali interpreter.',
  },
})
