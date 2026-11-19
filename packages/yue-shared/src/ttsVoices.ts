/** Curated Azure Neural TTS voices (API + web). */

export const DEFAULT_YUE_VOICE = 'zh-HK-HiuMaanNeural'
export const DEFAULT_EN_VOICE = 'en-US-JennyNeural'
export const DEFAULT_CMN_VOICE = 'zh-CN-XiaoxiaoNeural'
/** Shanghainese (Wu) — Azure locale wuu-CN. */
export const DEFAULT_WUU_VOICE = 'wuu-CN-XiaotongNeural'
/** Sichuanese (Chengdu) — Azure locale zh-CN-sichuan. */
export const DEFAULT_SICHUAN_VOICE = 'zh-CN-sichuan-YunxiNeural'
export const DEFAULT_TL_VOICE = 'fil-PH-BlessicaNeural'
/** Mexican Spanish (es-MX) — always the `es` code. Never Spain. */
export const DEFAULT_ES_VOICE = 'es-MX-DaliaNeural'
/** Peninsular / Castilian Spanish (es-ES) — always the `eses` code. Never Mexico. */
export const DEFAULT_ESES_VOICE = 'es-ES-ElviraNeural'
export const DEFAULT_VI_VOICE = 'vi-VN-HoaiMyNeural'
export const DEFAULT_TH_VOICE = 'th-TH-PremwadeeNeural'
export const DEFAULT_LO_VOICE = 'lo-LA-KeomanyNeural'
export const DEFAULT_KO_VOICE = 'ko-KR-SunHiNeural'
export const DEFAULT_JA_VOICE = 'ja-JP-NanamiNeural'
export const DEFAULT_ID_VOICE = 'id-ID-GadisNeural'
export const DEFAULT_MS_VOICE = 'ms-MY-YasminNeural'
export const DEFAULT_PT_VOICE = 'pt-BR-FranciscaNeural'
export const DEFAULT_FR_VOICE = 'fr-FR-DeniseNeural'
export const DEFAULT_HI_VOICE = 'hi-IN-AnanyaNeural'
export const DEFAULT_KM_VOICE = 'km-KH-SreymomNeural'
export const DEFAULT_MY_VOICE = 'my-MM-NilarNeural'
export const DEFAULT_JV_VOICE = 'jv-ID-SitiNeural'
export const DEFAULT_IT_VOICE = 'it-IT-ElsaNeural'
export const DEFAULT_DE_VOICE = 'de-DE-KatjaNeural'
export const DEFAULT_NL_VOICE = 'nl-NL-FennaNeural'
export const DEFAULT_AR_VOICE = 'ar-EG-SalmaNeural'
export const DEFAULT_ARSA_VOICE = 'ar-SA-ZariyahNeural'
/** Tamil (India) — Azure locale ta-IN. */
export const DEFAULT_TA_VOICE = 'ta-IN-PallaviNeural'
/** European Portuguese (Portugal) — always the `ptpt` code. Never Brazil. */
export const DEFAULT_PTPT_VOICE = 'pt-PT-RaquelNeural'
export const DEFAULT_TR_VOICE = 'tr-TR-EmelNeural'
/** Bengali (India) — Azure locale bn-IN. */
export const DEFAULT_BN_VOICE = 'bn-IN-TanishaaNeural'
/** Telugu — Azure locale te-IN. */
export const DEFAULT_TE_VOICE = 'te-IN-ShrutiNeural'
/** Gujarati — Azure locale gu-IN. */
export const DEFAULT_GU_VOICE = 'gu-IN-DhwaniNeural'
/** Kannada — Azure locale kn-IN. */
export const DEFAULT_KN_VOICE = 'kn-IN-SapnaNeural'
/** Polish — Azure locale pl-PL. */
export const DEFAULT_PL_VOICE = 'pl-PL-AgnieszkaNeural'
/** Romanian — Azure locale ro-RO. */
export const DEFAULT_RO_VOICE = 'ro-RO-AlinaNeural'
/** Czech — Azure locale cs-CZ. */
export const DEFAULT_CS_VOICE = 'cs-CZ-VlastaNeural'
/** Greek (Greece) — Greek script. */
export const DEFAULT_EL_VOICE = 'el-GR-AthinaNeural'
/** Hungarian — Azure locale hu-HU. */
export const DEFAULT_HU_VOICE = 'hu-HU-NoemiNeural'
/** Swedish — Azure locale sv-SE. */
export const DEFAULT_SV_VOICE = 'sv-SE-SofieNeural'
/** Russian (Russia) — never shares voices or prompts with Ukrainian (`uk`). */
export const DEFAULT_RU_VOICE = 'ru-RU-SvetlanaNeural'
/** Ukrainian (Ukraine) — never shares voices or prompts with Russian (`ru`). */
export const DEFAULT_UK_VOICE = 'uk-UA-PolinaNeural'
/** Hebrew (Israel) — RTL Hebrew script. */
export const DEFAULT_HE_VOICE = 'he-IL-HilaNeural'
/** Persian / Farsi (Iran) — Arabic-script RTL, never an Arabic (`ar` / `arsa`) voice. */
export const DEFAULT_FA_VOICE = 'fa-IR-DilaraNeural'
/** Urdu (India) — Nastaliq / Perso-Arabic RTL, never a Hindi (`hi`) voice. */
export const DEFAULT_UR_VOICE = 'ur-IN-GulNeural'

export type YueVoiceId =
  | 'zh-HK-HiuMaanNeural'
  | 'zh-HK-HiuGaaiNeural'
  | 'zh-HK-WanLungNeural'

export type EnVoiceId =
  | 'en-US-JennyNeural'
  | 'en-US-GuyNeural'
  | 'en-US-AriaNeural'
  | 'en-GB-SoniaNeural'
  | 'en-GB-RyanNeural'
  | 'en-AU-NatashaNeural'

export type CmnVoiceId = 'zh-CN-XiaoxiaoNeural' | 'zh-CN-YunxiNeural'

export type WuuVoiceId = 'wuu-CN-XiaotongNeural' | 'wuu-CN-YunzheNeural'

/** Male Chengdu — only curated Sichuanese neural for now. */
export type SichuanVoiceId = 'zh-CN-sichuan-YunxiNeural'

export type TlVoiceId = 'fil-PH-BlessicaNeural' | 'fil-PH-AngeloNeural'

export type EsVoiceId = 'es-MX-DaliaNeural' | 'es-MX-JorgeNeural'

/** Peninsular / Castilian Spanish (Spain) — `eses` code, es-ES locale. */
export type EsesVoiceId = 'es-ES-ElviraNeural' | 'es-ES-AlvaroNeural'

export type ViVoiceId = 'vi-VN-HoaiMyNeural' | 'vi-VN-NamMinhNeural'

export type ThVoiceId = 'th-TH-PremwadeeNeural' | 'th-TH-NiwatNeural'

export type LoVoiceId = 'lo-LA-KeomanyNeural' | 'lo-LA-ChanthavongNeural'

export type KoVoiceId = 'ko-KR-SunHiNeural' | 'ko-KR-InJoonNeural'
export type JaVoiceId = 'ja-JP-NanamiNeural' | 'ja-JP-KeitaNeural'
export type IdVoiceId = 'id-ID-GadisNeural' | 'id-ID-ArdiNeural'
export type MsVoiceId = 'ms-MY-YasminNeural' | 'ms-MY-OsmanNeural'
export type PtVoiceId = 'pt-BR-FranciscaNeural' | 'pt-BR-AntonioNeural'
export type FrVoiceId = 'fr-FR-DeniseNeural' | 'fr-FR-HenriNeural'
export type HiVoiceId = 'hi-IN-AnanyaNeural' | 'hi-IN-AaravNeural'
export type KmVoiceId = 'km-KH-SreymomNeural' | 'km-KH-PisethNeural'
export type MyVoiceId = 'my-MM-NilarNeural' | 'my-MM-ThihaNeural'
export type JvVoiceId = 'jv-ID-SitiNeural' | 'jv-ID-DimasNeural'
export type ItVoiceId = 'it-IT-ElsaNeural' | 'it-IT-DiegoNeural'
export type DeVoiceId = 'de-DE-KatjaNeural' | 'de-DE-ConradNeural'
export type NlVoiceId = 'nl-NL-FennaNeural' | 'nl-NL-MaartenNeural'
export type ArVoiceId = 'ar-EG-SalmaNeural' | 'ar-EG-ShakirNeural'
export type ArsaVoiceId = 'ar-SA-ZariyahNeural' | 'ar-SA-HamedNeural'
export type TaVoiceId = 'ta-IN-PallaviNeural' | 'ta-IN-ValluvarNeural'
/** European Portuguese (Portugal) — `ptpt` code, pt-PT locale. */
export type PtptVoiceId = 'pt-PT-RaquelNeural' | 'pt-PT-DuarteNeural'
export type TrVoiceId = 'tr-TR-EmelNeural' | 'tr-TR-AhmetNeural'
export type BnVoiceId = 'bn-IN-TanishaaNeural' | 'bn-IN-BashkarNeural'
export type TeVoiceId = 'te-IN-ShrutiNeural' | 'te-IN-MohanNeural'
export type GuVoiceId = 'gu-IN-DhwaniNeural' | 'gu-IN-NiranjanNeural'
export type KnVoiceId = 'kn-IN-SapnaNeural' | 'kn-IN-GaganNeural'
export type PlVoiceId = 'pl-PL-AgnieszkaNeural' | 'pl-PL-MarekNeural'
export type RoVoiceId = 'ro-RO-AlinaNeural' | 'ro-RO-EmilNeural'
export type CsVoiceId = 'cs-CZ-VlastaNeural' | 'cs-CZ-AntoninNeural'
export type ElVoiceId = 'el-GR-AthinaNeural' | 'el-GR-NestorasNeural'
export type HuVoiceId = 'hu-HU-NoemiNeural' | 'hu-HU-TamasNeural'
export type SvVoiceId = 'sv-SE-SofieNeural' | 'sv-SE-MattiasNeural'
export type RuVoiceId = 'ru-RU-SvetlanaNeural' | 'ru-RU-DmitryNeural'
export type UkVoiceId = 'uk-UA-PolinaNeural' | 'uk-UA-OstapNeural'
export type HeVoiceId = 'he-IL-HilaNeural' | 'he-IL-AvriNeural'
export type FaVoiceId = 'fa-IR-DilaraNeural' | 'fa-IR-FaridNeural'
export type UrVoiceId = 'ur-IN-GulNeural' | 'ur-IN-SalmanNeural'

export type TtsVoiceId =
  | YueVoiceId
  | EnVoiceId
  | CmnVoiceId
  | WuuVoiceId
  | SichuanVoiceId
  | TlVoiceId
  | EsVoiceId
  | EsesVoiceId
  | ViVoiceId
  | ThVoiceId
  | LoVoiceId
  | KoVoiceId
  | JaVoiceId
  | IdVoiceId
  | MsVoiceId
  | PtVoiceId
  | FrVoiceId
  | HiVoiceId
  | KmVoiceId
  | MyVoiceId
  | JvVoiceId
  | ItVoiceId
  | DeVoiceId
  | NlVoiceId
  | ArVoiceId
  | ArsaVoiceId
  | TaVoiceId
  | PtptVoiceId
  | TrVoiceId
  | BnVoiceId
  | TeVoiceId
  | GuVoiceId
  | KnVoiceId
  | PlVoiceId
  | RoVoiceId
  | CsVoiceId
  | ElVoiceId
  | HuVoiceId
  | SvVoiceId
  | RuVoiceId
  | UkVoiceId
  | HeVoiceId
  | FaVoiceId
  | UrVoiceId

export type TtsVoiceOption = {
  id: TtsVoiceId
  lang: 'yue' | 'en' | 'cmn' | 'wuu' | 'sichuan' | 'tl' | 'es' | 'eses' | 'vi' | 'th' | 'lo' | 'ko' | 'ja' | 'id' | 'ms' | 'pt' | 'fr' | 'hi' | 'km' | 'my' | 'jv' | 'it' | 'de' | 'nl' | 'ar' | 'arsa' | 'ta' | 'ptpt' | 'tr' | 'bn' | 'te' | 'gu' | 'kn' | 'pl' | 'ro' | 'cs' | 'el' | 'hu' | 'sv' | 'ru' | 'uk' | 'he' | 'fa' | 'ur'
  /** Azure SSML xml:lang */
  xmlLang: string
  labelEn: string
  labelZh: string
  gender: 'female' | 'male'
}

export const YUE_VOICES: TtsVoiceOption[] = [
  {
    id: 'zh-HK-HiuMaanNeural',
    lang: 'yue',
    xmlLang: 'zh-HK',
    labelEn: 'Hiu Maan · Female',
    labelZh: '曉曼 · 女聲',
    gender: 'female',
  },
  {
    id: 'zh-HK-HiuGaaiNeural',
    lang: 'yue',
    xmlLang: 'zh-HK',
    labelEn: 'Hiu Gaai · Female',
    labelZh: '曉佳 · 女聲',
    gender: 'female',
  },
  {
    id: 'zh-HK-WanLungNeural',
    lang: 'yue',
    xmlLang: 'zh-HK',
    labelEn: 'Wan Lung · Male',
    labelZh: '雲龍 · 男聲',
    gender: 'male',
  },
]

export const EN_VOICES: TtsVoiceOption[] = [
  {
    id: 'en-US-JennyNeural',
    lang: 'en',
    xmlLang: 'en-US',
    labelEn: 'Jenny · US Female',
    labelZh: 'Jenny · 美式女聲',
    gender: 'female',
  },
  {
    id: 'en-US-GuyNeural',
    lang: 'en',
    xmlLang: 'en-US',
    labelEn: 'Guy · US Male',
    labelZh: 'Guy · 美式男聲',
    gender: 'male',
  },
  {
    id: 'en-US-AriaNeural',
    lang: 'en',
    xmlLang: 'en-US',
    labelEn: 'Aria · US Female',
    labelZh: 'Aria · 美式女聲',
    gender: 'female',
  },
  {
    id: 'en-GB-SoniaNeural',
    lang: 'en',
    xmlLang: 'en-GB',
    labelEn: 'Sonia · UK Female',
    labelZh: 'Sonia · 英式女聲',
    gender: 'female',
  },
  {
    id: 'en-GB-RyanNeural',
    lang: 'en',
    xmlLang: 'en-GB',
    labelEn: 'Ryan · UK Male',
    labelZh: 'Ryan · 英式男聲',
    gender: 'male',
  },
  {
    id: 'en-AU-NatashaNeural',
    lang: 'en',
    xmlLang: 'en-AU',
    labelEn: 'Natasha · AU Female',
    labelZh: 'Natasha · 澳式女聲',
    gender: 'female',
  },
]


export const TL_VOICES: TtsVoiceOption[] = [
  {
    id: 'fil-PH-BlessicaNeural',
    lang: 'tl',
    xmlLang: 'fil-PH',
    labelEn: 'Blessica · Female',
    labelZh: 'Blessica · 女聲',
    gender: 'female',
  },
  {
    id: 'fil-PH-AngeloNeural',
    lang: 'tl',
    xmlLang: 'fil-PH',
    labelEn: 'Angelo · Male',
    labelZh: 'Angelo · 男聲',
    gender: 'male',
  },
]


export const ES_VOICES: TtsVoiceOption[] = [
  {
    id: 'es-MX-DaliaNeural',
    lang: 'es',
    xmlLang: 'es-MX',
    labelEn: 'Dalia · Mexican Female',
    labelZh: 'Dalia · 墨西哥女聲',
    gender: 'female',
  },
  {
    id: 'es-MX-JorgeNeural',
    lang: 'es',
    xmlLang: 'es-MX',
    labelEn: 'Jorge · Mexican Male',
    labelZh: 'Jorge · 墨西哥男聲',
    gender: 'male',
  },
]

export const ES_ES_VOICES: TtsVoiceOption[] = [
  {
    id: 'es-ES-ElviraNeural',
    lang: 'eses',
    xmlLang: 'es-ES',
    labelEn: 'Elvira · Spain Female',
    labelZh: 'Elvira · 西班牙女聲',
    gender: 'female',
  },
  {
    id: 'es-ES-AlvaroNeural',
    lang: 'eses',
    xmlLang: 'es-ES',
    labelEn: 'Álvaro · Spain Male',
    labelZh: 'Álvaro · 西班牙男聲',
    gender: 'male',
  },
]

export const VI_VOICES: TtsVoiceOption[] = [
  {
    id: 'vi-VN-HoaiMyNeural',
    lang: 'vi',
    xmlLang: 'vi-VN',
    labelEn: 'Hoài My · Female',
    labelZh: 'Hoài My · 女聲',
    gender: 'female',
  },
  {
    id: 'vi-VN-NamMinhNeural',
    lang: 'vi',
    xmlLang: 'vi-VN',
    labelEn: 'Nam Minh · Male',
    labelZh: 'Nam Minh · 男聲',
    gender: 'male',
  },
]

export const TH_VOICES: TtsVoiceOption[] = [
  {
    id: 'th-TH-PremwadeeNeural',
    lang: 'th',
    xmlLang: 'th-TH',
    labelEn: 'Premwadee · Female',
    labelZh: 'Premwadee · 女聲',
    gender: 'female',
  },
  {
    id: 'th-TH-NiwatNeural',
    lang: 'th',
    xmlLang: 'th-TH',
    labelEn: 'Niwat · Male',
    labelZh: 'Niwat · 男聲',
    gender: 'male',
  },
]

export const LO_VOICES: TtsVoiceOption[] = [
  {
    id: 'lo-LA-KeomanyNeural',
    lang: 'lo',
    xmlLang: 'lo-LA',
    labelEn: 'Keomany · Female',
    labelZh: 'Keomany · 女聲',
    gender: 'female',
  },
  {
    id: 'lo-LA-ChanthavongNeural',
    lang: 'lo',
    xmlLang: 'lo-LA',
    labelEn: 'Chanthavong · Male',
    labelZh: 'Chanthavong · 男聲',
    gender: 'male',
  },
]

export const KO_VOICES: TtsVoiceOption[] = [
  {
    id: 'ko-KR-SunHiNeural',
    lang: 'ko',
    xmlLang: 'ko-KR',
    labelEn: 'Sun-Hi · Female',
    labelZh: 'Sun-Hi · 女聲',
    gender: 'female',
  },
  {
    id: 'ko-KR-InJoonNeural',
    lang: 'ko',
    xmlLang: 'ko-KR',
    labelEn: 'InJoon · Male',
    labelZh: 'InJoon · 男聲',
    gender: 'male',
  },
]

export const JA_VOICES: TtsVoiceOption[] = [
  {
    id: 'ja-JP-NanamiNeural',
    lang: 'ja',
    xmlLang: 'ja-JP',
    labelEn: 'Nanami · Female',
    labelZh: 'Nanami · 女聲',
    gender: 'female',
  },
  {
    id: 'ja-JP-KeitaNeural',
    lang: 'ja',
    xmlLang: 'ja-JP',
    labelEn: 'Keita · Male',
    labelZh: 'Keita · 男聲',
    gender: 'male',
  },
]

export const ID_VOICES: TtsVoiceOption[] = [
  {
    id: 'id-ID-GadisNeural',
    lang: 'id',
    xmlLang: 'id-ID',
    labelEn: 'Gadis · Female',
    labelZh: 'Gadis · 女聲',
    gender: 'female',
  },
  {
    id: 'id-ID-ArdiNeural',
    lang: 'id',
    xmlLang: 'id-ID',
    labelEn: 'Ardi · Male',
    labelZh: 'Ardi · 男聲',
    gender: 'male',
  },
]

export const MS_VOICES: TtsVoiceOption[] = [
  {
    id: 'ms-MY-YasminNeural',
    lang: 'ms',
    xmlLang: 'ms-MY',
    labelEn: 'Yasmin · Female',
    labelZh: 'Yasmin · 女聲',
    gender: 'female',
  },
  {
    id: 'ms-MY-OsmanNeural',
    lang: 'ms',
    xmlLang: 'ms-MY',
    labelEn: 'Osman · Male',
    labelZh: 'Osman · 男聲',
    gender: 'male',
  },
]

export const PT_VOICES: TtsVoiceOption[] = [
  {
    id: 'pt-BR-FranciscaNeural',
    lang: 'pt',
    xmlLang: 'pt-BR',
    labelEn: 'Francisca · Female',
    labelZh: 'Francisca · 女聲',
    gender: 'female',
  },
  {
    id: 'pt-BR-AntonioNeural',
    lang: 'pt',
    xmlLang: 'pt-BR',
    labelEn: 'Antonio · Male',
    labelZh: 'Antonio · 男聲',
    gender: 'male',
  },
]

export const FR_VOICES: TtsVoiceOption[] = [
  {
    id: 'fr-FR-DeniseNeural',
    lang: 'fr',
    xmlLang: 'fr-FR',
    labelEn: 'Denise · Female',
    labelZh: 'Denise · 女聲',
    gender: 'female',
  },
  {
    id: 'fr-FR-HenriNeural',
    lang: 'fr',
    xmlLang: 'fr-FR',
    labelEn: 'Henri · Male',
    labelZh: 'Henri · 男聲',
    gender: 'male',
  },
]

export const HI_VOICES: TtsVoiceOption[] = [
  {
    id: 'hi-IN-AnanyaNeural',
    lang: 'hi',
    xmlLang: 'hi-IN',
    labelEn: 'Ananya · Female',
    labelZh: 'Ananya · 女聲',
    gender: 'female',
  },
  {
    id: 'hi-IN-AaravNeural',
    lang: 'hi',
    xmlLang: 'hi-IN',
    labelEn: 'Aarav · Male',
    labelZh: 'Aarav · 男聲',
    gender: 'male',
  },
]

export const KM_VOICES: TtsVoiceOption[] = [
  {
    id: 'km-KH-SreymomNeural',
    lang: 'km',
    xmlLang: 'km-KH',
    labelEn: 'Sreymom · Female',
    labelZh: 'Sreymom · 女聲',
    gender: 'female',
  },
  {
    id: 'km-KH-PisethNeural',
    lang: 'km',
    xmlLang: 'km-KH',
    labelEn: 'Piseth · Male',
    labelZh: 'Piseth · 男聲',
    gender: 'male',
  },
]

export const MY_VOICES: TtsVoiceOption[] = [
  {
    id: 'my-MM-NilarNeural',
    lang: 'my',
    xmlLang: 'my-MM',
    labelEn: 'Nilar · Female',
    labelZh: 'Nilar · 女聲',
    gender: 'female',
  },
  {
    id: 'my-MM-ThihaNeural',
    lang: 'my',
    xmlLang: 'my-MM',
    labelEn: 'Thiha · Male',
    labelZh: 'Thiha · 男聲',
    gender: 'male',
  },
]

export const JV_VOICES: TtsVoiceOption[] = [
  {
    id: 'jv-ID-SitiNeural',
    lang: 'jv',
    xmlLang: 'jv-ID',
    labelEn: 'Siti · Female',
    labelZh: 'Siti · 女聲',
    gender: 'female',
  },
  {
    id: 'jv-ID-DimasNeural',
    lang: 'jv',
    xmlLang: 'jv-ID',
    labelEn: 'Dimas · Male',
    labelZh: 'Dimas · 男聲',
    gender: 'male',
  },
]

export const IT_VOICES: TtsVoiceOption[] = [
  {
    id: 'it-IT-ElsaNeural',
    lang: 'it',
    xmlLang: 'it-IT',
    labelEn: 'Elsa · Female',
    labelZh: 'Elsa · 女聲',
    gender: 'female',
  },
  {
    id: 'it-IT-DiegoNeural',
    lang: 'it',
    xmlLang: 'it-IT',
    labelEn: 'Diego · Male',
    labelZh: 'Diego · 男聲',
    gender: 'male',
  },
]

export const DE_VOICES: TtsVoiceOption[] = [
  {
    id: 'de-DE-KatjaNeural',
    lang: 'de',
    xmlLang: 'de-DE',
    labelEn: 'Katja · Female',
    labelZh: 'Katja · 女聲',
    gender: 'female',
  },
  {
    id: 'de-DE-ConradNeural',
    lang: 'de',
    xmlLang: 'de-DE',
    labelEn: 'Conrad · Male',
    labelZh: 'Conrad · 男聲',
    gender: 'male',
  },
]

export const NL_VOICES: TtsVoiceOption[] = [
  {
    id: 'nl-NL-FennaNeural',
    lang: 'nl',
    xmlLang: 'nl-NL',
    labelEn: 'Fenna · Female',
    labelZh: 'Fenna · 女聲',
    gender: 'female',
  },
  {
    id: 'nl-NL-MaartenNeural',
    lang: 'nl',
    xmlLang: 'nl-NL',
    labelEn: 'Maarten · Male',
    labelZh: 'Maarten · 男聲',
    gender: 'male',
  },
]

export const AR_VOICES: TtsVoiceOption[] = [
  {
    id: 'ar-EG-SalmaNeural',
    lang: 'ar',
    xmlLang: 'ar-EG',
    labelEn: 'Salma · Female',
    labelZh: 'Salma · 女聲',
    gender: 'female',
  },
  {
    id: 'ar-EG-ShakirNeural',
    lang: 'ar',
    xmlLang: 'ar-EG',
    labelEn: 'Shakir · Male',
    labelZh: 'Shakir · 男聲',
    gender: 'male',
  },
]

export const ARSA_VOICES: TtsVoiceOption[] = [
  {
    id: 'ar-SA-ZariyahNeural',
    lang: 'arsa',
    xmlLang: 'ar-SA',
    labelEn: 'Zariyah · Female',
    labelZh: 'Zariyah · 女聲',
    gender: 'female',
  },
  {
    id: 'ar-SA-HamedNeural',
    lang: 'arsa',
    xmlLang: 'ar-SA',
    labelEn: 'Hamed · Male',
    labelZh: 'Hamed · 男聲',
    gender: 'male',
  },
]

export const TA_VOICES: TtsVoiceOption[] = [
  {
    id: 'ta-IN-PallaviNeural',
    lang: 'ta',
    xmlLang: 'ta-IN',
    labelEn: 'Pallavi · Female',
    labelZh: 'Pallavi · 女聲',
    gender: 'female',
  },
  {
    id: 'ta-IN-ValluvarNeural',
    lang: 'ta',
    xmlLang: 'ta-IN',
    labelEn: 'Valluvar · Male',
    labelZh: 'Valluvar · 男聲',
    gender: 'male',
  },
]

export const PTPT_VOICES: TtsVoiceOption[] = [
  {
    id: 'pt-PT-RaquelNeural',
    lang: 'ptpt',
    xmlLang: 'pt-PT',
    labelEn: 'Raquel · Female',
    labelZh: 'Raquel · 女聲',
    gender: 'female',
  },
  {
    id: 'pt-PT-DuarteNeural',
    lang: 'ptpt',
    xmlLang: 'pt-PT',
    labelEn: 'Duarte · Male',
    labelZh: 'Duarte · 男聲',
    gender: 'male',
  },
]

export const TR_VOICES: TtsVoiceOption[] = [
  {
    id: 'tr-TR-EmelNeural',
    lang: 'tr',
    xmlLang: 'tr-TR',
    labelEn: 'Emel · Female',
    labelZh: 'Emel · 女聲',
    gender: 'female',
  },
  {
    id: 'tr-TR-AhmetNeural',
    lang: 'tr',
    xmlLang: 'tr-TR',
    labelEn: 'Ahmet · Male',
    labelZh: 'Ahmet · 男聲',
    gender: 'male',
  },
]

export const BN_VOICES: TtsVoiceOption[] = [
  {
    id: 'bn-IN-TanishaaNeural',
    lang: 'bn',
    xmlLang: 'bn-IN',
    labelEn: 'Tanishaa · Female',
    labelZh: 'Tanishaa · 女聲',
    gender: 'female',
  },
  {
    id: 'bn-IN-BashkarNeural',
    lang: 'bn',
    xmlLang: 'bn-IN',
    labelEn: 'Bashkar · Male',
    labelZh: 'Bashkar · 男聲',
    gender: 'male',
  },
]

export const TE_VOICES: TtsVoiceOption[] = [
  {
    id: 'te-IN-ShrutiNeural',
    lang: 'te',
    xmlLang: 'te-IN',
    labelEn: 'Shruti · Female',
    labelZh: 'Shruti · 女聲',
    gender: 'female',
  },
  {
    id: 'te-IN-MohanNeural',
    lang: 'te',
    xmlLang: 'te-IN',
    labelEn: 'Mohan · Male',
    labelZh: 'Mohan · 男聲',
    gender: 'male',
  },
]

export const GU_VOICES: TtsVoiceOption[] = [
  {
    id: 'gu-IN-DhwaniNeural',
    lang: 'gu',
    xmlLang: 'gu-IN',
    labelEn: 'Dhwani · Female',
    labelZh: 'Dhwani · 女聲',
    gender: 'female',
  },
  {
    id: 'gu-IN-NiranjanNeural',
    lang: 'gu',
    xmlLang: 'gu-IN',
    labelEn: 'Niranjan · Male',
    labelZh: 'Niranjan · 男聲',
    gender: 'male',
  },
]

export const KN_VOICES: TtsVoiceOption[] = [
  {
    id: 'kn-IN-SapnaNeural',
    lang: 'kn',
    xmlLang: 'kn-IN',
    labelEn: 'Sapna · Female',
    labelZh: 'Sapna · 女聲',
    gender: 'female',
  },
  {
    id: 'kn-IN-GaganNeural',
    lang: 'kn',
    xmlLang: 'kn-IN',
    labelEn: 'Gagan · Male',
    labelZh: 'Gagan · 男聲',
    gender: 'male',
  },
]

export const PL_VOICES: TtsVoiceOption[] = [
  {
    id: 'pl-PL-AgnieszkaNeural',
    lang: 'pl',
    xmlLang: 'pl-PL',
    labelEn: 'Agnieszka · Female',
    labelZh: 'Agnieszka · 女聲',
    gender: 'female',
  },
  {
    id: 'pl-PL-MarekNeural',
    lang: 'pl',
    xmlLang: 'pl-PL',
    labelEn: 'Marek · Male',
    labelZh: 'Marek · 男聲',
    gender: 'male',
  },
]

export const RO_VOICES: TtsVoiceOption[] = [
  {
    id: 'ro-RO-AlinaNeural',
    lang: 'ro',
    xmlLang: 'ro-RO',
    labelEn: 'Alina · Female',
    labelZh: 'Alina · 女聲',
    gender: 'female',
  },
  {
    id: 'ro-RO-EmilNeural',
    lang: 'ro',
    xmlLang: 'ro-RO',
    labelEn: 'Emil · Male',
    labelZh: 'Emil · 男聲',
    gender: 'male',
  },
]

export const CS_VOICES: TtsVoiceOption[] = [
  {
    id: 'cs-CZ-VlastaNeural',
    lang: 'cs',
    xmlLang: 'cs-CZ',
    labelEn: 'Vlasta · Female',
    labelZh: 'Vlasta · 女聲',
    gender: 'female',
  },
  {
    id: 'cs-CZ-AntoninNeural',
    lang: 'cs',
    xmlLang: 'cs-CZ',
    labelEn: 'Antonín · Male',
    labelZh: 'Antonín · 男聲',
    gender: 'male',
  },
]

export const EL_VOICES: TtsVoiceOption[] = [
  {
    id: 'el-GR-AthinaNeural',
    lang: 'el',
    xmlLang: 'el-GR',
    labelEn: 'Athina · Female',
    labelZh: 'Athina · 女聲',
    gender: 'female',
  },
  {
    id: 'el-GR-NestorasNeural',
    lang: 'el',
    xmlLang: 'el-GR',
    labelEn: 'Nestoras · Male',
    labelZh: 'Nestoras · 男聲',
    gender: 'male',
  },
]

export const HU_VOICES: TtsVoiceOption[] = [
  {
    id: 'hu-HU-NoemiNeural',
    lang: 'hu',
    xmlLang: 'hu-HU',
    labelEn: 'Noémi · Female',
    labelZh: 'Noémi · 女聲',
    gender: 'female',
  },
  {
    id: 'hu-HU-TamasNeural',
    lang: 'hu',
    xmlLang: 'hu-HU',
    labelEn: 'Tamás · Male',
    labelZh: 'Tamás · 男聲',
    gender: 'male',
  },
]

export const SV_VOICES: TtsVoiceOption[] = [
  {
    id: 'sv-SE-SofieNeural',
    lang: 'sv',
    xmlLang: 'sv-SE',
    labelEn: 'Sofie · Female',
    labelZh: 'Sofie · 女聲',
    gender: 'female',
  },
  {
    id: 'sv-SE-MattiasNeural',
    lang: 'sv',
    xmlLang: 'sv-SE',
    labelEn: 'Mattias · Male',
    labelZh: 'Mattias · 男聲',
    gender: 'male',
  },
]

export const RU_VOICES: TtsVoiceOption[] = [
  {
    id: 'ru-RU-SvetlanaNeural',
    lang: 'ru',
    xmlLang: 'ru-RU',
    labelEn: 'Svetlana · Female',
    labelZh: 'Svetlana · 女聲',
    gender: 'female',
  },
  {
    id: 'ru-RU-DmitryNeural',
    lang: 'ru',
    xmlLang: 'ru-RU',
    labelEn: 'Dmitry · Male',
    labelZh: 'Dmitry · 男聲',
    gender: 'male',
  },
]

export const UK_VOICES: TtsVoiceOption[] = [
  {
    id: 'uk-UA-PolinaNeural',
    lang: 'uk',
    xmlLang: 'uk-UA',
    labelEn: 'Polina · Female',
    labelZh: 'Polina · 女聲',
    gender: 'female',
  },
  {
    id: 'uk-UA-OstapNeural',
    lang: 'uk',
    xmlLang: 'uk-UA',
    labelEn: 'Ostap · Male',
    labelZh: 'Ostap · 男聲',
    gender: 'male',
  },
]

export const HE_VOICES: TtsVoiceOption[] = [
  {
    id: 'he-IL-HilaNeural',
    lang: 'he',
    xmlLang: 'he-IL',
    labelEn: 'Hila · Female',
    labelZh: 'Hila · 女聲',
    gender: 'female',
  },
  {
    id: 'he-IL-AvriNeural',
    lang: 'he',
    xmlLang: 'he-IL',
    labelEn: 'Avri · Male',
    labelZh: 'Avri · 男聲',
    gender: 'male',
  },
]

export const FA_VOICES: TtsVoiceOption[] = [
  {
    id: 'fa-IR-DilaraNeural',
    lang: 'fa',
    xmlLang: 'fa-IR',
    labelEn: 'Dilara · Female',
    labelZh: 'Dilara · 女聲',
    gender: 'female',
  },
  {
    id: 'fa-IR-FaridNeural',
    lang: 'fa',
    xmlLang: 'fa-IR',
    labelEn: 'Farid · Male',
    labelZh: 'Farid · 男聲',
    gender: 'male',
  },
]

export const UR_VOICES: TtsVoiceOption[] = [
  {
    id: 'ur-IN-GulNeural',
    lang: 'ur',
    xmlLang: 'ur-IN',
    labelEn: 'Gul · Female',
    labelZh: 'Gul · 女聲',
    gender: 'female',
  },
  {
    id: 'ur-IN-SalmanNeural',
    lang: 'ur',
    xmlLang: 'ur-IN',
    labelEn: 'Salman · Male',
    labelZh: 'Salman · 男聲',
    gender: 'male',
  },
]

export const CMN_VOICES: TtsVoiceOption[] = [
  {
    id: 'zh-CN-XiaoxiaoNeural',
    lang: 'cmn',
    xmlLang: 'zh-CN',
    labelEn: 'Xiaoxiao · Female',
    labelZh: '晓晓 · 女声',
    gender: 'female',
  },
  {
    id: 'zh-CN-YunxiNeural',
    lang: 'cmn',
    xmlLang: 'zh-CN',
    labelEn: 'Yunxi · Male',
    labelZh: '云希 · 男声',
    gender: 'male',
  },
]

export const WUU_VOICES: TtsVoiceOption[] = [
  {
    id: 'wuu-CN-XiaotongNeural',
    lang: 'wuu',
    xmlLang: 'wuu-CN',
    labelEn: 'Xiaotong · Female',
    labelZh: '晓彤 · 女声',
    gender: 'female',
  },
  {
    id: 'wuu-CN-YunzheNeural',
    lang: 'wuu',
    xmlLang: 'wuu-CN',
    labelEn: 'Yunzhe · Male',
    labelZh: '云哲 · 男声',
    gender: 'male',
  },
]

export const SICHUAN_VOICES: TtsVoiceOption[] = [
  {
    id: 'zh-CN-sichuan-YunxiNeural',
    lang: 'sichuan',
    xmlLang: 'zh-CN-sichuan',
    labelEn: 'Yunxi · Chengdu Male',
    labelZh: '云希 · 成都男声',
    gender: 'male',
  },
]

const YUE_SET = new Set(YUE_VOICES.map((v) => v.id))
const EN_SET = new Set(EN_VOICES.map((v) => v.id))
const CMN_SET = new Set(CMN_VOICES.map((v) => v.id))
const WUU_SET = new Set(WUU_VOICES.map((v) => v.id))
const SICHUAN_SET = new Set(SICHUAN_VOICES.map((v) => v.id))
const TL_SET = new Set(TL_VOICES.map((v) => v.id))
const ES_SET = new Set(ES_VOICES.map((v) => v.id))
const ES_ES_SET = new Set(ES_ES_VOICES.map((v) => v.id))
const VI_SET = new Set(VI_VOICES.map((v) => v.id))
const TH_SET = new Set(TH_VOICES.map((v) => v.id))
const LO_SET = new Set(LO_VOICES.map((v) => v.id))
const KO_SET = new Set(KO_VOICES.map((v) => v.id))
const JA_SET = new Set(JA_VOICES.map((v) => v.id))
const ID_SET = new Set(ID_VOICES.map((v) => v.id))
const MS_SET = new Set(MS_VOICES.map((v) => v.id))
const PT_SET = new Set(PT_VOICES.map((v) => v.id))
const FR_SET = new Set(FR_VOICES.map((v) => v.id))
const HI_SET = new Set(HI_VOICES.map((v) => v.id))
const KM_SET = new Set(KM_VOICES.map((v) => v.id))
const MY_SET = new Set(MY_VOICES.map((v) => v.id))
const JV_SET = new Set(JV_VOICES.map((v) => v.id))
const IT_SET = new Set(IT_VOICES.map((v) => v.id))
const DE_SET = new Set(DE_VOICES.map((v) => v.id))
const NL_SET = new Set(NL_VOICES.map((v) => v.id))
const AR_SET = new Set(AR_VOICES.map((v) => v.id))
const ARSA_SET = new Set(ARSA_VOICES.map((v) => v.id))
const TA_SET = new Set(TA_VOICES.map((v) => v.id))
const PTPT_SET = new Set(PTPT_VOICES.map((v) => v.id))
const TR_SET = new Set(TR_VOICES.map((v) => v.id))
const BN_SET = new Set(BN_VOICES.map((v) => v.id))
const TE_SET = new Set(TE_VOICES.map((v) => v.id))
const GU_SET = new Set(GU_VOICES.map((v) => v.id))
const KN_SET = new Set(KN_VOICES.map((v) => v.id))
const PL_SET = new Set(PL_VOICES.map((v) => v.id))
const RO_SET = new Set(RO_VOICES.map((v) => v.id))
const CS_SET = new Set(CS_VOICES.map((v) => v.id))
const EL_SET = new Set(EL_VOICES.map((v) => v.id))
const HU_SET = new Set(HU_VOICES.map((v) => v.id))
const SV_SET = new Set(SV_VOICES.map((v) => v.id))
const RU_SET = new Set(RU_VOICES.map((v) => v.id))
const UK_SET = new Set(UK_VOICES.map((v) => v.id))
const HE_SET = new Set(HE_VOICES.map((v) => v.id))
const FA_SET = new Set(FA_VOICES.map((v) => v.id))
const UR_SET = new Set(UR_VOICES.map((v) => v.id))
const ALL = new Map<string, TtsVoiceOption>(
  [
    ...YUE_VOICES,
    ...EN_VOICES,
    ...CMN_VOICES,
    ...WUU_VOICES,
    ...SICHUAN_VOICES,
    ...TL_VOICES,
    ...ES_VOICES,
    ...ES_ES_VOICES,
    ...VI_VOICES,
    ...TH_VOICES,
    ...LO_VOICES,
    ...KO_VOICES,
    ...JA_VOICES,
    ...ID_VOICES,
    ...MS_VOICES,
    ...PT_VOICES,
    ...FR_VOICES,
    ...HI_VOICES,
    ...KM_VOICES,
    ...MY_VOICES,
    ...JV_VOICES,
    ...IT_VOICES,
    ...DE_VOICES,
    ...NL_VOICES,
    ...AR_VOICES,
    ...ARSA_VOICES,
    ...TA_VOICES,
    ...PTPT_VOICES,
    ...TR_VOICES,
    ...BN_VOICES,
    ...TE_VOICES,
    ...GU_VOICES,
    ...KN_VOICES,
    ...PL_VOICES,
    ...RO_VOICES,
    ...CS_VOICES,
    ...EL_VOICES,
    ...HU_VOICES,
    ...SV_VOICES,
    ...RU_VOICES,
    ...UK_VOICES,
    ...HE_VOICES,
    ...FA_VOICES,
    ...UR_VOICES,
  ].map((v) => [v.id, v]),
)

export function isYueVoice(id: string): id is YueVoiceId {
  return YUE_SET.has(id as YueVoiceId)
}

export function isEnVoice(id: string): id is EnVoiceId {
  return EN_SET.has(id as EnVoiceId)
}

export function isCmnVoice(id: string): id is CmnVoiceId {
  return CMN_SET.has(id as CmnVoiceId)
}

export function isWuuVoice(id: string): id is WuuVoiceId {
  return WUU_SET.has(id as WuuVoiceId)
}

export function isSichuanVoice(id: string): id is SichuanVoiceId {
  return SICHUAN_SET.has(id as SichuanVoiceId)
}

export function isTlVoice(id: string): id is TlVoiceId {
  return TL_SET.has(id as TlVoiceId)
}

export function isEsVoice(id: string): id is EsVoiceId {
  return ES_SET.has(id as EsVoiceId)
}

export function isEsesVoice(id: string): id is EsesVoiceId {
  return ES_ES_SET.has(id as EsesVoiceId)
}

export function isViVoice(id: string): id is ViVoiceId {
  return VI_SET.has(id as ViVoiceId)
}

export function isThVoice(id: string): id is ThVoiceId {
  return TH_SET.has(id as ThVoiceId)
}

export function isLoVoice(id: string): id is LoVoiceId {
  return LO_SET.has(id as LoVoiceId)
}

export function isKoVoice(id: string): id is KoVoiceId {
  return KO_SET.has(id as KoVoiceId)
}

export function resolveYueVoice(id: string | null | undefined): YueVoiceId {
  return id && isYueVoice(id) ? id : DEFAULT_YUE_VOICE
}

export function resolveEnVoice(id: string | null | undefined): EnVoiceId {
  return id && isEnVoice(id) ? id : DEFAULT_EN_VOICE
}

export function resolveCmnVoice(id: string | null | undefined): CmnVoiceId {
  return id && isCmnVoice(id) ? id : DEFAULT_CMN_VOICE
}

export function resolveWuuVoice(id: string | null | undefined): WuuVoiceId {
  return id && isWuuVoice(id) ? id : DEFAULT_WUU_VOICE
}

export function resolveSichuanVoice(id: string | null | undefined): SichuanVoiceId {
  return id && isSichuanVoice(id) ? id : DEFAULT_SICHUAN_VOICE
}

export function resolveTlVoice(id: string | null | undefined): TlVoiceId {
  return id && isTlVoice(id) ? id : DEFAULT_TL_VOICE
}

export function resolveEsVoice(id: string | null | undefined): EsVoiceId {
  return id && isEsVoice(id) ? id : DEFAULT_ES_VOICE
}

export function resolveEsesVoice(id: string | null | undefined): EsesVoiceId {
  return id && isEsesVoice(id) ? id : DEFAULT_ESES_VOICE
}

export function resolveViVoice(id: string | null | undefined): ViVoiceId {
  return id && isViVoice(id) ? id : DEFAULT_VI_VOICE
}

export function resolveThVoice(id: string | null | undefined): ThVoiceId {
  return id && isThVoice(id) ? id : DEFAULT_TH_VOICE
}

export function resolveLoVoice(id: string | null | undefined): LoVoiceId {
  return id && isLoVoice(id) ? id : DEFAULT_LO_VOICE
}

export function resolveKoVoice(id: string | null | undefined): KoVoiceId {
  return id && isKoVoice(id) ? id : DEFAULT_KO_VOICE
}

export function isJaVoice(id: string): id is JaVoiceId {
  return JA_SET.has(id as JaVoiceId)
}

export function resolveJaVoice(id: string | null | undefined): JaVoiceId {
  return id && isJaVoice(id) ? id : DEFAULT_JA_VOICE
}

export function isIdVoice(id: string): id is IdVoiceId {
  return ID_SET.has(id as IdVoiceId)
}

export function resolveIdVoice(id: string | null | undefined): IdVoiceId {
  return id && isIdVoice(id) ? id : DEFAULT_ID_VOICE
}

export function isMsVoice(id: string): id is MsVoiceId {
  return MS_SET.has(id as MsVoiceId)
}

export function resolveMsVoice(id: string | null | undefined): MsVoiceId {
  return id && isMsVoice(id) ? id : DEFAULT_MS_VOICE
}

export function isPtVoice(id: string): id is PtVoiceId {
  return PT_SET.has(id as PtVoiceId)
}

export function resolvePtVoice(id: string | null | undefined): PtVoiceId {
  return id && isPtVoice(id) ? id : DEFAULT_PT_VOICE
}

export function isFrVoice(id: string): id is FrVoiceId {
  return FR_SET.has(id as FrVoiceId)
}

export function resolveFrVoice(id: string | null | undefined): FrVoiceId {
  return id && isFrVoice(id) ? id : DEFAULT_FR_VOICE
}

export function isHiVoice(id: string): id is HiVoiceId {
  return HI_SET.has(id as HiVoiceId)
}

export function resolveHiVoice(id: string | null | undefined): HiVoiceId {
  return id && isHiVoice(id) ? id : DEFAULT_HI_VOICE
}

export function isKmVoice(id: string): id is KmVoiceId {
  return KM_SET.has(id as KmVoiceId)
}

export function resolveKmVoice(id: string | null | undefined): KmVoiceId {
  return id && isKmVoice(id) ? id : DEFAULT_KM_VOICE
}

export function isMyVoice(id: string): id is MyVoiceId {
  return MY_SET.has(id as MyVoiceId)
}

export function resolveMyVoice(id: string | null | undefined): MyVoiceId {
  return id && isMyVoice(id) ? id : DEFAULT_MY_VOICE
}

export function isJvVoice(id: string): id is JvVoiceId {
  return JV_SET.has(id as JvVoiceId)
}

export function resolveJvVoice(id: string | null | undefined): JvVoiceId {
  return id && isJvVoice(id) ? id : DEFAULT_JV_VOICE
}

export function isItVoice(id: string): id is ItVoiceId {
  return IT_SET.has(id as ItVoiceId)
}

export function resolveItVoice(id: string | null | undefined): ItVoiceId {
  return id && isItVoice(id) ? id : DEFAULT_IT_VOICE
}

export function isDeVoice(id: string): id is DeVoiceId {
  return DE_SET.has(id as DeVoiceId)
}

export function resolveDeVoice(id: string | null | undefined): DeVoiceId {
  return id && isDeVoice(id) ? id : DEFAULT_DE_VOICE
}

export function isNlVoice(id: string): id is NlVoiceId {
  return NL_SET.has(id as NlVoiceId)
}

export function isArVoice(id: string): id is ArVoiceId {
  return AR_SET.has(id as ArVoiceId)
}

export function isArsaVoice(id: string): id is ArsaVoiceId {
  return ARSA_SET.has(id as ArsaVoiceId)
}

export function resolveNlVoice(id: string | null | undefined): NlVoiceId {
  return id && isNlVoice(id) ? id : DEFAULT_NL_VOICE
}

export function resolveArVoice(id: string | null | undefined): ArVoiceId {
  return id && isArVoice(id) ? id : DEFAULT_AR_VOICE
}

export function resolveArsaVoice(id: string | null | undefined): ArsaVoiceId {
  return id && isArsaVoice(id) ? id : DEFAULT_ARSA_VOICE
}

export function isTaVoice(id: string): id is TaVoiceId {
  return TA_SET.has(id as TaVoiceId)
}

export function resolveTaVoice(id: string | null | undefined): TaVoiceId {
  return id && isTaVoice(id) ? id : DEFAULT_TA_VOICE
}

export function isPtptVoice(id: string): id is PtptVoiceId {
  return PTPT_SET.has(id as PtptVoiceId)
}

export function resolvePtptVoice(id: string | null | undefined): PtptVoiceId {
  return id && isPtptVoice(id) ? id : DEFAULT_PTPT_VOICE
}

export function isTrVoice(id: string): id is TrVoiceId {
  return TR_SET.has(id as TrVoiceId)
}

export function resolveTrVoice(id: string | null | undefined): TrVoiceId {
  return id && isTrVoice(id) ? id : DEFAULT_TR_VOICE
}

export function isBnVoice(id: string): id is BnVoiceId {
  return BN_SET.has(id as BnVoiceId)
}
export function isTeVoice(id: string): id is TeVoiceId {
  return TE_SET.has(id as TeVoiceId)
}
export function isGuVoice(id: string): id is GuVoiceId {
  return GU_SET.has(id as GuVoiceId)
}
export function isKnVoice(id: string): id is KnVoiceId {
  return KN_SET.has(id as KnVoiceId)
}
export function isPlVoice(id: string): id is PlVoiceId {
  return PL_SET.has(id as PlVoiceId)
}
export function isRoVoice(id: string): id is RoVoiceId {
  return RO_SET.has(id as RoVoiceId)
}
export function isCsVoice(id: string): id is CsVoiceId {
  return CS_SET.has(id as CsVoiceId)
}
export function isElVoice(id: string): id is ElVoiceId {
  return EL_SET.has(id as ElVoiceId)
}
export function isHuVoice(id: string): id is HuVoiceId {
  return HU_SET.has(id as HuVoiceId)
}
export function isSvVoice(id: string): id is SvVoiceId {
  return SV_SET.has(id as SvVoiceId)
}
export function isRuVoice(id: string): id is RuVoiceId {
  return RU_SET.has(id as RuVoiceId)
}
export function isUkVoice(id: string): id is UkVoiceId {
  return UK_SET.has(id as UkVoiceId)
}
export function isHeVoice(id: string): id is HeVoiceId {
  return HE_SET.has(id as HeVoiceId)
}
export function isFaVoice(id: string): id is FaVoiceId {
  return FA_SET.has(id as FaVoiceId)
}
export function isUrVoice(id: string): id is UrVoiceId {
  return UR_SET.has(id as UrVoiceId)
}

export function resolveBnVoice(id: string | null | undefined): BnVoiceId {
  return id && isBnVoice(id) ? id : DEFAULT_BN_VOICE
}
export function resolveTeVoice(id: string | null | undefined): TeVoiceId {
  return id && isTeVoice(id) ? id : DEFAULT_TE_VOICE
}
export function resolveGuVoice(id: string | null | undefined): GuVoiceId {
  return id && isGuVoice(id) ? id : DEFAULT_GU_VOICE
}
export function resolveKnVoice(id: string | null | undefined): KnVoiceId {
  return id && isKnVoice(id) ? id : DEFAULT_KN_VOICE
}
export function resolvePlVoice(id: string | null | undefined): PlVoiceId {
  return id && isPlVoice(id) ? id : DEFAULT_PL_VOICE
}
export function resolveRoVoice(id: string | null | undefined): RoVoiceId {
  return id && isRoVoice(id) ? id : DEFAULT_RO_VOICE
}
export function resolveCsVoice(id: string | null | undefined): CsVoiceId {
  return id && isCsVoice(id) ? id : DEFAULT_CS_VOICE
}
export function resolveElVoice(id: string | null | undefined): ElVoiceId {
  return id && isElVoice(id) ? id : DEFAULT_EL_VOICE
}
export function resolveHuVoice(id: string | null | undefined): HuVoiceId {
  return id && isHuVoice(id) ? id : DEFAULT_HU_VOICE
}
export function resolveSvVoice(id: string | null | undefined): SvVoiceId {
  return id && isSvVoice(id) ? id : DEFAULT_SV_VOICE
}
export function resolveRuVoice(id: string | null | undefined): RuVoiceId {
  return id && isRuVoice(id) ? id : DEFAULT_RU_VOICE
}
export function resolveUkVoice(id: string | null | undefined): UkVoiceId {
  return id && isUkVoice(id) ? id : DEFAULT_UK_VOICE
}
export function resolveHeVoice(id: string | null | undefined): HeVoiceId {
  return id && isHeVoice(id) ? id : DEFAULT_HE_VOICE
}
export function resolveFaVoice(id: string | null | undefined): FaVoiceId {
  return id && isFaVoice(id) ? id : DEFAULT_FA_VOICE
}
export function resolveUrVoice(id: string | null | undefined): UrVoiceId {
  return id && isUrVoice(id) ? id : DEFAULT_UR_VOICE
}

export function voiceMeta(id: string): TtsVoiceOption | undefined {
  return ALL.get(id)
}

/** Pick Azure voice + xml:lang for a speak request. */
export function resolveSpeakVoice(
  lang: string,
  preferredYue?: string | null,
  preferredEn?: string | null,
  preferredCmn?: string | null,
  preferredWuu?: string | null,
  preferredSichuan?: string | null,
  preferredTl?: string | null,
  preferredEs?: string | null,
  override?: string | null,
  preferredVi?: string | null,
  preferredEses?: string | null,
  preferredTh?: string | null,
  preferredLo?: string | null,
  preferredKo?: string | null,
  preferredJa?: string | null,
  preferredId?: string | null,
  preferredMs?: string | null,
  preferredPt?: string | null,
  preferredFr?: string | null,
  preferredHi?: string | null,
  preferredKm?: string | null,
  preferredMy?: string | null,
  preferredJv?: string | null,
  preferredIt?: string | null,
  preferredDe?: string | null,
  preferredNl?: string | null,
  preferredAr?: string | null,
  preferredArsa?: string | null,
  preferredTa?: string | null,
  preferredPtpt?: string | null,
  preferredTr?: string | null,
  preferredBn?: string | null,
  preferredTe?: string | null,
  preferredGu?: string | null,
  preferredKn?: string | null,
  preferredPl?: string | null,
  preferredRo?: string | null,
  preferredCs?: string | null,
  preferredEl?: string | null,
  preferredHu?: string | null,
  preferredSv?: string | null,
  preferredRu?: string | null,
  preferredUk?: string | null,
  preferredHe?: string | null,
  preferredFa?: string | null,
  preferredUr?: string | null,
): { voice: string; xmlLang: string } {
  const isEn = lang === 'en' || lang === 'en-US' || lang === 'en-GB' || lang === 'en-AU'
  const isCmn = lang === 'cmn' || lang === 'zh-CN' || lang === 'zh-Hans'
  const isWuu = lang === 'wuu' || lang === 'wuu-CN'
  const isSichuan = lang === 'sichuan' || lang === 'zh-CN-sichuan'
  const isTl = lang === 'tl' || lang === 'fil' || lang === 'fil-PH'
  /** Mexican Spanish only — es-ES belongs to `isEses`, never here. */
  const isEs = lang === 'es' || lang === 'es-MX' || lang === 'es-mx'
  /** Peninsular / Castilian Spanish (Spain) — `eses` code, es-ES locale. */
  const isEses = lang === 'eses' || lang === 'es-ES' || lang === 'es-es'
  const isVi = lang === 'vi' || lang === 'vi-VN' || lang === 'vi-vn'
  const isTh = lang === 'th' || lang === 'th-TH' || lang === 'th-th'
  const isLo = lang === 'lo' || lang === 'lo-LA' || lang === 'lo-la'
  const isKo = lang === 'ko' || lang === 'ko-KR' || lang === 'ko-kr'
  const isJa = lang === 'ja' || lang === 'ja-JP' || lang === 'ja-jp'
  const isId = lang === 'id' || lang === 'id-ID' || lang === 'id-id'
  const isMs = lang === 'ms' || lang === 'ms-MY' || lang === 'ms-my'
  const isPt = lang === 'pt' || lang === 'pt-BR' || lang === 'pt-br'
  const isFr = lang === 'fr' || lang === 'fr-FR' || lang === 'fr-fr'
  const isHi = lang === 'hi' || lang === 'hi-IN' || lang === 'hi-in'
  const isKm = lang === 'km' || lang === 'km-KH' || lang === 'km-kh'
  const isMy = lang === 'my' || lang === 'my-MM' || lang === 'my-mm'
  const isJv = lang === 'jv' || lang === 'jv-ID' || lang === 'jv-id'
  const isIt = lang === 'it' || lang === 'it-IT' || lang === 'it-it'
  const isDe = lang === 'de' || lang === 'de-DE' || lang === 'de-de'
  const isNl = lang === 'nl' || lang === 'nl-NL' || lang === 'nl-nl'
  const isAr = lang === 'ar' || lang === 'ar-EG' || lang === 'ar-eg'
  const isArsa = lang === 'arsa' || lang === 'ar-SA' || lang === 'ar-sa'
  const isTa = lang === 'ta' || lang === 'ta-IN' || lang === 'ta-in'
  /** European Portuguese only — pt-BR belongs to `isPt`, never here. */
  const isPtpt = lang === 'ptpt' || lang === 'pt-PT' || lang === 'pt-pt'
  const isTr = lang === 'tr' || lang === 'tr-TR' || lang === 'tr-tr'
  const isBn = lang === 'bn' || lang === 'bn-IN' || lang === 'bn-in'
  const isTe = lang === 'te' || lang === 'te-IN' || lang === 'te-in'
  const isGu = lang === 'gu' || lang === 'gu-IN' || lang === 'gu-in'
  const isKn = lang === 'kn' || lang === 'kn-IN' || lang === 'kn-in'
  const isPl = lang === 'pl' || lang === 'pl-PL' || lang === 'pl-pl'
  const isRo = lang === 'ro' || lang === 'ro-RO' || lang === 'ro-ro'
  const isCs = lang === 'cs' || lang === 'cs-CZ' || lang === 'cs-cz'
  const isEl = lang === 'el' || lang === 'el-GR' || lang === 'el-gr'
  const isHu = lang === 'hu' || lang === 'hu-HU' || lang === 'hu-hu'
  const isSv = lang === 'sv' || lang === 'sv-SE' || lang === 'sv-se'
  const isRu = lang === 'ru' || lang === 'ru-RU' || lang === 'ru-ru'
  const isUk = lang === 'uk' || lang === 'uk-UA' || lang === 'uk-ua'
  const isHe = lang === 'he' || lang === 'he-IL' || lang === 'he-il'
  const isFa = lang === 'fa' || lang === 'fa-IR' || lang === 'fa-ir'
  const isUr = lang === 'ur' || lang === 'ur-IN' || lang === 'ur-in'
  if (override) {
    const meta = voiceMeta(override)
    if (meta) {
      if (isEn && meta.lang === 'en') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isCmn && meta.lang === 'cmn') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isWuu && meta.lang === 'wuu') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isSichuan && meta.lang === 'sichuan') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isTl && meta.lang === 'tl') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isEs && meta.lang === 'es') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isEses && meta.lang === 'eses') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isVi && meta.lang === 'vi') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isTh && meta.lang === 'th') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isLo && meta.lang === 'lo') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isKo && meta.lang === 'ko') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isJa && meta.lang === 'ja') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isId && meta.lang === 'id') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isMs && meta.lang === 'ms') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isPt && meta.lang === 'pt') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isFr && meta.lang === 'fr') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isHi && meta.lang === 'hi') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isKm && meta.lang === 'km') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isMy && meta.lang === 'my') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isJv && meta.lang === 'jv') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isIt && meta.lang === 'it') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isDe && meta.lang === 'de') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isNl && meta.lang === 'nl') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isAr && meta.lang === 'ar') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isArsa && meta.lang === 'arsa') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isTa && meta.lang === 'ta') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isPtpt && meta.lang === 'ptpt') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isTr && meta.lang === 'tr') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isBn && meta.lang === 'bn') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isTe && meta.lang === 'te') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isGu && meta.lang === 'gu') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isKn && meta.lang === 'kn') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isPl && meta.lang === 'pl') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isRo && meta.lang === 'ro') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isCs && meta.lang === 'cs') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isEl && meta.lang === 'el') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isHu && meta.lang === 'hu') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isSv && meta.lang === 'sv') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isRu && meta.lang === 'ru') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isUk && meta.lang === 'uk') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isHe && meta.lang === 'he') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isFa && meta.lang === 'fa') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isUr && meta.lang === 'ur') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (
        !isEn &&
        !isCmn &&
        !isWuu &&
        !isSichuan &&
        !isTl &&
        !isEs &&
        !isEses &&
        !isVi &&
        !isTh &&
        !isLo &&
        !isKo &&
        !isJa &&
        !isId &&
        !isMs &&
        !isPt &&
        !isFr &&
        !isHi &&
        !isKm &&
        !isMy &&
        !isJv &&
        !isIt &&
        !isDe &&
        !isNl &&
        !isAr &&
        !isArsa &&
        !isTa &&
        !isPtpt &&
        !isTr &&
        !isBn &&
        !isTe &&
        !isGu &&
        !isKn &&
        !isPl &&
        !isRo &&
        !isCs &&
        !isEl &&
        !isHu &&
        !isSv &&
        !isRu &&
        !isUk &&
        !isHe &&
        !isFa &&
        !isUr &&
        meta.lang === 'yue'
      ) {
        return { voice: meta.id, xmlLang: meta.xmlLang }
      }
    }
  }
  if (isEn) {
    const id = resolveEnVoice(preferredEn)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  if (isCmn) {
    const id = resolveCmnVoice(preferredCmn)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  if (isWuu) {
    const id = resolveWuuVoice(preferredWuu)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  if (isSichuan) {
    const id = resolveSichuanVoice(preferredSichuan)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  if (isTl) {
    const id = resolveTlVoice(preferredTl)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  if (isEses) {
    const id = resolveEsesVoice(preferredEses)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  if (isEs) {
    const id = resolveEsVoice(preferredEs)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  if (isVi) {
    const id = resolveViVoice(preferredVi)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  if (isTh) {
    const id = resolveThVoice(preferredTh)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  if (isLo) {
    const id = resolveLoVoice(preferredLo)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  if (isKo) {
    const id = resolveKoVoice(preferredKo)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  if (isJa) {
    const id = resolveJaVoice(preferredJa)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  if (isId) {
    const id = resolveIdVoice(preferredId)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  if (isMs) {
    const id = resolveMsVoice(preferredMs)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  if (isPt) {
    const id = resolvePtVoice(preferredPt)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  if (isFr) {
    const id = resolveFrVoice(preferredFr)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  if (isHi) {
    const id = resolveHiVoice(preferredHi)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  if (isKm) {
    const id = resolveKmVoice(preferredKm)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  if (isMy) {
    const id = resolveMyVoice(preferredMy)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  if (isJv) {
    const id = resolveJvVoice(preferredJv)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  if (isIt) {
    const id = resolveItVoice(preferredIt)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  if (isDe) {
    const id = resolveDeVoice(preferredDe)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  if (isNl) {
    const id = resolveNlVoice(preferredNl)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  if (isAr) {
    const id = resolveArVoice(preferredAr)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  if (isArsa) {
    const id = resolveArsaVoice(preferredArsa)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  if (isTa) {
    const id = resolveTaVoice(preferredTa)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  if (isPtpt) {
    const id = resolvePtptVoice(preferredPtpt)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  if (isTr) {
    const id = resolveTrVoice(preferredTr)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  if (isBn) {
    const id = resolveBnVoice(preferredBn)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  if (isTe) {
    const id = resolveTeVoice(preferredTe)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  if (isGu) {
    const id = resolveGuVoice(preferredGu)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  if (isKn) {
    const id = resolveKnVoice(preferredKn)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  if (isPl) {
    const id = resolvePlVoice(preferredPl)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  if (isRo) {
    const id = resolveRoVoice(preferredRo)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  if (isCs) {
    const id = resolveCsVoice(preferredCs)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  if (isEl) {
    const id = resolveElVoice(preferredEl)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  if (isHu) {
    const id = resolveHuVoice(preferredHu)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  if (isSv) {
    const id = resolveSvVoice(preferredSv)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  if (isRu) {
    const id = resolveRuVoice(preferredRu)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  if (isUk) {
    const id = resolveUkVoice(preferredUk)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  if (isHe) {
    const id = resolveHeVoice(preferredHe)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  if (isFa) {
    const id = resolveFaVoice(preferredFa)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  if (isUr) {
    const id = resolveUrVoice(preferredUr)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  const id = resolveYueVoice(preferredYue)
  return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
}

export const PREVIEW_YUE = '你好，歡迎使用粵譯。'
export const PREVIEW_EN = 'Hello — this is your English voice.'
export const PREVIEW_CMN = '你好，欢迎使用粤译。'
export const PREVIEW_WUU = '侬好，欢迎用沪语翻译。'
export const PREVIEW_SICHUAN = '你好，欢迎用四川话。'
export const PREVIEW_TL = 'Kumusta — ito ang Tagalog voice mo.'
export const PREVIEW_ES = 'Hola — esta es tu voz en español mexicano.'
export const PREVIEW_ESES = 'Hola, tío — esta es tu voz en español de España. ¡Mola!'
export const PREVIEW_VI = 'Xin chào — đây là giọng tiếng Việt của bạn.'
export const PREVIEW_TH = 'สวัสดี — นี่คือเสียงไทย'
export const PREVIEW_LO = 'ສະບາຍດີ — ນີ້ແມ່ນສຽງລາວ'
export const PREVIEW_KO = '안녕하세요 — 한국어 음성입니다.'
export const PREVIEW_JA = 'こんにちは — 日本語の音声です。'
export const PREVIEW_ID = 'Halo — ini suara Bahasa Indonesia Anda.'
export const PREVIEW_MS = 'Halo — ini suara Bahasa Melayu anda.'
export const PREVIEW_PT = 'Olá — esta é a sua voz em português do Brasil.'
export const PREVIEW_FR = 'Bonjour — voici votre voix en français.'
export const PREVIEW_HI = 'नमस्ते — यह आपकी हिंदी आवाज़ है।'
export const PREVIEW_KM = 'សួស្តី — នេះជាសំឡេងខ្មែររបស់អ្នក។'
export const PREVIEW_MY = 'မင်္ဂလာပါ — ဤသည်မှာ သင့်မြန်မာအသံဖြစ်သည်။'
export const PREVIEW_JV = 'Halo — iki swara Basa Jawa sampeyan.'
export const PREVIEW_IT = 'Ciao — questa è la tua voce in italiano.'
export const PREVIEW_DE = 'Hallo — das ist Ihre deutsche Stimme.'
export const PREVIEW_NL = 'Hallo — dit is je Nederlandse stem.'
export const PREVIEW_AR = 'أهلاً — ده صوتك بالعامية المصرية.'
export const PREVIEW_ARSA = 'مرحباً — هذا صوتك باللغة العربية الفصحى.'
export const PREVIEW_TA = 'வணக்கம் — இது உங்கள் தமிழ்க் குரல்.'
export const PREVIEW_PTPT = 'Olá — esta é a sua voz em português de Portugal.'
export const PREVIEW_TR = 'Merhaba — bu sizin Türkçe sesiniz.'
export const PREVIEW_BN = 'নমস্কার — এটি আপনার বাংলা কণ্ঠস্বর।'
export const PREVIEW_TE = 'నమస్కారం — ఇది మీ తెలుగు స్వరం.'
export const PREVIEW_GU = 'નમસ્તે — આ તમારો ગુજરાતી અવાજ છે.'
export const PREVIEW_KN = 'ನಮಸ್ಕಾರ — ಇದು ನಿಮ್ಮ ಕನ್ನಡ ಧ್ವನಿ.'
export const PREVIEW_PL = 'Cześć — to jest Twój polski głos.'
export const PREVIEW_RO = 'Bună — aceasta este vocea ta în limba română.'
export const PREVIEW_CS = 'Ahoj — tohle je tvůj český hlas.'
export const PREVIEW_EL = 'Γεια σας — αυτή είναι η ελληνική σας φωνή.'
export const PREVIEW_HU = 'Szia — ez a magyar hangod.'
export const PREVIEW_SV = 'Hej — det här är din svenska röst.'
export const PREVIEW_RU = 'Привет — это ваш русский голос.'
export const PREVIEW_UK = 'Привіт — це ваш український голос.'
export const PREVIEW_HE = 'שלום — זה הקול שלך בעברית.'
export const PREVIEW_FA = 'سلام — این صدای فارسی شماست.'
export const PREVIEW_UR = 'السلام علیکم — یہ آپ کی اردو آواز ہے۔'
