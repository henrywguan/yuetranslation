import { fetchSpeechToken } from './api'
import { isTtsPlaying } from './tts'
import type { Lang, LiveSession, SpeechEventHandlers } from './types'

/** Ignore mic while TTS plays and briefly after — blocks speaker echo becoming a new turn. */
const ECHO_TAIL_MS = 600

function localeToLang(locale: string): Lang {
  const l = locale.toLowerCase()
  if (l.startsWith('zh') || l.includes('yue') || l.includes('hk')) return 'yue'
  return 'en'
}

export async function createAzureLiveSession(
  handlers: SpeechEventHandlers,
): Promise<LiveSession | null> {
  let tokenPayload: { token: string; region: string }
  try {
    const t = await fetchSpeechToken()
    if (!t) return null
    tokenPayload = t
  } catch (err) {
    handlers.onError(err instanceof Error ? err.message : String(err))
    return null
  }

  const SpeechSDK = await import('microsoft-cognitiveservices-speech-sdk')
  let recognizer: import('microsoft-cognitiveservices-speech-sdk').SpeechRecognizer | null = null
  let playbackActive = false
  let ignoreUntil = 0

  function shouldIgnoreMic() {
    return playbackActive || isTtsPlaying() || Date.now() < ignoreUntil
  }

  return {
    setPlaybackActive(active) {
      playbackActive = active
      if (!active) ignoreUntil = Date.now() + ECHO_TAIL_MS
    },
    async start() {
      const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(
        tokenPayload.token,
        tokenPayload.region,
      )
      speechConfig.setProperty(
        SpeechSDK.PropertyId.SpeechServiceConnection_LanguageIdMode,
        'Continuous',
      )
      const autoDetect = SpeechSDK.AutoDetectSourceLanguageConfig.fromLanguages(['en-US', 'zh-HK'])
      const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput()
      recognizer = SpeechSDK.SpeechRecognizer.FromConfig(speechConfig, autoDetect, audioConfig)

      recognizer.recognizing = (_s, e) => {
        // Never barge-in on TTS echo — that used to clear the gate and accept the echo as a new phrase.
        if (shouldIgnoreMic()) return
        if (e.result.reason !== SpeechSDK.ResultReason.RecognizingSpeech) return
        const text = e.result.text?.trim()
        if (!text) return
        const lang = localeToLang(
          SpeechSDK.AutoDetectSourceLanguageResult.fromResult(e.result).language || 'en-US',
        )
        handlers.onInterim(lang, text)
      }
      recognizer.recognized = (_s, e) => {
        if (shouldIgnoreMic()) return
        if (e.result.reason !== SpeechSDK.ResultReason.RecognizedSpeech) return
        const text = e.result.text?.trim()
        if (!text) return
        const lang = localeToLang(
          SpeechSDK.AutoDetectSourceLanguageResult.fromResult(e.result).language || 'en-US',
        )
        handlers.onFinal(lang, text)
      }
      recognizer.canceled = (_s, e) => {
        if (e.errorDetails) handlers.onError(e.errorDetails)
        handlers.onStatus('idle')
      }
      await new Promise<void>((resolve, reject) => {
        recognizer!.startContinuousRecognitionAsync(
          () => {
            handlers.onStatus('listening')
            resolve()
          },
          (err) => reject(new Error(err)),
        )
      })
    },
    async stop() {
      if (!recognizer) return
      const current = recognizer
      recognizer = null
      await new Promise<void>((resolve) => {
        current.stopContinuousRecognitionAsync(
          () => {
            current.close()
            handlers.onStatus('idle')
            resolve()
          },
          () => {
            current.close()
            handlers.onStatus('idle')
            resolve()
          },
        )
      })
    },
  }
}
