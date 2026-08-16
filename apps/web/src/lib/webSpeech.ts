import { stopSpeaking } from './tts'
import { createEchoGuard } from './echoGuard'
import { isAppleTouchDevice } from './mediaAccess'
import type { Lang, LiveSession, SpeechEventHandlers } from './types'

export function createWebSpeechSession(
  handlers: SpeechEventHandlers,
  lockLang?: Lang,
): LiveSession | null {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SR) return null
  let recognition: SpeechRecognition | null = null
  let stopped = true
  let activeLang: Lang = lockLang || 'en'
  const echo = createEchoGuard()
  // iOS WebKit: continuous mode often yields zero results; use short sessions + restart.
  const apple = isAppleTouchDevice()

  const startOne = () => {
    if (stopped) return
    const rec = new SR()
    recognition = rec
    rec.continuous = !apple
    rec.interimResults = true
    rec.maxAlternatives = 1
    rec.lang = activeLang === 'yue' ? 'zh-HK' : 'en-US'
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
      if (interim.trim()) handlers.onInterim(activeLang, interim.trim())
      if (finalText.trim()) {
        handlers.onFinal(activeLang, finalText.trim())
        // Don't flip languages mid-turn on mobile — it drops the next utterance.
        if (!lockLang && !apple) activeLang = activeLang === 'en' ? 'yue' : 'en'
      }
    }
    rec.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return
      if (e.error === 'not-allowed') {
        handlers.onError('Microphone permission denied. Allow mic access and try again.')
        return
      }
      handlers.onError(e.error)
    }
    rec.onend = () => {
      if (!stopped) {
        try {
          startOne()
        } catch {
          handlers.onStatus('idle')
        }
      } else handlers.onStatus('idle')
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
    async start() {
      stopped = false
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
