import { fetchTtsAudio } from './api'
import type { Lang } from './types'

let audio: HTMLAudioElement | null = null
let url: string | null = null
let gen = 0
let playing = false

export function isTtsPlaying() {
  return playing
}

export function stopSpeaking() {
  gen += 1
  playing = false
  if (audio) {
    audio.onended = null
    audio.pause()
    audio.src = ''
    audio = null
  }
  if (url) {
    URL.revokeObjectURL(url)
    url = null
  }
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
}

function browserSpeak(text: string, lang: Lang, g: number) {
  return new Promise<void>((resolve) => {
    if (!('speechSynthesis' in window)) {
      playing = false
      resolve()
      return
    }
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang === 'yue' ? 'zh-HK' : 'en-US'
    u.onend = () => {
      if (g === gen) playing = false
      resolve()
    }
    u.onerror = () => {
      if (g === gen) playing = false
      resolve()
    }
    playing = true
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  })
}

export async function speakText(text: string, lang: Lang) {
  const trimmed = text.trim()
  if (!trimmed) return
  stopSpeaking()
  const g = gen
  playing = true
  // #region agent log
  try {
    const w = window as unknown as { __agentDebugLogs?: unknown[] }
    const payload = {
      hypothesisId: 'E',
      location: 'tts.ts:speakText',
      message: 'speakText start',
      data: { lang, textLen: trimmed.length },
      timestamp: Date.now(),
    }
    w.__agentDebugLogs = w.__agentDebugLogs || []
    w.__agentDebugLogs.push(payload)
    fetch('http://127.0.0.1:7242/ingest/solo-autospeak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {})
  } catch {
    /* ignore */
  }
  // #endregion
  const blob = await fetchTtsAudio(trimmed, lang)
  if (g !== gen) {
    // #region agent log
    try {
      fetch('http://127.0.0.1:7242/ingest/solo-autospeak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hypothesisId: 'E',
          location: 'tts.ts:speakText',
          message: 'speakText aborted (gen mismatch)',
          data: { lang },
          timestamp: Date.now(),
        }),
      }).catch(() => {})
    } catch {
      /* ignore */
    }
    // #endregion
    return
  }
  if (blob && blob.size > 0) {
    // #region agent log
    try {
      fetch('http://127.0.0.1:7242/ingest/solo-autospeak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hypothesisId: 'E',
          location: 'tts.ts:speakText',
          message: 'speakText azure blob ok',
          data: { lang, size: blob.size },
          timestamp: Date.now(),
        }),
      }).catch(() => {})
    } catch {
      /* ignore */
    }
    // #endregion
    const objectUrl = URL.createObjectURL(blob)
    url = objectUrl
    const el = new Audio(objectUrl)
    audio = el
    await new Promise<void>((resolve) => {
      el.onended = () => {
        if (g === gen) playing = false
        resolve()
      }
      el.onerror = () => {
        if (g === gen) playing = false
        resolve()
      }
      void el.play().catch(() => {
        if (g === gen) playing = false
        resolve()
      })
    })
    return
  }
  // #region agent log
  try {
    fetch('http://127.0.0.1:7242/ingest/solo-autospeak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hypothesisId: 'E',
        location: 'tts.ts:speakText',
        message: 'speakText fallback browserSpeak',
        data: { lang, textLen: trimmed.length, blobNull: !blob },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
  } catch {
    /* ignore */
  }
  // #endregion
  await browserSpeak(trimmed, lang, g)
}
