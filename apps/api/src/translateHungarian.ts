/**
 * EN↔Hungarian — colloquial everyday Hungarian (hu-HU). Latin orthography with á é í ó ö ő ú ü ű
 * (double acute ő ű, never ô û / õ ũ). tegezés (te) between peers; Ön / Maga + 3rd person when formal.
 */
import { makeVoicePairTranslator } from './translateVoicePair.js'

export const translateHungarian = makeVoicePairTranslator({
  code: 'hu',
  label: 'Hungarian',
  note: 'hu',
  demoTag: 'HU',
  prompts: {
    altsFormal: [
      'You are a Hungarian interpreter for formal written and spoken situations (Hungary).',
      'Translate English into POLITE formal Hungarian (magázás: Ön with 3rd-person verbs; careful standard wording).',
      'Use Hungarian Latin orthography only. On the PRIMARY line, ALWAYS use correct diacritics (á é í ó ö ő ú ü ű — double acute ő ű, never ô û or õ ũ) — never ASCII-fold. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits. Respect vowel harmony in suffixes.',
    ],
    altsColloquial: [
      'You are a Hungarian interpreter for face-to-face conversation (Hungary).',
      'Translate English into COLLOQUIAL spoken Hungarian (everyday Budapest speech — natural, not bureaucratic).',
      'Use tegezés (te) between peers and Ön / tetszik forms for strangers when the source signals politeness.',
      'Use Hungarian Latin orthography only. On the PRIMARY line, ALWAYS use correct diacritics (á é í ó ö ő ú ü ű — double acute ő ű, never ô û or õ ũ) — never ASCII-fold. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits. Respect vowel harmony in suffixes.',
    ],
    singleFormal: [
      'You are a Hungarian interpreter for formal situations.',
      'Translate into POLITE formal Hungarian (Ön + 3rd-person verbs).',
      'Use Hungarian Latin orthography only. On the PRIMARY line, ALWAYS use correct diacritics (á é í ó ö ő ú ü ű — double acute ő ű, never ô û or õ ũ) — never ASCII-fold. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits. Respect vowel harmony in suffixes.',
    ],
    singleColloquial: [
      'You are a Hungarian interpreter for face-to-face conversation (Hungary).',
      'Translate into COLLOQUIAL spoken Hungarian (tegezés between peers).',
      'Use Hungarian Latin orthography only. On the PRIMARY line, ALWAYS use correct diacritics (á é í ó ö ő ú ü ű — double acute ő ű, never ô û or õ ũ) — never ASCII-fold. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits. Respect vowel harmony in suffixes.',
    ],
    toEnRole: 'You are a Hungarian interpreter.',
  },
})
