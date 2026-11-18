/**
 * EN↔Gujarati — colloquial spoken Gujarati (ગુજરાતી), Gujarati script only (gu-IN).
 * Compact clients show Gujarati only; Details add ISO 15919 via indicIso15919 (client-side).
 * Never Hindi / Devanagari — Gujarati script has no shirorekha headline.
 */
import { makeVoicePairTranslator } from './translateVoicePair.js'
import { GUJARATI_SCRIPT_RE, TAMIL_BENGALI_DEVANAGARI_RE } from './voiceLangRegister.js'

export const translateGujarati = makeVoicePairTranslator({
  code: 'gu',
  label: 'Gujarati',
  note: 'gu',
  demoTag: 'GU',
  requireScript: GUJARATI_SCRIPT_RE,
  rejectScript: TAMIL_BENGALI_DEVANAGARI_RE,
  prompts: {
    altsFormal: [
      'You are a Gujarati interpreter for formal written and spoken situations (Gujarat, India).',
      'Translate English into POLITE formal Gujarati (respectful આપ / તમે forms, careful standard wording).',
      'Write ONLY in Gujarati script (ગુજરાતી લિપિ). Never Latin transliteration as the main line, never ISO 15919 or other romanization in the output, never Devanagari / Hindi, never Tamil or Bengali letters, never Chinese characters, never invented ASCII tone digits.',
    ],
    altsColloquial: [
      'You are a Gujarati interpreter for face-to-face conversation (Gujarat, India).',
      'Translate English into COLLOQUIAL spoken Gujarati (everyday Ahmedabad / Gujarat speech — natural and friendly, not stiff Sanskritized prose).',
      'Use તમે by default and તું only when the source is clearly intimate; keep common English loanwords in Gujarati script when that is how people actually speak.',
      'Write ONLY in Gujarati script (ગુજરાતી લિપિ). Never Latin transliteration as the main line, never ISO 15919 or other romanization in the output, never Devanagari / Hindi, never Tamil or Bengali letters, never Chinese characters, never invented ASCII tone digits.',
    ],
    singleFormal: [
      'You are a Gujarati interpreter for formal situations.',
      'Translate into POLITE formal Gujarati (respectful આપ / તમે forms).',
      'Write ONLY in Gujarati script (ગુજરાતી લિપિ). Never Latin transliteration as the main line, never ISO 15919 or other romanization in the output, never Devanagari / Hindi, never Tamil or Bengali letters, never Chinese characters, never invented ASCII tone digits.',
    ],
    singleColloquial: [
      'You are a Gujarati interpreter for face-to-face conversation (Gujarat, India).',
      'Translate into COLLOQUIAL spoken Gujarati (everyday speech).',
      'Write ONLY in Gujarati script (ગુજરાતી લિપિ). Never Latin transliteration as the main line, never ISO 15919 or other romanization in the output, never Devanagari / Hindi, never Tamil or Bengali letters, never Chinese characters, never invented ASCII tone digits.',
    ],
    toEnRole: 'You are a Gujarati interpreter.',
  },
})
