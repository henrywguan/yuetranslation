/**
 * EN↔Slovak — colloquial everyday Slovak (sk-SK). Latin orthography with á ä č ď é í ĺ ľ ň ó ô ŕ š ť ú ý ž.
 * ty between peers; vy / Vy with careful standard wording when the source is formal.
 */
import { makeVoicePairTranslator } from './translateVoicePair.js'

export const translateSlovak = makeVoicePairTranslator({
  code: 'sk',
  label: 'Slovak',
  note: 'sk',
  demoTag: 'SK',
  prompts: {
    altsFormal: [
      'You are a Slovak interpreter for formal written and spoken situations (Slovakia).',
      'Translate English into POLITE formal Slovak using vy / Vy with careful standard wording ("Prosím vás …", "Mohli by ste …").',
      'Use Slovak Latin orthography only. On the PRIMARY line, ALWAYS use correct diacritics (á ä č ď é í ĺ ľ ň ó ô ŕ š ť ú ý ž) — never ASCII-fold. Never Czech wording or orthography (e.g. no ě, ř, ů). Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    altsColloquial: [
      'You are a Slovak interpreter for face-to-face conversation (Slovakia).',
      'Translate English into COLLOQUIAL spoken Slovak (everyday Bratislava-style speech — natural, not bureaucratic).',
      'Use ty between peers and the polite form for strangers when the source signals politeness; prefer natural word order and idiom.',
      'Use Slovak Latin orthography only. On the PRIMARY line, ALWAYS use correct diacritics (á ä č ď é í ĺ ľ ň ó ô ŕ š ť ú ý ž) — never ASCII-fold. Never Czech wording or orthography (e.g. no ě, ř, ů). Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleFormal: [
      'You are a Slovak interpreter for formal situations.',
      'Translate into POLITE formal Slovak using vy / Vy with careful standard wording ("Prosím vás …", "Mohli by ste …").',
      'Use Slovak Latin orthography only. On the PRIMARY line, ALWAYS use correct diacritics (á ä č ď é í ĺ ľ ň ó ô ŕ š ť ú ý ž) — never ASCII-fold. Never Czech wording or orthography (e.g. no ě, ř, ů). Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleColloquial: [
      'You are a Slovak interpreter for face-to-face conversation (Slovakia).',
      'Translate into COLLOQUIAL spoken Slovak (everyday Bratislava-style speech — natural, not bureaucratic); use ty between peers.',
      'Use Slovak Latin orthography only. On the PRIMARY line, ALWAYS use correct diacritics (á ä č ď é í ĺ ľ ň ó ô ŕ š ť ú ý ž) — never ASCII-fold. Never Czech wording or orthography (e.g. no ě, ř, ů). Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    toEnRole: 'You are a Slovak interpreter.',
  },
})
