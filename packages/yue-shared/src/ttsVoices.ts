/** Curated Azure Neural TTS voices (API + web). */

export const DEFAULT_YUE_VOICE = 'zh-HK-HiuMaanNeural'
export const DEFAULT_EN_VOICE = 'en-US-JennyNeural'
export const DEFAULT_CMN_VOICE = 'zh-CN-XiaoxiaoNeural'
/** Shanghainese (Wu) — Azure locale wuu-CN. */
export const DEFAULT_WUU_VOICE = 'wuu-CN-XiaotongNeural'
export const DEFAULT_TL_VOICE = 'fil-PH-BlessicaNeural'

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

export type TlVoiceId = 'fil-PH-BlessicaNeural' | 'fil-PH-AngeloNeural'

export type TtsVoiceId = YueVoiceId | EnVoiceId | CmnVoiceId | WuuVoiceId | TlVoiceId

export type TtsVoiceOption = {
  id: TtsVoiceId
  lang: 'yue' | 'en' | 'cmn' | 'wuu' | 'tl'
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

const YUE_SET = new Set(YUE_VOICES.map((v) => v.id))
const EN_SET = new Set(EN_VOICES.map((v) => v.id))
const CMN_SET = new Set(CMN_VOICES.map((v) => v.id))
const WUU_SET = new Set(WUU_VOICES.map((v) => v.id))
const TL_SET = new Set(TL_VOICES.map((v) => v.id))
const ALL = new Map<string, TtsVoiceOption>(
  [...YUE_VOICES, ...EN_VOICES, ...CMN_VOICES, ...WUU_VOICES, ...TL_VOICES].map((v) => [v.id, v]),
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

export function isTlVoice(id: string): id is TlVoiceId {
  return TL_SET.has(id as TlVoiceId)
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

export function resolveTlVoice(id: string | null | undefined): TlVoiceId {
  return id && isTlVoice(id) ? id : DEFAULT_TL_VOICE
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
  preferredTl?: string | null,
  override?: string | null,
): { voice: string; xmlLang: string } {
  const isEn = lang === 'en' || lang === 'en-US' || lang === 'en-GB' || lang === 'en-AU'
  const isCmn = lang === 'cmn' || lang === 'zh-CN' || lang === 'zh-Hans'
  const isWuu = lang === 'wuu' || lang === 'wuu-CN'
  const isTl = lang === 'tl' || lang === 'fil' || lang === 'fil-PH'
  if (override) {
    const meta = voiceMeta(override)
    if (meta) {
      if (isEn && meta.lang === 'en') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isCmn && meta.lang === 'cmn') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isWuu && meta.lang === 'wuu') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (isTl && meta.lang === 'tl') return { voice: meta.id, xmlLang: meta.xmlLang }
      if (!isEn && !isCmn && !isWuu && !isTl && meta.lang === 'yue') {
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
  if (isTl) {
    const id = resolveTlVoice(preferredTl)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  const id = resolveYueVoice(preferredYue)
  return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
}

export const PREVIEW_YUE = '你好，歡迎使用粵譯。'
export const PREVIEW_EN = 'Hello — this is your English voice.'
export const PREVIEW_CMN = '你好，欢迎使用粤译。'
export const PREVIEW_WUU = '侬好，欢迎用沪语翻译。'
export const PREVIEW_TL = 'Kumusta — ito ang Tagalog voice mo.'
