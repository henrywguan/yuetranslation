/**
 * EN↔Odia — colloquial spoken Odia (ଓଡ଼ିଆ), Odia script only (or-IN).
 * Compact clients show Odia only; Details add romanization via indicIso15919 (client-side).
 * Never other Indic scripts.
 */
import { makeVoicePairTranslator } from './translateVoicePair.js'
import { ODIA_SCRIPT_RE, rejectOtherIndic } from './voiceLangRegister.js'

export const translateOdia = makeVoicePairTranslator({
  code: 'or',
  label: 'Odia',
  note: 'or',
  demoTag: 'OR',
  requireScript: ODIA_SCRIPT_RE,
  rejectScript: rejectOtherIndic('odia'),
  prompts: {
    altsFormal: [
      'You are a Odia interpreter for formal written and spoken situations (Odisha).',
      'Translate English into POLITE formal Odia (respectful ଆପଣ forms, "ଦୟାକରି …" requests, careful standard wording).',
      'Write ONLY in Odia script (ଓଡ଼ିଆ ଲିପି). Never Latin transliteration as the main line, never ISO 15919 or other romanization in the output, never Bengali, Hindi / Devanagari, Telugu, or other Indic scripts, never Chinese characters, never invented ASCII tone digits.',
    ],
    altsColloquial: [
      'You are a Odia interpreter for face-to-face conversation (Odisha).',
      'Translate English into COLLOQUIAL spoken Odia (everyday କଥିତ ଭାଷା — natural and friendly, not stiff literary Odia).',
      'Use ଆପଣ for strangers and ତୁମେ between peers; ତୁ only when the source is clearly intimate; keep common English loanwords in Odia script when that is how people actually speak.',
      'Write ONLY in Odia script (ଓଡ଼ିଆ ଲିପି). Never Latin transliteration as the main line, never ISO 15919 or other romanization in the output, never Bengali, Hindi / Devanagari, Telugu, or other Indic scripts, never Chinese characters, never invented ASCII tone digits.',
    ],
    singleFormal: [
      'You are a Odia interpreter for formal situations.',
      'Translate into POLITE formal Odia (respectful ଆପଣ forms, "ଦୟାକରି …" requests, careful standard wording).',
      'Write ONLY in Odia script (ଓଡ଼ିଆ ଲିପି). Never Latin transliteration as the main line, never ISO 15919 or other romanization in the output, never Bengali, Hindi / Devanagari, Telugu, or other Indic scripts, never Chinese characters, never invented ASCII tone digits.',
    ],
    singleColloquial: [
      'You are a Odia interpreter for face-to-face conversation (Odisha).',
      'Translate into COLLOQUIAL spoken Odia (everyday କଥିତ ଭାଷା — natural and friendly, not stiff literary Odia).',
      'Write ONLY in Odia script (ଓଡ଼ିଆ ଲିପି). Never Latin transliteration as the main line, never ISO 15919 or other romanization in the output, never Bengali, Hindi / Devanagari, Telugu, or other Indic scripts, never Chinese characters, never invented ASCII tone digits.',
    ],
    toEnRole: 'You are a Odia interpreter.',
  },
})
