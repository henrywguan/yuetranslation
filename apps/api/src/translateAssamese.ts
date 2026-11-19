/**
 * EN↔Assamese — colloquial everyday Assamese (as-IN), Assamese script (Bengali-Assamese script, including Assamese ৰ and ৱ).
 * তুমি between peers; আপুনি with careful standard wording when the source is formal.
 */
import { makeVoicePairTranslator } from './translateVoicePair.js'
import { ASSAMESE_REJECT_RE, BENGALI_ASSAMESE_SCRIPT_RE } from './voiceLangRegister.js'

export const translateAssamese = makeVoicePairTranslator({
  code: 'as',
  label: 'Assamese',
  note: 'as',
  demoTag: 'AS',
  requireScript: BENGALI_ASSAMESE_SCRIPT_RE,
  rejectScript: ASSAMESE_REJECT_RE,
  prompts: {
    altsFormal: [
      'You are an Assamese interpreter for formal written and spoken situations (Assam).',
      'Translate English into POLITE formal Assamese using আপুনি with careful standard wording ("অনুগ্ৰহ কৰি …", "আপুনি … পাৰিবনে?").',
      'Write ONLY in Assamese script (Bengali-Assamese script with ৰ and ৱ). Never Latin transliteration, never Bengali (Bangla) spelling or wording — keep Assamese ৰ and ৱ, never Hindi / Devanagari or other Indic scripts. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    altsColloquial: [
      'You are an Assamese interpreter for face-to-face conversation (Assam).',
      'Translate English into COLLOQUIAL spoken Assamese (everyday Guwahati speech — natural, not bureaucratic).',
      'Use তুমি between peers and আপুনি for strangers when the source signals politeness; prefer natural word order and idiom.',
      'Write ONLY in Assamese script (Bengali-Assamese script with ৰ and ৱ). Never Latin transliteration, never Bengali (Bangla) spelling or wording — keep Assamese ৰ and ৱ, never Hindi / Devanagari or other Indic scripts. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleFormal: [
      'You are an Assamese interpreter for formal situations.',
      'Translate into POLITE formal Assamese (আপুনি + careful standard wording).',
      'Write ONLY in Assamese script (Bengali-Assamese script with ৰ and ৱ). Never Latin transliteration, never Bengali (Bangla) spelling or wording — keep Assamese ৰ and ৱ, never Hindi / Devanagari or other Indic scripts. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleColloquial: [
      'You are an Assamese interpreter for face-to-face conversation (Assam).',
      'Translate into COLLOQUIAL spoken Assamese (তুমি between peers).',
      'Write ONLY in Assamese script (Bengali-Assamese script with ৰ and ৱ). Never Latin transliteration, never Bengali (Bangla) spelling or wording — keep Assamese ৰ and ৱ, never Hindi / Devanagari or other Indic scripts. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    toEnRole: 'You are an Assamese interpreter.',
  },
})
