import type { ConversationLang, Lang, SpeakDirection } from './types'

const STORAGE_KEY = 'yue-primary-lang'
/** Last value confirmed saved to the signed-in profile (or hydrated from it). */
const SYNCED_KEY = 'yue-primary-lang-synced'

/** Languages that can be the app “primary” (your side of Solo / Conversation). */
export const PRIMARY_LANGS = ['en', 'yue', 'cmn', 'wuu', 'sichuan', 'tl', 'es', 'eses', 'vi'] as const
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

export function readSyncedPrimaryLang(): PrimaryLang | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(SYNCED_KEY)
    return isPrimaryLang(raw) ? raw : null
  } catch {
    return null
  }
}

export function writeSyncedPrimaryLang(lang: PrimaryLang) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(SYNCED_KEY, lang)
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Resolve primary language on health/bootstrap.
 * - Unsynced local change (leave before PATCH finishes, or save failed) → keep local + retry.
 * - Local matches last sync → trust server (cross-device).
 * - No sync stamp yet: non-default local beats stale server `yue`; default local adopts server.
 * - Guest / no server pref → local.
 */
export function resolvePrimaryLangOnBootstrap(opts: {
  loggedIn: boolean
  serverPrimary: unknown
  localPrimary: PrimaryLang
  syncedPrimary: PrimaryLang | null
}): { primary: PrimaryLang; needsServerPush: boolean; adoptServer: boolean } {
  const local = normalizePrimaryLang(opts.localPrimary)
  if (!opts.loggedIn || opts.serverPrimary == null || opts.serverPrimary === '') {
    return { primary: local, needsServerPush: false, adoptServer: false }
  }
  const server = normalizePrimaryLang(opts.serverPrimary)
  const synced = opts.syncedPrimary != null ? normalizePrimaryLang(opts.syncedPrimary) : null

  if (local === server) {
    return { primary: local, needsServerPush: false, adoptServer: false }
  }

  // Explicit pending write on this device — never clobber with a stale profile.
  if (synced != null && local !== synced) {
    return { primary: local, needsServerPush: true, adoptServer: false }
  }

  // First boot after this fix (no sync stamp): a non-default local pick is almost
  // certainly an unsaved change; default `yue` should adopt the profile (cross-device).
  if (synced == null) {
    if (local !== 'yue') {
      return { primary: local, needsServerPush: true, adoptServer: false }
    }
    return { primary: server, needsServerPush: false, adoptServer: true }
  }

  // Local matches last successful sync — server is newer (other device).
  return {
    primary: server,
    needsServerPush: false,
    adoptServer: true,
  }
}

/** Solo / Conversation / mic defaults for an Account Hub primary. */
export function layoutForPrimary(primary: PrimaryLang): {
  soloUpperLang: Lang
  soloLowerLang: Lang
  conversationYouLang: ConversationLang
  chineseLang: ConversationLang
  speakDirection: SpeakDirection
} {
  // English primary → classic English-you, Cantonese partner.
  if (primary === 'en') {
    return {
      soloUpperLang: 'en',
      soloLowerLang: 'yue',
      conversationYouLang: 'en',
      chineseLang: 'yue',
      speakDirection: 'en',
    }
  }
  // Every other primary (including Cantonese) fills Solo upper + Conversation you;
  // English moves to Solo lower + Conversation partner.
  return {
    soloUpperLang: primary,
    soloLowerLang: 'en',
    conversationYouLang: primary,
    chineseLang: 'en',
    speakDirection: primary,
  }
}

export function primaryLangLabel(lang: PrimaryLang): {
  en: string
  zh: string
  jp?: string
  /** Native secondary line when primary ≠ Yue/English (replaces Chinese under the logo). */
  gloss?: string
} {
  switch (lang) {
    case 'en':
      return {
        en: 'English Language Tool',
        zh: '英語語言工具',
        jp: 'jing1 jyu5 jyu5 jin4 gung1 geoi6',
      }
    case 'cmn':
      return { en: 'Mandarin Language Tool', zh: '普通話語言工具' }
    case 'wuu':
      return {
        en: 'Shanghainese Language Tool',
        zh: '上海話語言工具',
        gloss: '上海话语言工具',
      }
    case 'sichuan':
      return {
        en: 'Sichuanese Language Tool',
        zh: '四川話語言工具',
        gloss: '四川话语言工具',
      }
    case 'tl':
      return {
        en: 'Tagalog Language Tool',
        zh: '他加祿語語言工具',
        gloss: 'Kagamitan sa Wikang Tagalog',
      }
    case 'es':
      return {
        en: 'Spanish(MX) Language Tool',
        zh: '西班牙語（MX）語言工具',
        gloss: 'Herramienta de español (MX)',
      }
    case 'eses':
      return {
        en: 'Spanish(ES) Language Tool',
        zh: '西班牙語（ES）語言工具',
        gloss: 'Herramienta de español (España)',
      }
    case 'vi':
      return {
        en: 'Vietnamese Language Tool',
        zh: '越南語語言工具',
        gloss: 'Công cụ tiếng Việt',
      }
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
    case 'en':
      return { en: 'English', zh: '英語' }
    case 'cmn':
      return { en: 'Mandarin', zh: '普通話' }
    case 'wuu':
      return { en: 'Shanghainese', zh: '上海話' }
    case 'sichuan':
      return { en: 'Sichuanese', zh: '四川話' }
    case 'tl':
      return { en: 'Tagalog', zh: '他加祿語' }
    case 'es':
      return { en: 'Spanish(MX)', zh: '西班牙語（MX）' }
    case 'eses':
      return { en: 'Spanish(ES)', zh: '西班牙語（ES）' }
    case 'vi':
      return { en: 'Vietnamese', zh: '越南語' }
    case 'yue':
    default:
      return { en: 'Cantonese', zh: '粵語' }
  }
}

