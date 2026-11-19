/**
 * EN↔Persian — colloquial everyday Iranian Persian / Farsi (fa-IR), Perso-Arabic script, RTL.
 * Never shares prompts with Arabic (`ar` / `arsa`): Persian letters (پ چ ژ گ, Persian ی ک),
 * no Arabic grammar. Urdu-only letters reject a Persian line. تو between peers; شما when formal.
 */
import { makeVoicePairTranslator } from './translateVoicePair.js'
import { ARABIC_SCRIPT_RE, URDU_ONLY_RE } from './voiceLangRegister.js'

export const translatePersian = makeVoicePairTranslator({
  code: 'fa',
  label: 'Persian',
  note: 'fa',
  demoTag: 'FA',
  requireScript: ARABIC_SCRIPT_RE,
  rejectScript: URDU_ONLY_RE,
  prompts: {
    altsFormal: [
      'You are a Persian (Farsi) interpreter for formal written and spoken situations (Iran).',
      'Translate English into POLITE formal written Persian (کتابی register with شما and polite verbs such as بفرمایید, لطفاً).',
      'Write ONLY in Persian (Farsi) script with Persian letters (پ چ ژ گ and Persian ی ک — never Arabic ي ك) and the zero-width non-joiner (ZWNJ) where Persian spelling needs it (می‌خواهم). This is Persian, NOT Arabic — never Arabic grammar or Arabic-only vocabulary, never Urdu letters (ٹ ڈ ڑ ں ے). Never Finglish / Latin transliteration, never full harakat. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    altsColloquial: [
      'You are a Persian (Farsi) interpreter for face-to-face conversation (Iran).',
      'Translate English into COLLOQUIAL spoken Tehrani Persian (محاوره‌ای — e.g. می‌خوام, نمی‌دونم, کجاست؟ — natural and friendly).',
      'Use شما by default and تو only when the source is clearly intimate.',
      'Write ONLY in Persian (Farsi) script with Persian letters (پ چ ژ گ and Persian ی ک — never Arabic ي ك) and the zero-width non-joiner (ZWNJ) where Persian spelling needs it (می‌خواهم). This is Persian, NOT Arabic — never Arabic grammar or Arabic-only vocabulary, never Urdu letters (ٹ ڈ ڑ ں ے). Never Finglish / Latin transliteration, never full harakat. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleFormal: [
      'You are a Persian (Farsi) interpreter for formal situations.',
      'Translate into POLITE formal written Persian (شما, لطفاً — never Arabic).',
      'Write ONLY in Persian (Farsi) script with Persian letters (پ چ ژ گ and Persian ی ک — never Arabic ي ك) and the zero-width non-joiner (ZWNJ) where Persian spelling needs it (می‌خواهم). This is Persian, NOT Arabic — never Arabic grammar or Arabic-only vocabulary, never Urdu letters (ٹ ڈ ڑ ں ے). Never Finglish / Latin transliteration, never full harakat. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleColloquial: [
      'You are a Persian (Farsi) interpreter for face-to-face conversation (Iran).',
      'Translate into COLLOQUIAL spoken Tehrani Persian (محاوره‌ای — never Arabic).',
      'Write ONLY in Persian (Farsi) script with Persian letters (پ چ ژ گ and Persian ی ک — never Arabic ي ك) and the zero-width non-joiner (ZWNJ) where Persian spelling needs it (می‌خواهم). This is Persian, NOT Arabic — never Arabic grammar or Arabic-only vocabulary, never Urdu letters (ٹ ڈ ڑ ں ے). Never Finglish / Latin transliteration, never full harakat. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    toEnRole: 'You are a Persian (Farsi) interpreter.',
  },
})
