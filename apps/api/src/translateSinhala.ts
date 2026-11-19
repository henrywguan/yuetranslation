/**
 * EN↔Sinhala — colloquial spoken Sinhala (සිංහල), Sinhala script only (si-LK).
 * Compact clients show Sinhala only; Details add romanization via indicIso15919 (client-side).
 * Never other Indic scripts.
 */
import { makeVoicePairTranslator } from './translateVoicePair.js'
import { SINHALA_SCRIPT_RE, rejectOtherIndic } from './voiceLangRegister.js'

export const translateSinhala = makeVoicePairTranslator({
  code: 'si',
  label: 'Sinhala',
  note: 'si',
  demoTag: 'SI',
  requireScript: SINHALA_SCRIPT_RE,
  rejectScript: rejectOtherIndic('sinhala'),
  prompts: {
    altsFormal: [
      'You are a Sinhala interpreter for formal written and spoken situations (Sri Lanka).',
      'Translate English into POLITE formal Sinhala (respectful ඔබ / ඔබතුමා forms, "කරුණාකර …" requests, careful standard wording).',
      'Write ONLY in Sinhala script (සිංහල අකුරු). Never Latin transliteration as the main line, never ISO 15919 or other romanization in the output, never Tamil, Devanagari, Bengali, or other Indic scripts, never Chinese characters, never invented ASCII tone digits.',
    ],
    altsColloquial: [
      'You are a Sinhala interpreter for face-to-face conversation (Sri Lanka).',
      'Translate English into COLLOQUIAL spoken Sinhala (everyday කතා කරන සිංහල — natural and friendly, NOT stiff literary written Sinhala).',
      'Use ඔයා by default and ඔබ only for formal contexts; keep common English loanwords in Sinhala script when that is how people actually speak.',
      'Write ONLY in Sinhala script (සිංහල අකුරු). Never Latin transliteration as the main line, never ISO 15919 or other romanization in the output, never Tamil, Devanagari, Bengali, or other Indic scripts, never Chinese characters, never invented ASCII tone digits.',
    ],
    singleFormal: [
      'You are a Sinhala interpreter for formal situations.',
      'Translate into POLITE formal Sinhala (respectful ඔබ / ඔබතුමා forms, "කරුණාකර …" requests, careful standard wording).',
      'Write ONLY in Sinhala script (සිංහල අකුරු). Never Latin transliteration as the main line, never ISO 15919 or other romanization in the output, never Tamil, Devanagari, Bengali, or other Indic scripts, never Chinese characters, never invented ASCII tone digits.',
    ],
    singleColloquial: [
      'You are a Sinhala interpreter for face-to-face conversation (Sri Lanka).',
      'Translate into COLLOQUIAL spoken Sinhala (everyday කතා කරන සිංහල — natural and friendly, NOT stiff literary written Sinhala).',
      'Write ONLY in Sinhala script (සිංහල අකුරු). Never Latin transliteration as the main line, never ISO 15919 or other romanization in the output, never Tamil, Devanagari, Bengali, or other Indic scripts, never Chinese characters, never invented ASCII tone digits.',
    ],
    toEnRole: 'You are a Sinhala interpreter.',
  },
})
