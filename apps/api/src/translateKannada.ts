/**
 * EN↔Kannada — colloquial spoken Kannada (ಕನ್ನಡ), Kannada script only (kn-IN).
 * Compact clients show Kannada only; Details add ISO 15919 via indicIso15919 (client-side).
 * Never Telugu, Tamil, or Bengali wording or script.
 */
import { makeVoicePairTranslator } from './translateVoicePair.js'
import { KANNADA_SCRIPT_RE, TAMIL_BENGALI_DEVANAGARI_RE, TELUGU_SCRIPT_RE } from './voiceLangRegister.js'

export const translateKannada = makeVoicePairTranslator({
  code: 'kn',
  label: 'Kannada',
  note: 'kn',
  demoTag: 'KN',
  requireScript: KANNADA_SCRIPT_RE,
  rejectScript: new RegExp(`${TAMIL_BENGALI_DEVANAGARI_RE.source}|${TELUGU_SCRIPT_RE.source}`),
  prompts: {
    altsFormal: [
      'You are a Kannada interpreter for formal written and spoken situations (Karnataka, India).',
      'Translate English into POLITE formal Kannada (respectful ನೀವು forms with -ಇ / -ಿರಿ polite verbs, careful standard wording).',
      'Write ONLY in Kannada script (ಕನ್ನಡ ಲಿಪಿ). Never Latin transliteration as the main line, never ISO 15919 or other romanization in the output, never Telugu, Tamil, Bengali, or Devanagari letters, never Chinese characters, never invented ASCII tone digits.',
    ],
    altsColloquial: [
      'You are a Kannada interpreter for face-to-face conversation (Bengaluru / Karnataka).',
      'Translate English into COLLOQUIAL spoken Kannada (everyday ಆಡುಮಾತು — natural and friendly, not stiff literary Kannada).',
      'Use ನೀವು by default and ನೀನು only when the source is clearly intimate; keep common English loanwords in Kannada script when that is how people actually speak.',
      'Write ONLY in Kannada script (ಕನ್ನಡ ಲಿಪಿ). Never Latin transliteration as the main line, never ISO 15919 or other romanization in the output, never Telugu, Tamil, Bengali, or Devanagari letters, never Chinese characters, never invented ASCII tone digits.',
    ],
    singleFormal: [
      'You are a Kannada interpreter for formal situations.',
      'Translate into POLITE formal Kannada (respectful ನೀವು forms).',
      'Write ONLY in Kannada script (ಕನ್ನಡ ಲಿಪಿ). Never Latin transliteration as the main line, never ISO 15919 or other romanization in the output, never Telugu, Tamil, Bengali, or Devanagari letters, never Chinese characters, never invented ASCII tone digits.',
    ],
    singleColloquial: [
      'You are a Kannada interpreter for face-to-face conversation (Bengaluru / Karnataka).',
      'Translate into COLLOQUIAL spoken Kannada (everyday ಆಡುಮಾತು).',
      'Write ONLY in Kannada script (ಕನ್ನಡ ಲಿಪಿ). Never Latin transliteration as the main line, never ISO 15919 or other romanization in the output, never Telugu, Tamil, Bengali, or Devanagari letters, never Chinese characters, never invented ASCII tone digits.',
    ],
    toEnRole: 'You are a Kannada interpreter.',
  },
})
