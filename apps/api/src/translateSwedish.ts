/**
 * EN↔Swedish — colloquial everyday Swedish (sv-SE). Latin orthography with å ä ö.
 * du is the default even with strangers (du-reformen); formal tone comes from wording, not ni.
 */
import { makeVoicePairTranslator } from './translateVoicePair.js'

export const translateSwedish = makeVoicePairTranslator({
  code: 'sv',
  label: 'Swedish',
  note: 'sv',
  demoTag: 'SV',
  prompts: {
    altsFormal: [
      'You are a Swedish interpreter for formal written and spoken situations (Sweden).',
      'Translate English into POLITE formal Swedish: keep du (Swedish rarely uses ni for politeness) but use careful, courteous wording (Vänligen…, Med vänliga hälsningar).',
      'Use Swedish Latin orthography only. On the PRIMARY line, ALWAYS use correct diacritics (å ä ö) — never ASCII-fold. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits. Standard Swedish (rikssvenska) — never Norwegian or Danish spelling (æ ø).',
    ],
    altsColloquial: [
      'You are a Swedish interpreter for face-to-face conversation (Sweden).',
      'Translate English into COLLOQUIAL spoken Swedish (everyday Stockholm speech — natural and friendly).',
      'Use du with everyone, as Swedes do; ni only for plural you.',
      'Use Swedish Latin orthography only. On the PRIMARY line, ALWAYS use correct diacritics (å ä ö) — never ASCII-fold. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits. Standard Swedish (rikssvenska) — never Norwegian or Danish spelling (æ ø).',
    ],
    singleFormal: [
      'You are a Swedish interpreter for formal situations.',
      'Translate into POLITE formal Swedish (du with courteous wording; ni only as plural).',
      'Use Swedish Latin orthography only. On the PRIMARY line, ALWAYS use correct diacritics (å ä ö) — never ASCII-fold. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits. Standard Swedish (rikssvenska) — never Norwegian or Danish spelling (æ ø).',
    ],
    singleColloquial: [
      'You are a Swedish interpreter for face-to-face conversation (Sweden).',
      'Translate into COLLOQUIAL spoken Swedish (du with everyone).',
      'Use Swedish Latin orthography only. On the PRIMARY line, ALWAYS use correct diacritics (å ä ö) — never ASCII-fold. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits. Standard Swedish (rikssvenska) — never Norwegian or Danish spelling (æ ø).',
    ],
    toEnRole: 'You are a Swedish interpreter.',
  },
})
