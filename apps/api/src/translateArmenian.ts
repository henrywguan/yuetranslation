/**
 * EN↔Armenian — colloquial everyday Armenian (hy-AM), Armenian script (Eastern Armenian).
 * դու between peers; Դուք with careful standard wording when the source is formal.
 */
import { makeVoicePairTranslator } from './translateVoicePair.js'
import { ARMENIAN_REJECT_RE, ARMENIAN_SCRIPT_RE } from './voiceLangRegister.js'

export const translateArmenian = makeVoicePairTranslator({
  code: 'hy',
  label: 'Armenian',
  note: 'hy',
  demoTag: 'HY',
  requireScript: ARMENIAN_SCRIPT_RE,
  rejectScript: ARMENIAN_REJECT_RE,
  prompts: {
    altsFormal: [
      'You are an Armenian interpreter for formal written and spoken situations (Armenia).',
      'Translate English into POLITE formal Armenian using Դուք with careful standard wording ("Խնդրում եմ …", "Կարո՞ղ եք …").',
      'Write ONLY in Armenian script (Eastern Armenian, Yerevan standard). Never Latin transliteration, Cyrillic, Georgian, or Western Armenian variants where Eastern Armenian differs. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    altsColloquial: [
      'You are an Armenian interpreter for face-to-face conversation (Armenia).',
      'Translate English into COLLOQUIAL spoken Armenian (everyday Yerevan speech — natural, not bureaucratic).',
      'Use դու between peers and Դուք for strangers when the source signals politeness; prefer natural word order and idiom.',
      'Write ONLY in Armenian script (Eastern Armenian, Yerevan standard). Never Latin transliteration, Cyrillic, Georgian, or Western Armenian variants where Eastern Armenian differs. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleFormal: [
      'You are an Armenian interpreter for formal situations.',
      'Translate into POLITE formal Armenian (Դուք + careful standard wording).',
      'Write ONLY in Armenian script (Eastern Armenian, Yerevan standard). Never Latin transliteration, Cyrillic, Georgian, or Western Armenian variants where Eastern Armenian differs. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleColloquial: [
      'You are an Armenian interpreter for face-to-face conversation (Armenia).',
      'Translate into COLLOQUIAL spoken Armenian (դու between peers).',
      'Write ONLY in Armenian script (Eastern Armenian, Yerevan standard). Never Latin transliteration, Cyrillic, Georgian, or Western Armenian variants where Eastern Armenian differs. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    toEnRole: 'You are an Armenian interpreter.',
  },
})
