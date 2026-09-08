import type { Lang } from './types'

/**
 * iPhone live STT stays on Web Speech for every tap.
 * Routing follow-up taps to Azure ConversationTranscriber (en-US + zh-HK LID)
 * transcribed English onto a Cantonese-locked pane.
 */
export function appleLiveUsesWebSpeech(): boolean {
  return true
}

/** iOS must not mint Azure speech tokens for live STT (WAF + paid Azure). */
export function applePrefetchesSpeechToken(): boolean {
  return false
}

/** iOS must not fall through to Azure if Web Speech fails to start. */
export function appleFallsBackToAzure(): boolean {
  return false
}

/**
 * When Solo / Conversation locks a source language, Azure must recognize that
 * locale. LID + `emitLang(lockLang)` used to show English text on the Yue side.
 */
export function azureUsesFixedLocale(lockLang?: Lang): boolean {
  return Boolean(lockLang)
}

/**
 * iPhone Web Speech + HTMLAudio auto-speak: pausing TTS *before*
 * `recognition.start()` cancels capture (orange pill on, no audio).
 * Start STT first, then pause with `preserveSession`.
 */
export function shouldDeferTtsStopUntilSttStarts(opts: {
  apple: boolean
  webSpeechFirst: boolean
  ttsPlaying: boolean
}): boolean {
  return opts.apple && opts.webSpeechFirst && opts.ttsPlaying
}

/**
 * Edge-visible APIs one iPhone live turn is allowed to hit after STT.
 * Health + history hydrate on teardown used to fire every tap and trip
 * Vercel’s security checkpoint after 2–3 translations.
 */
export const APPLE_LIVE_TURN_API = {
  translate: true,
  tts: true,
  heartbeat: true,
  speechToken: false,
  healthOnTeardown: false,
  historyHydrateOnTeardown: false,
} as const
