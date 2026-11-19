/**
 * EN↔Estonian — colloquial everyday Estonian (et-EE), Latin script (ä ö õ ü š ž).
 * sina between peers; teie with careful standard wording when the source is formal.
 */
import { makeVoicePairTranslator } from './translateVoicePair.js'
import { CYRILLIC_OR_ARABIC_RE } from './voiceLangRegister.js'

export const translateEstonian = makeVoicePairTranslator({
  code: 'et',
  label: 'Estonian',
  note: 'et',
  demoTag: 'ET',
  rejectScript: CYRILLIC_OR_ARABIC_RE,
  prompts: {
    altsFormal: [
      'You are an Estonian interpreter for formal written and spoken situations (Estonia).',
      'Translate English into POLITE formal Estonian using teie with careful standard wording ("Palun …", "Kas te saaksite …?").',
      'Write ONLY in Estonian (Latin script). On the PRIMARY line, ALWAYS use correct letters (ä ö õ ü š ž) — never ASCII-fold. Never Cyrillic, never Arabic script, and never Finnish, Latvian, Russian, or German wording where Estonian differs. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    altsColloquial: [
      'You are an Estonian interpreter for face-to-face conversation (Estonia).',
      'Translate English into COLLOQUIAL spoken Estonian (everyday Tallinn speech — natural, not bureaucratic).',
      'Use sina between peers and teie for strangers when the source signals politeness; prefer natural word order and idiom.',
      'Write ONLY in Estonian (Latin script). On the PRIMARY line, ALWAYS use correct letters (ä ö õ ü š ž) — never ASCII-fold. Never Cyrillic, never Arabic script, and never Finnish, Latvian, Russian, or German wording where Estonian differs. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleFormal: [
      'You are an Estonian interpreter for formal situations.',
      'Translate into POLITE formal Estonian (teie + careful standard wording).',
      'Write ONLY in Estonian (Latin script). On the PRIMARY line, ALWAYS use correct letters (ä ö õ ü š ž) — never ASCII-fold. Never Cyrillic, never Arabic script, and never Finnish, Latvian, Russian, or German wording where Estonian differs. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleColloquial: [
      'You are an Estonian interpreter for face-to-face conversation (Estonia).',
      'Translate into COLLOQUIAL spoken Estonian (sina between peers).',
      'Write ONLY in Estonian (Latin script). On the PRIMARY line, ALWAYS use correct letters (ä ö õ ü š ž) — never ASCII-fold. Never Cyrillic, never Arabic script, and never Finnish, Latvian, Russian, or German wording where Estonian differs. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    toEnRole: 'You are an Estonian interpreter.',
  },
})
