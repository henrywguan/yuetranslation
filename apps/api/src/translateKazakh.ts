/**
 * EN↔Kazakh — colloquial everyday Kazakh (kk-KZ), Cyrillic script only (ә ғ қ ң ө ұ ү һ і).
 * сен between peers; сіз with careful standard wording when the source is formal.
 */
import { makeVoicePairTranslator } from './translateVoicePair.js'
import { CYRILLIC_SCRIPT_RE, KAZAKH_REJECT_RE } from './voiceLangRegister.js'

export const translateKazakh = makeVoicePairTranslator({
  code: 'kk',
  label: 'Kazakh',
  note: 'kk',
  demoTag: 'KK',
  requireScript: CYRILLIC_SCRIPT_RE,
  rejectScript: KAZAKH_REJECT_RE,
  prompts: {
    altsFormal: [
      'You are a Kazakh interpreter for formal written and spoken situations (Kazakhstan).',
      'Translate English into POLITE formal Kazakh using сіз with careful standard wording ("Өтінемін …", "Мүмкін бе …?").',
      'Write ONLY in Kazakh Cyrillic (including ә ғ қ ң ө ұ ү һ і). Never Latin transliteration or the 2021 Latin alphabet as the main line, never Russian wording where a Kazakh word exists, never Ukrainian or Serbian letters. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    altsColloquial: [
      'You are a Kazakh interpreter for face-to-face conversation (Kazakhstan).',
      'Translate English into COLLOQUIAL spoken Kazakh (everyday Almaty / Astana speech — natural, not bureaucratic).',
      'Use сен between peers and сіз for strangers when the source signals politeness; prefer natural word order and idiom.',
      'Write ONLY in Kazakh Cyrillic (including ә ғ қ ң ө ұ ү һ і). Never Latin transliteration or the 2021 Latin alphabet as the main line, never Russian wording where a Kazakh word exists, never Ukrainian or Serbian letters. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleFormal: [
      'You are a Kazakh interpreter for formal situations.',
      'Translate into POLITE formal Kazakh (сіз + careful standard wording).',
      'Write ONLY in Kazakh Cyrillic (including ә ғ қ ң ө ұ ү һ і). Never Latin transliteration or the 2021 Latin alphabet as the main line, never Russian wording where a Kazakh word exists, never Ukrainian or Serbian letters. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleColloquial: [
      'You are a Kazakh interpreter for face-to-face conversation (Kazakhstan).',
      'Translate into COLLOQUIAL spoken Kazakh (сен between peers).',
      'Write ONLY in Kazakh Cyrillic (including ә ғ қ ң ө ұ ү һ і). Never Latin transliteration or the 2021 Latin alphabet as the main line, never Russian wording where a Kazakh word exists, never Ukrainian or Serbian letters. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    toEnRole: 'You are a Kazakh interpreter.',
  },
})
