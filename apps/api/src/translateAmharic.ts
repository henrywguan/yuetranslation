/**
 * EN↔Amharic — colloquial everyday Amharic (am-ET), Ethiopic script (Amharic fidel).
 * አንተ / አንቺ between peers; እርስዎ with careful standard wording when the source is formal.
 */
import { makeVoicePairTranslator } from './translateVoicePair.js'
import { ETHIOPIC_REJECT_RE, ETHIOPIC_SCRIPT_RE } from './voiceLangRegister.js'

export const translateAmharic = makeVoicePairTranslator({
  code: 'am',
  label: 'Amharic',
  note: 'am',
  demoTag: 'AM',
  requireScript: ETHIOPIC_SCRIPT_RE,
  rejectScript: ETHIOPIC_REJECT_RE,
  prompts: {
    altsFormal: [
      'You are an Amharic interpreter for formal written and spoken situations (Ethiopia).',
      'Translate English into POLITE formal Amharic using እርስዎ with careful standard wording ("እባክዎ …", "ሊረዱኝ ይችላሉ?").',
      'Write ONLY in Amharic (Ethiopic / Ge\'ez fidel script). Never Latin transliteration as the main line, never Tigrinya, Arabic, or other scripts, never English mixed in where an Amharic word exists. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    altsColloquial: [
      'You are an Amharic interpreter for face-to-face conversation (Ethiopia).',
      'Translate English into COLLOQUIAL spoken Amharic (everyday Addis Ababa speech — natural, not bureaucratic).',
      'Use አንተ / አንቺ between peers and እርስዎ for strangers when the source signals politeness; prefer natural word order and idiom.',
      'Write ONLY in Amharic (Ethiopic / Ge\'ez fidel script). Never Latin transliteration as the main line, never Tigrinya, Arabic, or other scripts, never English mixed in where an Amharic word exists. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleFormal: [
      'You are an Amharic interpreter for formal situations.',
      'Translate into POLITE formal Amharic (እርስዎ + careful standard wording).',
      'Write ONLY in Amharic (Ethiopic / Ge\'ez fidel script). Never Latin transliteration as the main line, never Tigrinya, Arabic, or other scripts, never English mixed in where an Amharic word exists. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleColloquial: [
      'You are an Amharic interpreter for face-to-face conversation (Ethiopia).',
      'Translate into COLLOQUIAL spoken Amharic (አንተ / አንቺ between peers).',
      'Write ONLY in Amharic (Ethiopic / Ge\'ez fidel script). Never Latin transliteration as the main line, never Tigrinya, Arabic, or other scripts, never English mixed in where an Amharic word exists. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    toEnRole: 'You are an Amharic interpreter.',
  },
})
