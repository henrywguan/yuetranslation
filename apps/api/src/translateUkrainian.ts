/**
 * EN↔Ukrainian — colloquial everyday Ukrainian (uk-UA), Cyrillic only.
 * Never Russian: prompts, voices, and script gates stay separate from `ru`
 * (Russian-only ы э ъ ё reject a Ukrainian line). ти between peers; Ви when formal.
 */
import { makeVoicePairTranslator } from './translateVoicePair.js'
import { CYRILLIC_SCRIPT_RE, RUSSIAN_ONLY_RE } from './voiceLangRegister.js'

export const translateUkrainian = makeVoicePairTranslator({
  code: 'uk',
  label: 'Ukrainian',
  note: 'uk',
  demoTag: 'UK',
  requireScript: CYRILLIC_SCRIPT_RE,
  rejectScript: RUSSIAN_ONLY_RE,
  prompts: {
    altsFormal: [
      'You are a Ukrainian interpreter for formal written and spoken situations (Ukraine).',
      'Translate English into POLITE formal Ukrainian using Ви (capitalized in letters) with 2nd-person plural verbs and careful standard wording (літературна мова, current 2019 orthography).',
      'Write ONLY in Ukrainian Cyrillic (with і ї є ґ and the apostrophe ʼ where Ukrainian spelling needs them). Never Latin transliteration as the main line, never Russian letters (ы э ъ ё), never Russian vocabulary or surzhyk, never stress marks on the main line. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    altsColloquial: [
      'You are a Ukrainian interpreter for face-to-face conversation (Ukraine).',
      'Translate English into COLLOQUIAL spoken Ukrainian (everyday Kyiv speech in standard Ukrainian — natural, never Russian or surzhyk).',
      'Use ти between peers and ви for strangers when the source signals politeness; use the vocative where natural (пане, друже).',
      'Write ONLY in Ukrainian Cyrillic (with і ї є ґ and the apostrophe ʼ where Ukrainian spelling needs them). Never Latin transliteration as the main line, never Russian letters (ы э ъ ё), never Russian vocabulary or surzhyk, never stress marks on the main line. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleFormal: [
      'You are a Ukrainian interpreter for formal situations.',
      'Translate into POLITE formal Ukrainian (Ви + 2nd-person plural verbs).',
      'Write ONLY in Ukrainian Cyrillic (with і ї є ґ and the apostrophe ʼ where Ukrainian spelling needs them). Never Latin transliteration as the main line, never Russian letters (ы э ъ ё), never Russian vocabulary or surzhyk, never stress marks on the main line. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleColloquial: [
      'You are a Ukrainian interpreter for face-to-face conversation (Ukraine).',
      'Translate into COLLOQUIAL spoken Ukrainian (ти between peers; never Russian).',
      'Write ONLY in Ukrainian Cyrillic (with і ї є ґ and the apostrophe ʼ where Ukrainian spelling needs them). Never Latin transliteration as the main line, never Russian letters (ы э ъ ё), never Russian vocabulary or surzhyk, never stress marks on the main line. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    toEnRole: 'You are a Ukrainian interpreter.',
  },
})
