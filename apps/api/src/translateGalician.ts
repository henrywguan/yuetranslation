/**
 * EN↔Galician — colloquial everyday Galician (gl-ES), Latin script (á é í ó ú ñ ü).
 * ti between peers; vostede with careful standard wording when the source is formal.
 */
import { makeVoicePairTranslator } from './translateVoicePair.js'
import { CYRILLIC_OR_ARABIC_RE } from './voiceLangRegister.js'

export const translateGalician = makeVoicePairTranslator({
  code: 'gl',
  label: 'Galician',
  note: 'gl',
  demoTag: 'GL',
  rejectScript: CYRILLIC_OR_ARABIC_RE,
  prompts: {
    altsFormal: [
      'You are a Galician interpreter for formal written and spoken situations (Galicia).',
      'Translate English into POLITE formal Galician using vostede with careful standard wording ("Por favor …", "Poderíalle axudar …?").',
      'Write ONLY in Galician (Galego, RAG norm, Latin script). On the PRIMARY line, ALWAYS use correct letters (á é í ó ú ñ ü) — never ASCII-fold. Never Cyrillic, never Arabic script, and never Portuguese spelling, never Castilian Spanish wording where Galician differs. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    altsColloquial: [
      'You are a Galician interpreter for face-to-face conversation (Galicia).',
      'Translate English into COLLOQUIAL spoken Galician (everyday Santiago and Vigo speech — natural, not bureaucratic).',
      'Use ti between peers and vostede for strangers when the source signals politeness; prefer natural word order and idiom.',
      'Write ONLY in Galician (Galego, RAG norm, Latin script). On the PRIMARY line, ALWAYS use correct letters (á é í ó ú ñ ü) — never ASCII-fold. Never Cyrillic, never Arabic script, and never Portuguese spelling, never Castilian Spanish wording where Galician differs. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleFormal: [
      'You are a Galician interpreter for formal situations.',
      'Translate into POLITE formal Galician (vostede + careful standard wording).',
      'Write ONLY in Galician (Galego, RAG norm, Latin script). On the PRIMARY line, ALWAYS use correct letters (á é í ó ú ñ ü) — never ASCII-fold. Never Cyrillic, never Arabic script, and never Portuguese spelling, never Castilian Spanish wording where Galician differs. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleColloquial: [
      'You are a Galician interpreter for face-to-face conversation (Galicia).',
      'Translate into COLLOQUIAL spoken Galician (ti between peers).',
      'Write ONLY in Galician (Galego, RAG norm, Latin script). On the PRIMARY line, ALWAYS use correct letters (á é í ó ú ñ ü) — never ASCII-fold. Never Cyrillic, never Arabic script, and never Portuguese spelling, never Castilian Spanish wording where Galician differs. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    toEnRole: 'You are a Galician interpreter.',
  },
})
