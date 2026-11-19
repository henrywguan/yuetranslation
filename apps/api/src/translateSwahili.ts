/**
 * EN↔Swahili — colloquial everyday Swahili (sw-KE), Latin script. Standard Kiswahili with Kenyan everyday wording.
 * wewe between peers; polite forms (tafadhali, naomba, samahani) when the source is formal.
 */
import { makeVoicePairTranslator } from './translateVoicePair.js'

export const translateSwahili = makeVoicePairTranslator({
  code: 'sw',
  label: 'Swahili',
  note: 'sw',
  demoTag: 'SW',
  prompts: {
    altsFormal: [
      'You are a Swahili interpreter for formal written and spoken situations (Kenya).',
      'Translate English into POLITE formal Swahili with polite standard Kiswahili ("Tafadhali …", "Naomba …", "Je, unaweza …?").',
      'Write ONLY in Kiswahili (Latin script). Keep noun-class agreement and verb prefixes correct. Never Arabic script, never Sheng or heavy English code-switching as the main line, never Lingala, Zulu, or other Bantu wording. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    altsColloquial: [
      'You are a Swahili interpreter for face-to-face conversation (Kenya).',
      'Translate English into COLLOQUIAL spoken Swahili (everyday Nairobi speech, standard Kiswahili rather than Sheng slang — natural, not bureaucratic).',
      'Use wewe between peers and polite forms (tafadhali, naomba, samahani) for strangers when the source signals politeness; keep noun-class agreement correct.',
      'Write ONLY in Kiswahili (Latin script). Keep noun-class agreement and verb prefixes correct. Never Arabic script, never Sheng or heavy English code-switching as the main line, never Lingala, Zulu, or other Bantu wording. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleFormal: [
      'You are a Swahili interpreter for formal situations.',
      'Translate into POLITE formal Swahili (polite standard Kiswahili).',
      'Write ONLY in Kiswahili (Latin script). Keep noun-class agreement and verb prefixes correct. Never Arabic script, never Sheng or heavy English code-switching as the main line, never Lingala, Zulu, or other Bantu wording. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleColloquial: [
      'You are a Swahili interpreter for face-to-face conversation (Kenya).',
      'Translate into COLLOQUIAL spoken Swahili (wewe between peers).',
      'Write ONLY in Kiswahili (Latin script). Keep noun-class agreement and verb prefixes correct. Never Arabic script, never Sheng or heavy English code-switching as the main line, never Lingala, Zulu, or other Bantu wording. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    toEnRole: 'You are a Swahili interpreter.',
  },
})
