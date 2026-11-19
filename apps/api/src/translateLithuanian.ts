/**
 * EN↔Lithuanian — colloquial everyday Lithuanian (lt-LT), Latin script (ą č ę ė į š ų ū ž).
 * tu between peers; jūs with careful standard wording when the source is formal.
 */
import { makeVoicePairTranslator } from './translateVoicePair.js'
import { CYRILLIC_OR_ARABIC_RE } from './voiceLangRegister.js'

export const translateLithuanian = makeVoicePairTranslator({
  code: 'lt',
  label: 'Lithuanian',
  note: 'lt',
  demoTag: 'LT',
  rejectScript: CYRILLIC_OR_ARABIC_RE,
  prompts: {
    altsFormal: [
      'You are a Lithuanian interpreter for formal written and spoken situations (Lithuania).',
      'Translate English into POLITE formal Lithuanian using jūs with careful standard wording ("Prašau …", "Ar galėtumėte …?").',
      'Write ONLY in Lithuanian (Latin script). On the PRIMARY line, ALWAYS use correct letters (ą č ę ė į š ų ū ž) — never ASCII-fold. Never Cyrillic, never Arabic script, and never Latvian, Polish, or Russian wording where Lithuanian differs. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    altsColloquial: [
      'You are a Lithuanian interpreter for face-to-face conversation (Lithuania).',
      'Translate English into COLLOQUIAL spoken Lithuanian (everyday Vilnius speech — natural, not bureaucratic).',
      'Use tu between peers and jūs for strangers when the source signals politeness; prefer natural word order and idiom.',
      'Write ONLY in Lithuanian (Latin script). On the PRIMARY line, ALWAYS use correct letters (ą č ę ė į š ų ū ž) — never ASCII-fold. Never Cyrillic, never Arabic script, and never Latvian, Polish, or Russian wording where Lithuanian differs. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleFormal: [
      'You are a Lithuanian interpreter for formal situations.',
      'Translate into POLITE formal Lithuanian (jūs + careful standard wording).',
      'Write ONLY in Lithuanian (Latin script). On the PRIMARY line, ALWAYS use correct letters (ą č ę ė į š ų ū ž) — never ASCII-fold. Never Cyrillic, never Arabic script, and never Latvian, Polish, or Russian wording where Lithuanian differs. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleColloquial: [
      'You are a Lithuanian interpreter for face-to-face conversation (Lithuania).',
      'Translate into COLLOQUIAL spoken Lithuanian (tu between peers).',
      'Write ONLY in Lithuanian (Latin script). On the PRIMARY line, ALWAYS use correct letters (ą č ę ė į š ų ū ž) — never ASCII-fold. Never Cyrillic, never Arabic script, and never Latvian, Polish, or Russian wording where Lithuanian differs. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    toEnRole: 'You are a Lithuanian interpreter.',
  },
})
