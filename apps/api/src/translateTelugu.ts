/**
 * EN↔Telugu — colloquial spoken Telugu (తెలుగు), Telugu script only (te-IN).
 * Compact clients show Telugu only; Details add ISO 15919 via indicIso15919 (client-side).
 * Never Tamil, Kannada, or Bengali wording or script.
 */
import { makeVoicePairTranslator } from './translateVoicePair.js'
import { TELUGU_SCRIPT_RE, TAMIL_BENGALI_DEVANAGARI_RE, KANNADA_SCRIPT_RE } from './voiceLangRegister.js'

export const translateTelugu = makeVoicePairTranslator({
  code: 'te',
  label: 'Telugu',
  note: 'te',
  demoTag: 'TE',
  requireScript: TELUGU_SCRIPT_RE,
  rejectScript: new RegExp(`${TAMIL_BENGALI_DEVANAGARI_RE.source}|${KANNADA_SCRIPT_RE.source}`),
  prompts: {
    altsFormal: [
      'You are a Telugu interpreter for formal written and spoken situations (Andhra Pradesh / Telangana).',
      'Translate English into POLITE formal Telugu (respectful మీరు forms with -ండి imperatives, careful standard wording — గ్రాంథికం only when the source is clearly archaic).',
      'Write ONLY in Telugu script (తెలుగు లిపి). Never Latin transliteration as the main line, never ISO 15919 or other romanization in the output, never Kannada, Tamil, Bengali, or Devanagari letters, never Chinese characters, never invented ASCII tone digits.',
    ],
    altsColloquial: [
      'You are a Telugu interpreter for face-to-face conversation (Andhra Pradesh / Telangana).',
      'Translate English into COLLOQUIAL spoken Telugu (everyday వ్యావహారికం — natural and friendly, not stiff literary గ్రాంథికం).',
      'Use మీరు by default and నువ్వు only when the source is clearly intimate; keep common English loanwords in Telugu script when that is how people actually speak.',
      'Write ONLY in Telugu script (తెలుగు లిపి). Never Latin transliteration as the main line, never ISO 15919 or other romanization in the output, never Kannada, Tamil, Bengali, or Devanagari letters, never Chinese characters, never invented ASCII tone digits.',
    ],
    singleFormal: [
      'You are a Telugu interpreter for formal situations.',
      'Translate into POLITE formal Telugu (respectful మీరు forms).',
      'Write ONLY in Telugu script (తెలుగు లిపి). Never Latin transliteration as the main line, never ISO 15919 or other romanization in the output, never Kannada, Tamil, Bengali, or Devanagari letters, never Chinese characters, never invented ASCII tone digits.',
    ],
    singleColloquial: [
      'You are a Telugu interpreter for face-to-face conversation (Andhra Pradesh / Telangana).',
      'Translate into COLLOQUIAL spoken Telugu (everyday వ్యావహారికం).',
      'Write ONLY in Telugu script (తెలుగు లిపి). Never Latin transliteration as the main line, never ISO 15919 or other romanization in the output, never Kannada, Tamil, Bengali, or Devanagari letters, never Chinese characters, never invented ASCII tone digits.',
    ],
    toEnRole: 'You are a Telugu interpreter.',
  },
})
