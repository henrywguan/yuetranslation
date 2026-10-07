/**
 * Web TTS voice helpers — catalog lives in `@jyut/shared/ttsVoices`.
 * LocalStorage prefs stay client-only here.
 */
export {
  DEFAULT_YUE_VOICE,
  DEFAULT_EN_VOICE,
  DEFAULT_CMN_VOICE,
  DEFAULT_WUU_VOICE,
  DEFAULT_SICHUAN_VOICE,
  DEFAULT_TL_VOICE,
  DEFAULT_ES_VOICE,
  DEFAULT_ESES_VOICE,
  DEFAULT_VI_VOICE,
  DEFAULT_TH_VOICE,
  DEFAULT_LO_VOICE,
  DEFAULT_KO_VOICE,
  DEFAULT_JA_VOICE,
  DEFAULT_ID_VOICE,
  DEFAULT_MS_VOICE,
  DEFAULT_PT_VOICE,
  DEFAULT_FR_VOICE,
  DEFAULT_HI_VOICE,
  DEFAULT_KM_VOICE,
  DEFAULT_MY_VOICE,
  DEFAULT_JV_VOICE,
  DEFAULT_IT_VOICE,
  DEFAULT_DE_VOICE,
  DEFAULT_NL_VOICE,
  YUE_VOICES,
  EN_VOICES,
  CMN_VOICES,
  WUU_VOICES,
  SICHUAN_VOICES,
  TL_VOICES,
  ES_VOICES,
  ES_ES_VOICES,
  VI_VOICES,
  TH_VOICES,
  LO_VOICES,
  KO_VOICES,
  JA_VOICES,
  ID_VOICES,
  MS_VOICES,
  PT_VOICES,
  FR_VOICES,
  HI_VOICES,
  KM_VOICES,
  MY_VOICES,
  JV_VOICES,
  IT_VOICES,
  DE_VOICES,
  NL_VOICES,
  PREVIEW_YUE,
  PREVIEW_EN,
  PREVIEW_CMN,
  PREVIEW_WUU,
  PREVIEW_SICHUAN,
  PREVIEW_TL,
  PREVIEW_ES,
  PREVIEW_ESES,
  PREVIEW_VI,
  PREVIEW_TH,
  PREVIEW_LO,
  PREVIEW_KO,
  PREVIEW_JA,
  PREVIEW_ID,
  PREVIEW_MS,
  PREVIEW_PT,
  PREVIEW_FR,
  PREVIEW_HI,
  PREVIEW_KM,
  PREVIEW_MY,
  PREVIEW_JV,
  PREVIEW_IT,
  PREVIEW_DE,
  PREVIEW_NL,
  resolveYueVoice,
  resolveEnVoice,
  resolveCmnVoice,
  resolveWuuVoice,
  resolveSichuanVoice,
  resolveTlVoice,
  resolveEsVoice,
  resolveEsesVoice,
  resolveViVoice,
  resolveThVoice,
  resolveLoVoice,
  resolveKoVoice,
  resolveJaVoice,
  resolveIdVoice,
  resolveMsVoice,
  resolvePtVoice,
  resolveFrVoice,
  resolveHiVoice,
  resolveKmVoice,
  resolveMyVoice,
  resolveJvVoice,
  resolveItVoice,
  resolveDeVoice,
  resolveNlVoice,
  isYueVoice,
  isEnVoice,
  isCmnVoice,
  isWuuVoice,
  isSichuanVoice,
  isTlVoice,
  isEsVoice,
  isEsesVoice,
  isViVoice,
  isThVoice,
  isLoVoice,
  isKoVoice,
  isJaVoice,
  isIdVoice,
  isMsVoice,
  isPtVoice,
  isFrVoice,
  isHiVoice,
  isKmVoice,
  isMyVoice,
  isJvVoice,
  isItVoice,
  isDeVoice,
  isNlVoice,
  voiceMeta,
  type YueVoiceId,
  type EnVoiceId,
  type CmnVoiceId,
  type WuuVoiceId,
  type SichuanVoiceId,
  type TlVoiceId,
  type EsVoiceId,
  type EsesVoiceId,
  type ViVoiceId,
  type ThVoiceId,
  type LoVoiceId,
  type KoVoiceId,
  type JaVoiceId,
  type IdVoiceId,
  type MsVoiceId,
  type PtVoiceId,
  type FrVoiceId,
  type HiVoiceId,
  type KmVoiceId,
  type MyVoiceId,
  type JvVoiceId,
  type ItVoiceId,
  type DeVoiceId,
  type NlVoiceId,
  type TtsVoiceId,
  type TtsVoiceOption,
} from '@jyut/shared/ttsVoices'

import {
  DEFAULT_CMN_VOICE,
  DEFAULT_TL_VOICE,
  DEFAULT_ES_VOICE,
  DEFAULT_ESES_VOICE,
  DEFAULT_VI_VOICE,
  DEFAULT_TH_VOICE,
  DEFAULT_LO_VOICE,
  DEFAULT_KO_VOICE,
  DEFAULT_JA_VOICE,
  DEFAULT_ID_VOICE,
  DEFAULT_MS_VOICE,
  DEFAULT_PT_VOICE,
  DEFAULT_FR_VOICE,
  DEFAULT_HI_VOICE,
  DEFAULT_KM_VOICE,
  DEFAULT_MY_VOICE,
  DEFAULT_JV_VOICE,
  DEFAULT_IT_VOICE,
  DEFAULT_DE_VOICE,
  DEFAULT_NL_VOICE,
  DEFAULT_EN_VOICE,
  DEFAULT_YUE_VOICE,
  DEFAULT_WUU_VOICE,
  DEFAULT_SICHUAN_VOICE,
  resolveCmnVoice,
  resolveTlVoice,
  resolveEsVoice,
  resolveEsesVoice,
  resolveViVoice,
  resolveThVoice,
  resolveLoVoice,
  resolveKoVoice,
  resolveJaVoice,
  resolveIdVoice,
  resolveMsVoice,
  resolvePtVoice,
  resolveFrVoice,
  resolveHiVoice,
  resolveKmVoice,
  resolveMyVoice,
  resolveJvVoice,
  resolveItVoice,
  resolveDeVoice,
  resolveNlVoice,
  resolveEnVoice,
  resolveYueVoice,
  resolveWuuVoice,
  resolveSichuanVoice,
  voiceMeta,
  type CmnVoiceId,
  type TlVoiceId,
  type EsVoiceId,
  type EsesVoiceId,
  type ViVoiceId,
  type ThVoiceId,
  type LoVoiceId,
  type KoVoiceId,
  type JaVoiceId,
  type IdVoiceId,
  type MsVoiceId,
  type PtVoiceId,
  type FrVoiceId,
  type HiVoiceId,
  type KmVoiceId,
  type MyVoiceId,
  type JvVoiceId,
  type ItVoiceId,
  type DeVoiceId,
  type NlVoiceId,
  type EnVoiceId,
  type YueVoiceId,
  type WuuVoiceId,
  type SichuanVoiceId,
} from '@jyut/shared/ttsVoices'

const STORAGE_YUE = 'yue-tts-voice-yue'
const STORAGE_EN = 'yue-tts-voice-en'
const STORAGE_CMN = 'yue-tts-voice-cmn'
const STORAGE_WUU = 'yue-tts-voice-wuu'
const STORAGE_SICHUAN = 'yue-tts-voice-sichuan'
const STORAGE_TL = 'yue-tts-voice-tl'
const STORAGE_ES = 'yue-tts-voice-es'
const STORAGE_ESES = 'yue-tts-voice-eses'
const STORAGE_VI = 'yue-tts-voice-vi'
const STORAGE_TH = 'yue-tts-voice-th'
const STORAGE_LO = 'yue-tts-voice-lo'
const STORAGE_KO = 'yue-tts-voice-ko'
const STORAGE_JA = 'yue-tts-voice-ja'
const STORAGE_ID = 'yue-tts-voice-id'
const STORAGE_MS = 'yue-tts-voice-ms'
const STORAGE_PT = 'yue-tts-voice-pt'
const STORAGE_FR = 'yue-tts-voice-fr'
const STORAGE_HI = 'yue-tts-voice-hi'
const STORAGE_KM = 'yue-tts-voice-km'
const STORAGE_MY = 'yue-tts-voice-my'
const STORAGE_JV = 'yue-tts-voice-jv'
const STORAGE_IT = 'yue-tts-voice-it'
const STORAGE_DE = 'yue-tts-voice-de'
const STORAGE_NL = 'yue-tts-voice-nl'


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

export function readLocalCmnVoice(): CmnVoiceId {
  if (typeof window === 'undefined') return DEFAULT_CMN_VOICE
  try {
    return resolveCmnVoice(localStorage.getItem(STORAGE_CMN))
  } catch {
    return DEFAULT_CMN_VOICE
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

export function writeLocalCmnVoice(id: CmnVoiceId) {
  try {
    localStorage.setItem(STORAGE_CMN, resolveCmnVoice(id))
  } catch {
    /* ignore */
  }
}

export function readLocalTlVoice(): TlVoiceId {
  if (typeof window === 'undefined') return DEFAULT_TL_VOICE
  try {
    return resolveTlVoice(localStorage.getItem(STORAGE_TL))
  } catch {
    return DEFAULT_TL_VOICE
  }
}

export function writeLocalTlVoice(id: TlVoiceId) {
  try {
    localStorage.setItem(STORAGE_TL, resolveTlVoice(id))
  } catch {
    /* ignore */
  }
}


/** Short label for hub summary (first segment before ·). */
export function readLocalEsVoice(): EsVoiceId {
  if (typeof window === 'undefined') return DEFAULT_ES_VOICE
  try {
    return resolveEsVoice(localStorage.getItem(STORAGE_ES))
  } catch {
    return DEFAULT_ES_VOICE
  }
}

export function writeLocalEsVoice(id: EsVoiceId) {
  try {
    localStorage.setItem(STORAGE_ES, resolveEsVoice(id))
  } catch {
    /* ignore */
  }
}

/** Peninsular / Castilian Spanish (Spain) — `eses` code, never Mexico. */
export function readLocalEsesVoice(): EsesVoiceId {
  if (typeof window === 'undefined') return DEFAULT_ESES_VOICE
  try {
    return resolveEsesVoice(localStorage.getItem(STORAGE_ESES))
  } catch {
    return DEFAULT_ESES_VOICE
  }
}

export function writeLocalEsesVoice(id: EsesVoiceId) {
  try {
    localStorage.setItem(STORAGE_ESES, resolveEsesVoice(id))
  } catch {
    /* ignore */
  }
}

export function readLocalViVoice(): ViVoiceId {
  if (typeof window === 'undefined') return DEFAULT_VI_VOICE
  try {
    return resolveViVoice(localStorage.getItem(STORAGE_VI))
  } catch {
    return DEFAULT_VI_VOICE
  }
}

export function writeLocalViVoice(id: ViVoiceId) {
  try {
    localStorage.setItem(STORAGE_VI, resolveViVoice(id))
  } catch {
    /* ignore */
  }
}

export function readLocalThVoice(): ThVoiceId {
  if (typeof window === 'undefined') return DEFAULT_TH_VOICE
  try {
    return resolveThVoice(localStorage.getItem(STORAGE_TH))
  } catch {
    return DEFAULT_TH_VOICE
  }
}

export function writeLocalThVoice(id: ThVoiceId) {
  try {
    localStorage.setItem(STORAGE_TH, resolveThVoice(id))
  } catch {
    /* ignore */
  }
}

export function readLocalLoVoice(): LoVoiceId {
  if (typeof window === 'undefined') return DEFAULT_LO_VOICE
  try {
    return resolveLoVoice(localStorage.getItem(STORAGE_LO))
  } catch {
    return DEFAULT_LO_VOICE
  }
}

export function writeLocalLoVoice(id: LoVoiceId) {
  try {
    localStorage.setItem(STORAGE_LO, resolveLoVoice(id))
  } catch {
    /* ignore */
  }
}

export function readLocalKoVoice(): KoVoiceId {
  if (typeof window === 'undefined') return DEFAULT_KO_VOICE
  try {
    return resolveKoVoice(localStorage.getItem(STORAGE_KO))
  } catch {
    return DEFAULT_KO_VOICE
  }
}

export function writeLocalKoVoice(id: KoVoiceId) {
  try {
    localStorage.setItem(STORAGE_KO, resolveKoVoice(id))
  } catch {
    /* ignore */
  }
}

export function readLocalJaVoice(): JaVoiceId {
  if (typeof window === 'undefined') return DEFAULT_JA_VOICE
  try {
    return resolveJaVoice(localStorage.getItem(STORAGE_JA))
  } catch {
    return DEFAULT_JA_VOICE
  }
}

export function writeLocalJaVoice(id: JaVoiceId) {
  try {
    localStorage.setItem(STORAGE_JA, resolveJaVoice(id))
  } catch {
    /* ignore */
  }
}

export function readLocalIdVoice(): IdVoiceId {
  if (typeof window === 'undefined') return DEFAULT_ID_VOICE
  try {
    return resolveIdVoice(localStorage.getItem(STORAGE_ID))
  } catch {
    return DEFAULT_ID_VOICE
  }
}

export function writeLocalIdVoice(id: IdVoiceId) {
  try {
    localStorage.setItem(STORAGE_ID, resolveIdVoice(id))
  } catch {
    /* ignore */
  }
}

export function readLocalMsVoice(): MsVoiceId {
  if (typeof window === 'undefined') return DEFAULT_MS_VOICE
  try {
    return resolveMsVoice(localStorage.getItem(STORAGE_MS))
  } catch {
    return DEFAULT_MS_VOICE
  }
}

export function writeLocalMsVoice(id: MsVoiceId) {
  try {
    localStorage.setItem(STORAGE_MS, resolveMsVoice(id))
  } catch {
    /* ignore */
  }
}

export function readLocalPtVoice(): PtVoiceId {
  if (typeof window === 'undefined') return DEFAULT_PT_VOICE
  try {
    return resolvePtVoice(localStorage.getItem(STORAGE_PT))
  } catch {
    return DEFAULT_PT_VOICE
  }
}

export function writeLocalPtVoice(id: PtVoiceId) {
  try {
    localStorage.setItem(STORAGE_PT, resolvePtVoice(id))
  } catch {
    /* ignore */
  }
}

export function readLocalFrVoice(): FrVoiceId {
  if (typeof window === 'undefined') return DEFAULT_FR_VOICE
  try {
    return resolveFrVoice(localStorage.getItem(STORAGE_FR))
  } catch {
    return DEFAULT_FR_VOICE
  }
}

export function writeLocalFrVoice(id: FrVoiceId) {
  try {
    localStorage.setItem(STORAGE_FR, resolveFrVoice(id))
  } catch {
    /* ignore */
  }
}

export function readLocalHiVoice(): HiVoiceId {
  if (typeof window === 'undefined') return DEFAULT_HI_VOICE
  try {
    return resolveHiVoice(localStorage.getItem(STORAGE_HI))
  } catch {
    return DEFAULT_HI_VOICE
  }
}

export function writeLocalHiVoice(id: HiVoiceId) {
  try {
    localStorage.setItem(STORAGE_HI, resolveHiVoice(id))
  } catch {
    /* ignore */
  }
}

export function readLocalKmVoice(): KmVoiceId {
  if (typeof window === 'undefined') return DEFAULT_KM_VOICE
  try {
    return resolveKmVoice(localStorage.getItem(STORAGE_KM))
  } catch {
    return DEFAULT_KM_VOICE
  }
}

export function writeLocalKmVoice(id: KmVoiceId) {
  try {
    localStorage.setItem(STORAGE_KM, resolveKmVoice(id))
  } catch {
    /* ignore */
  }
}

export function readLocalMyVoice(): MyVoiceId {
  if (typeof window === 'undefined') return DEFAULT_MY_VOICE
  try {
    return resolveMyVoice(localStorage.getItem(STORAGE_MY))
  } catch {
    return DEFAULT_MY_VOICE
  }
}

export function writeLocalMyVoice(id: MyVoiceId) {
  try {
    localStorage.setItem(STORAGE_MY, resolveMyVoice(id))
  } catch {
    /* ignore */
  }
}

export function readLocalJvVoice(): JvVoiceId {
  if (typeof window === 'undefined') return DEFAULT_JV_VOICE
  try {
    return resolveJvVoice(localStorage.getItem(STORAGE_JV))
  } catch {
    return DEFAULT_JV_VOICE
  }
}

export function writeLocalJvVoice(id: JvVoiceId) {
  try {
    localStorage.setItem(STORAGE_JV, resolveJvVoice(id))
  } catch {
    /* ignore */
  }
}

export function readLocalItVoice(): ItVoiceId {
  if (typeof window === 'undefined') return DEFAULT_IT_VOICE
  try {
    return resolveItVoice(localStorage.getItem(STORAGE_IT))
  } catch {
    return DEFAULT_IT_VOICE
  }
}

export function writeLocalItVoice(id: ItVoiceId) {
  try {
    localStorage.setItem(STORAGE_IT, resolveItVoice(id))
  } catch {
    /* ignore */
  }
}

export function readLocalDeVoice(): DeVoiceId {
  if (typeof window === 'undefined') return DEFAULT_DE_VOICE
  try {
    return resolveDeVoice(localStorage.getItem(STORAGE_DE))
  } catch {
    return DEFAULT_DE_VOICE
  }
}

export function writeLocalDeVoice(id: DeVoiceId) {
  try {
    localStorage.setItem(STORAGE_DE, resolveDeVoice(id))
  } catch {
    /* ignore */
  }
}

export function readLocalNlVoice(): NlVoiceId {
  if (typeof window === 'undefined') return DEFAULT_NL_VOICE
  try {
    return resolveNlVoice(localStorage.getItem(STORAGE_NL))
  } catch {
    return DEFAULT_NL_VOICE
  }
}

export function writeLocalNlVoice(id: NlVoiceId) {
  try {
    localStorage.setItem(STORAGE_NL, resolveNlVoice(id))
  } catch {
    /* ignore */
  }
}

export function voiceShortLabel(id: string): string {
  const meta = voiceMeta(id)
  if (!meta) return id
  return meta.labelEn.split('·')[0]?.trim() || meta.labelEn
}

export function readLocalWuuVoice(): WuuVoiceId {
  if (typeof window === 'undefined') return DEFAULT_WUU_VOICE
  try {
    return resolveWuuVoice(localStorage.getItem(STORAGE_WUU))
  } catch {
    return DEFAULT_WUU_VOICE
  }
}

export function writeLocalWuuVoice(id: WuuVoiceId) {
  try {
    localStorage.setItem(STORAGE_WUU, resolveWuuVoice(id))
  } catch {
    /* ignore */
  }
}

export function readLocalSichuanVoice(): SichuanVoiceId {
  if (typeof window === 'undefined') return DEFAULT_SICHUAN_VOICE
  try {
    return resolveSichuanVoice(localStorage.getItem(STORAGE_SICHUAN))
  } catch {
    return DEFAULT_SICHUAN_VOICE
  }
}

export function writeLocalSichuanVoice(id: SichuanVoiceId) {
  try {
    localStorage.setItem(STORAGE_SICHUAN, resolveSichuanVoice(id))
  } catch {
    /* ignore */
  }
}
