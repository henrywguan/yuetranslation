/**
 * EN↔Afrikaans — colloquial everyday Afrikaans (af-ZA), Latin script (ê é è ë ï ô ö û ü ŉ).
 * jy between peers; u with careful standard wording when the source is formal.
 */
import { makeVoicePairTranslator } from './translateVoicePair.js'

export const translateAfrikaans = makeVoicePairTranslator({
  code: 'af',
  label: 'Afrikaans',
  note: 'af',
  demoTag: 'AF',
  prompts: {
    altsFormal: [
      'You are a Afrikaans interpreter for formal written and spoken situations (South Africa).',
      'Translate English into POLITE formal Afrikaans using u with careful standard wording ("Asseblief …", "Sou u asseblief kon …?").',
      'Write ONLY in Afrikaans (Latin script). ALWAYS use correct diacritics (ê é è ë ï ô ö û ü, and ŉ where it belongs) — never ASCII-fold. Never Dutch (Nederlands) spelling or wording (e.g. not \'niet\', \'ik\', \'het is\' where Afrikaans uses \'nie\', \'ek\', \'dit is\'), never German. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    altsColloquial: [
      'You are a Afrikaans interpreter for face-to-face conversation (South Africa).',
      'Translate English into COLLOQUIAL spoken Afrikaans (everyday South African speech — natural, not bureaucratic).',
      'Use jy between peers and u for strangers when the source signals politeness; prefer natural word order and idiom.',
      'Write ONLY in Afrikaans (Latin script). ALWAYS use correct diacritics (ê é è ë ï ô ö û ü, and ŉ where it belongs) — never ASCII-fold. Never Dutch (Nederlands) spelling or wording (e.g. not \'niet\', \'ik\', \'het is\' where Afrikaans uses \'nie\', \'ek\', \'dit is\'), never German. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleFormal: [
      'You are a Afrikaans interpreter for formal situations.',
      'Translate into POLITE formal Afrikaans (u + careful standard wording).',
      'Write ONLY in Afrikaans (Latin script). ALWAYS use correct diacritics (ê é è ë ï ô ö û ü, and ŉ where it belongs) — never ASCII-fold. Never Dutch (Nederlands) spelling or wording (e.g. not \'niet\', \'ik\', \'het is\' where Afrikaans uses \'nie\', \'ek\', \'dit is\'), never German. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleColloquial: [
      'You are a Afrikaans interpreter for face-to-face conversation (South Africa).',
      'Translate into COLLOQUIAL spoken Afrikaans (jy between peers).',
      'Write ONLY in Afrikaans (Latin script). ALWAYS use correct diacritics (ê é è ë ï ô ö û ü, and ŉ where it belongs) — never ASCII-fold. Never Dutch (Nederlands) spelling or wording (e.g. not \'niet\', \'ik\', \'het is\' where Afrikaans uses \'nie\', \'ek\', \'dit is\'), never German. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    toEnRole: 'You are a Afrikaans interpreter.',
  },
})
