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
  DEFAULT_AR_VOICE,
  DEFAULT_ARSA_VOICE,
  DEFAULT_TA_VOICE,
  DEFAULT_PTPT_VOICE,
  DEFAULT_TR_VOICE,
  DEFAULT_BN_VOICE,
  DEFAULT_TE_VOICE,
  DEFAULT_GU_VOICE,
  DEFAULT_KN_VOICE,
  DEFAULT_PL_VOICE,
  DEFAULT_RO_VOICE,
  DEFAULT_CS_VOICE,
  DEFAULT_EL_VOICE,
  DEFAULT_HU_VOICE,
  DEFAULT_SV_VOICE,
  DEFAULT_RU_VOICE,
  DEFAULT_UK_VOICE,
  DEFAULT_HE_VOICE,
  DEFAULT_FA_VOICE,
  DEFAULT_UR_VOICE,
  DEFAULT_ML_VOICE,
  DEFAULT_MR_VOICE,
  DEFAULT_PA_VOICE,
  DEFAULT_OR_VOICE,
  DEFAULT_SI_VOICE,
  DEFAULT_NE_VOICE,
  DEFAULT_DA_VOICE,
  DEFAULT_NB_VOICE,
  DEFAULT_FI_VOICE,
  DEFAULT_SK_VOICE,
  DEFAULT_HR_VOICE,
  DEFAULT_CA_VOICE,
  DEFAULT_AZ_VOICE,
  DEFAULT_KK_VOICE,
  DEFAULT_UZ_VOICE,
  DEFAULT_BG_VOICE,
  DEFAULT_SR_VOICE,
  DEFAULT_SW_VOICE,
  DEFAULT_AF_VOICE,
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
  AR_VOICES,
  ARSA_VOICES,
  TA_VOICES,
  PTPT_VOICES,
  TR_VOICES,
  BN_VOICES,
  TE_VOICES,
  GU_VOICES,
  KN_VOICES,
  PL_VOICES,
  RO_VOICES,
  CS_VOICES,
  EL_VOICES,
  HU_VOICES,
  SV_VOICES,
  RU_VOICES,
  UK_VOICES,
  HE_VOICES,
  FA_VOICES,
  UR_VOICES,
  ML_VOICES,
  MR_VOICES,
  PA_VOICES,
  OR_VOICES,
  SI_VOICES,
  NE_VOICES,
  DA_VOICES,
  NB_VOICES,
  FI_VOICES,
  SK_VOICES,
  HR_VOICES,
  CA_VOICES,
  AZ_VOICES,
  KK_VOICES,
  UZ_VOICES,
  BG_VOICES,
  SR_VOICES,
  SW_VOICES,
  AF_VOICES,
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
  PREVIEW_AR,
  PREVIEW_ARSA,
  PREVIEW_TA,
  PREVIEW_PTPT,
  PREVIEW_TR,
  PREVIEW_BN,
  PREVIEW_TE,
  PREVIEW_GU,
  PREVIEW_KN,
  PREVIEW_PL,
  PREVIEW_RO,
  PREVIEW_CS,
  PREVIEW_EL,
  PREVIEW_HU,
  PREVIEW_SV,
  PREVIEW_RU,
  PREVIEW_UK,
  PREVIEW_HE,
  PREVIEW_FA,
  PREVIEW_UR,
  PREVIEW_ML,
  PREVIEW_MR,
  PREVIEW_PA,
  PREVIEW_OR,
  PREVIEW_SI,
  PREVIEW_NE,
  PREVIEW_DA,
  PREVIEW_NB,
  PREVIEW_FI,
  PREVIEW_SK,
  PREVIEW_HR,
  PREVIEW_CA,
  PREVIEW_AZ,
  PREVIEW_KK,
  PREVIEW_UZ,
  PREVIEW_BG,
  PREVIEW_SR,
  PREVIEW_SW,
  PREVIEW_AF,
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
  resolveArVoice,
  resolveArsaVoice,
  resolveTaVoice,
  resolvePtptVoice,
  resolveTrVoice,
  resolveBnVoice,
  resolveTeVoice,
  resolveGuVoice,
  resolveKnVoice,
  resolvePlVoice,
  resolveRoVoice,
  resolveCsVoice,
  resolveElVoice,
  resolveHuVoice,
  resolveSvVoice,
  resolveRuVoice,
  resolveUkVoice,
  resolveHeVoice,
  resolveFaVoice,
  resolveUrVoice,
  resolveMlVoice,
  resolveMrVoice,
  resolvePaVoice,
  resolveOrVoice,
  resolveSiVoice,
  resolveNeVoice,
  resolveDaVoice,
  resolveNbVoice,
  resolveFiVoice,
  resolveSkVoice,
  resolveHrVoice,
  resolveCaVoice,
  resolveAzVoice,
  resolveKkVoice,
  resolveUzVoice,
  resolveBgVoice,
  resolveSrVoice,
  resolveSwVoice,
  resolveAfVoice,
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
  isArVoice,
  isArsaVoice,
  isTaVoice,
  isPtptVoice,
  isTrVoice,
  isBnVoice,
  isTeVoice,
  isGuVoice,
  isKnVoice,
  isPlVoice,
  isRoVoice,
  isCsVoice,
  isElVoice,
  isHuVoice,
  isSvVoice,
  isRuVoice,
  isUkVoice,
  isHeVoice,
  isFaVoice,
  isUrVoice,
  isMlVoice,
  isMrVoice,
  isPaVoice,
  isOrVoice,
  isSiVoice,
  isNeVoice,
  isDaVoice,
  isNbVoice,
  isFiVoice,
  isSkVoice,
  isHrVoice,
  isCaVoice,
  isAzVoice,
  isKkVoice,
  isUzVoice,
  isBgVoice,
  isSrVoice,
  isSwVoice,
  isAfVoice,
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
  type ArVoiceId,
  type ArsaVoiceId,
  type TaVoiceId,
  type PtptVoiceId,
  type TrVoiceId,
  type BnVoiceId,
  type TeVoiceId,
  type GuVoiceId,
  type KnVoiceId,
  type PlVoiceId,
  type RoVoiceId,
  type CsVoiceId,
  type ElVoiceId,
  type HuVoiceId,
  type SvVoiceId,
  type RuVoiceId,
  type UkVoiceId,
  type HeVoiceId,
  type FaVoiceId,
  type UrVoiceId,
  type MlVoiceId,
  type MrVoiceId,
  type PaVoiceId,
  type OrVoiceId,
  type SiVoiceId,
  type NeVoiceId,
  type DaVoiceId,
  type NbVoiceId,
  type FiVoiceId,
  type SkVoiceId,
  type HrVoiceId,
  type CaVoiceId,
  type AzVoiceId,
  type KkVoiceId,
  type UzVoiceId,
  type BgVoiceId,
  type SrVoiceId,
  type SwVoiceId,
  type AfVoiceId,
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
  DEFAULT_AR_VOICE,
  DEFAULT_ARSA_VOICE,
  DEFAULT_TA_VOICE,
  DEFAULT_PTPT_VOICE,
  DEFAULT_TR_VOICE,
  DEFAULT_BN_VOICE,
  DEFAULT_TE_VOICE,
  DEFAULT_GU_VOICE,
  DEFAULT_KN_VOICE,
  DEFAULT_PL_VOICE,
  DEFAULT_RO_VOICE,
  DEFAULT_CS_VOICE,
  DEFAULT_EL_VOICE,
  DEFAULT_HU_VOICE,
  DEFAULT_SV_VOICE,
  DEFAULT_RU_VOICE,
  DEFAULT_UK_VOICE,
  DEFAULT_HE_VOICE,
  DEFAULT_FA_VOICE,
  DEFAULT_UR_VOICE,
  DEFAULT_ML_VOICE,
  DEFAULT_MR_VOICE,
  DEFAULT_PA_VOICE,
  DEFAULT_OR_VOICE,
  DEFAULT_SI_VOICE,
  DEFAULT_NE_VOICE,
  DEFAULT_DA_VOICE,
  DEFAULT_NB_VOICE,
  DEFAULT_FI_VOICE,
  DEFAULT_SK_VOICE,
  DEFAULT_HR_VOICE,
  DEFAULT_CA_VOICE,
  DEFAULT_AZ_VOICE,
  DEFAULT_KK_VOICE,
  DEFAULT_UZ_VOICE,
  DEFAULT_BG_VOICE,
  DEFAULT_SR_VOICE,
  DEFAULT_SW_VOICE,
  DEFAULT_AF_VOICE,
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
  resolveArVoice,
  resolveArsaVoice,
  resolveTaVoice,
  resolvePtptVoice,
  resolveTrVoice,
  resolveBnVoice,
  resolveTeVoice,
  resolveGuVoice,
  resolveKnVoice,
  resolvePlVoice,
  resolveRoVoice,
  resolveCsVoice,
  resolveElVoice,
  resolveHuVoice,
  resolveSvVoice,
  resolveRuVoice,
  resolveUkVoice,
  resolveHeVoice,
  resolveFaVoice,
  resolveUrVoice,
  resolveMlVoice,
  resolveMrVoice,
  resolvePaVoice,
  resolveOrVoice,
  resolveSiVoice,
  resolveNeVoice,
  resolveDaVoice,
  resolveNbVoice,
  resolveFiVoice,
  resolveSkVoice,
  resolveHrVoice,
  resolveCaVoice,
  resolveAzVoice,
  resolveKkVoice,
  resolveUzVoice,
  resolveBgVoice,
  resolveSrVoice,
  resolveSwVoice,
  resolveAfVoice,
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
  type ArVoiceId,
  type ArsaVoiceId,
  type TaVoiceId,
  type PtptVoiceId,
  type TrVoiceId,
  type BnVoiceId,
  type TeVoiceId,
  type GuVoiceId,
  type KnVoiceId,
  type PlVoiceId,
  type RoVoiceId,
  type CsVoiceId,
  type ElVoiceId,
  type HuVoiceId,
  type SvVoiceId,
  type RuVoiceId,
  type UkVoiceId,
  type HeVoiceId,
  type FaVoiceId,
  type UrVoiceId,
  type MlVoiceId,
  type MrVoiceId,
  type PaVoiceId,
  type OrVoiceId,
  type SiVoiceId,
  type NeVoiceId,
  type DaVoiceId,
  type NbVoiceId,
  type FiVoiceId,
  type SkVoiceId,
  type HrVoiceId,
  type CaVoiceId,
  type AzVoiceId,
  type KkVoiceId,
  type UzVoiceId,
  type BgVoiceId,
  type SrVoiceId,
  type SwVoiceId,
  type AfVoiceId,
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
const STORAGE_AR = 'yue-tts-voice-ar'
const STORAGE_ARSA = 'yue-tts-voice-arsa'
const STORAGE_TA = 'yue-tts-voice-ta'
const STORAGE_PTPT = 'yue-tts-voice-ptpt'
const STORAGE_TR = 'yue-tts-voice-tr'
const STORAGE_BN = 'yue-tts-voice-bn'
const STORAGE_TE = 'yue-tts-voice-te'
const STORAGE_GU = 'yue-tts-voice-gu'
const STORAGE_KN = 'yue-tts-voice-kn'
const STORAGE_PL = 'yue-tts-voice-pl'
const STORAGE_RO = 'yue-tts-voice-ro'
const STORAGE_CS = 'yue-tts-voice-cs'
const STORAGE_EL = 'yue-tts-voice-el'
const STORAGE_HU = 'yue-tts-voice-hu'
const STORAGE_SV = 'yue-tts-voice-sv'
const STORAGE_RU = 'yue-tts-voice-ru'
const STORAGE_UK = 'yue-tts-voice-uk'
const STORAGE_HE = 'yue-tts-voice-he'
const STORAGE_FA = 'yue-tts-voice-fa'
const STORAGE_UR = 'yue-tts-voice-ur'
const STORAGE_ML = 'yue-tts-voice-ml'
const STORAGE_MR = 'yue-tts-voice-mr'
const STORAGE_PA = 'yue-tts-voice-pa'
const STORAGE_OR = 'yue-tts-voice-or'
const STORAGE_SI = 'yue-tts-voice-si'
const STORAGE_NE = 'yue-tts-voice-ne'
const STORAGE_DA = 'yue-tts-voice-da'
const STORAGE_NB = 'yue-tts-voice-nb'
const STORAGE_FI = 'yue-tts-voice-fi'
const STORAGE_SK = 'yue-tts-voice-sk'
const STORAGE_HR = 'yue-tts-voice-hr'
const STORAGE_CA = 'yue-tts-voice-ca'
const STORAGE_AZ = 'yue-tts-voice-az'
const STORAGE_KK = 'yue-tts-voice-kk'
const STORAGE_UZ = 'yue-tts-voice-uz'
const STORAGE_BG = 'yue-tts-voice-bg'
const STORAGE_SR = 'yue-tts-voice-sr'
const STORAGE_SW = 'yue-tts-voice-sw'
const STORAGE_AF = 'yue-tts-voice-af'


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

export function readLocalArVoice(): ArVoiceId {
  if (typeof window === 'undefined') return DEFAULT_AR_VOICE
  try {
    return resolveArVoice(localStorage.getItem(STORAGE_AR))
  } catch {
    return DEFAULT_AR_VOICE
  }
}

export function readLocalArsaVoice(): ArsaVoiceId {
  if (typeof window === 'undefined') return DEFAULT_ARSA_VOICE
  try {
    return resolveArsaVoice(localStorage.getItem(STORAGE_ARSA))
  } catch {
    return DEFAULT_ARSA_VOICE
  }
}

export function writeLocalNlVoice(id: NlVoiceId) {
  try {
    localStorage.setItem(STORAGE_NL, resolveNlVoice(id))
  } catch {
    /* ignore */
  }
}

export function writeLocalArVoice(id: ArVoiceId) {
  try {
    localStorage.setItem(STORAGE_AR, resolveArVoice(id))
  } catch {
    /* ignore */
  }
}

export function writeLocalArsaVoice(id: ArsaVoiceId) {
  try {
    localStorage.setItem(STORAGE_ARSA, resolveArsaVoice(id))
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

export function readLocalTaVoice(): TaVoiceId {
  if (typeof window === 'undefined') return DEFAULT_TA_VOICE
  try {
    return resolveTaVoice(localStorage.getItem(STORAGE_TA))
  } catch {
    return DEFAULT_TA_VOICE
  }
}

export function writeLocalTaVoice(id: TaVoiceId) {
  try {
    localStorage.setItem(STORAGE_TA, resolveTaVoice(id))
  } catch {
    /* ignore */
  }
}

export function readLocalPtptVoice(): PtptVoiceId {
  if (typeof window === 'undefined') return DEFAULT_PTPT_VOICE
  try {
    return resolvePtptVoice(localStorage.getItem(STORAGE_PTPT))
  } catch {
    return DEFAULT_PTPT_VOICE
  }
}

export function writeLocalPtptVoice(id: PtptVoiceId) {
  try {
    localStorage.setItem(STORAGE_PTPT, resolvePtptVoice(id))
  } catch {
    /* ignore */
  }
}

export function readLocalTrVoice(): TrVoiceId {
  if (typeof window === 'undefined') return DEFAULT_TR_VOICE
  try {
    return resolveTrVoice(localStorage.getItem(STORAGE_TR))
  } catch {
    return DEFAULT_TR_VOICE
  }
}

export function writeLocalTrVoice(id: TrVoiceId) {
  try {
    localStorage.setItem(STORAGE_TR, resolveTrVoice(id))
  } catch {
    /* ignore */
  }
}

export function readLocalBnVoice(): BnVoiceId {
  if (typeof window === 'undefined') return DEFAULT_BN_VOICE
  try {
    return resolveBnVoice(localStorage.getItem(STORAGE_BN))
  } catch {
    return DEFAULT_BN_VOICE
  }
}
export function readLocalTeVoice(): TeVoiceId {
  if (typeof window === 'undefined') return DEFAULT_TE_VOICE
  try {
    return resolveTeVoice(localStorage.getItem(STORAGE_TE))
  } catch {
    return DEFAULT_TE_VOICE
  }
}
export function readLocalGuVoice(): GuVoiceId {
  if (typeof window === 'undefined') return DEFAULT_GU_VOICE
  try {
    return resolveGuVoice(localStorage.getItem(STORAGE_GU))
  } catch {
    return DEFAULT_GU_VOICE
  }
}
export function readLocalKnVoice(): KnVoiceId {
  if (typeof window === 'undefined') return DEFAULT_KN_VOICE
  try {
    return resolveKnVoice(localStorage.getItem(STORAGE_KN))
  } catch {
    return DEFAULT_KN_VOICE
  }
}
export function readLocalPlVoice(): PlVoiceId {
  if (typeof window === 'undefined') return DEFAULT_PL_VOICE
  try {
    return resolvePlVoice(localStorage.getItem(STORAGE_PL))
  } catch {
    return DEFAULT_PL_VOICE
  }
}
export function readLocalRoVoice(): RoVoiceId {
  if (typeof window === 'undefined') return DEFAULT_RO_VOICE
  try {
    return resolveRoVoice(localStorage.getItem(STORAGE_RO))
  } catch {
    return DEFAULT_RO_VOICE
  }
}
export function readLocalCsVoice(): CsVoiceId {
  if (typeof window === 'undefined') return DEFAULT_CS_VOICE
  try {
    return resolveCsVoice(localStorage.getItem(STORAGE_CS))
  } catch {
    return DEFAULT_CS_VOICE
  }
}
export function readLocalElVoice(): ElVoiceId {
  if (typeof window === 'undefined') return DEFAULT_EL_VOICE
  try {
    return resolveElVoice(localStorage.getItem(STORAGE_EL))
  } catch {
    return DEFAULT_EL_VOICE
  }
}
export function readLocalHuVoice(): HuVoiceId {
  if (typeof window === 'undefined') return DEFAULT_HU_VOICE
  try {
    return resolveHuVoice(localStorage.getItem(STORAGE_HU))
  } catch {
    return DEFAULT_HU_VOICE
  }
}
export function readLocalSvVoice(): SvVoiceId {
  if (typeof window === 'undefined') return DEFAULT_SV_VOICE
  try {
    return resolveSvVoice(localStorage.getItem(STORAGE_SV))
  } catch {
    return DEFAULT_SV_VOICE
  }
}
export function readLocalRuVoice(): RuVoiceId {
  if (typeof window === 'undefined') return DEFAULT_RU_VOICE
  try {
    return resolveRuVoice(localStorage.getItem(STORAGE_RU))
  } catch {
    return DEFAULT_RU_VOICE
  }
}
export function readLocalUkVoice(): UkVoiceId {
  if (typeof window === 'undefined') return DEFAULT_UK_VOICE
  try {
    return resolveUkVoice(localStorage.getItem(STORAGE_UK))
  } catch {
    return DEFAULT_UK_VOICE
  }
}
export function readLocalHeVoice(): HeVoiceId {
  if (typeof window === 'undefined') return DEFAULT_HE_VOICE
  try {
    return resolveHeVoice(localStorage.getItem(STORAGE_HE))
  } catch {
    return DEFAULT_HE_VOICE
  }
}
export function readLocalFaVoice(): FaVoiceId {
  if (typeof window === 'undefined') return DEFAULT_FA_VOICE
  try {
    return resolveFaVoice(localStorage.getItem(STORAGE_FA))
  } catch {
    return DEFAULT_FA_VOICE
  }
}
export function readLocalUrVoice(): UrVoiceId {
  if (typeof window === 'undefined') return DEFAULT_UR_VOICE
  try {
    return resolveUrVoice(localStorage.getItem(STORAGE_UR))
  } catch {
    return DEFAULT_UR_VOICE
  }
}

export function writeLocalBnVoice(id: BnVoiceId) {
  try {
    localStorage.setItem(STORAGE_BN, resolveBnVoice(id))
  } catch {
    /* ignore */
  }
}
export function writeLocalTeVoice(id: TeVoiceId) {
  try {
    localStorage.setItem(STORAGE_TE, resolveTeVoice(id))
  } catch {
    /* ignore */
  }
}
export function writeLocalGuVoice(id: GuVoiceId) {
  try {
    localStorage.setItem(STORAGE_GU, resolveGuVoice(id))
  } catch {
    /* ignore */
  }
}
export function writeLocalKnVoice(id: KnVoiceId) {
  try {
    localStorage.setItem(STORAGE_KN, resolveKnVoice(id))
  } catch {
    /* ignore */
  }
}
export function writeLocalPlVoice(id: PlVoiceId) {
  try {
    localStorage.setItem(STORAGE_PL, resolvePlVoice(id))
  } catch {
    /* ignore */
  }
}
export function writeLocalRoVoice(id: RoVoiceId) {
  try {
    localStorage.setItem(STORAGE_RO, resolveRoVoice(id))
  } catch {
    /* ignore */
  }
}
export function writeLocalCsVoice(id: CsVoiceId) {
  try {
    localStorage.setItem(STORAGE_CS, resolveCsVoice(id))
  } catch {
    /* ignore */
  }
}
export function writeLocalElVoice(id: ElVoiceId) {
  try {
    localStorage.setItem(STORAGE_EL, resolveElVoice(id))
  } catch {
    /* ignore */
  }
}
export function writeLocalHuVoice(id: HuVoiceId) {
  try {
    localStorage.setItem(STORAGE_HU, resolveHuVoice(id))
  } catch {
    /* ignore */
  }
}
export function writeLocalSvVoice(id: SvVoiceId) {
  try {
    localStorage.setItem(STORAGE_SV, resolveSvVoice(id))
  } catch {
    /* ignore */
  }
}
export function writeLocalRuVoice(id: RuVoiceId) {
  try {
    localStorage.setItem(STORAGE_RU, resolveRuVoice(id))
  } catch {
    /* ignore */
  }
}
export function writeLocalUkVoice(id: UkVoiceId) {
  try {
    localStorage.setItem(STORAGE_UK, resolveUkVoice(id))
  } catch {
    /* ignore */
  }
}
export function writeLocalHeVoice(id: HeVoiceId) {
  try {
    localStorage.setItem(STORAGE_HE, resolveHeVoice(id))
  } catch {
    /* ignore */
  }
}
export function writeLocalFaVoice(id: FaVoiceId) {
  try {
    localStorage.setItem(STORAGE_FA, resolveFaVoice(id))
  } catch {
    /* ignore */
  }
}
export function writeLocalUrVoice(id: UrVoiceId) {
  try {
    localStorage.setItem(STORAGE_UR, resolveUrVoice(id))
  } catch {
    /* ignore */
  }
}

export function readLocalMlVoice(): MlVoiceId {
  if (typeof window === 'undefined') return DEFAULT_ML_VOICE
  try {
    return resolveMlVoice(localStorage.getItem(STORAGE_ML))
  } catch {
    return DEFAULT_ML_VOICE
  }
}

export function writeLocalMlVoice(id: MlVoiceId) {
  try {
    localStorage.setItem(STORAGE_ML, resolveMlVoice(id))
  } catch {
    /* ignore */
  }
}

export function readLocalMrVoice(): MrVoiceId {
  if (typeof window === 'undefined') return DEFAULT_MR_VOICE
  try {
    return resolveMrVoice(localStorage.getItem(STORAGE_MR))
  } catch {
    return DEFAULT_MR_VOICE
  }
}

export function writeLocalMrVoice(id: MrVoiceId) {
  try {
    localStorage.setItem(STORAGE_MR, resolveMrVoice(id))
  } catch {
    /* ignore */
  }
}

export function readLocalPaVoice(): PaVoiceId {
  if (typeof window === 'undefined') return DEFAULT_PA_VOICE
  try {
    return resolvePaVoice(localStorage.getItem(STORAGE_PA))
  } catch {
    return DEFAULT_PA_VOICE
  }
}

export function writeLocalPaVoice(id: PaVoiceId) {
  try {
    localStorage.setItem(STORAGE_PA, resolvePaVoice(id))
  } catch {
    /* ignore */
  }
}

export function readLocalOrVoice(): OrVoiceId {
  if (typeof window === 'undefined') return DEFAULT_OR_VOICE
  try {
    return resolveOrVoice(localStorage.getItem(STORAGE_OR))
  } catch {
    return DEFAULT_OR_VOICE
  }
}

export function writeLocalOrVoice(id: OrVoiceId) {
  try {
    localStorage.setItem(STORAGE_OR, resolveOrVoice(id))
  } catch {
    /* ignore */
  }
}

export function readLocalSiVoice(): SiVoiceId {
  if (typeof window === 'undefined') return DEFAULT_SI_VOICE
  try {
    return resolveSiVoice(localStorage.getItem(STORAGE_SI))
  } catch {
    return DEFAULT_SI_VOICE
  }
}

export function writeLocalSiVoice(id: SiVoiceId) {
  try {
    localStorage.setItem(STORAGE_SI, resolveSiVoice(id))
  } catch {
    /* ignore */
  }
}

export function readLocalNeVoice(): NeVoiceId {
  if (typeof window === 'undefined') return DEFAULT_NE_VOICE
  try {
    return resolveNeVoice(localStorage.getItem(STORAGE_NE))
  } catch {
    return DEFAULT_NE_VOICE
  }
}

export function writeLocalNeVoice(id: NeVoiceId) {
  try {
    localStorage.setItem(STORAGE_NE, resolveNeVoice(id))
  } catch {
    /* ignore */
  }
}

export function readLocalDaVoice(): DaVoiceId {
  if (typeof window === 'undefined') return DEFAULT_DA_VOICE
  try {
    return resolveDaVoice(localStorage.getItem(STORAGE_DA))
  } catch {
    return DEFAULT_DA_VOICE
  }
}

export function writeLocalDaVoice(id: DaVoiceId) {
  try {
    localStorage.setItem(STORAGE_DA, resolveDaVoice(id))
  } catch {
    /* ignore */
  }
}

export function readLocalNbVoice(): NbVoiceId {
  if (typeof window === 'undefined') return DEFAULT_NB_VOICE
  try {
    return resolveNbVoice(localStorage.getItem(STORAGE_NB))
  } catch {
    return DEFAULT_NB_VOICE
  }
}

export function writeLocalNbVoice(id: NbVoiceId) {
  try {
    localStorage.setItem(STORAGE_NB, resolveNbVoice(id))
  } catch {
    /* ignore */
  }
}

export function readLocalFiVoice(): FiVoiceId {
  if (typeof window === 'undefined') return DEFAULT_FI_VOICE
  try {
    return resolveFiVoice(localStorage.getItem(STORAGE_FI))
  } catch {
    return DEFAULT_FI_VOICE
  }
}

export function writeLocalFiVoice(id: FiVoiceId) {
  try {
    localStorage.setItem(STORAGE_FI, resolveFiVoice(id))
  } catch {
    /* ignore */
  }
}

export function readLocalSkVoice(): SkVoiceId {
  if (typeof window === 'undefined') return DEFAULT_SK_VOICE
  try {
    return resolveSkVoice(localStorage.getItem(STORAGE_SK))
  } catch {
    return DEFAULT_SK_VOICE
  }
}

export function writeLocalSkVoice(id: SkVoiceId) {
  try {
    localStorage.setItem(STORAGE_SK, resolveSkVoice(id))
  } catch {
    /* ignore */
  }
}

export function readLocalHrVoice(): HrVoiceId {
  if (typeof window === 'undefined') return DEFAULT_HR_VOICE
  try {
    return resolveHrVoice(localStorage.getItem(STORAGE_HR))
  } catch {
    return DEFAULT_HR_VOICE
  }
}

export function writeLocalHrVoice(id: HrVoiceId) {
  try {
    localStorage.setItem(STORAGE_HR, resolveHrVoice(id))
  } catch {
    /* ignore */
  }
}

export function readLocalCaVoice(): CaVoiceId {
  if (typeof window === 'undefined') return DEFAULT_CA_VOICE
  try {
    return resolveCaVoice(localStorage.getItem(STORAGE_CA))
  } catch {
    return DEFAULT_CA_VOICE
  }
}

export function writeLocalCaVoice(id: CaVoiceId) {
  try {
    localStorage.setItem(STORAGE_CA, resolveCaVoice(id))
  } catch {
    /* ignore */
  }
}

export function readLocalAzVoice(): AzVoiceId {
  if (typeof window === 'undefined') return DEFAULT_AZ_VOICE
  try {
    return resolveAzVoice(localStorage.getItem(STORAGE_AZ))
  } catch {
    return DEFAULT_AZ_VOICE
  }
}

export function writeLocalAzVoice(id: AzVoiceId) {
  try {
    localStorage.setItem(STORAGE_AZ, resolveAzVoice(id))
  } catch {
    /* ignore */
  }
}

export function readLocalKkVoice(): KkVoiceId {
  if (typeof window === 'undefined') return DEFAULT_KK_VOICE
  try {
    return resolveKkVoice(localStorage.getItem(STORAGE_KK))
  } catch {
    return DEFAULT_KK_VOICE
  }
}

export function writeLocalKkVoice(id: KkVoiceId) {
  try {
    localStorage.setItem(STORAGE_KK, resolveKkVoice(id))
  } catch {
    /* ignore */
  }
}

export function readLocalUzVoice(): UzVoiceId {
  if (typeof window === 'undefined') return DEFAULT_UZ_VOICE
  try {
    return resolveUzVoice(localStorage.getItem(STORAGE_UZ))
  } catch {
    return DEFAULT_UZ_VOICE
  }
}

export function writeLocalUzVoice(id: UzVoiceId) {
  try {
    localStorage.setItem(STORAGE_UZ, resolveUzVoice(id))
  } catch {
    /* ignore */
  }
}

export function readLocalBgVoice(): BgVoiceId {
  if (typeof window === 'undefined') return DEFAULT_BG_VOICE
  try {
    return resolveBgVoice(localStorage.getItem(STORAGE_BG))
  } catch {
    return DEFAULT_BG_VOICE
  }
}

export function writeLocalBgVoice(id: BgVoiceId) {
  try {
    localStorage.setItem(STORAGE_BG, resolveBgVoice(id))
  } catch {
    /* ignore */
  }
}

export function readLocalSrVoice(): SrVoiceId {
  if (typeof window === 'undefined') return DEFAULT_SR_VOICE
  try {
    return resolveSrVoice(localStorage.getItem(STORAGE_SR))
  } catch {
    return DEFAULT_SR_VOICE
  }
}

export function writeLocalSrVoice(id: SrVoiceId) {
  try {
    localStorage.setItem(STORAGE_SR, resolveSrVoice(id))
  } catch {
    /* ignore */
  }
}

export function readLocalSwVoice(): SwVoiceId {
  if (typeof window === 'undefined') return DEFAULT_SW_VOICE
  try {
    return resolveSwVoice(localStorage.getItem(STORAGE_SW))
  } catch {
    return DEFAULT_SW_VOICE
  }
}

export function writeLocalSwVoice(id: SwVoiceId) {
  try {
    localStorage.setItem(STORAGE_SW, resolveSwVoice(id))
  } catch {
    /* ignore */
  }
}

export function readLocalAfVoice(): AfVoiceId {
  if (typeof window === 'undefined') return DEFAULT_AF_VOICE
  try {
    return resolveAfVoice(localStorage.getItem(STORAGE_AF))
  } catch {
    return DEFAULT_AF_VOICE
  }
}

export function writeLocalAfVoice(id: AfVoiceId) {
  try {
    localStorage.setItem(STORAGE_AF, resolveAfVoice(id))
  } catch {
    /* ignore */
  }
}
