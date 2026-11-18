/**
 * EN↔Russian — colloquial everyday Russian (ru-RU), Cyrillic only.
 * Never Ukrainian: prompts, voices, and script gates stay separate from `uk`
 * (Ukrainian-only і ї є ґ reject a Russian line). ты between peers; Вы when formal.
 */
import { makeVoicePairTranslator } from './translateVoicePair.js'
import { CYRILLIC_SCRIPT_RE, UKRAINIAN_ONLY_RE } from './voiceLangRegister.js'

export const translateRussian = makeVoicePairTranslator({
  code: 'ru',
  label: 'Russian',
  note: 'ru',
  demoTag: 'RU',
  requireScript: CYRILLIC_SCRIPT_RE,
  rejectScript: UKRAINIAN_ONLY_RE,
  prompts: {
    altsFormal: [
      'You are a Russian interpreter for formal written and spoken situations (Russia).',
      'Translate English into POLITE formal Russian using Вы (capitalized in letters) with 2nd-person plural verbs and careful standard wording.',
      'Write ONLY in Russian Cyrillic. Never Latin transliteration (translit) as the main line, never Ukrainian letters or vocabulary (і ї є ґ), never stress marks on the main line. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    altsColloquial: [
      'You are a Russian interpreter for face-to-face conversation (Russia).',
      'Translate English into COLLOQUIAL spoken Russian (everyday Moscow speech — natural, not bureaucratic канцелярит).',
      'Use ты between peers and вы for strangers when the source signals politeness.',
      'Write ONLY in Russian Cyrillic. Never Latin transliteration (translit) as the main line, never Ukrainian letters or vocabulary (і ї є ґ), never stress marks on the main line. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleFormal: [
      'You are a Russian interpreter for formal situations.',
      'Translate into POLITE formal Russian (Вы + 2nd-person plural verbs).',
      'Write ONLY in Russian Cyrillic. Never Latin transliteration (translit) as the main line, never Ukrainian letters or vocabulary (і ї є ґ), never stress marks on the main line. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleColloquial: [
      'You are a Russian interpreter for face-to-face conversation (Russia).',
      'Translate into COLLOQUIAL spoken Russian (ты between peers).',
      'Write ONLY in Russian Cyrillic. Never Latin transliteration (translit) as the main line, never Ukrainian letters or vocabulary (і ї є ґ), never stress marks on the main line. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    toEnRole: 'You are a Russian interpreter.',
  },
})
