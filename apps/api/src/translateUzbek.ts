/**
 * EN↔Uzbek — colloquial everyday Uzbek (uz-UZ), Latin script only (oʻ gʻ sh ch, tutuq belgisi ʼ).
 * sen between peers; siz with careful standard wording when the source is formal.
 */
import { makeVoicePairTranslator } from './translateVoicePair.js'
import { CYRILLIC_OR_ARABIC_RE } from './voiceLangRegister.js'

export const translateUzbek = makeVoicePairTranslator({
  code: 'uz',
  label: 'Uzbek',
  note: 'uz',
  demoTag: 'UZ',
  rejectScript: CYRILLIC_OR_ARABIC_RE,
  prompts: {
    altsFormal: [
      'You are a Uzbek interpreter for formal written and spoken situations (Uzbekistan).',
      'Translate English into POLITE formal Uzbek using siz with careful standard wording ("Iltimos …", "Mumkinmi …?").',
      'Write ONLY in Uzbek Latin orthography (the official Latin alphabet of Uzbekistan: oʻ gʻ sh ch ng, tutuq belgisi ʼ). Never Cyrillic Uzbek, never Arabic script, never Kazakh, Kyrgyz, or Turkish wording. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    altsColloquial: [
      'You are a Uzbek interpreter for face-to-face conversation (Uzbekistan).',
      'Translate English into COLLOQUIAL spoken Uzbek (everyday Tashkent speech — natural, not bureaucratic).',
      'Use sen between peers and siz for strangers when the source signals politeness; prefer natural word order and idiom.',
      'Write ONLY in Uzbek Latin orthography (the official Latin alphabet of Uzbekistan: oʻ gʻ sh ch ng, tutuq belgisi ʼ). Never Cyrillic Uzbek, never Arabic script, never Kazakh, Kyrgyz, or Turkish wording. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleFormal: [
      'You are a Uzbek interpreter for formal situations.',
      'Translate into POLITE formal Uzbek (siz + careful standard wording).',
      'Write ONLY in Uzbek Latin orthography (the official Latin alphabet of Uzbekistan: oʻ gʻ sh ch ng, tutuq belgisi ʼ). Never Cyrillic Uzbek, never Arabic script, never Kazakh, Kyrgyz, or Turkish wording. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleColloquial: [
      'You are a Uzbek interpreter for face-to-face conversation (Uzbekistan).',
      'Translate into COLLOQUIAL spoken Uzbek (sen between peers).',
      'Write ONLY in Uzbek Latin orthography (the official Latin alphabet of Uzbekistan: oʻ gʻ sh ch ng, tutuq belgisi ʼ). Never Cyrillic Uzbek, never Arabic script, never Kazakh, Kyrgyz, or Turkish wording. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    toEnRole: 'You are a Uzbek interpreter.',
  },
})
