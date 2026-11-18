/**
 * Russian / Ukrainian Details helpers — ты/Вы · ти/Ви chips, optional Latin reading, honesty.
 * Compact panes stay Cyrillic only. Russian and Ukrainian keep separate tables — never shared.
 */
import { detectAddress, type AddressHit, type AddressRule } from './langFamilyAddress'

export type CyrillicLang = 'ru' | 'uk'

export const CYRILLIC_HTML_LANG: Record<CyrillicLang, string> = { ru: 'ru-RU', uk: 'uk-UA' }

export const CYRILLIC_READING_LABEL: Record<CyrillicLang, string> = {
  ru: 'BGN/PCGN',
  uk: 'Ukrainian national',
}

export const CYRILLIC_HONESTY_NOTE: Record<CyrillicLang, string> = {
  ru: 'Russian stress is free and not marked in normal spelling (за́мок “castle” vs замо́к “lock”); unstressed о sounds like “a”. The Latin reading is a learner aid, not pronunciation. Russian is not tonal.',
  uk: 'Ukrainian stress is free and not marked in normal spelling; unlike Russian, unstressed о keeps its “o” sound. и and і are different letters, and ʼ separates sounds. Ukrainian is not Russian and is not tonal.',
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

const RU_VOWELS = 'аеёиоуыэюяъь'

function matchCase(src: string, out: string): string {
  if (!out) return out
  if (src !== src.toLowerCase()) return out[0]!.toUpperCase() + out.slice(1)
  return out
}

/**
 * Optional Latin reading for Details (BGN/PCGN-style for Russian, Ukrainian national
 * system for Ukrainian). Null when there is no Cyrillic. Never shown on compact lines.
 */
export function romanizeCyrillic(text: string, lang: CyrillicLang): string | null {
  const t = text.normalize('NFC').trim()
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
