import { stopSpeaking } from './tts'
import { createEchoGuard } from './echoGuard'
import { isAppleTouchDevice } from './mediaAccess'
import type { Lang, LiveSession, SpeechEventHandlers } from './types'

/** After this many silent no-speech ends, stop instead of restarting forever. */
const MAX_EMPTY_RESTARTS = 2

export function createWebSpeechSession(
  handlers: SpeechEventHandlers,
  lockLang?: Lang,
): LiveSession | null {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SR) return null
  let recognition: SpeechRecognition | null = null
  let stopped = true
  let activeLang: Lang = lockLang || 'en'
  let emptyRestarts = 0
  let heardSpeech = false
  let yueLocaleIndex = 0
  let cmnLocaleIndex = 0
  let wuuLocaleIndex = 0
  const echo = createEchoGuard()
  // iOS WebKit: Cantonese needs short sessions + restart; en-US handles continuous well.
  const apple = isAppleTouchDevice()
  // zh-HK is primary; rotate fallbacks when the browser rejects Cantonese.
  const yueLocales = ['zh-HK', 'yue-HK', 'yue-Hant-HK', 'zh-TW']
  const cmnLocales = ['zh-CN', 'zh-Hans-CN', 'cmn-Hans-CN', 'zh']
  const wuuLocales = ['wuu-CN', 'zh-CN']

  const yueLocale = () => yueLocales[yueLocaleIndex % yueLocales.length]
  const cmnLocale = () => cmnLocales[cmnLocaleIndex % cmnLocales.length]
  const wuuLocale = () => wuuLocales[wuuLocaleIndex % wuuLocales.length]

  const startOne = () => {
    if (stopped) return
    const rec = new SR()
    recognition = rec
    rec.continuous = !apple || activeLang === 'en'
    rec.interimResults = true
    rec.maxAlternatives = 1
    rec.lang =
      activeLang === 'yue'
        ? yueLocale()
        : activeLang === 'cmn'
          ? cmnLocale()
          : activeLang === 'wuu'
            ? wuuLocale()
            : 'en-US'
    rec.onresult = (event) => {
      let interim = ''
      let finalText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i]
        const t = r[0]?.transcript || ''
        if (r.isFinal) finalText += t
        else interim += t
      }
      if (echo.shouldIgnoreMic()) return
      if (interim.trim() || finalText.trim()) {
        heardSpeech = true
        emptyRestarts = 0
      }
      if (interim.trim()) handlers.onInterim(activeLang, interim.trim())
      if (finalText.trim()) {
        handlers.onFinal(activeLang, finalText.trim())
        // Don't flip languages mid-turn on mobile — it drops the next utterance.
        if (!lockLang && !apple) activeLang = activeLang === 'en' ? 'yue' : 'en'
      }
    }
    rec.onerror = (e) => {
      if (e.error === 'aborted') return
      if (e.error === 'no-speech') {
        // iOS often fires no-speech then onend; restart is handled in onend.
        return
      }
      if (
        e.error === 'language-not-supported' &&
        activeLang === 'yue' &&
        yueLocaleIndex < yueLocales.length - 1
      ) {
        yueLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (
        e.error === 'language-not-supported' &&
        activeLang === 'cmn' &&
        cmnLocaleIndex < cmnLocales.length - 1
      ) {
        cmnLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (e.error === 'not-allowed') {
        stopped = true
        handlers.onError('Microphone permission denied. Allow mic access and try again.')
        return
      }
      handlers.onError(e.error)
    }
    rec.onend = () => {
      if (stopped) {
        handlers.onStatus('idle')
        return
      }
      // Without an initial user-gesture, iOS restarts produce zero audio — cap them.
      if (!heardSpeech) {
        emptyRestarts += 1
        if (activeLang === 'yue' && yueLocaleIndex < yueLocales.length - 1) {
          yueLocaleIndex += 1
        }
        if (activeLang === 'cmn' && cmnLocaleIndex < cmnLocales.length - 1) {
          cmnLocaleIndex += 1
        }
        if (emptyRestarts > MAX_EMPTY_RESTARTS) {
          stopped = true
          recognition = null
          handlers.onError(
            'No speech detected. Tap the mic again, speak closer to the phone, and check mic permission.',
          )
          handlers.onStatus('idle')
          return
        }
      }
      try {
        startOne()
      } catch {
        stopped = true
        handlers.onStatus('idle')
      }
    }
    try {
      rec.start()
      handlers.onStatus('listening')
    } catch (err) {
      handlers.onError(String(err))
    }
  }

  return {
    setPlaybackActive(a) {
      echo.setPlaybackActive(a)
    },
    /**
     * Starts recognition. On Apple devices this MUST run in the same turn as a
     * user gesture (before any await) or Safari starts “listening” with no audio.
     */
    async start() {
      stopped = false
      emptyRestarts = 0
      heardSpeech = false
      yueLocaleIndex = 0
      cmnLocaleIndex = 0
      wuuLocaleIndex = 0
      startOne()
    },
    async stop() {
      stopped = true
      stopSpeaking()
      try {
        recognition?.stop()
      } catch {
        /* ignore */
      }
      recognition = null
      handlers.onStatus('idle')
    },
  }
}
