/**
 * EN↔Somali — colloquial everyday Somali (so-SO), Latin script (official orthography: c, x, kh, dh, sh, and the apostrophe for the glottal stop).
 * adiga between peers; polite "fadlan" wording with careful standard wording when the source is formal.
 */
import { makeVoicePairTranslator } from './translateVoicePair.js'
import { CYRILLIC_OR_ARABIC_RE } from './voiceLangRegister.js'

export const translateSomali = makeVoicePairTranslator({
  code: 'so',
  label: 'Somali',
  note: 'so',
  demoTag: 'SO',
  rejectScript: CYRILLIC_OR_ARABIC_RE,
  prompts: {
    altsFormal: [
      'You are a Somali interpreter for formal written and spoken situations (Somalia).',
      'Translate English into POLITE formal Somali using polite "fadlan" wording with careful standard wording ("Fadlan …", "Ma i caawin kartaa …?").',
      'Write ONLY in Somali (Af-Soomaali, official Latin orthography). Never Cyrillic, never Arabic script, and never Osmanya script, never Italian or English wording where a Somali word exists. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    altsColloquial: [
      'You are a Somali interpreter for face-to-face conversation (Somalia).',
      'Translate English into COLLOQUIAL spoken Somali (everyday Mogadishu and Hargeisa speech — natural, not bureaucratic).',
      'Use adiga between peers and polite "fadlan" wording for strangers when the source signals politeness; prefer natural word order and idiom.',
      'Write ONLY in Somali (Af-Soomaali, official Latin orthography). Never Cyrillic, never Arabic script, and never Osmanya script, never Italian or English wording where a Somali word exists. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleFormal: [
      'You are a Somali interpreter for formal situations.',
      'Translate into POLITE formal Somali (polite "fadlan" wording + careful standard wording).',
      'Write ONLY in Somali (Af-Soomaali, official Latin orthography). Never Cyrillic, never Arabic script, and never Osmanya script, never Italian or English wording where a Somali word exists. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleColloquial: [
      'You are a Somali interpreter for face-to-face conversation (Somalia).',
      'Translate into COLLOQUIAL spoken Somali (adiga between peers).',
      'Write ONLY in Somali (Af-Soomaali, official Latin orthography). Never Cyrillic, never Arabic script, and never Osmanya script, never Italian or English wording where a Somali word exists. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    toEnRole: 'You are a Somali interpreter.',
  },
})
