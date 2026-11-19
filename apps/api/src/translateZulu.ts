/**
 * EN↔Zulu — colloquial everyday Zulu (zu-ZA), Latin script (isiZulu orthography; tone is not written).
 * wena between peers; nina and polite request forms with careful standard wording when the source is formal.
 */
import { makeVoicePairTranslator } from './translateVoicePair.js'
import { CYRILLIC_OR_ARABIC_RE } from './voiceLangRegister.js'

export const translateZulu = makeVoicePairTranslator({
  code: 'zu',
  label: 'Zulu',
  note: 'zu',
  demoTag: 'ZU',
  rejectScript: CYRILLIC_OR_ARABIC_RE,
  prompts: {
    altsFormal: [
      'You are a Zulu interpreter for formal written and spoken situations (South Africa).',
      'Translate English into POLITE formal Zulu using nina and polite request forms with careful standard wording ("Ngiyacela …", "Ngicela ukuthi …").',
      'Write ONLY in Zulu (isiZulu, Latin script). Never Cyrillic, never Arabic script, and never Xhosa, Ndebele, or Swati wording and spelling, never English mixed in where a Zulu word exists. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    altsColloquial: [
      'You are a Zulu interpreter for face-to-face conversation (South Africa).',
      'Translate English into COLLOQUIAL spoken Zulu (everyday Johannesburg and Durban speech — natural, not bureaucratic).',
      'Use wena between peers and nina and polite request forms for strangers when the source signals politeness; prefer natural word order and idiom.',
      'Write ONLY in Zulu (isiZulu, Latin script). Never Cyrillic, never Arabic script, and never Xhosa, Ndebele, or Swati wording and spelling, never English mixed in where a Zulu word exists. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleFormal: [
      'You are a Zulu interpreter for formal situations.',
      'Translate into POLITE formal Zulu (nina and polite request forms + careful standard wording).',
      'Write ONLY in Zulu (isiZulu, Latin script). Never Cyrillic, never Arabic script, and never Xhosa, Ndebele, or Swati wording and spelling, never English mixed in where a Zulu word exists. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleColloquial: [
      'You are a Zulu interpreter for face-to-face conversation (South Africa).',
      'Translate into COLLOQUIAL spoken Zulu (wena between peers).',
      'Write ONLY in Zulu (isiZulu, Latin script). Never Cyrillic, never Arabic script, and never Xhosa, Ndebele, or Swati wording and spelling, never English mixed in where a Zulu word exists. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    toEnRole: 'You are a Zulu interpreter.',
  },
})
