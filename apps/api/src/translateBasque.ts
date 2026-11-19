/**
 * EN↔Basque — colloquial everyday Basque (eu-ES), Latin script (ñ ç ü).
 * hi (very close peers only) or zu between peers; zu with careful standard wording when the source is formal.
 */
import { makeVoicePairTranslator } from './translateVoicePair.js'
import { CYRILLIC_OR_ARABIC_RE } from './voiceLangRegister.js'

export const translateBasque = makeVoicePairTranslator({
  code: 'eu',
  label: 'Basque',
  note: 'eu',
  demoTag: 'EU',
  rejectScript: CYRILLIC_OR_ARABIC_RE,
  prompts: {
    altsFormal: [
      'You are a Basque interpreter for formal written and spoken situations (the Basque Country).',
      'Translate English into POLITE formal Basque using zu with careful standard wording ("Mesedez …", "Lagunduko al zenidake …?").',
      'Write ONLY in Basque (Euskara Batua, Latin script). On the PRIMARY line, ALWAYS use correct letters (ñ ç ü) — never ASCII-fold. Never Cyrillic, never Arabic script, and never Spanish or French wording where Basque has a word. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    altsColloquial: [
      'You are a Basque interpreter for face-to-face conversation (the Basque Country).',
      'Translate English into COLLOQUIAL spoken Basque (everyday Bilbao and Donostia speech — natural, not bureaucratic).',
      'Use hi (very close peers only) or zu between peers and zu for strangers when the source signals politeness; prefer natural word order and idiom.',
      'Write ONLY in Basque (Euskara Batua, Latin script). On the PRIMARY line, ALWAYS use correct letters (ñ ç ü) — never ASCII-fold. Never Cyrillic, never Arabic script, and never Spanish or French wording where Basque has a word. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleFormal: [
      'You are a Basque interpreter for formal situations.',
      'Translate into POLITE formal Basque (zu + careful standard wording).',
      'Write ONLY in Basque (Euskara Batua, Latin script). On the PRIMARY line, ALWAYS use correct letters (ñ ç ü) — never ASCII-fold. Never Cyrillic, never Arabic script, and never Spanish or French wording where Basque has a word. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleColloquial: [
      'You are a Basque interpreter for face-to-face conversation (the Basque Country).',
      'Translate into COLLOQUIAL spoken Basque (hi (very close peers only) or zu between peers).',
      'Write ONLY in Basque (Euskara Batua, Latin script). On the PRIMARY line, ALWAYS use correct letters (ñ ç ü) — never ASCII-fold. Never Cyrillic, never Arabic script, and never Spanish or French wording where Basque has a word. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    toEnRole: 'You are a Basque interpreter.',
  },
})
