/**
 * Russian / Ukrainian / Kazakh / Bulgarian / Serbian Details helpers — ты/Вы · ти/Ви · сен/сіз · ти/Вие chips,
 * optional Latin reading (not Serbian — Cyrillic only), honesty.
 * Compact panes stay Cyrillic only. Each language keeps its own tables — never shared.
 */
import { detectAddress, type AddressHit, type AddressRule } from './langFamilyAddress'

export type CyrillicLang = 'ru' | 'uk' | 'kk' | 'bg' | 'sr'

export const CYRILLIC_HTML_LANG: Record<CyrillicLang, string> = {
  ru: 'ru-RU',
  uk: 'uk-UA',
  kk: 'kk-KZ',
  bg: 'bg-BG',
  sr: 'sr-Cyrl-RS',
}

export const CYRILLIC_READING_LABEL: Record<CyrillicLang, string> = {
  ru: 'BGN/PCGN',
  uk: 'Ukrainian national',
  kk: 'BGN/PCGN',
  bg: 'Streamlined System',
  sr: 'Cyrillic only',
}

export const CYRILLIC_HONESTY_NOTE: Record<CyrillicLang, string> = {
  ru: 'Russian stress is free and not marked in normal spelling (за́мок “castle” vs замо́к “lock”); unstressed о sounds like “a”. The Latin reading is a learner aid, not pronunciation. Russian is not tonal.',
  uk: 'Ukrainian stress is free and not marked in normal spelling; unlike Russian, unstressed о keeps its “o” sound. и and і are different letters, and ʼ separates sounds. Ukrainian is not Russian and is not tonal.',
  kk: 'Kazakh is written in Cyrillic with extra letters ә ғ қ ң ө ұ ү һ і. It has vowel harmony and Turkic suffixes, and stress usually falls on the last syllable. Kazakhstan is moving toward a Latin alphabet, but this app shows Cyrillic. Kazakh is not Russian and is not tonal. The Latin reading is a learner aid, not pronunciation.',
  bg: 'Bulgarian is written in Cyrillic but has no noun cases and uses a postfixed article (-ът, -та, -то, -те). ъ is a vowel (like “u” in “but”), not a hard sign, and stress is free and not marked in spelling. Bulgarian is not Russian and is not tonal. The Latin reading is a learner aid, not pronunciation.',
  sr: 'Serbian is shown in Cyrillic only here (it also has an official Latin alphabet, which this app does not use). Spelling is phonetic — one letter, one sound — and ј љ њ ђ ћ џ are separate letters. It has a pitch accent that spelling does not mark — not lexical tone like Cantonese. Serbian is not Russian and not Bulgarian.',
}

const CYRILLIC = /[\u0400-\u04FF]/

const RULES: Record<CyrillicLang, AddressRule[]> = {
  ru: [
    { kind: 'ty', chip: 'ты', label: 'ты (informal)', forms: ['ты', 'тебя', 'тебе', 'тобой', 'твой', 'твоя', 'твоё', 'твое', 'твои', 'твоего', 'твоей'] },
    { kind: 'vy', chip: 'Вы', label: 'Вы (formal / plural)', forms: ['вы', 'вас', 'вам', 'вами', 'ваш', 'ваша', 'ваше', 'ваши', 'вашего', 'вашей'] },
  ],
  uk: [
    { kind: 'ty', chip: 'ти', label: 'ти (informal)', forms: ['ти', 'тебе', 'тобі', 'тобою', 'твій', 'твоя', 'твоє', 'твої', 'твого', 'твоєї'] },
    { kind: 'vy', chip: 'Ви', label: 'Ви (formal / plural)', forms: ['ви', 'вас', 'вам', 'вами', 'ваш', 'ваша', 'ваше', 'ваші', 'вашого', 'вашої'] },
  ],
  kk: [
    { kind: 'sen', chip: 'сен', label: 'сен (informal)', forms: ['сен', 'сені', 'саған', 'сенің', 'сенде', 'сенен', 'сенімен'] },
    { kind: 'siz', chip: 'сіз', label: 'сіз (formal / plural)', forms: ['сіз', 'сізді', 'сізге', 'сіздің', 'сізде', 'сізден', 'сізбен'] },
  ],
  bg: [
    { kind: 'ti', chip: 'ти', label: 'ти (informal)', forms: ['ти', 'теб', 'тебе', 'твой', 'твоя', 'твоето', 'твои', 'твоите'] },
    { kind: 'vie', chip: 'Вие', label: 'Вие (formal / plural)', forms: ['вие', 'вас', 'вам', 'ваш', 'ваша', 'вашето', 'ваши', 'вашите'] },
  ],
  sr: [
    { kind: 'ti', chip: 'ти', label: 'ти (informal)', forms: ['ти', 'тебе', 'теби', 'тобом', 'твој', 'твоја', 'твоје', 'твоји'] },
    { kind: 'vi', chip: 'Ви', label: 'Ви (formal / plural)', forms: ['ви', 'вас', 'вама', 'ваш', 'ваша', 'ваше', 'ваши'] },
  ],
}

export function detectCyrillicAddress(text: string, lang: CyrillicLang): AddressHit | null {
  return detectAddress(text, RULES[lang], { caseInsensitive: true, script: CYRILLIC })
}

const RU: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch',
  ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

const UK: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z', и: 'y', і: 'i', к: 'k',
  л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'shch', ь: '', 'ʼ': '', "'": '', '’': '',
}

/** Ukrainian national (2010) letters that change at the start of a word. */
const UK_INITIAL: Record<string, [string, string]> = {
  є: ['ye', 'ie'],
  ї: ['yi', 'i'],
  й: ['y', 'i'],
  ю: ['yu', 'iu'],
  я: ['ya', 'ia'],
}

const KK: Record<string, string> = {
  а: 'a', ә: 'ä', б: 'b', в: 'v', г: 'g', ғ: 'gh', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', қ: 'q', л: 'l', м: 'm', н: 'n', ң: 'ng', о: 'o', ө: 'ö', п: 'p', р: 'r', с: 's', т: 't', у: 'u',
  ұ: 'u', ү: 'ü', ф: 'f', х: 'kh', һ: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', і: 'i', ь: '',
  э: 'e', ю: 'yu', я: 'ya',
}

/** Bulgarian Streamlined System (official, 2009). */
const BG: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'sht', ъ: 'a', ь: 'y', ю: 'yu', я: 'ya',
}

const RU_VOWELS = 'аеёиоуыэюяъь'

function matchCase(src: string, out: string): string {
  if (!out) return out
  if (src !== src.toLowerCase()) return out[0]!.toUpperCase() + out.slice(1)
  return out
}

/**
 * Optional Latin reading for Details (BGN/PCGN-style for Russian, Ukrainian national
 * system for Ukrainian, BGN/PCGN-style for Kazakh, Streamlined System for Bulgarian). Null when there is
 * no Cyrillic, and always null for Serbian (Cyrillic only — never a Latin line). Never shown on compact lines.
 */
export function romanizeCyrillic(text: string, lang: CyrillicLang): string | null {
  const t = text.normalize('NFC').trim()
  if (lang === 'sr') return null
  if (!t || !CYRILLIC.test(t)) return null
  let out = ''
  for (let i = 0; i < t.length; i++) {
    const src = t[i]!
    const ch = src.toLowerCase()
    const prev = i > 0 ? t[i - 1]!.toLowerCase() : ''
    const wordStart = !prev || !/[\p{L}ʼ'’]/u.test(prev)
    let piece: string | undefined
    if (lang === 'ru') {
      if (ch === 'е') piece = wordStart || RU_VOWELS.includes(prev) ? 'ye' : 'e'
      else if (ch === 'ё') piece = wordStart || RU_VOWELS.includes(prev) ? 'yo' : 'ë'
      else piece = RU[ch]
    } else if (lang === 'kk') {
      piece = KK[ch]
    } else if (lang === 'bg') {
      piece = BG[ch]
    } else {
      const initial = UK_INITIAL[ch]
      if (initial) piece = wordStart ? initial[0] : initial[1]
      else if (ch === 'г' && prev === 'з') piece = 'gh'
      else piece = UK[ch]
    }
    out += piece === undefined ? src : matchCase(src, piece)
  }
  return out
}
