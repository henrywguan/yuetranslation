import { fetchTtsAudio } from './api'
import { ensureSharedAudioContext } from './audioReactive'
import { isAppleTouchDevice } from './mediaAccess'
import type { Lang } from './types'
import { readLocalCmnVoice, readLocalWuuVoice, readLocalSichuanVoice, readLocalEnVoice, readLocalTlVoice, readLocalEsVoice, readLocalEsesVoice, readLocalViVoice, readLocalThVoice, readLocalLoVoice, readLocalYueVoice } from './ttsVoices'

/** Practice Partner / fill-the-room — HTML volume caps at 1; Web Audio can go higher. */
const LOUD_PLAYBACK_GAIN = 1.85
let ttsMediaSource: MediaElementAudioSourceNode | null = null
let ttsGainNode: GainNode | null = null
/** iPhone loud TTS — BufferSource, not HTMLAudio (receiver / voice-chat route). */
let ttsBufferSource: AudioBufferSourceNode | null = null
let ttsBufferGain: GainNode | null = null
/** Keeps AudioContext running across the Practice Partner LLM gap. */
let ttsKeepAliveOsc: OscillatorNode | null = null
/** Optional near-silent tap to destination — speaker route after mic. */
let ttsKeepAliveGain: GainNode | null = null
/** Silent sink so the keep-alive osc stays in the graph without speaker bleed. */
let ttsKeepAliveSink: GainNode | null = null

function stopTtsBufferSource() {
  try {
    ttsBufferSource?.stop()
  } catch {
    /* already stopped */
  }
  try {
    ttsBufferSource?.disconnect()
  } catch {
    /* ignore */
  }
  try {
    ttsBufferGain?.disconnect()
  } catch {
    /* ignore */
  }
  ttsBufferSource = null
  ttsBufferGain = null
}

function armTtsContextKeepAlive(opts?: { speaker?: boolean }) {
  try {
    const ctx = ensureSharedAudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    if (!ttsKeepAliveOsc) {
      ttsKeepAliveOsc = ctx.createOscillator()
      ttsKeepAliveOsc.frequency.value = 20
      ttsKeepAliveOsc.start()
    }
    // Always park the osc on a muted sink so Safari does not suspend the
    // context after hushTtsSpeakerForMic() drops the speaker tap.
    if (!ttsKeepAliveSink) {
      ttsKeepAliveSink = ctx.createGain()
      ttsKeepAliveSink.gain.value = 0
      ttsKeepAliveOsc.connect(ttsKeepAliveSink)
      ttsKeepAliveSink.connect(ctx.destination)
    }
    if (opts?.speaker && !ttsKeepAliveGain) {
      ttsKeepAliveGain = ctx.createGain()
      ttsKeepAliveGain.gain.value = 0.0001
      ttsKeepAliveOsc.connect(ttsKeepAliveGain)
      ttsKeepAliveGain.connect(ctx.destination)
    }
  } catch {
    /* Web Audio may be unavailable */
  }
}

function stopTtsContextKeepAlive() {
  try {
    ttsKeepAliveOsc?.stop()
  } catch {
    /* ignore */
  }
  try {
    ttsKeepAliveOsc?.disconnect()
  } catch {
    /* ignore */
  }
  try {
    ttsKeepAliveGain?.disconnect()
  } catch {
    /* ignore */
  }
  try {
    ttsKeepAliveSink?.disconnect()
  } catch {
    /* ignore */
  }
  ttsKeepAliveOsc = null
  ttsKeepAliveGain = null
  ttsKeepAliveSink = null
}

/**
 * Drop the near-silent speaker tap before Web Speech starts.
 * Keeps the muted sink + oscillator so later loud TTS still has a running
 * AudioContext (including the 2s-silence auto-stop path).
 */
export function hushTtsSpeakerForMic() {
  try {
    ttsKeepAliveGain?.disconnect()
  } catch {
    /* ignore */
  }
  ttsKeepAliveGain = null
}

/**
 * After mic stop (Stop & judge / silence), re-arm speaker keep-alive and
 * resume the shared AudioContext so the next loud BufferSource is not soft.
 * Safe outside a gesture once unlock already ran in the Talk tap.
 */
export function prepareLoudTtsPlayback() {
  if (typeof window === 'undefined') return
  if (!isAppleTouchDevice()) return
  try {
    const ctx = ensureSharedAudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    /* ignore */
  }
  armTtsContextKeepAlive({ speaker: true })
}

/** Test/dev: keep-alive oscillator is running. */
export function ttsKeepAliveArmedForTests() {
  return Boolean(ttsKeepAliveOsc)
}

function setTtsPlaybackGain(loud: boolean) {
  try {
    const el = ensureSharedAudio()
    el.volume = 1
    // iPhone: createMediaElementSource permanently reroutes element output through
    // AudioContext. After Practice Partner's LLM await that context is often still
    // suspended outside the gesture → play() succeeds but TTS is silent, and busy
    // stays true so the next mic tap no-ops. Azure SSML x-loud is enough on Apple.
    if (isAppleTouchDevice()) return
    const ctx = ensureSharedAudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    // Only wire MediaElementSource while the context is running. Wiring while
    // suspended mutes the element with no audible Web Audio output.
    if (!ttsMediaSource) {
      if (ctx.state !== 'running') return
      ttsMediaSource = ctx.createMediaElementSource(el)
      ttsGainNode = ctx.createGain()
      ttsMediaSource.connect(ttsGainNode)
      ttsGainNode.connect(ctx.destination)
    }
    if (ttsGainNode) ttsGainNode.gain.value = loud ? LOUD_PLAYBACK_GAIN : 1
  } catch {
    /* Web Audio may be unavailable — HTMLAudioElement.volume=1 still applies. */
  }
}
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
  stopTtsBufferSource()
  hushTtsSpeakerForMic()
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
 *
 * `force` — play the silent tick even after the first unlock. Needed after
 * Web Speech / mic stop: iOS stays in a record / voice-chat session, so the
 * next Azure clip is late and quiet (earpiece-ish) unless we flip back to
 * playback in this gesture. Do not force immediately before `recognition.start()`.
 */
export function unlockTtsPlayback(opts?: { force?: boolean }): void {
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
  // Resume shared AudioContext in-gesture so later TTS is not stuck suspended
  // after an async LLM gap (Practice Partner on iPhone).
  try {
    const ctx = ensureSharedAudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    /* ignore */
  }
  const force = Boolean(opts?.force)
  // iPhone: arm a running AudioContext in this gesture so later loud TTS
  // can play through the speaker after the async LLM wait.
  if (isAppleTouchDevice()) {
    armTtsContextKeepAlive({ speaker: force })
  }
  // Already unlocked / unlock in progress — keep the shared element warm
  // unless we must flip iOS out of the mic session.
  if (!force && (unlocked || unlockInFlight)) return
  if (force && unlockInFlight) return
  unlockInFlight = true
  try {
    el.pause()
  } catch {
    /* ignore */
  }
  el.src = SILENT_WAV
  // First unlock stays near-silent. After mic, play at full volume so iOS
  // routes the shared element back to the speaker, not the receiver.
  el.volume = force ? 1 : 0.01
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
        // Do not el.load() — on iOS that resets the audio session and the next
        // Web Speech start can show the orange pill with no capture.
        if (!playing) {
          try {
            el.removeAttribute('src')
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
  stopTtsBufferSource()
  if (!opts?.preserveSession) {
    stopTtsContextKeepAlive()
  }
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
  if (lang === 'sichuan') return 'zh-CN-sichuan'
  if (lang === 'tl') return 'fil-PH'
  if (lang === 'es') return 'es-MX'
  if (lang === 'eses') return 'es-ES'
  if (lang === 'vi') return 'vi-VN'
  if (lang === 'th') return 'th-TH'
  if (lang === 'lo') return 'lo-LA'
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
    if (!match && (lang === 'tl' || lang === 'wuu' || lang === 'sichuan')) {
      if (g === gen) playing = false
      resolve(false)
      return
    }
    let settled = false
    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      window.clearTimeout(watchdog)
      if (g === gen) playing = false
      resolve(ok)
    }
    // iOS often accepts speak() outside a gesture then never fires end/error.
    const watchdog = window.setTimeout(() => {
      try {
        window.speechSynthesis.cancel()
      } catch {
        /* ignore */
      }
      finish(false)
    }, Math.min(60_000, Math.max(8_000, text.length * 180)))
    u.onend = () => finish(true)
    u.onerror = () => finish(false)
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
  if (lang === 'sichuan') return readLocalSichuanVoice()
  if (lang === 'tl') return readLocalTlVoice()
  if (lang === 'es') return readLocalEsVoice()
  if (lang === 'eses') return readLocalEsesVoice()
  if (lang === 'vi') return readLocalViVoice()
  if (lang === 'th') return readLocalThVoice()
  if (lang === 'lo') return readLocalLoVoice()
  return readLocalYueVoice()
}

const TTS_CACHE_MAX = 24
const ttsBlobs = new Map<string, Blob>()
const ttsInflight = new Map<string, Promise<Blob | null>>()

function ttsCacheKey(text: string, lang: Lang, voice: string | null, loud = false) {
  return `${lang}|${voice || ''}|${loud ? 'loud' : 'norm'}|${text}`
}

function rememberTtsBlob(key: string, blob: Blob) {
  if (ttsBlobs.has(key)) ttsBlobs.delete(key)
  ttsBlobs.set(key, blob)
  while (ttsBlobs.size > TTS_CACHE_MAX) {
    const oldest = ttsBlobs.keys().next().value
    if (oldest === undefined) break
    ttsBlobs.delete(oldest)
  }
}

/** Test/dev: drop in-memory clips so smokes start clean. */
export function resetTtsAudioCacheForTests() {
  ttsBlobs.clear()
  ttsInflight.clear()
}

export function ttsAudioCacheSizeForTests() {
  return ttsBlobs.size
}

/**
 * Load Azure TTS audio, coalescing in-flight requests and reusing recent clips.
 * Auto-speak and the speaker button share this so a tap after playback is instant.
 */
export async function loadTtsAudio(
  text: string,
  lang: Lang,
  voice?: string | null,
  opts?: { loud?: boolean },
): Promise<Blob | null> {
  const trimmed = text.trim()
  if (!trimmed) return null
  const resolved = preferredVoiceFor(lang, voice)
  const loud = Boolean(opts?.loud)
  const key = ttsCacheKey(trimmed, lang, resolved, loud)
  const cached = ttsBlobs.get(key)
  if (cached) {
    ttsBlobs.delete(key)
    ttsBlobs.set(key, cached)
    return cached
  }
  const pending = ttsInflight.get(key)
  if (pending) return pending
  const next = fetchTtsAudio(trimmed, lang, resolved, { loud })
    .then((blob) => {
      if (blob && blob.size > 0) rememberTtsBlob(key, blob)
      return blob
    })
    .finally(() => {
      ttsInflight.delete(key)
    })
  ttsInflight.set(key, next)
  return next
}

/** Warm the clip while the user reads the translation — no playback. */
export function prefetchTts(text: string, lang: Lang, voice?: string | null) {
  const trimmed = text.trim()
  if (!trimmed) return
  void loadTtsAudio(trimmed, lang, voice).catch(() => undefined)
}

async function playAzureBlobViaWebAudio(
  blob: Blob,
  g: number,
  loud: boolean,
): Promise<'played' | 'failed' | 'aborted'> {
  try {
    const ctx = ensureSharedAudioContext()
    if (ctx.state === 'suspended') {
      await ctx.resume()
    }
    // Re-arm keep-alive before decode — LLM awaits can leave the context idle.
    if (loud) armTtsContextKeepAlive({ speaker: true })
    if (ctx.state !== 'running' || g !== gen) return 'failed'
    const raw = await blob.arrayBuffer()
    if (g !== gen) return 'aborted'
    const audioBuf = await ctx.decodeAudioData(raw.slice(0))
    if (g !== gen) return 'aborted'
    stopTtsBufferSource()
    const src = ctx.createBufferSource()
    const gain = ctx.createGain()
    gain.gain.value = loud ? LOUD_PLAYBACK_GAIN : 1
    src.buffer = audioBuf
    src.playbackRate.value = playbackRate
    src.connect(gain)
    gain.connect(ctx.destination)
    ttsBufferSource = src
    ttsBufferGain = gain
    return await new Promise<'played' | 'failed' | 'aborted'>((resolve) => {
      let settled = false
      const finish = (result: 'played' | 'failed' | 'aborted') => {
        if (settled) return
        settled = true
        window.clearTimeout(watchdog)
        if (ttsBufferSource === src) stopTtsBufferSource()
        if (g === gen) playing = false
        resolve(result)
      }
      playbackWaiter = () => finish('aborted')
      src.onended = () => finish(g === gen ? 'played' : 'aborted')
      const watchdog = window.setTimeout(() => finish('failed'), Math.min(90_000, Math.max(12_000, blob.size / 6)))
      try {
        src.start()
      } catch {
        finish('failed')
      }
    })
  } catch {
    return 'failed'
  }
}

async function playAzureBlob(
  blob: Blob,
  g: number,
  opts?: { loud?: boolean },
): Promise<'played' | 'failed' | 'aborted'> {
  const loud = Boolean(opts?.loud)
  // After Web Speech, HTMLAudio stays on iPhone's voice-chat / receiver route
  // even at volume=1 + Azure x-loud. Play loud clips through Web Audio so
  // they come out the speaker. Fall back to HTMLAudio if decode fails.
  if (isAppleTouchDevice() && loud) {
    const via = await playAzureBlobViaWebAudio(blob, g, loud)
    if (via === 'played' || via === 'aborted' || g !== gen) return via
  }
  const objectUrl = URL.createObjectURL(blob)
  url = objectUrl
  // Reuse the gesture-unlocked element — `new Audio()` would be blocked on iOS.
  const el = ensureSharedAudio()
  el.playbackRate = playbackRate
  el.src = objectUrl
  el.volume = 1
  el.muted = false
  setTtsPlaybackGain(Boolean(opts?.loud))
  // After Web Speech, iOS can leave volume ducked even when we set 1 above.
  try {
    el.volume = 1
  } catch {
    /* ignore */
  }
  return await new Promise<'played' | 'failed' | 'aborted'>((resolve) => {
    let settled = false
    const finish = (result: 'played' | 'failed' | 'aborted') => {
      if (settled) return
      settled = true
      window.clearTimeout(watchdog)
      if (playbackWaiter === onEnded) playbackWaiter = null
      if (g === gen) playing = false
      resolve(result)
    }
    const onEnded = () => finish(g === gen ? 'played' : 'aborted')
    playbackWaiter = onEnded
    el.onended = onEnded
    el.onerror = () => finish('failed')
    // Guard against play() resolving then never ending (broken/unlock races).
    const watchdog = window.setTimeout(() => {
      try {
        el.pause()
      } catch {
        /* ignore */
      }
      finish('failed')
    }, Math.min(90_000, Math.max(12_000, blob.size / 6)))
    void el.play().then(
      () => {
        // play() resolved — wait for onended; if gen changes, abort.
      },
      () => finish('failed'),
    )
  })
}

export async function speakText(
  text: string,
  lang: Lang,
  voice?: string | null,
  opts?: { loud?: boolean },
) {
  const trimmed = text.trim()
  if (!trimmed) return
  // Keep the shared element — audio.load() here added a visible gap before play.
  stopSpeaking({ preserveSession: true })
  const g = gen
  const loud = Boolean(opts?.loud)
  playing = true
  let fetchError: Error | null = null
  try {
    let blob: Blob | null = null
    try {
      blob = await loadTtsAudio(trimmed, lang, voice, { loud })
    } catch (err) {
      fetchError = err instanceof Error ? err : new Error('Voice playback failed.')
    }
    if (g !== gen) return
    if (blob && blob.size > 0) {
      const result = await playAzureBlob(blob, g, { loud })
      if (result === 'played' || result === 'aborted' || g !== gen) return
      // play() blocked (often missing gesture unlock) — try browser fallback.
    }
    setTtsPlaybackGain(false)
    const spoke = await browserSpeak(trimmed, lang, g)
    if (spoke || g !== gen) return
    if (fetchError) throw fetchError
    throw new Error('Voice playback failed.')
  } finally {
    if (g === gen) {
      playing = false
      armTtsEchoTail()
    }
    // Reset gain so normal translator speak is not left boosted.
    if (!loud) setTtsPlaybackGain(false)
    else if (g === gen) setTtsPlaybackGain(false)
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
    items.map((text) => loadTtsAudio(text, lang, preferredVoiceFor(lang)).catch(() => null)),
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
