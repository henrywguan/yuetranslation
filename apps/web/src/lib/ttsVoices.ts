/**
 * Web TTS voice helpers — catalog lives in `@jyut/shared/ttsVoices`.
 * LocalStorage prefs stay client-only here.
 */
export {
  DEFAULT_YUE_VOICE,
  DEFAULT_EN_VOICE,
  DEFAULT_CMN_VOICE,
  DEFAULT_WUU_VOICE,
  YUE_VOICES,
  EN_VOICES,
  CMN_VOICES,
  WUU_VOICES,
  PREVIEW_YUE,
  PREVIEW_EN,
  PREVIEW_CMN,
  PREVIEW_WUU,
  resolveYueVoice,
  resolveEnVoice,
  resolveCmnVoice,
  resolveWuuVoice,
  voiceMeta,
  type YueVoiceId,
  type EnVoiceId,
  type CmnVoiceId,
  type WuuVoiceId,
  type TtsVoiceId,
  type TtsVoiceOption,
} from '@jyut/shared/ttsVoices'

import {
  DEFAULT_CMN_VOICE,
  DEFAULT_EN_VOICE,
  DEFAULT_YUE_VOICE,
  DEFAULT_WUU_VOICE,
  resolveCmnVoice,
  resolveEnVoice,
  resolveYueVoice,
  resolveWuuVoice,
  voiceMeta,
  type CmnVoiceId,
  type EnVoiceId,
  type YueVoiceId,
  type WuuVoiceId,
} from '@jyut/shared/ttsVoices'

const STORAGE_YUE = 'yue-tts-voice-yue'
const STORAGE_EN = 'yue-tts-voice-en'
const STORAGE_CMN = 'yue-tts-voice-cmn'
const STORAGE_WUU = 'yue-tts-voice-wuu'

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

/** Short label for hub summary (first segment before ·). */
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
