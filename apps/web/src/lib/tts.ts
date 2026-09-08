import { fetchTtsAudio } from './api'
import type { Lang } from './types'
import { readLocalCmnVoice, readLocalWuuVoice, readLocalEnVoice, readLocalTlVoice, readLocalEsVoice, readLocalViVoice, readLocalYueVoice } from './ttsVoices'
/** Tiny silent WAV — played during a user gesture to unlock later HTMLAudio playback (iOS). */
const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAAABkYXRhAAAAAA=='

let audio: HTMLAudioElement | null = null
let url: string | null = null
let gen = 0
let playing = false
/** Brief post-TTS mute so speaker echo cannot start a new STT turn. */
let echoTailUntil = 0
/** True after a successful gesture-time unlock play on the shared element. */
let unlocked = false
/** Prevent overlapping silent unlock plays from LiveHoldButton + startHold. */
let unlockInFlight = false
let playbackRate = 1
let sequenceId = 0
/** Resolves an in-flight `speakText` waiter when barge-in pauses TTS. */
let playbackWaiter: (() => void) | null = null

function ensureSharedAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio()
    audio.setAttribute('playsinline', 'true')
    audio.preload = 'auto'
  }
  return audio
}

/** True while TTS plays or during the short echo tail after playback. */
export function isMicEchoMuted() {
  return playing || Date.now() < echoTailUntil
}

/** True while Azure / browser TTS audio is actually playing (not the echo tail). */
export function isTtsPlaying() {
  return playing
}

function resolvePlaybackWaiter() {
  const done = playbackWaiter
  playbackWaiter = null
  done?.()
}

/**
 * Mute in-flight TTS without pausing or cancelling speechSynthesis.
 * Call immediately before `recognition.start()` on iPhone barge-in so the
 * audio session stays up and Web Speech can attach, then `stopSpeaking({ preserveSession: true })`.
 */
export function duckTtsForMicBargeIn() {
  playing = false
  echoTailUntil = 0
  if (audio) {
    try {
      audio.volume = 0
    } catch {
      /* ignore */
    }
  }
}

export function armTtsEchoTail(ms = 600) {
  echoTailUntil = Date.now() + ms
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
  // Auto-speak barge-in: do not steal the shared element or resume/cancel
  // speechSynthesis — that aborts the Web Speech capture we are about to start.
  if (playing) return
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

export function stopSpeaking(opts?: { preserveSession?: boolean }) {
  sequenceId += 1
  gen += 1
  playing = false
  echoTailUntil = 0
  if (audio) {
    audio.onended = null
    audio.onerror = null
    try {
      audio.pause()
    } catch {
      /* ignore */
    }
    // iOS: audio.load() resets the shared audio session and the next Web Speech
    // start looks live but captures nothing. Mic barge-in only pauses.
    if (!opts?.preserveSession) {
      try {
        audio.removeAttribute('src')
        audio.load()
      } catch {
        audio.src = ''
      }
    }
  }
  resolvePlaybackWaiter()
  if (url) {
    URL.revokeObjectURL(url)
    url = null
  }
  // speechSynthesis.cancel() aborts an in-flight SpeechRecognition on iOS.
  // Barge-in only pauses; a full stop may cancel.
  if ('speechSynthesis' in window) {
    if (opts?.preserveSession) {
      try {
        window.speechSynthesis.pause()
      } catch {
        /* ignore */
      }
    } else {
      window.speechSynthesis.cancel()
    }
  }
}

function browserLangTag(lang: Lang): string {
  if (lang === 'yue') return 'zh-HK'
  if (lang === 'cmn') return 'zh-CN'
  if (lang === 'wuu') return 'wuu-CN'
  if (lang === 'tl') return 'fil-PH'
  if (lang === 'es') return 'es-MX'
  if (lang === 'vi') return 'vi-VN'
  return 'en-US'
}

/** Prefer an installed system voice so Tagalog/fil-PH does not speak as English. */
function pickBrowserVoice(langTag: string): SpeechSynthesisVoice | undefined {
  if (!('speechSynthesis' in window)) return undefined
  let voices: SpeechSynthesisVoice[] = []
  try {
    voices = window.speechSynthesis.getVoices()
  } catch {
    return undefined
  }
  if (!voices.length) return undefined
  const want = langTag.toLowerCase()
  const prefix = want.split('-')[0] || want
  // Tagalog: browsers may label voices fil-PH, fil, tl-PH, or tl.
  const aliases =
    prefix === 'fil' || prefix === 'tl'
      ? ['fil-ph', 'fil', 'tl-ph', 'tl']
      : [want, prefix]
  return (
    voices.find((v) => aliases.includes(v.lang.toLowerCase())) ||
    voices.find((v) => {
      const vl = v.lang.toLowerCase()
      return aliases.some((a) => vl === a || vl.startsWith(`${a}-`) || vl.startsWith(`${a}_`))
    })
  )
}

function browserSpeak(text: string, lang: Lang, g: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      if (g === gen) playing = false
      resolve(false)
      return
    }
    const langTag = browserLangTag(lang)
    const u = new SpeechSynthesisUtterance(text)
    u.lang = langTag
    const match = pickBrowserVoice(langTag)
    if (match) u.voice = match
    // Languages without a system voice (common for fil-PH) would otherwise
    // silently speak as the default English voice or fail — treat as no-op.
    if (!match && (lang === 'tl' || lang === 'wuu')) {
      if (g === gen) playing = false
      resolve(false)
      return
    }
    u.onend = () => {
      if (g === gen) playing = false
      resolve(true)
    }
    u.onerror = () => {
      if (g === gen) playing = false
      resolve(false)
    }
    playing = true
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  })
}

function preferredVoiceFor(lang: Lang, override?: string | null): string | null {
  if (override) return override
  if (lang === 'en') return readLocalEnVoice()
  if (lang === 'cmn') return readLocalCmnVoice()
  if (lang === 'wuu') return readLocalWuuVoice()
  if (lang === 'tl') return readLocalTlVoice()
  if (lang === 'es') return readLocalEsVoice()
  if (lang === 'vi') return readLocalViVoice()
  return readLocalYueVoice()
}

async function playAzureBlob(blob: Blob, g: number): Promise<'played' | 'failed' | 'aborted'> {
  const objectUrl = URL.createObjectURL(blob)
  url = objectUrl
  // Reuse the gesture-unlocked element — `new Audio()` would be blocked on iOS.
  const el = ensureSharedAudio()
  el.playbackRate = playbackRate
  el.src = objectUrl
  el.volume = 1
  el.muted = false
  return await new Promise<'played' | 'failed' | 'aborted'>((resolve) => {
    let settled = false
    const finish = (result: 'played' | 'failed' | 'aborted') => {
      if (settled) return
      settled = true
      if (playbackWaiter === onEnded) playbackWaiter = null
      if (g === gen) playing = false
      resolve(result)
    }
    const onEnded = () => finish(g === gen ? 'played' : 'aborted')
    playbackWaiter = onEnded
    el.onended = onEnded
    el.onerror = () => finish('failed')
    void el.play().then(
      () => {
        // play() resolved — wait for onended; if gen changes, abort.
      },
      () => finish('failed'),
    )
  })
}

export async function speakText(text: string, lang: Lang, voice?: string | null) {
  const trimmed = text.trim()
  if (!trimmed) return
  stopSpeaking()
  const g = gen
  playing = true
  let fetchError: Error | null = null
  try {
    let blob: Blob | null = null
    try {
      blob = await fetchTtsAudio(trimmed, lang, preferredVoiceFor(lang, voice))
    } catch (err) {
      fetchError = err instanceof Error ? err : new Error('Voice playback failed.')
    }
    if (g !== gen) return
    if (blob && blob.size > 0) {
      const result = await playAzureBlob(blob, g)
      if (result === 'played' || result === 'aborted' || g !== gen) return
      // play() blocked (often missing gesture unlock) — try browser fallback.
    }
    const spoke = await browserSpeak(trimmed, lang, g)
    if (spoke || g !== gen) return
    if (fetchError) throw fetchError
    throw new Error('Voice playback failed.')
  } finally {
    if (g === gen) {
      playing = false
      armTtsEchoTail()
    }
  }
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
    items.map((text) =>
      fetchTtsAudio(text, lang, preferredVoiceFor(lang)).catch(() => null),
    ),
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
