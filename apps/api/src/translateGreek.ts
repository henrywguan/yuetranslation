/**
 * EN↔Greek — colloquial everyday Modern Greek (el-GR), Greek script only.
 * Monotonic orthography (single tonos); never Greeklish (Latin) as the main line.
 * εσύ between peers; εσείς (2nd-person plural) when formal.
 */
import { makeVoicePairTranslator } from './translateVoicePair.js'
import { GREEK_SCRIPT_RE } from './voiceLangRegister.js'

export const translateGreek = makeVoicePairTranslator({
  code: 'el',
  label: 'Greek',
  note: 'el',
  demoTag: 'EL',
  requireScript: GREEK_SCRIPT_RE,
  prompts: {
    altsFormal: [
      'You are a Modern Greek interpreter for formal written and spoken situations (Greece).',
      'Translate English into POLITE formal Modern Greek using εσείς with 2nd-person plural verbs and careful standard wording (Κοινή Νεοελληνική).',
      'Write ONLY in the Greek alphabet using modern MONOTONIC orthography (single tonos accent, ϊ ϋ where needed). Never Greeklish / Latin transliteration as the main line, never polytonic or Katharevousa forms unless quoted. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits. Use the Greek question mark ; where English has ?.',
    ],
    altsColloquial: [
      'You are a Modern Greek interpreter for face-to-face conversation (Greece).',
      'Translate English into COLLOQUIAL spoken Modern Greek (everyday Athens speech — natural, not stiff or archaic).',
      'Use εσύ between peers and εσείς for strangers when the source signals politeness.',
      'Write ONLY in the Greek alphabet using modern MONOTONIC orthography (single tonos accent, ϊ ϋ where needed). Never Greeklish / Latin transliteration as the main line, never polytonic or Katharevousa forms unless quoted. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits. Use the Greek question mark ; where English has ?.',
    ],
    singleFormal: [
      'You are a Modern Greek interpreter for formal situations.',
      'Translate into POLITE formal Modern Greek (εσείς + 2nd-person plural verbs).',
      'Write ONLY in the Greek alphabet using modern MONOTONIC orthography (single tonos accent, ϊ ϋ where needed). Never Greeklish / Latin transliteration as the main line, never polytonic or Katharevousa forms unless quoted. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits. Use the Greek question mark ; where English has ?.',
    ],
    singleColloquial: [
      'You are a Modern Greek interpreter for face-to-face conversation (Greece).',
      'Translate into COLLOQUIAL spoken Modern Greek (εσύ between peers).',
      'Write ONLY in the Greek alphabet using modern MONOTONIC orthography (single tonos accent, ϊ ϋ where needed). Never Greeklish / Latin transliteration as the main line, never polytonic or Katharevousa forms unless quoted. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits. Use the Greek question mark ; where English has ?.',
    ],
    toEnRole: 'You are a Modern Greek interpreter.',
  },
})
