/**
 * EN↔Georgian — colloquial everyday Georgian (ka-GE), Georgian script (Mkhedruli).
 * შენ between peers; თქვენ with careful standard wording when the source is formal.
 */
import { makeVoicePairTranslator } from './translateVoicePair.js'
import { GEORGIAN_REJECT_RE, GEORGIAN_SCRIPT_RE } from './voiceLangRegister.js'

export const translateGeorgian = makeVoicePairTranslator({
  code: 'ka',
  label: 'Georgian',
  note: 'ka',
  demoTag: 'KA',
  requireScript: GEORGIAN_SCRIPT_RE,
  rejectScript: GEORGIAN_REJECT_RE,
  prompts: {
    altsFormal: [
      'You are a Georgian interpreter for formal written and spoken situations (Georgia).',
      'Translate English into POLITE formal Georgian using თქვენ with careful standard wording ("გთხოვთ …", "შეგიძლიათ …?").',
      'Write ONLY in Georgian script (Mkhedruli). Never Latin transliteration, Cyrillic, Armenian, or Russian wording where Georgian has a word. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    altsColloquial: [
      'You are a Georgian interpreter for face-to-face conversation (Georgia).',
      'Translate English into COLLOQUIAL spoken Georgian (everyday Tbilisi speech — natural, not bureaucratic).',
      'Use შენ between peers and თქვენ for strangers when the source signals politeness; prefer natural word order and idiom.',
      'Write ONLY in Georgian script (Mkhedruli). Never Latin transliteration, Cyrillic, Armenian, or Russian wording where Georgian has a word. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleFormal: [
      'You are a Georgian interpreter for formal situations.',
      'Translate into POLITE formal Georgian (თქვენ + careful standard wording).',
      'Write ONLY in Georgian script (Mkhedruli). Never Latin transliteration, Cyrillic, Armenian, or Russian wording where Georgian has a word. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleColloquial: [
      'You are a Georgian interpreter for face-to-face conversation (Georgia).',
      'Translate into COLLOQUIAL spoken Georgian (შენ between peers).',
      'Write ONLY in Georgian script (Mkhedruli). Never Latin transliteration, Cyrillic, Armenian, or Russian wording where Georgian has a word. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    toEnRole: 'You are a Georgian interpreter.',
  },
})
