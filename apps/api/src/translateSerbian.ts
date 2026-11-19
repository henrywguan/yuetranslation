/**
 * EN↔Serbian — colloquial everyday Serbian (sr-RS), Cyrillic only. Never Latin (sr-Latn).
 * ти between peers; Ви with careful standard wording when the source is formal.
 */
import { makeVoicePairTranslator } from './translateVoicePair.js'
import { CYRILLIC_SCRIPT_RE, SERBIAN_REJECT_RE } from './voiceLangRegister.js'

export const translateSerbian = makeVoicePairTranslator({
  code: 'sr',
  label: 'Serbian',
  note: 'sr',
  demoTag: 'SR',
  requireScript: CYRILLIC_SCRIPT_RE,
  rejectScript: SERBIAN_REJECT_RE,
  prompts: {
    altsFormal: [
      'You are a Serbian interpreter for formal written and spoken situations (Serbia).',
      'Translate English into POLITE formal Serbian using Ви (capitalized) with careful standard wording ("Молим Вас …", "Да ли бисте могли …?").',
      'Write ONLY in Serbian Cyrillic (including ђ ј љ њ ћ џ). Never Latin script (Latinica) as the main line, never Croatian, Bosnian, or Montenegrin-specific wording, never Russian, Bulgarian, or Macedonian letters (ы э ё щ ъ). Prefer standard ekavian pronunciation spelling. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    altsColloquial: [
      'You are a Serbian interpreter for face-to-face conversation (Serbia).',
      'Translate English into COLLOQUIAL spoken Serbian (everyday Belgrade ekavian speech — natural, not bureaucratic).',
      'Use ти between peers and ви for strangers when the source signals politeness; prefer natural word order and idiom.',
      'Write ONLY in Serbian Cyrillic (including ђ ј љ њ ћ џ). Never Latin script (Latinica) as the main line, never Croatian, Bosnian, or Montenegrin-specific wording, never Russian, Bulgarian, or Macedonian letters (ы э ё щ ъ). Prefer standard ekavian pronunciation spelling. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleFormal: [
      'You are a Serbian interpreter for formal situations.',
      'Translate into POLITE formal Serbian (Ви + careful standard wording).',
      'Write ONLY in Serbian Cyrillic (including ђ ј љ њ ћ џ). Never Latin script (Latinica) as the main line, never Croatian, Bosnian, or Montenegrin-specific wording, never Russian, Bulgarian, or Macedonian letters (ы э ё щ ъ). Prefer standard ekavian pronunciation spelling. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleColloquial: [
      'You are a Serbian interpreter for face-to-face conversation (Serbia).',
      'Translate into COLLOQUIAL spoken Serbian (ти between peers).',
      'Write ONLY in Serbian Cyrillic (including ђ ј љ њ ћ џ). Never Latin script (Latinica) as the main line, never Croatian, Bosnian, or Montenegrin-specific wording, never Russian, Bulgarian, or Macedonian letters (ы э ё щ ъ). Prefer standard ekavian pronunciation spelling. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    toEnRole: 'You are a Serbian interpreter.',
  },
})
