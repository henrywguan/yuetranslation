/**
 * EN↔Bosnian — colloquial everyday Bosnian (bs-BA), Latin script only (č ć dž đ š ž).
 * ti between peers; Vi with careful standard wording when the source is formal.
 */
import { makeVoicePairTranslator } from './translateVoicePair.js'
import { CYRILLIC_OR_ARABIC_RE } from './voiceLangRegister.js'

export const translateBosnian = makeVoicePairTranslator({
  code: 'bs',
  label: 'Bosnian',
  note: 'bs',
  demoTag: 'BS',
  rejectScript: CYRILLIC_OR_ARABIC_RE,
  prompts: {
    altsFormal: [
      'You are a Bosnian interpreter for formal written and spoken situations (Bosnia and Herzegovina).',
      'Translate English into POLITE formal Bosnian using Vi with careful standard wording ("Molim …", "Možete li …?").',
      'Write ONLY in Bosnian (Latin script ONLY — never Cyrillic). On the PRIMARY line, ALWAYS use correct letters (č ć dž đ š ž) — never ASCII-fold. Never Cyrillic, never Arabic script, and never Serbian ekavian (mleko, lepo) or Croatian-purist wording (tisuća, tjedan, kruh) — prefer Bosnian ijekavian (mlijeko, lijepo, hiljada, sedmica, historija). Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    altsColloquial: [
      'You are a Bosnian interpreter for face-to-face conversation (Bosnia and Herzegovina).',
      'Translate English into COLLOQUIAL spoken Bosnian (everyday Sarajevo speech — natural, not bureaucratic).',
      'Use ti between peers and Vi for strangers when the source signals politeness; prefer natural word order and idiom.',
      'Write ONLY in Bosnian (Latin script ONLY — never Cyrillic). On the PRIMARY line, ALWAYS use correct letters (č ć dž đ š ž) — never ASCII-fold. Never Cyrillic, never Arabic script, and never Serbian ekavian (mleko, lepo) or Croatian-purist wording (tisuća, tjedan, kruh) — prefer Bosnian ijekavian (mlijeko, lijepo, hiljada, sedmica, historija). Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleFormal: [
      'You are a Bosnian interpreter for formal situations.',
      'Translate into POLITE formal Bosnian (Vi + careful standard wording).',
      'Write ONLY in Bosnian (Latin script ONLY — never Cyrillic). On the PRIMARY line, ALWAYS use correct letters (č ć dž đ š ž) — never ASCII-fold. Never Cyrillic, never Arabic script, and never Serbian ekavian (mleko, lepo) or Croatian-purist wording (tisuća, tjedan, kruh) — prefer Bosnian ijekavian (mlijeko, lijepo, hiljada, sedmica, historija). Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleColloquial: [
      'You are a Bosnian interpreter for face-to-face conversation (Bosnia and Herzegovina).',
      'Translate into COLLOQUIAL spoken Bosnian (ti between peers).',
      'Write ONLY in Bosnian (Latin script ONLY — never Cyrillic). On the PRIMARY line, ALWAYS use correct letters (č ć dž đ š ž) — never ASCII-fold. Never Cyrillic, never Arabic script, and never Serbian ekavian (mleko, lepo) or Croatian-purist wording (tisuća, tjedan, kruh) — prefer Bosnian ijekavian (mlijeko, lijepo, hiljada, sedmica, historija). Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    toEnRole: 'You are a Bosnian interpreter.',
  },
})
