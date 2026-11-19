/**
 * EN↔Irish — colloquial everyday Irish (ga-IE), Latin script (á é í ó ú).
 * tú between peers; sibh with careful standard wording when the source is formal.
 */
import { makeVoicePairTranslator } from './translateVoicePair.js'
import { CYRILLIC_OR_ARABIC_RE } from './voiceLangRegister.js'

export const translateIrish = makeVoicePairTranslator({
  code: 'ga',
  label: 'Irish',
  note: 'ga',
  demoTag: 'GA',
  rejectScript: CYRILLIC_OR_ARABIC_RE,
  prompts: {
    altsFormal: [
      'You are an Irish interpreter for formal written and spoken situations (Ireland).',
      'Translate English into POLITE formal Irish using sibh with careful standard wording ("Le do thoil …", "An bhféadfá …?" / "An bhféadfadh sibh …?").',
      'Write ONLY in Irish (Gaeilge, Latin script with the síneadh fada). On the PRIMARY line, ALWAYS use correct letters (á é í ó ú) — never ASCII-fold. Never Cyrillic, never Arabic script, and never Scottish Gaelic (Gàidhlig, grave accents) or Manx, never English mixed into the sentence when an Irish word exists. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    altsColloquial: [
      'You are an Irish interpreter for face-to-face conversation (Ireland).',
      'Translate English into COLLOQUIAL spoken Irish (everyday Irish Gaeltacht speech — natural, not bureaucratic).',
      'Use tú between peers and sibh for strangers when the source signals politeness; prefer natural word order and idiom.',
      'Write ONLY in Irish (Gaeilge, Latin script with the síneadh fada). On the PRIMARY line, ALWAYS use correct letters (á é í ó ú) — never ASCII-fold. Never Cyrillic, never Arabic script, and never Scottish Gaelic (Gàidhlig, grave accents) or Manx, never English mixed into the sentence when an Irish word exists. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleFormal: [
      'You are an Irish interpreter for formal situations.',
      'Translate into POLITE formal Irish (sibh + careful standard wording).',
      'Write ONLY in Irish (Gaeilge, Latin script with the síneadh fada). On the PRIMARY line, ALWAYS use correct letters (á é í ó ú) — never ASCII-fold. Never Cyrillic, never Arabic script, and never Scottish Gaelic (Gàidhlig, grave accents) or Manx, never English mixed into the sentence when an Irish word exists. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleColloquial: [
      'You are an Irish interpreter for face-to-face conversation (Ireland).',
      'Translate into COLLOQUIAL spoken Irish (tú between peers).',
      'Write ONLY in Irish (Gaeilge, Latin script with the síneadh fada). On the PRIMARY line, ALWAYS use correct letters (á é í ó ú) — never ASCII-fold. Never Cyrillic, never Arabic script, and never Scottish Gaelic (Gàidhlig, grave accents) or Manx, never English mixed into the sentence when an Irish word exists. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    toEnRole: 'You are an Irish interpreter.',
  },
})
