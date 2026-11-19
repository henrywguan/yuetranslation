import type { ConversationLang, Lang, SpeakDirection, VoiceLang } from './types'

const STORAGE_KEY = 'yue-primary-lang'
/** Last value confirmed saved to the signed-in profile (or hydrated from it). */
const SYNCED_KEY = 'yue-primary-lang-synced'

/**
 * Languages that can be the app “primary” (your side of Solo / Conversation).
 * Every voice-capable lang — text-only (ceb / ilo / bcl) stay out.
 */
export const PRIMARY_LANGS = [
  'en',
  'yue',
  'cmn',
  'wuu',
  'sichuan',
  'tl',
  'es',
  'eses',
  'vi',
  'th',
  'lo',
  'ko',
  'ja',
  'id',
  'ms',
  'pt',
  'fr',
  'hi',
  'km',
  'my',
  'jv',
  'it',
  'de',
  'nl',
  'ar',
  'arsa',
  'ta',
  'ptpt',
  'tr',
  'bn',
  'te',
  'gu',
  'kn',
  'pl',
  'ro',
  'cs',
  'el',
  'hu',
  'sv',
  'ru',
  'uk',
  'he',
  'fa',
  'ur',
  'ml',
  'mr',
  'pa',
  'or',
  'si',
  'ne',
  'da',
  'nb',
  'fi',
  'sk',
  'hr',
  'ca',
  'az',
  'kk',
  'uz',
  'bg',
  'sr',
  'sw',
  'af',
  'et',
  'lv',
  'lt',
  'ga',
  'cy',
  'eu',
  'gl',
  'mt',
  'is',
  'bs',
  'sq',
  'zu',
  'so',
  'as',
  'mk',
  'mn',
  'ps',
  'hy',
  'ka',
  'am',
] as const satisfies readonly VoiceLang[]
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
    case 'th':
      return {
        en: 'Thai Language Tool',
        zh: '泰文語言工具',
        gloss: 'เครื่องมือภาษาไทย',
      }
    case 'lo':
      return {
        en: 'Lao Language Tool',
        zh: '老撾話語言工具',
        gloss: 'ເຄື່ອງມືພາສາລາວ',
      }
    case 'ko':
      return {
        en: 'Korean Language Tool',
        zh: '韓文語言工具',
        gloss: '한국어 언어 도구',
      }
    case 'ja':
      return {
        en: 'Japanese Language Tool',
        zh: '日文語言工具',
        gloss: '日本語言語ツール',
      }
    case 'id':
      return {
        en: 'Indonesian Language Tool',
        zh: '印尼話語言工具',
        gloss: 'Alat Bahasa Indonesia',
      }
    case 'ms':
      return {
        en: 'Malay Language Tool',
        zh: '馬來話語言工具',
        gloss: 'Alat Bahasa Melayu',
      }
    case 'pt':
      return {
        en: 'Portuguese (BR) Language Tool',
        zh: '巴西葡文語言工具',
        gloss: 'Ferramenta de português (BR)',
      }
    case 'fr':
      return {
        en: 'French Language Tool',
        zh: '法文語言工具',
        gloss: 'Outil de langue française',
      }
    case 'hi':
      return {
        en: 'Hindi Language Tool',
        zh: '印地話語言工具',
        gloss: 'हिन्दी भाषा उपकरण',
      }
    case 'km':
      return {
        en: 'Khmer Language Tool',
        zh: '高棉話語言工具',
        gloss: 'ឧបករណ៍ភាសាខ្មែរ',
      }
    case 'my':
      return {
        en: 'Burmese Language Tool',
        zh: '緬甸話語言工具',
        gloss: 'မြန်မာဘာသာ ကိရိယာ',
      }
    case 'jv':
      return {
        en: 'Javanese Language Tool',
        zh: '爪哇話語言工具',
        gloss: 'Piranti Basa Jawa',
      }
    case 'it':
      return {
        en: 'Italian Language Tool',
        zh: '意大利文語言工具',
        gloss: 'Strumento per la lingua italiana',
      }
    case 'de':
      return {
        en: 'German Language Tool',
        zh: '德文語言工具',
        gloss: 'Deutsch-Sprachwerkzeug',
      }
    case 'nl':
      return {
        en: 'Dutch Language Tool',
        zh: '荷蘭文語言工具',
        gloss: 'Nederlandse taalhulpmiddel',
      }
    case 'ar':
      return {
        en: 'Egyptian Arabic Language Tool',
        zh: '埃及阿拉伯話語言工具',
        gloss: 'أداة اللغة العربية المصرية',
      }
    case 'arsa':
      return {
        en: 'Modern Standard Arabic Language Tool',
        zh: '標準阿拉伯文語言工具',
        gloss: 'أداة اللغة العربية الفصحى',
      }
    case 'ta':
      return {
        en: 'Tamil Language Tool',
        zh: '泰米爾文語言工具',
        gloss: 'தமிழ் மொழிக் கருவி',
      }
    case 'ptpt':
      return {
        en: 'European Portuguese Language Tool',
        zh: '歐洲葡文語言工具',
        gloss: 'Ferramenta de português europeu',
      }
    case 'tr':
      return {
        en: 'Turkish Language Tool',
        zh: '土耳其文語言工具',
        gloss: 'Türkçe dil aracı',
      }
    case 'bn':
      return {
        en: 'Bengali Language Tool',
        zh: '孟加拉文語言工具',
        gloss: 'বাংলা ভাষার সরঞ্জাম',
      }
    case 'te':
      return {
        en: 'Telugu Language Tool',
        zh: '泰盧固文語言工具',
        gloss: 'తెలుగు భాషా సాధనం',
      }
    case 'gu':
      return {
        en: 'Gujarati Language Tool',
        zh: '古吉拉特文語言工具',
        gloss: 'ગુજરાતી ભાષા સાધન',
      }
    case 'kn':
      return {
        en: 'Kannada Language Tool',
        zh: '卡納達文語言工具',
        gloss: 'ಕನ್ನಡ ಭಾಷಾ ಸಾಧನ',
      }
    case 'pl':
      return {
        en: 'Polish Language Tool',
        zh: '波蘭文語言工具',
        gloss: 'Narzędzie językowe – polski',
      }
    case 'ro':
      return {
        en: 'Romanian Language Tool',
        zh: '羅馬尼亞文語言工具',
        gloss: 'Instrument pentru limba română',
      }
    case 'cs':
      return {
        en: 'Czech Language Tool',
        zh: '捷克文語言工具',
        gloss: 'Jazykový nástroj – čeština',
      }
    case 'el':
      return {
        en: 'Greek Language Tool',
        zh: '希臘文語言工具',
        gloss: 'Εργαλείο ελληνικής γλώσσας',
      }
    case 'hu':
      return {
        en: 'Hungarian Language Tool',
        zh: '匈牙利文語言工具',
        gloss: 'Magyar nyelvi eszköz',
      }
    case 'sv':
      return {
        en: 'Swedish Language Tool',
        zh: '瑞典文語言工具',
        gloss: 'Svenskt språkverktyg',
      }
    case 'ru':
      return {
        en: 'Russian Language Tool',
        zh: '俄文語言工具',
        gloss: 'Инструмент для русского языка',
      }
    case 'uk':
      return {
        en: 'Ukrainian Language Tool',
        zh: '烏克蘭文語言工具',
        gloss: 'Інструмент для української мови',
      }
    case 'he':
      return {
        en: 'Hebrew Language Tool',
        zh: '希伯來文語言工具',
        gloss: 'כלי לשפה העברית',
      }
    case 'fa':
      return {
        en: 'Persian Language Tool',
        zh: '波斯文語言工具',
        gloss: 'ابزار زبان فارسی',
      }
    case 'ur':
      return {
        en: 'Urdu Language Tool',
        zh: '烏爾都文語言工具',
        gloss: 'اردو زبان کا آلہ',
      }
    case 'ml':
      return {
        en: 'Malayalam Language Tool',
        zh: '馬拉雅拉姆文語言工具',
        gloss: 'മലയാളം ഭാഷാ ഉപകരണം',
      }
    case 'mr':
      return {
        en: 'Marathi Language Tool',
        zh: '馬拉地文語言工具',
        gloss: 'मराठी भाषा साधन',
      }
    case 'pa':
      return {
        en: 'Punjabi Language Tool',
        zh: '旁遮普文語言工具',
        gloss: 'ਪੰਜਾਬੀ ਭਾਸ਼ਾ ਟੂਲ',
      }
    case 'or':
      return {
        en: 'Odia Language Tool',
        zh: '奧里亞文語言工具',
        gloss: 'ଓଡ଼ିଆ ଭାଷା ସାଧନ',
      }
    case 'si':
      return {
        en: 'Sinhala Language Tool',
        zh: '僧伽羅文語言工具',
        gloss: 'සිංහල භාෂා මෙවලම',
      }
    case 'ne':
      return {
        en: 'Nepali Language Tool',
        zh: '尼泊爾文語言工具',
        gloss: 'नेपाली भाषा उपकरण',
      }
    case 'da':
      return {
        en: 'Danish Language Tool',
        zh: '丹麥文語言工具',
        gloss: 'Dansk sprogværktøj',
      }
    case 'nb':
      return {
        en: 'Norwegian Language Tool',
        zh: '挪威文語言工具',
        gloss: 'Norsk språkverktøy',
      }
    case 'fi':
      return {
        en: 'Finnish Language Tool',
        zh: '芬蘭文語言工具',
        gloss: 'Suomen kielityökalu',
      }
    case 'sk':
      return {
        en: 'Slovak Language Tool',
        zh: '斯洛伐克文語言工具',
        gloss: 'Slovenský jazykový nástroj',
      }
    case 'hr':
      return {
        en: 'Croatian Language Tool',
        zh: '克羅地亞文語言工具',
        gloss: 'Hrvatski jezični alat',
      }
    case 'ca':
      return {
        en: 'Catalan Language Tool',
        zh: '加泰隆尼亞文語言工具',
        gloss: 'Eina lingüística en català',
      }
    case 'az':
      return {
        en: 'Azerbaijani Language Tool',
        zh: '亞塞拜然文語言工具',
        gloss: 'Dil aləti',
      }
    case 'kk':
      return {
        en: 'Kazakh Language Tool',
        zh: '哈薩克文語言工具',
        gloss: 'Тіл құралы',
      }
    case 'uz':
      return {
        en: 'Uzbek Language Tool',
        zh: '烏茲別克文語言工具',
        gloss: 'Til vositasi',
      }
    case 'bg':
      return {
        en: 'Bulgarian Language Tool',
        zh: '保加利亞文語言工具',
        gloss: 'Езиков инструмент',
      }
    case 'sr':
      return {
        en: 'Serbian Language Tool',
        zh: '塞爾維亞文語言工具',
        gloss: 'Језички алат',
      }
    case 'sw':
      return {
        en: 'Swahili Language Tool',
        zh: '斯瓦希里文語言工具',
        gloss: 'Zana ya Lugha',
      }
    case 'af':
      return {
        en: 'Afrikaans Language Tool',
        zh: '南非荷蘭文語言工具',
        gloss: 'Taalgereedskap',
      }
    case 'et':
      return {
        en: 'Estonian Language Tool',
        zh: '愛沙尼亞文語言工具',
        gloss: 'Keelevahend',
      }
    case 'lv':
      return {
        en: 'Latvian Language Tool',
        zh: '拉脫維亞文語言工具',
        gloss: 'Valodas rīks',
      }
    case 'lt':
      return {
        en: 'Lithuanian Language Tool',
        zh: '立陶宛文語言工具',
        gloss: 'Kalbos įrankis',
      }
    case 'ga':
      return {
        en: 'Irish Language Tool',
        zh: '愛爾蘭文語言工具',
        gloss: 'Uirlis Teanga',
      }
    case 'cy':
      return {
        en: 'Welsh Language Tool',
        zh: '威爾斯文語言工具',
        gloss: 'Offeryn Iaith',
      }
    case 'eu':
      return {
        en: 'Basque Language Tool',
        zh: '巴斯克文語言工具',
        gloss: 'Hizkuntza tresna',
      }
    case 'gl':
      return {
        en: 'Galician Language Tool',
        zh: '加利西亞文語言工具',
        gloss: 'Ferramenta de idiomas',
      }
    case 'mt':
      return {
        en: 'Maltese Language Tool',
        zh: '馬爾他文語言工具',
        gloss: 'Għodda tal-Lingwa',
      }
    case 'is':
      return {
        en: 'Icelandic Language Tool',
        zh: '冰島文語言工具',
        gloss: 'Tungumálatól',
      }
    case 'bs':
      return {
        en: 'Bosnian Language Tool',
        zh: '波斯尼亞文語言工具',
        gloss: 'Jezički alat',
      }
    case 'sq':
      return {
        en: 'Albanian Language Tool',
        zh: '阿爾巴尼亞文語言工具',
        gloss: 'Mjet gjuhësor',
      }
    case 'zu':
      return {
        en: 'Zulu Language Tool',
        zh: '祖魯文語言工具',
        gloss: 'Insiza yolimi',
      }
    case 'so':
      return {
        en: 'Somali Language Tool',
        zh: '索馬里文語言工具',
        gloss: 'Qalab Luuqadeed',
      }
    case 'as':
      return {
        en: 'Assamese Language Tool',
        zh: '阿薩姆文語言工具',
        gloss: 'ভাষা সঁজুলি',
      }
    case 'mk':
      return {
        en: 'Macedonian Language Tool',
        zh: '馬其頓文語言工具',
        gloss: 'Јазична алатка',
      }
    case 'mn':
      return {
        en: 'Mongolian Language Tool',
        zh: '蒙古文語言工具',
        gloss: 'Хэлний хэрэгсэл',
      }
    case 'ps':
      return {
        en: 'Pashto Language Tool',
        zh: '普什圖文語言工具',
        gloss: 'د ژبې وسیله',
      }
    case 'hy':
      return {
        en: 'Armenian Language Tool',
        zh: '亞美尼亞文語言工具',
        gloss: 'Լեզվի գործիք',
      }
    case 'ka':
      return {
        en: 'Georgian Language Tool',
        zh: '喬治亞文語言工具',
        gloss: 'ენის ხელსაწყო',
      }
    case 'am':
      return {
        en: 'Amharic Language Tool',
        zh: '阿姆哈拉文語言工具',
        gloss: 'የቋንቋ መሣሪያ',
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
    case 'th':
      return { en: 'Thai', zh: '泰文' }
    case 'lo':
      return { en: 'Lao', zh: '老撾話' }
    case 'ko':
      return { en: 'Korean', zh: '韓文' }
    case 'ja':
      return { en: 'Japanese', zh: '日文' }
    case 'id':
      return { en: 'Indonesian', zh: '印尼話' }
    case 'ms':
      return { en: 'Malay', zh: '馬來話' }
    case 'pt':
      return { en: 'Portuguese (BR)', zh: '巴西葡文' }
    case 'fr':
      return { en: 'French', zh: '法文' }
    case 'hi':
      return { en: 'Hindi', zh: '印地話' }
    case 'km':
      return { en: 'Khmer', zh: '高棉話' }
    case 'my':
      return { en: 'Burmese', zh: '緬甸話' }
    case 'jv':
      return { en: 'Javanese', zh: '爪哇話' }
    case 'it':
      return { en: 'Italian', zh: '意大利文' }
    case 'de':
      return { en: 'German', zh: '德文' }
    case 'nl':
      return { en: 'Dutch', zh: '荷蘭文' }
    case 'ar':
      return { en: 'Egyptian Arabic', zh: '埃及阿拉伯話' }
    case 'arsa':
      return { en: 'Modern Standard Arabic', zh: '標準阿拉伯文' }
    case 'ta':
      return { en: 'Tamil', zh: '泰米爾文' }
    case 'ptpt':
      return { en: 'European Portuguese', zh: '歐洲葡文' }
    case 'tr':
      return { en: 'Turkish', zh: '土耳其文' }
    case 'bn':
      return { en: 'Bengali', zh: '孟加拉文' }
    case 'te':
      return { en: 'Telugu', zh: '泰盧固文' }
    case 'gu':
      return { en: 'Gujarati', zh: '古吉拉特文' }
    case 'kn':
      return { en: 'Kannada', zh: '卡納達文' }
    case 'pl':
      return { en: 'Polish', zh: '波蘭文' }
    case 'ro':
      return { en: 'Romanian', zh: '羅馬尼亞文' }
    case 'cs':
      return { en: 'Czech', zh: '捷克文' }
    case 'el':
      return { en: 'Greek', zh: '希臘文' }
    case 'hu':
      return { en: 'Hungarian', zh: '匈牙利文' }
    case 'sv':
      return { en: 'Swedish', zh: '瑞典文' }
    case 'ru':
      return { en: 'Russian', zh: '俄文' }
    case 'uk':
      return { en: 'Ukrainian', zh: '烏克蘭文' }
    case 'he':
      return { en: 'Hebrew', zh: '希伯來文' }
    case 'fa':
      return { en: 'Persian', zh: '波斯文' }
    case 'ur':
      return { en: 'Urdu', zh: '烏爾都文' }
    case 'ml':
      return { en: 'Malayalam', zh: '馬拉雅拉姆文' }
    case 'mr':
      return { en: 'Marathi', zh: '馬拉地文' }
    case 'pa':
      return { en: 'Punjabi', zh: '旁遮普文' }
    case 'or':
      return { en: 'Odia', zh: '奧里亞文' }
    case 'si':
      return { en: 'Sinhala', zh: '僧伽羅文' }
    case 'ne':
      return { en: 'Nepali', zh: '尼泊爾文' }
    case 'da':
      return { en: 'Danish', zh: '丹麥文' }
    case 'nb':
      return { en: 'Norwegian', zh: '挪威文' }
    case 'fi':
      return { en: 'Finnish', zh: '芬蘭文' }
    case 'sk':
      return { en: 'Slovak', zh: '斯洛伐克文' }
    case 'hr':
      return { en: 'Croatian', zh: '克羅地亞文' }
    case 'ca':
      return { en: 'Catalan', zh: '加泰隆尼亞文' }
    case 'az':
      return { en: 'Azerbaijani', zh: '亞塞拜然文' }
    case 'kk':
      return { en: 'Kazakh', zh: '哈薩克文' }
    case 'uz':
      return { en: 'Uzbek', zh: '烏茲別克文' }
    case 'bg':
      return { en: 'Bulgarian', zh: '保加利亞文' }
    case 'sr':
      return { en: 'Serbian', zh: '塞爾維亞文' }
    case 'sw':
      return { en: 'Swahili', zh: '斯瓦希里文' }
    case 'af':
      return { en: 'Afrikaans', zh: '南非荷蘭文' }
    case 'et':
      return { en: 'Estonian', zh: '愛沙尼亞文' }
    case 'lv':
      return { en: 'Latvian', zh: '拉脫維亞文' }
    case 'lt':
      return { en: 'Lithuanian', zh: '立陶宛文' }
    case 'ga':
      return { en: 'Irish', zh: '愛爾蘭文' }
    case 'cy':
      return { en: 'Welsh', zh: '威爾斯文' }
    case 'eu':
      return { en: 'Basque', zh: '巴斯克文' }
    case 'gl':
      return { en: 'Galician', zh: '加利西亞文' }
    case 'mt':
      return { en: 'Maltese', zh: '馬爾他文' }
    case 'is':
      return { en: 'Icelandic', zh: '冰島文' }
    case 'bs':
      return { en: 'Bosnian', zh: '波斯尼亞文' }
    case 'sq':
      return { en: 'Albanian', zh: '阿爾巴尼亞文' }
    case 'zu':
      return { en: 'Zulu', zh: '祖魯文' }
    case 'so':
      return { en: 'Somali', zh: '索馬里文' }
    case 'as':
      return { en: 'Assamese', zh: '阿薩姆文' }
    case 'mk':
      return { en: 'Macedonian', zh: '馬其頓文' }
    case 'mn':
      return { en: 'Mongolian', zh: '蒙古文' }
    case 'ps':
      return { en: 'Pashto', zh: '普什圖文' }
    case 'hy':
      return { en: 'Armenian', zh: '亞美尼亞文' }
    case 'ka':
      return { en: 'Georgian', zh: '喬治亞文' }
    case 'am':
      return { en: 'Amharic', zh: '阿姆哈拉文' }
    case 'yue':
    default:
      return { en: 'Cantonese', zh: '粵語' }
  }
}
