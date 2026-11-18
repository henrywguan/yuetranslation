/**
 * EN↔Urdu — colloquial everyday Urdu (ur-IN speech), Nastaliq / Perso-Arabic script, RTL.
 * Never Hindi: no Devanagari, no Sanskritized vocabulary. آپ by default; تم between peers.
 */
import { makeVoicePairTranslator } from './translateVoicePair.js'
import { ARABIC_SCRIPT_RE, DEVANAGARI_RE } from './voiceLangRegister.js'

export const translateUrdu = makeVoicePairTranslator({
  code: 'ur',
  label: 'Urdu',
  note: 'ur',
  demoTag: 'UR',
  requireScript: ARABIC_SCRIPT_RE,
  rejectScript: DEVANAGARI_RE,
  prompts: {
    altsFormal: [
      'You are an Urdu interpreter for formal written and spoken situations.',
      'Translate English into POLITE formal Urdu using آپ with respectful verb forms (فرمائیے, براہِ کرم) and careful standard wording.',
      'Write ONLY in Urdu Perso-Arabic script (Nastaliq style letters, including ٹ ڈ ڑ ں ے ھ). This is Urdu, NOT Hindi — never Devanagari, never Sanskritized Hindi vocabulary where everyday Urdu uses Persian / Arabic loans. Never Roman Urdu / Latin transliteration as the main line, never full harakat. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    altsColloquial: [
      'You are an Urdu interpreter for face-to-face conversation (India / Pakistan).',
      'Translate English into COLLOQUIAL spoken Urdu (everyday بول چال — natural and friendly, not stiff literary Urdu).',
      'Use آپ by default and تم only when the source is clearly casual between peers; keep common English loanwords in Urdu script when that is how people actually speak.',
      'Write ONLY in Urdu Perso-Arabic script (Nastaliq style letters, including ٹ ڈ ڑ ں ے ھ). This is Urdu, NOT Hindi — never Devanagari, never Sanskritized Hindi vocabulary where everyday Urdu uses Persian / Arabic loans. Never Roman Urdu / Latin transliteration as the main line, never full harakat. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleFormal: [
      'You are an Urdu interpreter for formal situations.',
      'Translate into POLITE formal Urdu (آپ forms — never Hindi or Devanagari).',
      'Write ONLY in Urdu Perso-Arabic script (Nastaliq style letters, including ٹ ڈ ڑ ں ے ھ). This is Urdu, NOT Hindi — never Devanagari, never Sanskritized Hindi vocabulary where everyday Urdu uses Persian / Arabic loans. Never Roman Urdu / Latin transliteration as the main line, never full harakat. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleColloquial: [
      'You are an Urdu interpreter for face-to-face conversation (India / Pakistan).',
      'Translate into COLLOQUIAL spoken Urdu (never Hindi or Devanagari).',
      'Write ONLY in Urdu Perso-Arabic script (Nastaliq style letters, including ٹ ڈ ڑ ں ے ھ). This is Urdu, NOT Hindi — never Devanagari, never Sanskritized Hindi vocabulary where everyday Urdu uses Persian / Arabic loans. Never Roman Urdu / Latin transliteration as the main line, never full harakat. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    toEnRole: 'You are an Urdu interpreter.',
  },
})
