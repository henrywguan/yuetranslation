import { isTtsPlaying, stopSpeaking } from './tts'
import type { Lang, LiveSession, SpeechEventHandlers } from './types'

/** Ignore mic while TTS plays and briefly after — blocks speaker echo becoming a new turn. */
const ECHO_TAIL_MS = 600

export function createWebSpeechSession(
  handlers: SpeechEventHandlers,
  lockLang?: Lang,
): LiveSession | null {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SR) return null
  let recognition: SpeechRecognition | null = null
  let stopped = true
  let activeLang: Lang = lockLang || 'en'
  let playbackActive = false
  let ignoreUntil = 0

  function shouldIgnoreMic() {
    return playbackActive || isTtsPlaying() || Date.now() < ignoreUntil
  }

  const startOne = () => {
    if (stopped) return
    const rec = new SR()
    recognition = rec
    rec.continuous = true
    rec.interimResults = true
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
      if (shouldIgnoreMic()) return
      if (interim.trim()) handlers.onInterim(activeLang, interim.trim())
      if (finalText.trim()) {
        handlers.onFinal(activeLang, finalText.trim())
        if (!lockLang) activeLang = activeLang === 'en' ? 'yue' : 'en'
      }
    }
    rec.onerror = (e) => {
      if (e.error !== 'no-speech' && e.error !== 'aborted') handlers.onError(e.error)
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
      playbackActive = a
      if (!a) ignoreUntil = Date.now() + ECHO_TAIL_MS
    },
    async start() {
      stopped = false
      startOne()
    },
    async stop() {
      stopped = true
      stopSpeaking()
      recognition?.stop()
      recognition = null
      handlers.onStatus('idle')
    },
  }
}
