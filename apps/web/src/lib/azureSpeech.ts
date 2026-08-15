import { fetchSpeechToken } from './api'
import { isTtsPlaying } from './tts'
import type { Lang, LiveSession, SpeechEventHandlers, SpeechMeta } from './types'

/** Ignore mic while TTS plays and briefly after — blocks speaker echo becoming a new turn. */
const ECHO_TAIL_MS = 600

function localeToLang(locale: string): Lang {
  const l = locale.toLowerCase()
  if (l.startsWith('zh') || l.includes('yue') || l.includes('hk')) return 'yue'
  return 'en'
}

function normalizeSpeakerId(speakerId?: string | null): string {
  return (speakerId || '').trim()
}

function isUnknownSpeaker(id: string): boolean {
  const n = id.toLowerCase()
  return !n || n === 'unknown' || n === 'unknown speaker'
}

/**
 * Lock to the first diarized speaker in this listening turn.
 * Other Guest-* voices are ignored until the session ends.
 * Unknown/empty ids are still accepted after lock — Azure often
 * re-labels the same talker as Unknown mid-utterance.
 */
function createSpeakerGate() {
  let locked: string | null = null
  return {
    accept(speakerId?: string | null): boolean {
      const id = normalizeSpeakerId(speakerId)
      if (!locked) {
        if (!isUnknownSpeaker(id)) locked = id
        // Before a concrete Guest-* id exists, still accept so solo speech works.
        return true
      }
      if (isUnknownSpeaker(id)) return true
      return id === locked
    },
    reset() {
      locked = null
    },
  }
}

function metaFromSpeaker(speakerId?: string | null): SpeechMeta | undefined {
  const id = normalizeSpeakerId(speakerId)
  return id ? { speakerId: id } : undefined
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
  let transcriber: import('microsoft-cognitiveservices-speech-sdk').ConversationTranscriber | null =
    null
  let recognizer: import('microsoft-cognitiveservices-speech-sdk').SpeechRecognizer | null = null
  let playbackActive = false
  let ignoreUntil = 0
  const gate = createSpeakerGate()

  function shouldIgnoreMic() {
    return playbackActive || isTtsPlaying() || Date.now() < ignoreUntil
  }

  function buildSpeechConfig() {
    const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(
      tokenPayload.token,
      tokenPayload.region,
    )
    speechConfig.setProperty(
      SpeechSDK.PropertyId.SpeechServiceConnection_LanguageIdMode,
      'Continuous',
    )
    speechConfig.setProperty(
      SpeechSDK.PropertyId.SpeechServiceResponse_DiarizeIntermediateResults,
      'true',
    )
    return speechConfig
  }

  async function startWithTranscriber(): Promise<boolean> {
    const speechConfig = buildSpeechConfig()
    const autoDetect = SpeechSDK.AutoDetectSourceLanguageConfig.fromLanguages(['en-US', 'zh-HK'])
    const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput()
    const next = SpeechSDK.ConversationTranscriber.FromConfig(speechConfig, autoDetect, audioConfig)

    next.transcribing = (_s, e) => {
      if (shouldIgnoreMic()) return
      if (e.result.reason !== SpeechSDK.ResultReason.RecognizingSpeech) return
      const text = e.result.text?.trim()
      if (!text) return
      const speakerId = e.result.speakerId
      if (!gate.accept(speakerId)) return
      const lang = localeToLang(e.result.language || 'en-US')
      handlers.onInterim(lang, text, metaFromSpeaker(speakerId))
    }
    next.transcribed = (_s, e) => {
      if (shouldIgnoreMic()) return
      if (e.result.reason !== SpeechSDK.ResultReason.RecognizedSpeech) return
      const text = e.result.text?.trim()
      if (!text) return
      const speakerId = e.result.speakerId
      if (!gate.accept(speakerId)) return
      const lang = localeToLang(e.result.language || 'en-US')
      handlers.onFinal(lang, text, metaFromSpeaker(speakerId))
    }
    next.canceled = (_s, e) => {
      if (e.errorDetails) handlers.onError(e.errorDetails)
      handlers.onStatus('idle')
    }

    await new Promise<void>((resolve, reject) => {
      next.startTranscribingAsync(
        () => {
          handlers.onStatus('listening')
          resolve()
        },
        (err) => reject(new Error(err)),
      )
    })
    transcriber = next
    return true
  }

  async function startWithRecognizer(): Promise<void> {
    const speechConfig = buildSpeechConfig()
    const autoDetect = SpeechSDK.AutoDetectSourceLanguageConfig.fromLanguages(['en-US', 'zh-HK'])
    const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput()
    const next = SpeechSDK.SpeechRecognizer.FromConfig(speechConfig, autoDetect, audioConfig)

    next.recognizing = (_s, e) => {
      if (shouldIgnoreMic()) return
      if (e.result.reason !== SpeechSDK.ResultReason.RecognizingSpeech) return
      const text = e.result.text?.trim()
      if (!text) return
      const speakerId = e.result.speakerId
      if (!gate.accept(speakerId)) return
      const lang = localeToLang(
        SpeechSDK.AutoDetectSourceLanguageResult.fromResult(e.result).language || 'en-US',
      )
      handlers.onInterim(lang, text, metaFromSpeaker(speakerId))
    }
    next.recognized = (_s, e) => {
      if (shouldIgnoreMic()) return
      if (e.result.reason !== SpeechSDK.ResultReason.RecognizedSpeech) return
      const text = e.result.text?.trim()
      if (!text) return
      const speakerId = e.result.speakerId
      if (!gate.accept(speakerId)) return
      const lang = localeToLang(
        SpeechSDK.AutoDetectSourceLanguageResult.fromResult(e.result).language || 'en-US',
      )
      handlers.onFinal(lang, text, metaFromSpeaker(speakerId))
    }
    next.canceled = (_s, e) => {
      if (e.errorDetails) handlers.onError(e.errorDetails)
      handlers.onStatus('idle')
    }

    await new Promise<void>((resolve, reject) => {
      next.startContinuousRecognitionAsync(
        () => {
          handlers.onStatus('listening')
          resolve()
        },
        (err) => reject(new Error(err)),
      )
    })
    recognizer = next
  }

  return {
    setPlaybackActive(active) {
      playbackActive = active
      if (!active) ignoreUntil = Date.now() + ECHO_TAIL_MS
    },
    async start() {
      gate.reset()
      try {
        await startWithTranscriber()
      } catch {
        // Diarization endpoint unavailable — fall back to plain recognition (no speaker lock).
        transcriber = null
        gate.reset()
        await startWithRecognizer()
      }
    },
    async stop() {
      const currentTranscriber = transcriber
      const currentRecognizer = recognizer
      transcriber = null
      recognizer = null
      gate.reset()
      if (currentTranscriber) {
        await new Promise<void>((resolve) => {
          currentTranscriber.stopTranscribingAsync(
            () => {
              currentTranscriber.close(() => {
                handlers.onStatus('idle')
                resolve()
              })
            },
            () => {
              try {
                currentTranscriber.close()
              } catch {
                /* ignore */
              }
              handlers.onStatus('idle')
              resolve()
            },
          )
        })
        return
      }
      if (!currentRecognizer) return
      await new Promise<void>((resolve) => {
        currentRecognizer.stopContinuousRecognitionAsync(
          () => {
            currentRecognizer.close()
            handlers.onStatus('idle')
            resolve()
          },
          () => {
            currentRecognizer.close()
            handlers.onStatus('idle')
            resolve()
          },
        )
      })
    },
  }
}
