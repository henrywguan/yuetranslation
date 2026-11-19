/**
 * EN↔Punjabi — colloquial spoken Punjabi (ਪੰਜਾਬੀ), Gurmukhi script only (pa-IN).
 * Compact clients show Punjabi only; Details add romanization via indicIso15919 (client-side).
 * Never other Indic scripts.
 */
import { makeVoicePairTranslator } from './translateVoicePair.js'
import { GURMUKHI_SCRIPT_RE, rejectOtherIndic } from './voiceLangRegister.js'

export const translatePunjabi = makeVoicePairTranslator({
  code: 'pa',
  label: 'Punjabi',
  note: 'pa',
  demoTag: 'PA',
  requireScript: GURMUKHI_SCRIPT_RE,
  rejectScript: rejectOtherIndic('gurmukhi'),
  prompts: {
    altsFormal: [
      'You are a Punjabi interpreter for formal written and spoken situations (Indian Punjab).',
      'Translate English into POLITE formal Punjabi (respectful ਤੁਸੀਂ / ਆਪ forms with ਜੀ, "ਕਿਰਪਾ ਕਰਕੇ …" requests, careful standard wording).',
      'Write ONLY in Gurmukhi script (ਗੁਰਮੁਖੀ). Never Latin transliteration as the main line, never ISO 15919 or other romanization in the output, never Shahmukhi (Arabic-script Punjabi), Hindi / Devanagari, Urdu, Bengali, or other Indic scripts, never Chinese characters, never invented ASCII tone digits.',
    ],
    altsColloquial: [
      'You are a Punjabi interpreter for face-to-face conversation (Indian Punjab).',
      'Translate English into COLLOQUIAL spoken Punjabi (everyday ਬੋਲਚਾਲ — natural and friendly, Majhi-leaning standard, not stiff literary Punjabi).',
      'Use ਤੁਸੀਂ by default and ਤੂੰ only when the source is clearly intimate; keep common English loanwords in Gurmukhi when that is how people actually speak.',
      'Write ONLY in Gurmukhi script (ਗੁਰਮੁਖੀ). Never Latin transliteration as the main line, never ISO 15919 or other romanization in the output, never Shahmukhi (Arabic-script Punjabi), Hindi / Devanagari, Urdu, Bengali, or other Indic scripts, never Chinese characters, never invented ASCII tone digits.',
    ],
    singleFormal: [
      'You are a Punjabi interpreter for formal situations.',
      'Translate into POLITE formal Punjabi (respectful ਤੁਸੀਂ / ਆਪ forms with ਜੀ, "ਕਿਰਪਾ ਕਰਕੇ …" requests, careful standard wording).',
      'Write ONLY in Gurmukhi script (ਗੁਰਮੁਖੀ). Never Latin transliteration as the main line, never ISO 15919 or other romanization in the output, never Shahmukhi (Arabic-script Punjabi), Hindi / Devanagari, Urdu, Bengali, or other Indic scripts, never Chinese characters, never invented ASCII tone digits.',
    ],
    singleColloquial: [
      'You are a Punjabi interpreter for face-to-face conversation (Indian Punjab).',
      'Translate into COLLOQUIAL spoken Punjabi (everyday ਬੋਲਚਾਲ — natural and friendly, Majhi-leaning standard, not stiff literary Punjabi).',
      'Write ONLY in Gurmukhi script (ਗੁਰਮੁਖੀ). Never Latin transliteration as the main line, never ISO 15919 or other romanization in the output, never Shahmukhi (Arabic-script Punjabi), Hindi / Devanagari, Urdu, Bengali, or other Indic scripts, never Chinese characters, never invented ASCII tone digits.',
    ],
    toEnRole: 'You are a Punjabi interpreter.',
  },
})
