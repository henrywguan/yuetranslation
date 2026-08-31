import { fetchTtsAudio } from './api'
import type { Lang } from './types'
import { readLocalEnVoice, readLocalYueVoice } from './ttsVoices'

/** Tiny silent WAV — played during a user gesture to unlock later HTMLAudio playback (iOS). */
const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAAABkYXRhAAAAAA=='

let audio: HTMLAudioElement | null = null
let url: string | null = null
let gen = 0
let playing = false
/** True after a successful gesture-time unlock play on the shared element. */
let unlocked = false
/** Prevent overlapping silent unlock plays from LiveHoldButton + startHold. */
let unlockInFlight = false
let playbackRate = 1
let sequenceId = 0

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
  // Already unlocked / unlock in progress — keep the shared element warm.
  if (unlocked || unlockInFlight) return
  unlockInFlight = true
  try {
    el.pause()
  } catch {
    /* ignore */
  }
  el.src = SILENT_WAV
  el.volume = 0.01
  el.muted = false
  const playResult = el.play()
  if (playResult && typeof playResult.then === 'function') {
    void playResult
      .then(() => {
        unlocked = true
        unlockInFlight = false
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
      })
      .catch(() => {
        unlockInFlight = false
      })
  } else {
    // Older engines may return undefined from play().
    unlocked = true
    unlockInFlight = false
  }
}

export function setTtsPlaybackRate(rate: number) {
  playbackRate = Math.max(0.5, Math.min(rate, 3))
  if (audio) audio.playbackRate = playbackRate
}

export function stopSpeaking() {
  sequenceId += 1
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

function preferredVoiceFor(lang: Lang, override?: string | null): string | null {
  if (override) return override
  return lang === 'en' ? readLocalEnVoice() : readLocalYueVoice()
}

export async function speakText(text: string, lang: Lang, voice?: string | null) {
  const trimmed = text.trim()
  if (!trimmed) return
  stopSpeaking()
  const g = gen
  playing = true
  const blob = await fetchTtsAudio(trimmed, lang, preferredVoiceFor(lang, voice))
  if (g !== gen) return
  if (blob && blob.size > 0) {
    const objectUrl = URL.createObjectURL(blob)
    url = objectUrl
    // Reuse the gesture-unlocked element — `new Audio()` would be blocked on iOS.
    const el = ensureSharedAudio()
    el.playbackRate = playbackRate
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
        resolve()
      }
      void el.play().then(
        () => {},
        () => {
          if (g === gen) playing = false
          resolve()
        },
      )
    })
    return
  }
  await browserSpeak(trimmed, lang, g)
}

/** Play a pre-fetched blob without bumping the speak generation (for rapid sequences). */
export function playTtsBlob(blob: Blob | null, fallbackText: string, lang: Lang) {
  void playTtsBlobAndWait(blob, fallbackText, lang, Number.POSITIVE_INFINITY)
}

function swapTtsBlob(blob: Blob | null, fallbackText: string, lang: Lang): HTMLAudioElement | null {
  if (audio) {
    audio.onended = null
    audio.onerror = null
    try {
      audio.pause()
    } catch {
      /* ignore */
    }
  }
  if (url) {
    URL.revokeObjectURL(url)
    url = null
  }
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()

  playing = true

  if (blob && blob.size > 0) {
    const objectUrl = URL.createObjectURL(blob)
    url = objectUrl
    const el = ensureSharedAudio()
    el.playbackRate = playbackRate
    el.src = objectUrl
    el.volume = 1
    el.muted = false
    return el
  }

  void browserSpeak(fallbackText, lang, gen)
  return null
}

function playTtsBlobAndWait(
  blob: Blob | null,
  fallbackText: string,
  lang: Lang,
  maxMs: number,
): Promise<void> {
  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      resolve()
    }
    const timer = window.setTimeout(finish, maxMs)

    const el = swapTtsBlob(blob, fallbackText, lang)
    if (!el) {
      finish()
      return
    }

    el.onended = finish
    el.onerror = finish
    void el.play().catch(finish)
  })
}

/**
 * Prefetch TTS then play each clip in order — one full syllable at a time.
 * Uses maxMsPerItem as a ceiling so the demo stays snappy without chopping mid-tone.
 */
export async function speakTextSequence(
  texts: string[],
  options: {
    lang?: Lang
    rate?: number
    maxMsPerItem?: number
    onStep?: (index: number, text: string) => void
  },
): Promise<void> {
  const lang = options.lang ?? 'yue'
  const items = texts.map((t) => t.trim()).filter(Boolean)
  if (!items.length) return

  stopSpeaking()
  const id = sequenceId
  const maxMs = options.maxMsPerItem ?? 950
  setTtsPlaybackRate(options.rate ?? 1.15)

  const blobs = await Promise.all(
    items.map((text) => fetchTtsAudio(text, lang, preferredVoiceFor(lang))),
  )
  if (id !== sequenceId) return

  for (let i = 0; i < items.length; i++) {
    if (id !== sequenceId) return
    const text = items[i]!
    options.onStep?.(i, text)
    await playTtsBlobAndWait(blobs[i] ?? null, text, lang, maxMs)
  }

  if (id === sequenceId) {
    stopSpeaking()
    setTtsPlaybackRate(1)
  }
}
