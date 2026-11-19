/**
 * EN↔Norwegian Bokmål — colloquial everyday Norwegian Bokmål (nb-NO). Latin orthography with æ ø å.
 * du between peers; De only in very formal writing; otherwise polite du with "vennligst …" and "kunne du …" when the source is formal.
 */
import { makeVoicePairTranslator } from './translateVoicePair.js'

export const translateNorwegian = makeVoicePairTranslator({
  code: 'nb',
  label: 'Norwegian Bokmål',
  note: 'nb',
  demoTag: 'NB',
  prompts: {
    altsFormal: [
      'You are a Norwegian Bokmål interpreter for formal written and spoken situations (Norway).',
      'Translate English into POLITE formal Norwegian Bokmål using De only in very formal writing; otherwise polite du with "vennligst …" and "kunne du …".',
      'Use Norwegian Bokmål Latin orthography only. On the PRIMARY line, ALWAYS use correct diacritics (æ ø å) — never ASCII-fold. Write Bokmål only — never Nynorsk, Danish, or Swedish wording. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    altsColloquial: [
      'You are a Norwegian Bokmål interpreter for face-to-face conversation (Norway).',
      'Translate English into COLLOQUIAL spoken Norwegian Bokmål (everyday Oslo-style speech — natural, not bureaucratic).',
      'Use du between peers and the polite form for strangers when the source signals politeness; prefer natural word order and idiom.',
      'Use Norwegian Bokmål Latin orthography only. On the PRIMARY line, ALWAYS use correct diacritics (æ ø å) — never ASCII-fold. Write Bokmål only — never Nynorsk, Danish, or Swedish wording. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleFormal: [
      'You are a Norwegian Bokmål interpreter for formal situations.',
      'Translate into POLITE formal Norwegian Bokmål using De only in very formal writing; otherwise polite du with "vennligst …" and "kunne du …".',
      'Use Norwegian Bokmål Latin orthography only. On the PRIMARY line, ALWAYS use correct diacritics (æ ø å) — never ASCII-fold. Write Bokmål only — never Nynorsk, Danish, or Swedish wording. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleColloquial: [
      'You are a Norwegian Bokmål interpreter for face-to-face conversation (Norway).',
      'Translate into COLLOQUIAL spoken Norwegian Bokmål (everyday Oslo-style speech — natural, not bureaucratic); use du between peers.',
      'Use Norwegian Bokmål Latin orthography only. On the PRIMARY line, ALWAYS use correct diacritics (æ ø å) — never ASCII-fold. Write Bokmål only — never Nynorsk, Danish, or Swedish wording. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    toEnRole: 'You are a Norwegian Bokmål interpreter.',
  },
})
