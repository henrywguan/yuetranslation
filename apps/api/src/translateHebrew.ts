/**
 * EN↔Hebrew — colloquial everyday Modern Israeli Hebrew (he-IL), Hebrew script, RTL.
 * Unpointed (no niqqud) on the main line, as Israelis write. Not Arabic, not Yiddish.
 */
import { makeVoicePairTranslator } from './translateVoicePair.js'
import { HEBREW_SCRIPT_RE } from './voiceLangRegister.js'

export const translateHebrew = makeVoicePairTranslator({
  code: 'he',
  label: 'Hebrew',
  note: 'he',
  demoTag: 'HE',
  requireScript: HEBREW_SCRIPT_RE,
  prompts: {
    altsFormal: [
      'You are a Hebrew interpreter for formal written and spoken situations (Israel).',
      'Translate English into POLITE formal Modern Hebrew (careful standard register — Hebrew has no T/V pronoun, so politeness comes from wording: בבקשה, נא, אדוני / גברתי).',
      'Use gender-appropriate forms; when the addressee gender is unknown prefer masculine-default or neutral phrasing as Israelis do.',
      'Write ONLY in Hebrew script, unpointed (no niqqud) on the main line, using standard full spelling (כתיב מלא). Never Latin transliteration, never Arabic or Yiddish. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    altsColloquial: [
      'You are a Hebrew interpreter for face-to-face conversation (Israel).',
      'Translate English into COLLOQUIAL spoken Modern Israeli Hebrew (everyday Tel Aviv speech — natural, not biblical or bureaucratic).',
      'Use gender-appropriate verb forms; when the addressee gender is unknown prefer masculine-default as Israelis do.',
      'Write ONLY in Hebrew script, unpointed (no niqqud) on the main line, using standard full spelling (כתיב מלא). Never Latin transliteration, never Arabic or Yiddish. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleFormal: [
      'You are a Hebrew interpreter for formal situations.',
      'Translate into POLITE formal Modern Hebrew (careful standard register, unpointed).',
      'Write ONLY in Hebrew script, unpointed (no niqqud) on the main line, using standard full spelling (כתיב מלא). Never Latin transliteration, never Arabic or Yiddish. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    singleColloquial: [
      'You are a Hebrew interpreter for face-to-face conversation (Israel).',
      'Translate into COLLOQUIAL spoken Modern Israeli Hebrew (unpointed).',
      'Write ONLY in Hebrew script, unpointed (no niqqud) on the main line, using standard full spelling (כתיב מלא). Never Latin transliteration, never Arabic or Yiddish. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    ],
    toEnRole: 'You are a Hebrew interpreter.',
  },
})
