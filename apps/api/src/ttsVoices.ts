/** Curated Azure Neural TTS voices for JyutTranslate. */

export const DEFAULT_YUE_VOICE = 'zh-HK-HiuMaanNeural'
export const DEFAULT_EN_VOICE = 'en-US-JennyNeural'

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

export type TtsVoiceId = YueVoiceId | EnVoiceId

export type TtsVoiceOption = {
  id: TtsVoiceId
  lang: 'yue' | 'en'
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

const YUE_SET = new Set(YUE_VOICES.map((v) => v.id))
const EN_SET = new Set(EN_VOICES.map((v) => v.id))
const ALL = new Map<string, TtsVoiceOption>(
  [...YUE_VOICES, ...EN_VOICES].map((v) => [v.id, v]),
)

export function isYueVoice(id: string): id is YueVoiceId {
  return YUE_SET.has(id as YueVoiceId)
}

export function isEnVoice(id: string): id is EnVoiceId {
  return EN_SET.has(id as EnVoiceId)
}

export function resolveYueVoice(id: string | null | undefined): YueVoiceId {
  return id && isYueVoice(id) ? id : DEFAULT_YUE_VOICE
}

export function resolveEnVoice(id: string | null | undefined): EnVoiceId {
  return id && isEnVoice(id) ? id : DEFAULT_EN_VOICE
}

export function voiceMeta(id: string): TtsVoiceOption | undefined {
  return ALL.get(id)
}

/** Pick Azure voice + xml:lang for a speak request. */
export function resolveSpeakVoice(
  lang: string,
  preferredYue?: string | null,
  preferredEn?: string | null,
  override?: string | null,
): { voice: string; xmlLang: string } {
  const isEn = lang === 'en' || lang === 'en-US' || lang === 'en-GB' || lang === 'en-AU'
  if (override) {
    const meta = voiceMeta(override)
    if (meta) {
      // Only honor override if it matches the speak language family.
      if (isEn ? meta.lang === 'en' : meta.lang === 'yue') {
        return { voice: meta.id, xmlLang: meta.xmlLang }
      }
    }
  }
  if (isEn) {
    const id = resolveEnVoice(preferredEn)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  const id = resolveYueVoice(preferredYue)
  return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
}
