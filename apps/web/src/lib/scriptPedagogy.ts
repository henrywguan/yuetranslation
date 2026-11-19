/**
 * Armenian / Georgian / Amharic Details helpers — address chips + honesty.
 * One "script family" renderer (`LangFamilyText`): each language has its own alphabet and tables,
 * never folded into Russian, Persian, or Arabic. Compact panes stay native script only; no Latin reading is added.
 */
import { detectAddress, type AddressHit, type AddressRule } from './langFamilyAddress'

export type ScriptFamilyLang = 'hy' | 'ka' | 'am'

export const SCRIPT_FAMILY_HTML_LANG: Record<ScriptFamilyLang, string> = {
  hy: 'hy-AM',
  ka: 'ka-GE',
  am: 'am-ET',
}

export const SCRIPT_FAMILY_HONESTY_NOTE: Record<ScriptFamilyLang, string> = {
  hy: 'Armenian has its own 38-letter alphabet. This app shows Eastern Armenian (Armenia); Western Armenian pronounces several consonants differently (բ is “b” in Eastern, “p” in Western) and spells some words differently. Armenian is not Russian or Georgian and is not tonal. դու is informal; դուք is formal / plural. No Latin reading is shown.',
  ka: 'Georgian uses its own Mkhedruli alphabet — one letter, one sound, with no capitals — and has ejective consonants (კ ტ პ წ ჭ ყ) beside aspirated ones. Verbs agree with both subject and object. Georgian is unrelated to Russian or Armenian and is not tonal. შენ is informal; თქვენ is formal / plural. No Latin reading is shown.',
  am: 'Amharic is a Semitic language written left-to-right in Ethiopic (Ge’ez) script — an abugida where each symbol is a consonant plus a vowel — not in Arabic script. Spelling does not mark doubled consonants, and “you” marks gender and respect: አንተ (m), አንቺ (f), እርስዎ (formal), እናንተ (plural). Amharic is not tonal. No Latin reading is shown.',
}

const SCRIPT: Record<ScriptFamilyLang, RegExp> = {
  hy: /[\u0530-\u058F]/,
  ka: /[\u10A0-\u10FF\u1C90-\u1CBF]/,
  am: /[\u1200-\u137F]/,
}

const RULES: Record<ScriptFamilyLang, AddressRule[]> = {
  hy: [
    { kind: 'du', chip: 'դու', label: 'դու (informal)', forms: ['դու', 'քեզ', 'քո', 'քեզնից'] },
    { kind: 'duk', chip: 'դուք', label: 'դուք (formal / plural)', forms: ['դուք', 'ձեզ', 'ձեր', 'ձեզնից'] },
  ],
  ka: [
    { kind: 'shen', chip: 'შენ', label: 'შენ (informal)', forms: ['შენ', 'შენი', 'შენს', 'შენთან', 'შენგან', 'შენზე'] },
    { kind: 'tkven', chip: 'თქვენ', label: 'თქვენ (formal / plural)', forms: ['თქვენ', 'თქვენი', 'თქვენს', 'თქვენთან', 'თქვენგან', 'თქვენზე'] },
  ],
  am: [
    { kind: 'ante', chip: 'አንተ', label: 'አንተ (you, masculine)', forms: ['አንተ', 'አንተን', 'ያንተ', 'ለአንተ'] },
    { kind: 'anchi', chip: 'አንቺ', label: 'አንቺ (you, feminine)', forms: ['አንቺ', 'አንቺን', 'ያንቺ', 'ለአንቺ'] },
    { kind: 'ersiwo', chip: 'እርስዎ', label: 'እርስዎ (formal)', forms: ['እርስዎ', 'እርስዎን', 'የእርስዎ', 'ለእርስዎ'] },
    { kind: 'inante', chip: 'እናንተ', label: 'እናንተ (you, plural)', forms: ['እናንተ', 'እናንተን', 'የእናንተ', 'ለእናንተ'] },
  ],
}

/** Best-effort address detection from pronoun forms; null when there is no clear cue. */
export function detectScriptFamilyAddress(text: string, lang: ScriptFamilyLang): AddressHit | null {
  return detectAddress(text, RULES[lang], { script: SCRIPT[lang] })
}
