import { canUseMicrophone, micBlockedMessage } from './mediaAccess'
import { createEchoGuard } from './echoGuard'
import { getSpeechToken } from './speechToken'
import type { Lang, LiveSession, SpeechEventHandlers, SpeechMeta } from './types'

function localeToLang(locale: string): Lang {
  const l = locale.toLowerCase()
  if (l.includes('yue') || l.includes('hk') || l === 'zh-hk' || l.startsWith('zh-hk')) return 'yue'
  if (l.startsWith('zh-cn') || l.includes('cmn') || l.includes('hans') || l === 'zh-cn') return 'cmn'
  // Generic zh without region — prefer Cantonese for HK product default.
  if (l.startsWith('zh')) return 'yue'
  return 'en'
}

function langToLocale(lang: Lang): string {
  if (lang === 'yue') return 'zh-HK'
  if (lang === 'cmn') return 'zh-CN'
  return 'en-US'
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

function buildAudioConfig(
  SpeechSDK: typeof import('microsoft-cognitiveservices-speech-sdk'),
  mediaStream?: MediaStream | null,
) {
  // Prefer a stream opened in the user-gesture turn — iOS often blocks a second
  // fromDefaultMicrophoneInput() after awaits (token fetch / dynamic import).
  if (mediaStream && mediaStream.getAudioTracks().some((t) => t.readyState === 'live')) {
    return SpeechSDK.AudioConfig.fromStreamInput(mediaStream)
  }
  return SpeechSDK.AudioConfig.fromDefaultMicrophoneInput()
}

export async function createAzureLiveSession(
  handlers: SpeechEventHandlers,
  mediaStream?: MediaStream | null,
  /** Solo direction or Conversation pane — skip auto-detect so Cantonese isn’t heard as English. */
  lockLang?: Lang,
): Promise<LiveSession | null> {
  let tokenPayload: { token: string; region: string }
  try {
    const t = await getSpeechToken()
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
  const echo = createEchoGuard()
  const gate = createSpeakerGate()

  function buildSpeechConfig(fixedLang?: Lang) {
    const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(
      tokenPayload.token,
      tokenPayload.region,
    )
    if (fixedLang) {
      speechConfig.speechRecognitionLanguage = langToLocale(fixedLang)
    } else {
      speechConfig.setProperty(
        SpeechSDK.PropertyId.SpeechServiceConnection_LanguageIdMode,
        'Continuous',
      )
    }
    speechConfig.setProperty(
      SpeechSDK.PropertyId.SpeechServiceResponse_DiarizeIntermediateResults,
      'true',
    )
    return speechConfig
  }

  function emitLang(detectedLocale: string): Lang {
    return lockLang || localeToLang(detectedLocale)
  }

  async function startWithTranscriber(): Promise<boolean> {
    const speechConfig = buildSpeechConfig()
    const autoDetect = SpeechSDK.AutoDetectSourceLanguageConfig.fromLanguages(['en-US', 'zh-HK'])
    const audioConfig = buildAudioConfig(SpeechSDK, mediaStream)
    const next = SpeechSDK.ConversationTranscriber.FromConfig(speechConfig, autoDetect, audioConfig)

    next.transcribing = (_s, e) => {
      if (echo.shouldIgnoreMic()) return
      if (e.result.reason !== SpeechSDK.ResultReason.RecognizingSpeech) return
      const text = e.result.text?.trim()
      if (!text) return
      const speakerId = e.result.speakerId
      if (!gate.accept(speakerId)) return
      handlers.onInterim(emitLang(e.result.language || 'en-US'), text, metaFromSpeaker(speakerId))
    }
    next.transcribed = (_s, e) => {
      if (echo.shouldIgnoreMic()) return
      if (e.result.reason !== SpeechSDK.ResultReason.RecognizedSpeech) return
      const text = e.result.text?.trim()
      if (!text) return
      const speakerId = e.result.speakerId
      if (!gate.accept(speakerId)) return
      handlers.onFinal(emitLang(e.result.language || 'en-US'), text, metaFromSpeaker(speakerId))
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

  async function startWithRecognizer(fixedLang: Lang | undefined = lockLang): Promise<void> {
    const speechConfig = buildSpeechConfig(fixedLang)
    const audioConfig = buildAudioConfig(SpeechSDK, mediaStream)
    const next = fixedLang
      ? new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig)
      : SpeechSDK.SpeechRecognizer.FromConfig(
          speechConfig,
          SpeechSDK.AutoDetectSourceLanguageConfig.fromLanguages(['en-US', 'zh-HK']),
          audioConfig,
        )

    next.recognizing = (_s, e) => {
      if (echo.shouldIgnoreMic()) return
      if (e.result.reason !== SpeechSDK.ResultReason.RecognizingSpeech) return
      const text = e.result.text?.trim()
      if (!text) return
      const speakerId = e.result.speakerId
      if (!gate.accept(speakerId)) return
      const detected = fixedLang
        ? langToLocale(fixedLang)
        : SpeechSDK.AutoDetectSourceLanguageResult.fromResult(e.result).language || 'en-US'
      handlers.onInterim(emitLang(detected), text, metaFromSpeaker(speakerId))
    }
    next.recognized = (_s, e) => {
      if (echo.shouldIgnoreMic()) return
      if (e.result.reason !== SpeechSDK.ResultReason.RecognizedSpeech) return
      const text = e.result.text?.trim()
      if (!text) return
      const speakerId = e.result.speakerId
      if (!gate.accept(speakerId)) return
      const detected = fixedLang
        ? langToLocale(fixedLang)
        : SpeechSDK.AutoDetectSourceLanguageResult.fromResult(e.result).language || 'en-US'
      handlers.onFinal(emitLang(detected), text, metaFromSpeaker(speakerId))
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
      echo.setPlaybackActive(active)
    },
    async start() {
      gate.reset()
      if (!canUseMicrophone()) {
        throw new Error(micBlockedMessage() || 'Microphone unavailable.')
      }
      // Locked languages: prefer the multilingual transcriber for fast interim streaming.
      // Fixed en-US recognizer feels sluggish; fixed zh-HK is flaky — transcriber + lockLang pins the pane.
      // Mandarin (zh-CN): use fixed recognizer — auto-detect set is en-US + zh-HK only.
      if (lockLang === 'cmn') {
        await startWithRecognizer('cmn')
        return
      }
      if (lockLang === 'en' || lockLang === 'yue') {
        try {
          await startWithTranscriber()
        } catch (err) {
          transcriber = null
          gate.reset()
          if (!canUseMicrophone()) {
            throw err instanceof Error ? err : new Error(String(err))
          }
          await startWithRecognizer(lockLang)
        }
        return
      }
      try {
        await startWithTranscriber()
      } catch (err) {
        // Diarization endpoint unavailable — fall back to plain recognition (no speaker lock).
        transcriber = null
        gate.reset()
        if (!canUseMicrophone()) {
          throw err instanceof Error ? err : new Error(String(err))
        }
        await startWithRecognizer(undefined)
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
