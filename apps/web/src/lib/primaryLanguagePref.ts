import type { Lang } from './types'

const STORAGE_KEY = 'yue-primary-lang'

/** Non-English languages that can be the app “primary” (paired with English). */
export const PRIMARY_LANGS = ['yue', 'cmn', 'wuu', 'tl', 'es', 'vi'] as const
export type PrimaryLang = (typeof PRIMARY_LANGS)[number]

export function isPrimaryLang(value: unknown): value is PrimaryLang {
  return typeof value === 'string' && (PRIMARY_LANGS as readonly string[]).includes(value)
}

export function normalizePrimaryLang(value: unknown): PrimaryLang {
  return isPrimaryLang(value) ? value : 'yue'
}

/** Device cache so primary language survives reloads before entitlement hydrates. */
export function readLocalPrimaryLang(): PrimaryLang {
  if (typeof localStorage === 'undefined') return 'yue'
  try {
    return normalizePrimaryLang(localStorage.getItem(STORAGE_KEY))
  } catch {
    return 'yue'
  }
}

export function writeLocalPrimaryLang(lang: PrimaryLang) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    /* ignore quota / private mode */
  }
}

export function primaryLangLabel(lang: PrimaryLang): { en: string; zh: string; jp?: string } {
  switch (lang) {
    case 'cmn':
      return { en: 'Mandarin Language Tool', zh: '普通話語言工具' }
    case 'wuu':
      return { en: 'Shanghainese Language Tool', zh: '上海話語言工具' }
    case 'tl':
      return { en: 'Tagalog Language Tool', zh: '他加祿語語言工具' }
    case 'es':
      return { en: 'Spanish Language Tool', zh: '西班牙語語言工具' }
    case 'vi':
      return { en: 'Vietnamese Language Tool', zh: '越南語語言工具' }
    case 'yue':
    default:
      return {
        en: 'Cantonese Language Tool',
        zh: '粵語語言工具',
        jp: 'jyut6 jyu5 jyu5 jin4 gung1 geoi6',
      }
  }
}

export function primaryLangShortCopy(lang: PrimaryLang): { en: string; zh: string } {
  switch (lang) {
    case 'cmn':
      return { en: 'Mandarin', zh: '普通話' }
    case 'wuu':
      return { en: 'Shanghainese', zh: '上海話' }
    case 'tl':
      return { en: 'Tagalog', zh: '他加祿語' }
    case 'es':
      return { en: 'Spanish', zh: '西班牙語' }
    case 'vi':
      return { en: 'Vietnamese', zh: '越南語' }
    case 'yue':
    default:
      return { en: 'Cantonese', zh: '粵語' }
  }
}

/** Cast helper when a Lang must be treated as primary (never `en`). */
export function asPrimaryOrYue(lang: Lang): PrimaryLang {
  return isPrimaryLang(lang) ? lang : 'yue'
}
