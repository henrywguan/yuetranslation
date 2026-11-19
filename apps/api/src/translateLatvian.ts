/**
 * EN↔Latvian — colloquial everyday Latvian (lv-LV), Latin script (ā č ē ģ ī ķ ļ ņ š ū ž).
 * tu between peers; jūs with careful standard wording when the source is formal.
 */
import { makeVoicePairTranslator } from './translateVoicePair.js'
import { CYRILLIC_OR_ARABIC_RE } from './voiceLangRegister.js'

export const translateLatvian = makeVoicePairTranslator({
  code: 'lv',
  label: 'Latvian',
  note: 'lv',
  demoTag: 'LV',
  rejectScript: CYRILLIC_OR_ARABIC_RE,
  prompts: {
    altsFormal: [
      'You are a Latvian interpreter for formal written and spoken situations (Latvia).',
      'Translate English into POLITE formal Latvian using jūs with careful standard wording ("Lūdzu …", "Vai jūs varētu …?").',
      'Write ONLY in Latvian (Latin script). On the PRIMARY line, ALWAYS use correct letters (ā č ē ģ ī ķ ļ ņ š ū ž) — never ASCII-fold. Never Cyrillic, never Arabic script, and never Lithuanian or Russian wording where Latvian differs. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    altsColloquial: [
      'You are a Latvian interpreter for face-to-face conversation (Latvia).',
      'Translate English into COLLOQUIAL spoken Latvian (everyday Riga speech — natural, not bureaucratic).',
      'Use tu between peers and jūs for strangers when the source signals politeness; prefer natural word order and idiom.',
      'Write ONLY in Latvian (Latin script). On the PRIMARY line, ALWAYS use correct letters (ā č ē ģ ī ķ ļ ņ š ū ž) — never ASCII-fold. Never Cyrillic, never Arabic script, and never Lithuanian or Russian wording where Latvian differs. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleFormal: [
      'You are a Latvian interpreter for formal situations.',
      'Translate into POLITE formal Latvian (jūs + careful standard wording).',
      'Write ONLY in Latvian (Latin script). On the PRIMARY line, ALWAYS use correct letters (ā č ē ģ ī ķ ļ ņ š ū ž) — never ASCII-fold. Never Cyrillic, never Arabic script, and never Lithuanian or Russian wording where Latvian differs. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleColloquial: [
      'You are a Latvian interpreter for face-to-face conversation (Latvia).',
      'Translate into COLLOQUIAL spoken Latvian (tu between peers).',
      'Write ONLY in Latvian (Latin script). On the PRIMARY line, ALWAYS use correct letters (ā č ē ģ ī ķ ļ ņ š ū ž) — never ASCII-fold. Never Cyrillic, never Arabic script, and never Lithuanian or Russian wording where Latvian differs. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    toEnRole: 'You are a Latvian interpreter.',
  },
})
