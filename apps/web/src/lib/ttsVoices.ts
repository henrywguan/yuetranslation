/**
 * Web TTS voice helpers — catalog lives in `@jyut/shared/ttsVoices`.
 * LocalStorage prefs stay client-only here.
 */
export {
  DEFAULT_YUE_VOICE,
  DEFAULT_EN_VOICE,
  DEFAULT_CMN_VOICE,
  YUE_VOICES,
  EN_VOICES,
  CMN_VOICES,
  PREVIEW_YUE,
  PREVIEW_EN,
  PREVIEW_CMN,
  resolveYueVoice,
  resolveEnVoice,
  resolveCmnVoice,
  type YueVoiceId,
  type EnVoiceId,
  type CmnVoiceId,
  type TtsVoiceId,
  type TtsVoiceOption,
} from '@jyut/shared/ttsVoices'

import {
  DEFAULT_EN_VOICE,
  DEFAULT_YUE_VOICE,
  resolveEnVoice,
  resolveYueVoice,
  type EnVoiceId,
  type YueVoiceId,
} from '@jyut/shared/ttsVoices'

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
