import type { Lang } from './types'

/**
 * Safari Web Speech has no reliable STT for these locales (Tagalog →
 * `service-not-allowed`; Shanghainese unsupported). Use Azure with a
 * **fixed** locale on iPhone — never LID — so English cannot leak onto
 * a Cantonese-locked pane.
 */
export function appleNeedsAzureStt(lockLang?: Lang | null): boolean {
  return lockLang === 'tl' || lockLang === 'wuu'
}

/**
 * iPhone live STT stays on Web Speech for Yue / En / Cmn / Es / Vi.
 * Tagalog + Shanghainese use Azure fixed-locale instead (see above).
 */
export function appleLiveUsesWebSpeech(lockLang?: Lang | null): boolean {
  return !appleNeedsAzureStt(lockLang)
}

/** Warm `/api/speech-token` on Apple only when Azure STT is required. */
export function applePrefetchesSpeechToken(lockLang?: Lang | null): boolean {
  return appleNeedsAzureStt(lockLang)
}

/**
 * iOS must not fall through to Azure LID when Web Speech fails for Yue/En.
 * Tagalog / Wu may use Azure fixed-locale when Web Speech cannot start.
 */
export function appleFallsBackToAzure(lockLang?: Lang | null): boolean {
  return appleNeedsAzureStt(lockLang)
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
 *
 * `speechToken` stays false for the default Yue/En Web Speech path.
 * Tagalog / Wu mint a token only when `appleNeedsAzureStt` applies.
 */
export const APPLE_LIVE_TURN_API = {
  translate: true,
  tts: true,
  heartbeat: true,
  speechToken: false,
  healthOnTeardown: false,
  historyHydrateOnTeardown: false,
} as const
