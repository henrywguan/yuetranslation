import type { Lang } from './types'

/**
 * iPhone live STT stays on Web Speech for every tap.
 * Routing follow-up taps to Azure ConversationTranscriber (en-US + zh-HK LID)
 * transcribed English onto a Cantonese-locked pane.
 */
export function appleLiveUsesWebSpeech(): boolean {
  return true
}

/**
 * When Solo / Conversation locks a source language, Azure must recognize that
 * locale. LID + `emitLang(lockLang)` used to show English text on the Yue side.
 */
export function azureUsesFixedLocale(lockLang?: Lang): boolean {
  return Boolean(lockLang)
}
