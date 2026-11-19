/**
 * EN↔Pashto — colloquial everyday Pashto (ps-AF), Pashto Perso-Arabic script (RTL).
 * ته between peers; تاسو with careful standard wording when the source is formal.
 */
import { makeVoicePairTranslator } from './translateVoicePair.js'
import { ARABIC_SCRIPT_RE, DEVANAGARI_RE } from './voiceLangRegister.js'

export const translatePashto = makeVoicePairTranslator({
  code: 'ps',
  label: 'Pashto',
  note: 'ps',
  demoTag: 'PS',
  requireScript: ARABIC_SCRIPT_RE,
  rejectScript: DEVANAGARI_RE,
  prompts: {
    altsFormal: [
      'You are a Pashto interpreter for formal written and spoken situations (Afghanistan).',
      'Translate English into POLITE formal Pashto using تاسو with careful standard wording ("مهرباني وکړئ …", "ایا تاسو کولی شئ …؟").',
      'Write ONLY in Pashto (Perso-Arabic script, right-to-left, with Pashto letters ټ ډ ړ ږ ښ ڼ ې ۍ ځ څ ګ). Never Latin transliteration, Devanagari, never Dari / Persian or Urdu wording where Pashto differs. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    altsColloquial: [
      'You are a Pashto interpreter for face-to-face conversation (Afghanistan).',
      'Translate English into COLLOQUIAL spoken Pashto (everyday Kabul and Kandahar speech — natural, not bureaucratic).',
      'Use ته between peers and تاسو for strangers when the source signals politeness; prefer natural word order and idiom.',
      'Write ONLY in Pashto (Perso-Arabic script, right-to-left, with Pashto letters ټ ډ ړ ږ ښ ڼ ې ۍ ځ څ ګ). Never Latin transliteration, Devanagari, never Dari / Persian or Urdu wording where Pashto differs. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleFormal: [
      'You are a Pashto interpreter for formal situations.',
      'Translate into POLITE formal Pashto (تاسو + careful standard wording).',
      'Write ONLY in Pashto (Perso-Arabic script, right-to-left, with Pashto letters ټ ډ ړ ږ ښ ڼ ې ۍ ځ څ ګ). Never Latin transliteration, Devanagari, never Dari / Persian or Urdu wording where Pashto differs. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleColloquial: [
      'You are a Pashto interpreter for face-to-face conversation (Afghanistan).',
      'Translate into COLLOQUIAL spoken Pashto (ته between peers).',
      'Write ONLY in Pashto (Perso-Arabic script, right-to-left, with Pashto letters ټ ډ ړ ږ ښ ڼ ې ۍ ځ څ ګ). Never Latin transliteration, Devanagari, never Dari / Persian or Urdu wording where Pashto differs. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    toEnRole: 'You are a Pashto interpreter.',
  },
})
