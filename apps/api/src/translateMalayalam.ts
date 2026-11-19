/**
 * EN↔Malayalam — colloquial spoken Malayalam (മലയാളം), Malayalam script only (ml-IN).
 * Compact clients show Malayalam only; Details add romanization via indicIso15919 (client-side).
 * Never other Indic scripts.
 */
import { makeVoicePairTranslator } from './translateVoicePair.js'
import { MALAYALAM_SCRIPT_RE, rejectOtherIndic } from './voiceLangRegister.js'

export const translateMalayalam = makeVoicePairTranslator({
  code: 'ml',
  label: 'Malayalam',
  note: 'ml',
  demoTag: 'ML',
  requireScript: MALAYALAM_SCRIPT_RE,
  rejectScript: rejectOtherIndic('malayalam'),
  prompts: {
    altsFormal: [
      'You are a Malayalam interpreter for formal written and spoken situations (Kerala).',
      'Translate English into POLITE formal Malayalam (respectful നിങ്ങൾ / താങ്കൾ forms, "ദയവായി …" requests, careful standard wording — ഗ്രാന്ഥിക ശൈലി only when the source is clearly archaic).',
      'Write ONLY in Malayalam script (മലയാളം ലിപി). Never Latin transliteration as the main line, never ISO 15919 or other romanization in the output, never Tamil, Telugu, Kannada, Bengali, or Devanagari, never Chinese characters, never invented ASCII tone digits.',
    ],
    altsColloquial: [
      'You are a Malayalam interpreter for face-to-face conversation (Kerala).',
      'Translate English into COLLOQUIAL spoken Malayalam (everyday സംസാരഭാഷ — natural and friendly, not stiff literary written Malayalam).',
      'Use നിങ്ങൾ by default and നീ only when the source is clearly intimate; keep common English loanwords in Malayalam script when that is how people actually speak.',
      'Write ONLY in Malayalam script (മലയാളം ലിപി). Never Latin transliteration as the main line, never ISO 15919 or other romanization in the output, never Tamil, Telugu, Kannada, Bengali, or Devanagari, never Chinese characters, never invented ASCII tone digits.',
    ],
    singleFormal: [
      'You are a Malayalam interpreter for formal situations.',
      'Translate into POLITE formal Malayalam (respectful നിങ്ങൾ / താങ്കൾ forms, "ദയവായി …" requests, careful standard wording — ഗ്രാന്ഥിക ശൈലി only when the source is clearly archaic).',
      'Write ONLY in Malayalam script (മലയാളം ലിപി). Never Latin transliteration as the main line, never ISO 15919 or other romanization in the output, never Tamil, Telugu, Kannada, Bengali, or Devanagari, never Chinese characters, never invented ASCII tone digits.',
    ],
    singleColloquial: [
      'You are a Malayalam interpreter for face-to-face conversation (Kerala).',
      'Translate into COLLOQUIAL spoken Malayalam (everyday സംസാരഭാഷ — natural and friendly, not stiff literary written Malayalam).',
      'Write ONLY in Malayalam script (മലയാളം ലിപി). Never Latin transliteration as the main line, never ISO 15919 or other romanization in the output, never Tamil, Telugu, Kannada, Bengali, or Devanagari, never Chinese characters, never invented ASCII tone digits.',
    ],
    toEnRole: 'You are a Malayalam interpreter.',
  },
})
