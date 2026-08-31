/** Curated Azure Neural TTS voices (mirrors apps/api/src/ttsVoices.ts). */

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
  labelEn: string
  labelZh: string
  gender: 'female' | 'male'
}

export const YUE_VOICES: TtsVoiceOption[] = [
  {
    id: 'zh-HK-HiuMaanNeural',
    lang: 'yue',
    labelEn: 'Hiu Maan · Female',
    labelZh: '曉曼 · 女聲',
    gender: 'female',
  },
  {
    id: 'zh-HK-HiuGaaiNeural',
    lang: 'yue',
    labelEn: 'Hiu Gaai · Female',
    labelZh: '曉佳 · 女聲',
    gender: 'female',
  },
  {
    id: 'zh-HK-WanLungNeural',
    lang: 'yue',
    labelEn: 'Wan Lung · Male',
    labelZh: '雲龍 · 男聲',
    gender: 'male',
  },
]

export const EN_VOICES: TtsVoiceOption[] = [
  {
    id: 'en-US-JennyNeural',
    lang: 'en',
    labelEn: 'Jenny · US Female',
    labelZh: 'Jenny · 美式女聲',
    gender: 'female',
  },
  {
    id: 'en-US-GuyNeural',
    lang: 'en',
    labelEn: 'Guy · US Male',
    labelZh: 'Guy · 美式男聲',
    gender: 'male',
  },
  {
    id: 'en-US-AriaNeural',
    lang: 'en',
    labelEn: 'Aria · US Female',
    labelZh: 'Aria · 美式女聲',
    gender: 'female',
  },
  {
    id: 'en-GB-SoniaNeural',
    lang: 'en',
    labelEn: 'Sonia · UK Female',
    labelZh: 'Sonia · 英式女聲',
    gender: 'female',
  },
  {
    id: 'en-GB-RyanNeural',
    lang: 'en',
    labelEn: 'Ryan · UK Male',
    labelZh: 'Ryan · 英式男聲',
    gender: 'male',
  },
  {
    id: 'en-AU-NatashaNeural',
    lang: 'en',
    labelEn: 'Natasha · AU Female',
    labelZh: 'Natasha · 澳式女聲',
    gender: 'female',
  },
]

const YUE_SET = new Set(YUE_VOICES.map((v) => v.id))
const EN_SET = new Set(EN_VOICES.map((v) => v.id))

export function resolveYueVoice(id: string | null | undefined): YueVoiceId {
  return id && YUE_SET.has(id as YueVoiceId) ? (id as YueVoiceId) : DEFAULT_YUE_VOICE
}

export function resolveEnVoice(id: string | null | undefined): EnVoiceId {
  return id && EN_SET.has(id as EnVoiceId) ? (id as EnVoiceId) : DEFAULT_EN_VOICE
}

const STORAGE_YUE = 'yue-tts-voice-yue'
const STORAGE_EN = 'yue-tts-voice-en'

export function readLocalYueVoice(): YueVoiceId {
  if (typeof window === 'undefined') return DEFAULT_YUE_VOICE
  try {
    return resolveYueVoice(localStorage.getItem(STORAGE_YUE))
  } catch {
    return DEFAULT_YUE_VOICE
  }
}

export function readLocalEnVoice(): EnVoiceId {
  if (typeof window === 'undefined') return DEFAULT_EN_VOICE
  try {
    return resolveEnVoice(localStorage.getItem(STORAGE_EN))
  } catch {
    return DEFAULT_EN_VOICE
  }
}

export function writeLocalYueVoice(id: YueVoiceId) {
  try {
    localStorage.setItem(STORAGE_YUE, resolveYueVoice(id))
  } catch {
    /* ignore */
  }
}

export function writeLocalEnVoice(id: EnVoiceId) {
  try {
    localStorage.setItem(STORAGE_EN, resolveEnVoice(id))
  } catch {
    /* ignore */
  }
}

export const PREVIEW_YUE = '你好，歡迎使用粵譯。'
export const PREVIEW_EN = 'Hello — this is your English voice.'
