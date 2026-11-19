/**
 * EN↔Bulgarian — colloquial everyday Bulgarian (bg-BG), Cyrillic only.
 * ти between peers; Вие with careful standard wording when the source is formal.
 */
import { makeVoicePairTranslator } from './translateVoicePair.js'
import { BULGARIAN_REJECT_RE, CYRILLIC_SCRIPT_RE } from './voiceLangRegister.js'

export const translateBulgarian = makeVoicePairTranslator({
  code: 'bg',
  label: 'Bulgarian',
  note: 'bg',
  demoTag: 'BG',
  requireScript: CYRILLIC_SCRIPT_RE,
  rejectScript: BULGARIAN_REJECT_RE,
  prompts: {
    altsFormal: [
      'You are a Bulgarian interpreter for formal written and spoken situations (Bulgaria).',
      'Translate English into POLITE formal Bulgarian using Вие (capitalized) with careful standard wording ("Моля …", "Бихте ли могли …?").',
      'Write ONLY in Bulgarian Cyrillic. Never Latin transliteration (shlyokavitsa) as the main line, never Russian wording or letters (ы э ё), never Serbian or Macedonian letters (ђ ј љ њ ћ џ). Keep Bulgarian grammar: no cases, postfixed definite article (-ът, -та, -то, -те). Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    altsColloquial: [
      'You are a Bulgarian interpreter for face-to-face conversation (Bulgaria).',
      'Translate English into COLLOQUIAL spoken Bulgarian (everyday Sofia speech — natural, not bureaucratic).',
      'Use ти between peers and вие for strangers when the source signals politeness; prefer natural word order and idiom.',
      'Write ONLY in Bulgarian Cyrillic. Never Latin transliteration (shlyokavitsa) as the main line, never Russian wording or letters (ы э ё), never Serbian or Macedonian letters (ђ ј љ њ ћ џ). Keep Bulgarian grammar: no cases, postfixed definite article (-ът, -та, -то, -те). Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleFormal: [
      'You are a Bulgarian interpreter for formal situations.',
      'Translate into POLITE formal Bulgarian (Вие + careful standard wording).',
      'Write ONLY in Bulgarian Cyrillic. Never Latin transliteration (shlyokavitsa) as the main line, never Russian wording or letters (ы э ё), never Serbian or Macedonian letters (ђ ј љ њ ћ џ). Keep Bulgarian grammar: no cases, postfixed definite article (-ът, -та, -то, -те). Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleColloquial: [
      'You are a Bulgarian interpreter for face-to-face conversation (Bulgaria).',
      'Translate into COLLOQUIAL spoken Bulgarian (ти between peers).',
      'Write ONLY in Bulgarian Cyrillic. Never Latin transliteration (shlyokavitsa) as the main line, never Russian wording or letters (ы э ё), never Serbian or Macedonian letters (ђ ј љ њ ћ џ). Keep Bulgarian grammar: no cases, postfixed definite article (-ът, -та, -то, -те). Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    toEnRole: 'You are a Bulgarian interpreter.',
  },
})
