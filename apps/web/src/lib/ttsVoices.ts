/**
 * Web TTS voice helpers — catalog lives in `@jyut/shared/ttsVoices`.
 * LocalStorage prefs stay client-only here.
 */
export {
  DEFAULT_YUE_VOICE,
  DEFAULT_EN_VOICE,
  DEFAULT_CMN_VOICE,
  DEFAULT_TL_VOICE,
  YUE_VOICES,
  EN_VOICES,
  CMN_VOICES,
  TL_VOICES,
  PREVIEW_YUE,
  PREVIEW_EN,
  PREVIEW_CMN,
  PREVIEW_TL,
  resolveYueVoice,
  resolveEnVoice,
  resolveCmnVoice,
  resolveTlVoice,
  voiceMeta,
  type YueVoiceId,
  type EnVoiceId,
  type CmnVoiceId,
  type TlVoiceId,
  type TtsVoiceId,
  type TtsVoiceOption,
} from '@jyut/shared/ttsVoices'

import {
  DEFAULT_CMN_VOICE,
  DEFAULT_TL_VOICE,
  DEFAULT_EN_VOICE,
  DEFAULT_YUE_VOICE,
  resolveCmnVoice,
  resolveTlVoice,
  resolveEnVoice,
  resolveYueVoice,
  voiceMeta,
  type CmnVoiceId,
  type TlVoiceId,
  type EnVoiceId,
  type YueVoiceId,
} from '@jyut/shared/ttsVoices'

const STORAGE_YUE = 'yue-tts-voice-yue'
const STORAGE_EN = 'yue-tts-voice-en'
const STORAGE_CMN = 'yue-tts-voice-cmn'
const STORAGE_TL = 'yue-tts-voice-tl'

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
export function voiceShortLabel(id: string): string {
  const meta = voiceMeta(id)
  if (!meta) return id
  return meta.labelEn.split('·')[0]?.trim() || meta.labelEn
}
