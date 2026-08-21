import { fetchTtsAudio } from './api'
import type { Lang } from './types'

/** Tiny silent WAV — played during a user gesture to unlock later HTMLAudio playback (iOS). */
const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAAABkYXRhAAAAAA=='

let audio: HTMLAudioElement | null = null
let url: string | null = null
let gen = 0
let playing = false
/** True after a successful gesture-time unlock play on the shared element. */
let unlocked = false

function agentTtsLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>,
) {
  // #region agent log
  try {
    const w = window as unknown as { __agentDebugLogs?: unknown[] }
    const payload = { hypothesisId, location, message, data, timestamp: Date.now() }
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
}

function ensureSharedAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio()
    audio.setAttribute('playsinline', 'true')
    audio.preload = 'auto'
  }
  return audio
}

export function isTtsPlaying() {
  return playing
}

/** Whether gesture unlock succeeded (for probes / diagnostics). */
export function isTtsPlaybackUnlocked() {
  return unlocked
}

/**
 * Call synchronously inside a user gesture (mic pointerdown / startHold)
 * so later async auto-speak `audio.play()` is allowed on iOS Safari/PWA.
 * Reuses one shared HTMLAudioElement for all TTS playback.
 */
export function unlockTtsPlayback(): void {
  if (typeof window === 'undefined') return
  const el = ensureSharedAudio()
  // Warm speechSynthesis resume in the same gesture (browserSpeak fallback).
  try {
    if ('speechSynthesis' in window) window.speechSynthesis.resume()
  } catch {
    /* ignore */
  }
  // Already unlocked and idle — keep the shared element warm without re-playing silence.
  if (unlocked && !playing && !el.src) {
    agentTtsLog('E', 'tts.ts:unlockTtsPlayback', 'unlock already warm', {
      unlocked,
      playing,
    })
    return
  }
  try {
    el.pause()
  } catch {
    /* ignore */
  }
  el.src = SILENT_WAV
  el.volume = 0.01
  el.muted = false
  const playResult = el.play()
  agentTtsLog('E', 'tts.ts:unlockTtsPlayback', 'unlock play started', {
    hasPlayPromise: Boolean(playResult && typeof playResult.then === 'function'),
    wasUnlocked: unlocked,
  })
  if (playResult && typeof playResult.then === 'function') {
    void playResult
      .then(() => {
        unlocked = true
        try {
          el.pause()
          el.currentTime = 0
        } catch {
          /* ignore */
        }
        // Drop silent src so the next speakText can set a blob URL cleanly.
        if (!playing) {
          el.removeAttribute('src')
          try {
            el.load()
          } catch {
            /* ignore */
          }
        }
        agentTtsLog('E', 'tts.ts:unlockTtsPlayback', 'unlock play ok', { unlocked: true })
      })
      .catch((err: unknown) => {
        agentTtsLog('E', 'tts.ts:unlockTtsPlayback', 'unlock play rejected', {
          name: err instanceof Error ? err.name : 'unknown',
          message: err instanceof Error ? err.message : String(err),
        })
      })
  } else {
    // Older engines may return undefined from play().
    unlocked = true
    agentTtsLog('E', 'tts.ts:unlockTtsPlayback', 'unlock play sync ok', { unlocked: true })
  }
}

export function stopSpeaking() {
  gen += 1
  playing = false
  if (audio) {
    audio.onended = null
    audio.onerror = null
    try {
      audio.pause()
    } catch {
      /* ignore */
    }
    // Keep the shared element (iOS unlock) — clear src only.
    try {
      audio.removeAttribute('src')
      audio.load()
    } catch {
      audio.src = ''
    }
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
  agentTtsLog('E', 'tts.ts:speakText', 'speakText start', {
    lang,
    textLen: trimmed.length,
    unlocked,
    reusedAudio: Boolean(audio),
  })
  const blob = await fetchTtsAudio(trimmed, lang)
  if (g !== gen) {
    agentTtsLog('E', 'tts.ts:speakText', 'speakText aborted (gen mismatch)', { lang })
    return
  }
  if (blob && blob.size > 0) {
    agentTtsLog('E', 'tts.ts:speakText', 'speakText azure blob ok', {
      lang,
      size: blob.size,
      unlocked,
    })
    const objectUrl = URL.createObjectURL(blob)
    url = objectUrl
    // Reuse the gesture-unlocked element — `new Audio()` would be blocked on iOS.
    const el = ensureSharedAudio()
    el.src = objectUrl
    el.volume = 1
    el.muted = false
    await new Promise<void>((resolve) => {
      el.onended = () => {
        if (g === gen) playing = false
        resolve()
      }
      el.onerror = () => {
        if (g === gen) playing = false
        agentTtsLog('E', 'tts.ts:speakText', 'speakText audio element error', {
          lang,
          unlocked,
        })
        resolve()
      }
      void el.play().then(
        () => {
          agentTtsLog('E', 'tts.ts:speakText', 'speakText play ok', {
            lang,
            unlocked,
          })
        },
        (err: unknown) => {
          // H-E: iOS autoplay block — previously swallowed silently.
          agentTtsLog('E', 'tts.ts:speakText', 'speakText play rejected', {
            lang,
            unlocked,
            name: err instanceof Error ? err.name : 'unknown',
            message: err instanceof Error ? err.message : String(err),
          })
          if (g === gen) playing = false
          resolve()
        },
      )
    })
    return
  }
  agentTtsLog('E', 'tts.ts:speakText', 'speakText fallback browserSpeak', {
    lang,
    textLen: trimmed.length,
    blobNull: !blob,
    unlocked,
  })
  await browserSpeak(trimmed, lang, g)
}
