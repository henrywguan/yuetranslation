import { stopSpeaking } from './tts'
import { createEchoGuard } from './echoGuard'
import { isAppleTouchDevice } from './mediaAccess'
import type { Lang, LiveSession, SpeechEventHandlers } from './types'

/** After this many silent no-speech ends on desktop, stop instead of restarting forever. */
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
  let tlLocaleIndex = 0
  let esLocaleIndex = 0
  let viLocaleIndex = 0
  const echo = createEchoGuard()
  const apple = isAppleTouchDevice()
  // zh-HK is primary; rotate fallbacks when the browser rejects Cantonese.
  const yueLocales = ['zh-HK', 'yue-HK', 'yue-Hant-HK', 'zh-TW']
  const cmnLocales = ['zh-CN', 'zh-Hans-CN', 'cmn-Hans-CN', 'zh']
  const wuuLocales = ['wuu-CN', 'zh-CN']
  const tlLocales = ['fil-PH', 'tl-PH', 'fil']
  const esLocales = ['es-MX', 'es-US', 'es']
  const viLocales = ['vi-VN', 'vi']

  const yueLocale = () => yueLocales[yueLocaleIndex % yueLocales.length]
  const cmnLocale = () => cmnLocales[cmnLocaleIndex % cmnLocales.length]
  const wuuLocale = () => wuuLocales[wuuLocaleIndex % wuuLocales.length]
  const tlLocale = () => tlLocales[tlLocaleIndex % tlLocales.length]
  const esLocale = () => esLocales[esLocaleIndex % esLocales.length]
  const viLocale = () => viLocales[viLocaleIndex % viLocales.length]
  const startOne = () => {
    if (stopped) return
    const rec = new SR()
    recognition = rec
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 1
    rec.lang =
      activeLang === 'yue'
        ? yueLocale()
        : activeLang === 'cmn'
          ? cmnLocale()
          : activeLang === 'wuu'
            ? wuuLocale()
            : activeLang === 'tl'
              ? tlLocale()
              : activeLang === 'es'
                ? esLocale()
                : activeLang === 'vi'
                  ? viLocale()
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
      // Safari often returns service-not-allowed (not language-not-supported)
      // for locales it cannot recognize (e.g. fil-PH Tagalog).
      const localeRejected =
        e.error === 'language-not-supported' || e.error === 'service-not-allowed'
      if (localeRejected && activeLang === 'yue' && yueLocaleIndex < yueLocales.length - 1) {
        yueLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'cmn' && cmnLocaleIndex < cmnLocales.length - 1) {
        cmnLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'wuu' && wuuLocaleIndex < wuuLocales.length - 1) {
        wuuLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'tl' && tlLocaleIndex < tlLocales.length - 1) {
        tlLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'es' && esLocaleIndex < esLocales.length - 1) {
        esLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'vi' && viLocaleIndex < viLocales.length - 1) {
        viLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (e.error === 'not-allowed') {
        stopped = true
        handlers.onError('Microphone permission denied. Allow mic access and try again.')
        return
      }
      if (e.error === 'service-not-allowed' || e.error === 'language-not-supported') {
        stopped = true
        handlers.onError(
          activeLang === 'tl'
            ? 'Tagalog speech recognition is not available in this browser. Try again on a network that can reach live speech, or use another device.'
            : 'Speech recognition is not available for this language here. Try again or switch language.',
        )
        return
      }
      handlers.onError(e.error)
    }
    rec.onend = () => {
      if (stopped) {
        handlers.onStatus('idle')
        return
      }
      // iOS tap-to-talk (every language): Safari often fires onend before the
      // user speaks. The store’s 7s silence timer / second tap ends the turn —
      // do not kill listening after two empty restarts (button flipped back to
      // “hold or tap” while the orange Safari mic stayed on).
      if (!heardSpeech) {
        emptyRestarts += 1
        if (activeLang === 'yue' && yueLocaleIndex < yueLocales.length - 1) {
          yueLocaleIndex += 1
        }
        if (activeLang === 'cmn' && cmnLocaleIndex < cmnLocales.length - 1) {
          cmnLocaleIndex += 1
        }
        if (!apple && emptyRestarts > MAX_EMPTY_RESTARTS) {
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
      tlLocaleIndex = 0
      esLocaleIndex = 0
      viLocaleIndex = 0
      startOne()
    },
    async stop() {
      stopped = true
      stopSpeaking({ preserveSession: apple })
      const rec = recognition
      recognition = null
      if (!rec) {
        handlers.onStatus('idle')
        return
      }
      // Chrome/Safari keep a global recognition lock until onend. Starting the
      // next turn before that fires shows the mic icon with no audio.
      await new Promise<void>((resolve) => {
        let settled = false
        const finish = () => {
          if (settled) return
          settled = true
          window.clearTimeout(timer)
          rec.onend = null
          rec.onerror = null
          rec.onresult = null
          resolve()
        }
        const timer = window.setTimeout(finish, apple ? 800 : 400)
        rec.onend = () => finish()
        try {
          if (apple) rec.stop()
          else rec.abort()
        } catch {
          try {
            rec.stop()
          } catch {
            finish()
          }
        }
      })
      handlers.onStatus('idle')
    },
  }
}
