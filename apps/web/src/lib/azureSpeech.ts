import { canUseMicrophone, micBlockedMessage } from './mediaAccess'
import {
  addMicPcmListener,
  connectMicAnalyser,
  ensureSharedAudioContext,
  getSharedAudioSampleRate,
} from './audioReactive'
import { createEchoGuard } from './echoGuard'
import { azureUsesFixedLocale } from './liveStt'
import { AZURE_PCM_RATE, createLinearResampler, floatTo16BitPcm } from './pcmResample'
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
  const resample = createLinearResampler(getSharedAudioSampleRate(), AZURE_PCM_RATE)
  const format = SpeechSDK.AudioStreamFormat.getWaveFormatPCM(AZURE_PCM_RATE, 16, 1)
  const push = SpeechSDK.AudioInputStream.createPushStream(format)
  let open = true
  const unsub = addMicPcmListener((samples) => {
    if (!open) return
    try {
      const at16k = resample(samples)
      if (!at16k.length) return
      push.write(floatTo16BitPcm(at16k))
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
  // Sichuan before generic zh-CN / cmn — locale is zh-CN-sichuan.
  if (l.includes('sichuan')) return 'sichuan'
  if (l.startsWith('zh-cn') || l.includes('cmn') || l.includes('hans') || l === 'zh-cn') return 'cmn'
  if (l.startsWith('wuu') || l.includes('wuu')) return 'wuu'
  if (l.startsWith('fil') || l.startsWith('tl')) return 'tl'
  // es-ES → eses (Peninsular Spanish); es-MX / es-US / bare es → es (Mexican).
  if (l.startsWith('es-es')) return 'eses'
  if (l.startsWith('es')) return 'es'
  if (l.startsWith('vi')) return 'vi'
  if (l.startsWith('th')) return 'th'
  if (l.startsWith('lo')) return 'lo'
  if (l.startsWith('ko')) return 'ko'
  if (l.startsWith('ja')) return 'ja'
  if (l.startsWith('id')) return 'id'
  if (l.startsWith('ms')) return 'ms'
  // pt-PT → ptpt (European); pt-BR / bare pt → pt (Brazilian). Never cross-map.
  if (l.startsWith('pt-pt')) return 'ptpt'
  if (l.startsWith('pt')) return 'pt'
  if (l.startsWith('fr')) return 'fr'
  if (l.startsWith('hi')) return 'hi'
  if (l.startsWith('km')) return 'km'
  if (l.startsWith('my')) return 'my'
  if (l.startsWith('jv')) return 'jv'
  if (l.startsWith('it')) return 'it'
  if (l.startsWith('de')) return 'de'
  if (l.startsWith('nl')) return 'nl'
  // ar-EG → ar (Egyptian colloquial); ar-SA and other Arabic locales → arsa (MSA).
  if (l.startsWith('ar-eg')) return 'ar'
  if (l.startsWith('ar')) return 'arsa'
  if (l.startsWith('ta')) return 'ta'
  if (l.startsWith('tr')) return 'tr'
  if (l.startsWith('bn')) return 'bn'
  if (l.startsWith('te')) return 'te'
  if (l.startsWith('gu')) return 'gu'
  if (l.startsWith('kn')) return 'kn'
  if (l.startsWith('pl')) return 'pl'
  if (l.startsWith('ro')) return 'ro'
  if (l.startsWith('cs')) return 'cs'
  if (l.startsWith('el')) return 'el'
  if (l.startsWith('hu')) return 'hu'
  if (l.startsWith('sv')) return 'sv'
  if (l.startsWith('ru')) return 'ru'
  if (l.startsWith('uk')) return 'uk'
  if (l.startsWith('he')) return 'he'
  if (l.startsWith('fa')) return 'fa'
  if (l.startsWith('ur')) return 'ur'
  // Batch 3a–4: exact / hyphen-boundary matches (sichuan is already handled above; fil-PH stays tl).
  if (l === 'ml' || l.startsWith('ml-')) return 'ml'
  if (l === 'mr' || l.startsWith('mr-')) return 'mr'
  if (l === 'pa' || l.startsWith('pa-')) return 'pa'
  if (l === 'or' || l.startsWith('or-')) return 'or'
  if (l === 'si' || l.startsWith('si-')) return 'si'
  if (l === 'ne' || l.startsWith('ne-')) return 'ne'
  if (l === 'da' || l.startsWith('da-')) return 'da'
  if (l === 'nb' || l.startsWith('nb-') || l === 'no' || l.startsWith('no-')) return 'nb'
  if (l === 'fi' || l.startsWith('fi-')) return 'fi'
  if (l === 'sk' || l.startsWith('sk-')) return 'sk'
  if (l === 'hr' || l.startsWith('hr-')) return 'hr'
  if (l === 'ca' || l.startsWith('ca-')) return 'ca'
  if (l === 'az' || l.startsWith('az-')) return 'az'
  if (l === 'kk' || l.startsWith('kk-')) return 'kk'
  if (l === 'uz' || l.startsWith('uz-')) return 'uz'
  if (l === 'bg' || l.startsWith('bg-')) return 'bg'
  if (l === 'sr' || l.startsWith('sr-')) return 'sr'
  if (l === 'sw' || l.startsWith('sw-')) return 'sw'
  if (l === 'af' || l.startsWith('af-')) return 'af'
  if (l === 'et' || l.startsWith('et-')) return 'et'
  if (l === 'lv' || l.startsWith('lv-')) return 'lv'
  if (l === 'lt' || l.startsWith('lt-')) return 'lt'
  if (l === 'ga' || l.startsWith('ga-')) return 'ga'
  if (l === 'cy' || l.startsWith('cy-')) return 'cy'
  if (l === 'eu' || l.startsWith('eu-')) return 'eu'
  if (l === 'gl' || l.startsWith('gl-')) return 'gl'
  if (l === 'mt' || l.startsWith('mt-')) return 'mt'
  if (l === 'is' || l.startsWith('is-')) return 'is'
  if (l === 'bs' || l.startsWith('bs-')) return 'bs'
  if (l === 'sq' || l.startsWith('sq-')) return 'sq'
  if (l === 'zu' || l.startsWith('zu-')) return 'zu'
  if (l === 'so' || l.startsWith('so-')) return 'so'
  if (l === 'as' || l.startsWith('as-')) return 'as'
  if (l === 'mk' || l.startsWith('mk-')) return 'mk'
  if (l === 'mn' || l.startsWith('mn-')) return 'mn'
  if (l === 'ps' || l.startsWith('ps-')) return 'ps'
  if (l === 'hy' || l.startsWith('hy-')) return 'hy'
  if (l === 'ka' || l.startsWith('ka-')) return 'ka'
  if (l === 'am' || l.startsWith('am-')) return 'am'
  // Generic zh without region — prefer Cantonese for HK product default.
  if (l.startsWith('zh')) return 'yue'
  return 'en'
}

function langToLocale(lang: Lang): string {
  if (lang === 'yue') return 'zh-HK'
  if (lang === 'cmn') return 'zh-CN'
  if (lang === 'wuu') return 'wuu-CN'
  if (lang === 'sichuan') return 'zh-CN-sichuan'
  if (lang === 'tl') return 'fil-PH'
  if (lang === 'es') return 'es-MX'
  if (lang === 'eses') return 'es-ES'
  if (lang === 'vi') return 'vi-VN'
  if (lang === 'th') return 'th-TH'
  if (lang === 'lo') return 'lo-LA'
  if (lang === 'ko') return 'ko-KR'
  if (lang === 'ja') return 'ja-JP'
  if (lang === 'id') return 'id-ID'
  if (lang === 'ms') return 'ms-MY'
  if (lang === 'pt') return 'pt-BR'
  if (lang === 'fr') return 'fr-FR'
  if (lang === 'hi') return 'hi-IN'
  if (lang === 'km') return 'km-KH'
  if (lang === 'my') return 'my-MM'
  if (lang === 'jv') return 'jv-ID'
  if (lang === 'it') return 'it-IT'
  if (lang === 'de') return 'de-DE'
  if (lang === 'nl') return 'nl-NL'
  if (lang === 'ar') return 'ar-EG'
  if (lang === 'arsa') return 'ar-SA'
  if (lang === 'ta') return 'ta-IN'
  if (lang === 'ptpt') return 'pt-PT'
  if (lang === 'tr') return 'tr-TR'
  if (lang === 'bn') return 'bn-IN'
  if (lang === 'te') return 'te-IN'
  if (lang === 'gu') return 'gu-IN'
  if (lang === 'kn') return 'kn-IN'
  if (lang === 'pl') return 'pl-PL'
  if (lang === 'ro') return 'ro-RO'
  if (lang === 'cs') return 'cs-CZ'
  if (lang === 'el') return 'el-GR'
  if (lang === 'hu') return 'hu-HU'
  if (lang === 'sv') return 'sv-SE'
  if (lang === 'ru') return 'ru-RU'
  if (lang === 'uk') return 'uk-UA'
  if (lang === 'he') return 'he-IL'
  if (lang === 'fa') return 'fa-IR'
  if (lang === 'ur') return 'ur-IN'
  if (lang === 'ml') return 'ml-IN'
  if (lang === 'mr') return 'mr-IN'
  if (lang === 'pa') return 'pa-IN'
  if (lang === 'or') return 'or-IN'
  if (lang === 'si') return 'si-LK'
  if (lang === 'ne') return 'ne-NP'
  if (lang === 'da') return 'da-DK'
  if (lang === 'nb') return 'nb-NO'
  if (lang === 'fi') return 'fi-FI'
  if (lang === 'sk') return 'sk-SK'
  if (lang === 'hr') return 'hr-HR'
  if (lang === 'ca') return 'ca-ES'
  if (lang === 'az') return 'az-AZ'
  if (lang === 'kk') return 'kk-KZ'
  if (lang === 'uz') return 'uz-UZ'
  if (lang === 'bg') return 'bg-BG'
  if (lang === 'sr') return 'sr-RS'
  if (lang === 'sw') return 'sw-KE'
  if (lang === 'af') return 'af-ZA'
  if (lang === 'et') return 'et-EE'
  if (lang === 'lv') return 'lv-LV'
  if (lang === 'lt') return 'lt-LT'
  if (lang === 'ga') return 'ga-IE'
  if (lang === 'cy') return 'cy-GB'
  if (lang === 'eu') return 'eu-ES'
  if (lang === 'gl') return 'gl-ES'
  if (lang === 'mt') return 'mt-MT'
  if (lang === 'is') return 'is-IS'
  if (lang === 'bs') return 'bs-BA'
  if (lang === 'sq') return 'sq-AL'
  if (lang === 'zu') return 'zu-ZA'
  if (lang === 'so') return 'so-SO'
  if (lang === 'as') return 'as-IN'
  if (lang === 'mk') return 'mk-MK'
  if (lang === 'mn') return 'mn-MN'
  if (lang === 'ps') return 'ps-AF'
  if (lang === 'hy') return 'hy-AM'
  if (lang === 'ka') return 'ka-GE'
  if (lang === 'am') return 'am-ET'
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
      // Solo direction / Conversation pane lock → fixed locale (zh-HK for Yue).
      // LID transcriber (en-US + zh-HK) often picks English for Cantonese;
      // emitLang then pinned that English text onto the Yue pane.
      if (azureUsesFixedLocale(lockLang) && lockLang) {
        await startWithRecognizer(lockLang)
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
