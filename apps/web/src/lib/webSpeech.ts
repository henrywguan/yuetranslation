import { stopSpeaking } from './tts'
import { createEchoGuard } from './echoGuard'
import { isAppleTouchDevice } from './mediaAccess'
import type { Lang, LiveSession, SpeechEventHandlers } from './types'

/** After this many silent no-speech ends on desktop, stop instead of restarting forever. */
const MAX_EMPTY_RESTARTS = 2

export type WebSpeechSessionOptions = {
  /**
   * Practice Partner: accept Cantonese *or* English in one mic turn.
   * Starts on zh-HK; empty Safari restarts alternate to en-US (and back)
   * until speech is heard, then stays on that locale for the turn.
   */
  bilingualYueEn?: boolean
}

export function createWebSpeechSession(
  handlers: SpeechEventHandlers,
  lockLang?: Lang,
  opts?: WebSpeechSessionOptions,
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
  let sichuanLocaleIndex = 0
  let tlLocaleIndex = 0
  let esLocaleIndex = 0
  let esesLocaleIndex = 0
  let viLocaleIndex = 0
  let thLocaleIndex = 0
  let loLocaleIndex = 0
  const bilingualYueEn = Boolean(opts?.bilingualYueEn)
  const echo = createEchoGuard()
  const apple = isAppleTouchDevice()
  // zh-HK is primary; rotate fallbacks when the browser rejects Cantonese.
  const yueLocales = ['zh-HK', 'yue-HK', 'yue-Hant-HK', 'zh-TW']
  const cmnLocales = ['zh-CN', 'zh-Hans-CN', 'cmn-Hans-CN', 'zh']
  const wuuLocales = ['wuu-CN', 'zh-CN']
  const sichuanLocales = ['zh-CN-sichuan', 'zh-CN']
  const tlLocales = ['fil-PH', 'tl-PH', 'fil']
  const esLocales = ['es-MX', 'es-US', 'es']
  /** Peninsular Spanish (Spain) — Web Speech like es/vi, never Azure fixed-locale. */
  const esesLocales = ['es-ES', 'es']
  const viLocales = ['vi-VN', 'vi']
  const thLocales = ['th-TH', 'th']
  const loLocales = ['lo-LA', 'lo']

  const yueLocale = () => yueLocales[yueLocaleIndex % yueLocales.length]
  const cmnLocale = () => cmnLocales[cmnLocaleIndex % cmnLocales.length]
  const wuuLocale = () => wuuLocales[wuuLocaleIndex % wuuLocales.length]
  const sichuanLocale = () => sichuanLocales[sichuanLocaleIndex % sichuanLocales.length]
  const tlLocale = () => tlLocales[tlLocaleIndex % tlLocales.length]
  const esLocale = () => esLocales[esLocaleIndex % esLocales.length]
  const esesLocale = () => esesLocales[esesLocaleIndex % esesLocales.length]
  const viLocale = () => viLocales[viLocaleIndex % viLocales.length]
  const thLocale = () => thLocales[thLocaleIndex % thLocales.length]
  const loLocale = () => loLocales[loLocaleIndex % loLocales.length]

  const resolveRecLang = (): string => {
    if (bilingualYueEn && activeLang === 'en') return 'en-US'
    if (activeLang === 'yue') return yueLocale()
    if (activeLang === 'cmn') return cmnLocale()
    if (activeLang === 'wuu') return wuuLocale()
    if (activeLang === 'sichuan') return sichuanLocale()
    if (activeLang === 'tl') return tlLocale()
    if (activeLang === 'es') return esLocale()
    if (activeLang === 'eses') return esesLocale()
    if (activeLang === 'vi') return viLocale()
    if (activeLang === 'th') return thLocale()
    if (activeLang === 'lo') return loLocale()
    return 'en-US'
  }

  const startOne = () => {
    if (stopped) return
    const rec = new SR()
    recognition = rec
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 1
    rec.lang = resolveRecLang()
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
        // Bilingual Practice Partner also stays put once speech was heard.
        if (!lockLang && !apple && !bilingualYueEn) activeLang = activeLang === 'en' ? 'yue' : 'en'
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
      if (localeRejected && bilingualYueEn && !heardSpeech) {
        activeLang = activeLang === 'en' ? 'yue' : 'en'
        queueMicrotask(() => startOne())
        return
      }
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
      if (
        localeRejected &&
        activeLang === 'sichuan' &&
        sichuanLocaleIndex < sichuanLocales.length - 1
      ) {
        sichuanLocaleIndex += 1
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
      if (localeRejected && activeLang === 'eses' && esesLocaleIndex < esesLocales.length - 1) {
        esesLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'vi' && viLocaleIndex < viLocales.length - 1) {
        viLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'th' && thLocaleIndex < thLocales.length - 1) {
        thLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'lo' && loLocaleIndex < loLocales.length - 1) {
        loLocaleIndex += 1
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
        if (bilingualYueEn) {
          // Alternate Yue ↔ English so English answers still get interim STT.
          activeLang = activeLang === 'en' ? 'yue' : 'en'
        } else if (activeLang === 'yue' && yueLocaleIndex < yueLocales.length - 1) {
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
      activeLang = lockLang || (bilingualYueEn ? 'yue' : 'en')
      yueLocaleIndex = 0
      cmnLocaleIndex = 0
      wuuLocaleIndex = 0
      sichuanLocaleIndex = 0
      tlLocaleIndex = 0
      esLocaleIndex = 0
      esesLocaleIndex = 0
      viLocaleIndex = 0
      thLocaleIndex = 0
      loLocaleIndex = 0
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
