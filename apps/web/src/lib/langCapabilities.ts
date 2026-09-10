import type { Lang, SpeakDirection, TextOnlyLang, VoiceLang } from './types'

export const VOICE_LANGS = ['en', 'yue', 'cmn', 'wuu', 'sichuan', 'tl', 'es', 'vi'] as const satisfies readonly VoiceLang[]
export const TEXT_ONLY_LANGS = ['ceb', 'ilo'] as const satisfies readonly TextOnlyLang[]
export const SOLO_LANGS = [...VOICE_LANGS, ...TEXT_ONLY_LANGS] as const satisfies readonly Lang[]

export function isTextOnlyLang(lang: string | null | undefined): lang is TextOnlyLang {
  return lang === 'ceb' || lang === 'ilo'
}

export function isVoiceLang(lang: string | null | undefined): lang is VoiceLang {
  return (
    lang === 'en' ||
    lang === 'yue' ||
    lang === 'cmn' ||
    lang === 'wuu' ||
    lang === 'sichuan' ||
    lang === 'tl' ||
    lang === 'es' ||
    lang === 'vi'
  )
}

/** Live mic + Azure/Web Speech STT. */
export function supportsLiveMic(lang: string | null | undefined): boolean {
  return isVoiceLang(lang) && !isTextOnlyLang(lang)
}

/** Speak button / auto-speak TTS. */
export function supportsTts(lang: string | null | undefined): boolean {
  return supportsLiveMic(lang)
}

/** Conversation panes — voice languages only. */
export function isConversationLang(lang: string | null | undefined): lang is VoiceLang {
  return isVoiceLang(lang)
}

export function asSpeakDirection(lang: Lang | SpeakDirection | null | undefined): SpeakDirection | null {
  return isVoiceLang(lang) ? lang : null
}

/** When selecting a Solo pane language, pick a mic side that still supports speech. */
export function resolveSpeakDirectionForSolo(opts: {
  selected: Lang
  other: Lang
  current: SpeakDirection
}): SpeakDirection {
  const { selected, other, current } = opts
  if (isVoiceLang(selected)) return selected
  if (isVoiceLang(other)) return other
  if (isVoiceLang(current)) return current
  return 'en'
}

export function textOnlyLangLabel(lang: TextOnlyLang): string {
  return lang === 'ceb' ? 'Cebuano' : 'Ilocano'
}
