import { canUseMicrophone, micBlockedMessage } from './mediaAccess'
import {
  addMicPcmListener,
  connectMicAnalyser,
  ensureSharedAudioContext,
  getSharedAudioSampleRate,
} from './audioReactive'
import { createEchoGuard } from './echoGuard'
import { getSpeechToken } from './speechToken'
import type { Lang, LiveSession, SpeechEventHandlers, SpeechMeta } from './types'

type SpeechSdk = typeof import('microsoft-cognitiveservices-speech-sdk')

type AudioPump = {
  audioConfig: import('microsoft-cognitiveservices-speech-sdk').AudioConfig
  close: () => void
}

/**
 * Feed Azure from our persistent AudioContext instead of fromStreamInput(MediaStream).
 * The SDK closes its own AudioContext on stop(), and the next session then
 * starts “listening” with a dead graph (icon on, no speech).
 */
function createAudioPump(SpeechSDK: SpeechSdk, mediaStream?: MediaStream | null): AudioPump {
  const live =
    mediaStream && mediaStream.getAudioTracks().some((t) => t.readyState === 'live')
      ? mediaStream
      : null
  if (!live) {
    return {
      audioConfig: SpeechSDK.AudioConfig.fromDefaultMicrophoneInput(),
      close() {},
    }
  }

  ensureSharedAudioContext()
  connectMicAnalyser(live)
  const format = SpeechSDK.AudioStreamFormat.getWaveFormatPCM(getSharedAudioSampleRate(), 16, 1)
  const push = SpeechSDK.AudioInputStream.createPushStream(format)
  let open = true
  const unsub = addMicPcmListener((buf) => {
    if (!open) return
    try {
      push.write(buf)
    } catch {
      open = false
    }
  })
  return {
    audioConfig: SpeechSDK.AudioConfig.fromStreamInput(push),
    close() {
      if (!open) return
      open = false
      unsub()
      try {
        push.close()
      } catch {
        /* ignore */
      }
    },
  }
}

function waitEngineStop(
  engine: { sessionStopped: unknown },
  startStop: (ok: () => void, err: () => void) => void,
  close: () => void,
): Promise<void> {
  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      try {
        close()
      } catch {
        /* ignore */
      }
      resolve()
    }
    const timer = window.setTimeout(finish, 2000)
    engine.sessionStopped = () => finish()
    startStop(finish, finish)
  })
}

function localeToLang(locale: string): Lang {
  const l = locale.toLowerCase()
  if (l.includes('yue') || l.includes('hk') || l === 'zh-hk' || l.startsWith('zh-hk')) return 'yue'
  if (l.startsWith('zh-cn') || l.includes('cmn') || l.includes('hans') || l === 'zh-cn') return 'cmn'
  if (l.startsWith('wuu') || l.includes('wuu')) return 'wuu'
  if (l.startsWith('fil') || l.startsWith('tl')) return 'tl'
  if (l.startsWith('es')) return 'es'
  if (l.startsWith('vi')) return 'vi'
  // Generic zh without region — prefer Cantonese for HK product default.
  if (l.startsWith('zh')) return 'yue'
  return 'en'
}

function langToLocale(lang: Lang): string {
  if (lang === 'yue') return 'zh-HK'
  if (lang === 'cmn') return 'zh-CN'
  if (lang === 'wuu') return 'wuu-CN'
  if (lang === 'tl') return 'fil-PH'
  if (lang === 'es') return 'es-MX'
  if (lang === 'vi') return 'vi-VN'
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
  let audioPump: AudioPump | null = null
  const echo = createEchoGuard()
  const gate = createSpeakerGate()

  function replaceAudioPump(): AudioPump {
    audioPump?.close()
    audioPump = createAudioPump(SpeechSDK, mediaStream)
    return audioPump
  }

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
    const audioConfig = replaceAudioPump().audioConfig
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
      // Quiet EndOfStream cancels often omit errorDetails — still tear down via onError
      // when the store is not already flushing, so live=true zombies cannot block the next mic.
      const detail = e.errorDetails?.trim()
      if (detail || e.reason === SpeechSDK.CancellationReason.Error) {
        handlers.onError(detail || 'Speech recognition error')
      } else {
        handlers.onError('')
      }
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
    const audioConfig = replaceAudioPump().audioConfig
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
      const detail = e.errorDetails?.trim()
      if (detail || e.reason === SpeechSDK.CancellationReason.Error) {
        handlers.onError(detail || 'Speech recognition error')
      } else {
        handlers.onError('')
      }
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
      if (lockLang === 'tl') {
        await startWithRecognizer('tl')
        return
      }
      if (lockLang === 'es') {
        await startWithRecognizer('es')
        return
      }
      if (lockLang === 'vi') {
        await startWithRecognizer('vi')
        return
      }
      if (lockLang === 'cmn') {
        await startWithRecognizer('cmn')
        return
      }
      if (lockLang === 'wuu') {
        await startWithRecognizer('wuu')
        return
      }
      if (lockLang === 'en' || lockLang === 'yue') {
        try {
          await startWithTranscriber()
        } catch (err) {
          transcriber = null
          audioPump?.close()
          audioPump = null
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
        audioPump?.close()
        audioPump = null
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
      const currentPump = audioPump
      transcriber = null
      recognizer = null
      audioPump = null
      gate.reset()
      currentPump?.close()
      // Stop both if a fallthrough ever started recognizer + transcriber on one stream.
      if (currentTranscriber) {
        await waitEngineStop(
          currentTranscriber,
          (ok, err) => currentTranscriber.stopTranscribingAsync(ok, err),
          () => currentTranscriber.close(),
        )
      }
      if (currentRecognizer) {
        await waitEngineStop(
          currentRecognizer,
          (ok, err) => currentRecognizer.stopContinuousRecognitionAsync(ok, err),
          () => currentRecognizer.close(),
        )
      }
      if (currentTranscriber || currentRecognizer) handlers.onStatus('idle')
    },
  }
}
