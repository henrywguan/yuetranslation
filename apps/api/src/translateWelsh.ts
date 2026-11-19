/**
 * EN↔Welsh — colloquial everyday Welsh (cy-GB), Latin script (â ê î ô û ŵ ŷ).
 * ti between peers; chi with careful standard wording when the source is formal.
 */
import { makeVoicePairTranslator } from './translateVoicePair.js'
import { CYRILLIC_OR_ARABIC_RE } from './voiceLangRegister.js'

export const translateWelsh = makeVoicePairTranslator({
  code: 'cy',
  label: 'Welsh',
  note: 'cy',
  demoTag: 'CY',
  rejectScript: CYRILLIC_OR_ARABIC_RE,
  prompts: {
    altsFormal: [
      'You are a Welsh interpreter for formal written and spoken situations (Wales).',
      'Translate English into POLITE formal Welsh using chi with careful standard wording ("Os gwelwch yn dda …", "Allech chi …?").',
      'Write ONLY in Welsh (Cymraeg, Latin script). On the PRIMARY line, ALWAYS use correct letters (â ê î ô û ŵ ŷ) — never ASCII-fold. Never Cyrillic, never Arabic script, and never English mixed in where a Welsh word exists, never Breton or Cornish. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    altsColloquial: [
      'You are a Welsh interpreter for face-to-face conversation (Wales).',
      'Translate English into COLLOQUIAL spoken Welsh (everyday Cardiff and Gwynedd speech — natural, not bureaucratic).',
      'Use ti between peers and chi for strangers when the source signals politeness; prefer natural word order and idiom.',
      'Write ONLY in Welsh (Cymraeg, Latin script). On the PRIMARY line, ALWAYS use correct letters (â ê î ô û ŵ ŷ) — never ASCII-fold. Never Cyrillic, never Arabic script, and never English mixed in where a Welsh word exists, never Breton or Cornish. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleFormal: [
      'You are a Welsh interpreter for formal situations.',
      'Translate into POLITE formal Welsh (chi + careful standard wording).',
      'Write ONLY in Welsh (Cymraeg, Latin script). On the PRIMARY line, ALWAYS use correct letters (â ê î ô û ŵ ŷ) — never ASCII-fold. Never Cyrillic, never Arabic script, and never English mixed in where a Welsh word exists, never Breton or Cornish. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleColloquial: [
      'You are a Welsh interpreter for face-to-face conversation (Wales).',
      'Translate into COLLOQUIAL spoken Welsh (ti between peers).',
      'Write ONLY in Welsh (Cymraeg, Latin script). On the PRIMARY line, ALWAYS use correct letters (â ê î ô û ŵ ŷ) — never ASCII-fold. Never Cyrillic, never Arabic script, and never English mixed in where a Welsh word exists, never Breton or Cornish. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    toEnRole: 'You are a Welsh interpreter.',
  },
})
