/**
 * Harbor Quest · Chinese-themed ambient BGM (Web Audio, no assets).
 * Sparse, looping riverside music in the spirit of classic RuneScape
 * area themes — pentatonic flute / soft pad / plucked accents.
 * Guan Harbor: original tribal-island loop (soft hand-drums, steel flute,
 * warm pads) — mood-adjacent to classic jungle/barbarian *era* cues, not a
 * Jagex melody or arrangement. See RS-LIKE-CRAFT-BIBLE.md §7.
 */
import { ensureSharedAudioContext } from '../../lib/audioReactive'

/** Bus gain — stays under SFX / fanfare, loud enough on phone speakers. */
export const HARBOR_BGM_GAIN = 0.18

/** One loop length in seconds (smoke-tested). */
export const HARBOR_BGM_LOOP_SEC = 36

/** Area theme — river (default) vs Guan Harbor paradise. */
export type HarborBgmTheme = 'river' | 'guan'

/**
 * Gong-mode pentatonic (C D E G A) — Jiangnan / riverside feel.
 * Frequencies used by the scheduler (Hz).
 */
export const HARBOR_BGM_SCALE_HZ = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25] as const

/**
 * Guan Harbor scale — G minor / Aeolian island (G A Bb C D F).
 * Original Harbor pitch set (not a Jagex transcription).
 */
export const GUAN_BGM_SCALE_HZ = [196.0, 220.0, 233.08, 261.63, 293.66, 349.23] as const

type VoiceKind = 'flute' | 'pluck' | 'pad' | 'drum'

type Voice = { freq: number; start: number; dur: number; gain: number; kind: VoiceKind }

/**
 * One loop of sparse melody + pad cues (seconds from loop start).
 * Classic RS-like pacing: long rests, soft phrases, gentle return.
 */
export const HARBOR_BGM_PHRASE: readonly Voice[] = [
  // Soft pad drones
  { freq: 130.81, start: 0.0, dur: 12.0, gain: 0.35, kind: 'pad' },
  { freq: 196.0, start: 0.0, dur: 12.0, gain: 0.22, kind: 'pad' },
  { freq: 130.81, start: 12.0, dur: 12.0, gain: 0.32, kind: 'pad' },
  { freq: 164.81, start: 12.0, dur: 12.0, gain: 0.18, kind: 'pad' },
  { freq: 98.0, start: 24.0, dur: 12.0, gain: 0.3, kind: 'pad' },
  { freq: 196.0, start: 24.0, dur: 12.0, gain: 0.2, kind: 'pad' },

  // Flute call — phrase A
  { freq: 392.0, start: 1.2, dur: 1.4, gain: 0.7, kind: 'flute' },
  { freq: 440.0, start: 2.8, dur: 1.1, gain: 0.65, kind: 'flute' },
  { freq: 523.25, start: 4.1, dur: 1.8, gain: 0.72, kind: 'flute' },
  { freq: 440.0, start: 6.2, dur: 1.0, gain: 0.55, kind: 'flute' },
  { freq: 392.0, start: 7.4, dur: 2.2, gain: 0.6, kind: 'flute' },

  // Pluck accents
  { freq: 659.25, start: 3.5, dur: 0.35, gain: 0.35, kind: 'pluck' },
  { freq: 523.25, start: 5.5, dur: 0.35, gain: 0.3, kind: 'pluck' },
  { freq: 784.0, start: 8.8, dur: 0.4, gain: 0.28, kind: 'pluck' },

  // Flute call — phrase B (answer)
  { freq: 329.63, start: 14.0, dur: 1.3, gain: 0.62, kind: 'flute' },
  { freq: 392.0, start: 15.5, dur: 1.1, gain: 0.58, kind: 'flute' },
  { freq: 440.0, start: 16.8, dur: 1.5, gain: 0.68, kind: 'flute' },
  { freq: 392.0, start: 18.5, dur: 1.2, gain: 0.55, kind: 'flute' },
  { freq: 329.63, start: 20.0, dur: 2.4, gain: 0.6, kind: 'flute' },

  { freq: 587.33, start: 17.4, dur: 0.32, gain: 0.28, kind: 'pluck' },
  { freq: 523.25, start: 19.6, dur: 0.32, gain: 0.26, kind: 'pluck' },

  // Closing phrase — settles like a classic area theme loop seam
  { freq: 261.63, start: 26.0, dur: 1.5, gain: 0.55, kind: 'flute' },
  { freq: 329.63, start: 27.7, dur: 1.3, gain: 0.58, kind: 'flute' },
  { freq: 392.0, start: 29.2, dur: 1.6, gain: 0.65, kind: 'flute' },
  { freq: 349.23, start: 31.0, dur: 1.2, gain: 0.5, kind: 'flute' },
  { freq: 329.63, start: 32.4, dur: 2.8, gain: 0.55, kind: 'flute' },

  { freq: 523.25, start: 28.5, dur: 0.3, gain: 0.24, kind: 'pluck' },
  { freq: 440.0, start: 30.5, dur: 0.3, gain: 0.22, kind: 'pluck' },
  { freq: 392.0, start: 33.2, dur: 0.35, gain: 0.2, kind: 'pluck' },
] as const

/**
 * Guan Harbor loop — original tribal-island composition.
 * Soft hand-drum pulse, warm Aeolian pads, declarative flute calls,
 * syncopated reed plucks. Mood: sunny / wild shore — melody is Harbor's own.
 */
export const GUAN_BGM_PHRASE: readonly Voice[] = [
  // Warm lagoon pads (G minor)
  { freq: 98.0, start: 0.0, dur: 16.0, gain: 0.4, kind: 'pad' },
  { freq: 146.83, start: 0.0, dur: 16.0, gain: 0.22, kind: 'pad' },
  { freq: 116.54, start: 16.0, dur: 12.0, gain: 0.36, kind: 'pad' },
  { freq: 174.61, start: 16.0, dur: 12.0, gain: 0.18, kind: 'pad' },
  { freq: 87.31, start: 28.0, dur: 8.0, gain: 0.34, kind: 'pad' },
  { freq: 130.81, start: 28.0, dur: 8.0, gain: 0.2, kind: 'pad' },

  // Soft hand-drum pulse (~90 BPM feel, sparse — not a ripped percussion loop)
  { freq: 90, start: 0.0, dur: 0.18, gain: 0.55, kind: 'drum' },
  { freq: 90, start: 1.33, dur: 0.16, gain: 0.42, kind: 'drum' },
  { freq: 70, start: 2.0, dur: 0.22, gain: 0.48, kind: 'drum' },
  { freq: 90, start: 2.66, dur: 0.15, gain: 0.38, kind: 'drum' },
  { freq: 90, start: 4.0, dur: 0.18, gain: 0.52, kind: 'drum' },
  { freq: 70, start: 5.33, dur: 0.2, gain: 0.4, kind: 'drum' },
  { freq: 90, start: 6.0, dur: 0.16, gain: 0.45, kind: 'drum' },
  { freq: 90, start: 8.0, dur: 0.18, gain: 0.5, kind: 'drum' },
  { freq: 70, start: 9.33, dur: 0.22, gain: 0.44, kind: 'drum' },
  { freq: 90, start: 10.66, dur: 0.15, gain: 0.36, kind: 'drum' },
  { freq: 90, start: 12.0, dur: 0.18, gain: 0.5, kind: 'drum' },
  { freq: 70, start: 13.33, dur: 0.2, gain: 0.4, kind: 'drum' },
  { freq: 90, start: 14.0, dur: 0.16, gain: 0.42, kind: 'drum' },
  { freq: 90, start: 16.0, dur: 0.18, gain: 0.52, kind: 'drum' },
  { freq: 70, start: 17.33, dur: 0.22, gain: 0.46, kind: 'drum' },
  { freq: 90, start: 18.66, dur: 0.15, gain: 0.38, kind: 'drum' },
  { freq: 90, start: 20.0, dur: 0.18, gain: 0.5, kind: 'drum' },
  { freq: 70, start: 21.33, dur: 0.2, gain: 0.4, kind: 'drum' },
  { freq: 90, start: 24.0, dur: 0.18, gain: 0.48, kind: 'drum' },
  { freq: 70, start: 25.33, dur: 0.22, gain: 0.42, kind: 'drum' },
  { freq: 90, start: 28.0, dur: 0.18, gain: 0.45, kind: 'drum' },
  { freq: 70, start: 30.66, dur: 0.24, gain: 0.38, kind: 'drum' },
  { freq: 90, start: 32.0, dur: 0.16, gain: 0.4, kind: 'drum' },
  { freq: 70, start: 34.0, dur: 0.22, gain: 0.36, kind: 'drum' },

  // Flute call A — rising shore call, then settle (original contour)
  { freq: 392.0, start: 0.85, dur: 0.55, gain: 0.72, kind: 'flute' },
  { freq: 466.16, start: 1.45, dur: 0.5, gain: 0.7, kind: 'flute' },
  { freq: 523.25, start: 2.05, dur: 0.85, gain: 0.75, kind: 'flute' },
  { freq: 440.0, start: 3.05, dur: 0.7, gain: 0.62, kind: 'flute' },
  { freq: 392.0, start: 3.9, dur: 0.55, gain: 0.58, kind: 'flute' },
  { freq: 349.23, start: 4.6, dur: 1.6, gain: 0.65, kind: 'flute' },

  // Syncopated reed plucks under call A
  { freq: 293.66, start: 1.1, dur: 0.22, gain: 0.36, kind: 'pluck' },
  { freq: 349.23, start: 1.75, dur: 0.22, gain: 0.34, kind: 'pluck' },
  { freq: 392.0, start: 2.4, dur: 0.24, gain: 0.38, kind: 'pluck' },
  { freq: 466.16, start: 4.15, dur: 0.22, gain: 0.3, kind: 'pluck' },
  { freq: 261.63, start: 5.4, dur: 0.28, gain: 0.32, kind: 'pluck' },

  // Flute call B — lower answer across the lagoon
  { freq: 293.66, start: 8.2, dur: 0.7, gain: 0.6, kind: 'flute' },
  { freq: 349.23, start: 9.05, dur: 0.55, gain: 0.62, kind: 'flute' },
  { freq: 392.0, start: 9.75, dur: 0.65, gain: 0.68, kind: 'flute' },
  { freq: 466.16, start: 10.55, dur: 0.8, gain: 0.7, kind: 'flute' },
  { freq: 440.0, start: 11.5, dur: 1.4, gain: 0.58, kind: 'flute' },

  { freq: 233.08, start: 8.6, dur: 0.2, gain: 0.3, kind: 'pluck' },
  { freq: 293.66, start: 9.4, dur: 0.2, gain: 0.28, kind: 'pluck' },
  { freq: 349.23, start: 10.9, dur: 0.22, gain: 0.32, kind: 'pluck' },
  { freq: 392.0, start: 12.2, dur: 0.24, gain: 0.28, kind: 'pluck' },

  // Mid-loop bridge — open fifth calls
  { freq: 196.0, start: 14.5, dur: 1.1, gain: 0.55, kind: 'flute' },
  { freq: 293.66, start: 15.8, dur: 1.0, gain: 0.6, kind: 'flute' },
  { freq: 349.23, start: 17.0, dur: 0.7, gain: 0.58, kind: 'flute' },
  { freq: 392.0, start: 17.85, dur: 0.55, gain: 0.62, kind: 'flute' },
  { freq: 349.23, start: 18.55, dur: 0.5, gain: 0.55, kind: 'flute' },
  { freq: 293.66, start: 19.2, dur: 1.8, gain: 0.6, kind: 'flute' },

  { freq: 440.0, start: 15.2, dur: 0.2, gain: 0.26, kind: 'pluck' },
  { freq: 523.25, start: 16.5, dur: 0.2, gain: 0.24, kind: 'pluck' },
  { freq: 392.0, start: 18.2, dur: 0.22, gain: 0.28, kind: 'pluck' },
  { freq: 349.23, start: 19.6, dur: 0.24, gain: 0.26, kind: 'pluck' },

  // Closing — walk back to the pier hush
  { freq: 349.23, start: 24.5, dur: 0.65, gain: 0.55, kind: 'flute' },
  { freq: 392.0, start: 25.3, dur: 0.55, gain: 0.58, kind: 'flute' },
  { freq: 440.0, start: 26.0, dur: 0.7, gain: 0.62, kind: 'flute' },
  { freq: 392.0, start: 26.85, dur: 0.55, gain: 0.52, kind: 'flute' },
  { freq: 349.23, start: 27.55, dur: 0.7, gain: 0.55, kind: 'flute' },
  { freq: 293.66, start: 28.4, dur: 2.4, gain: 0.58, kind: 'flute' },
  { freq: 261.63, start: 31.0, dur: 3.5, gain: 0.5, kind: 'flute' },

  { freq: 466.16, start: 25.0, dur: 0.2, gain: 0.24, kind: 'pluck' },
  { freq: 392.0, start: 26.5, dur: 0.2, gain: 0.22, kind: 'pluck' },
  { freq: 349.23, start: 28.0, dur: 0.22, gain: 0.24, kind: 'pluck' },
  { freq: 293.66, start: 30.2, dur: 0.26, gain: 0.22, kind: 'pluck' },
  { freq: 233.08, start: 33.0, dur: 0.28, gain: 0.2, kind: 'pluck' },
] as const

let running = false
let bus: GainNode | null = null
let loopTimer: ReturnType<typeof setTimeout> | null = null
let duckUntil = 0
/** Nested hold count — Harbor TTS ducks BGM until every speak finishes. */
let duckHoldCount = 0
let currentTheme: HarborBgmTheme = 'river'

const HARBOR_BGM_DUCK_GAIN = HARBOR_BGM_GAIN * 0.28

function applyHarborBgmGain(target: number, timeConstant: number): void {
  if (!bus || !running) return
  const ctx = ensureSharedAudioContext()
  bus.gain.cancelScheduledValues(ctx.currentTime)
  bus.gain.setTargetAtTime(target, ctx.currentTime, timeConstant)
}

function restoreHarborBgmIfClear(): void {
  if (!bus || !running || duckHoldCount > 0) return
  const ctx = ensureSharedAudioContext()
  if (ctx.currentTime + 0.05 < duckUntil) return
  applyHarborBgmGain(HARBOR_BGM_GAIN, 0.35)
}

function activePhrase(): readonly Voice[] {
  return currentTheme === 'guan' ? GUAN_BGM_PHRASE : HARBOR_BGM_PHRASE
}

function scheduleVoice(ctx: AudioContext, dest: AudioNode, v: Voice, t0: number) {
  const t = t0 + v.start
  const dur = v.dur
  const master = ctx.createGain()
  master.connect(dest)

  if (v.kind === 'drum') {
    // Soft hand-tom — sine thud + brief noise brush (original synth, not sample)
    master.gain.setValueAtTime(0.0001, t)
    master.gain.exponentialRampToValueAtTime(0.16 * v.gain, t + 0.008)
    master.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(v.freq * 1.8, t)
    o.frequency.exponentialRampToValueAtTime(Math.max(40, v.freq * 0.55), t + dur)
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(420, t)
    filter.frequency.exponentialRampToValueAtTime(120, t + dur)
    o.connect(filter)
    filter.connect(master)
    o.start(t)
    o.stop(t + dur + 0.02)
    // Light brush click
    const bufLen = Math.max(1, Math.floor(ctx.sampleRate * 0.03))
    const noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate)
    const data = noiseBuf.getChannelData(0)
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufLen)
    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuf
    const nG = ctx.createGain()
    nG.gain.setValueAtTime(0.08 * v.gain, t)
    nG.gain.exponentialRampToValueAtTime(0.0001, t + 0.04)
    const nF = ctx.createBiquadFilter()
    nF.type = 'bandpass'
    nF.frequency.setValueAtTime(800, t)
    nF.Q.setValueAtTime(0.8, t)
    noise.connect(nF)
    nF.connect(nG)
    nG.connect(master)
    noise.start(t)
    noise.stop(t + 0.05)
    return
  }

  if (v.kind === 'pad') {
    master.gain.setValueAtTime(0.0001, t)
    master.gain.exponentialRampToValueAtTime(0.045 * v.gain, t + 1.2)
    master.gain.setValueAtTime(0.04 * v.gain, t + dur - 1.5)
    master.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(v.freq, t)
    const o2 = ctx.createOscillator()
    o2.type = 'triangle'
    o2.frequency.setValueAtTime(v.freq * 2.01, t)
    const g2 = ctx.createGain()
    g2.gain.value = 0.25
    o.connect(master)
    o2.connect(g2)
    g2.connect(master)
    o.start(t)
    o.stop(t + dur + 0.05)
    o2.start(t)
    o2.stop(t + dur + 0.05)
    return
  }

  if (v.kind === 'pluck') {
    // Guan: brighter short decay (reed / ukulele-ish); river: softer triangle
    const bright = currentTheme === 'guan'
    master.gain.setValueAtTime(0.0001, t)
    master.gain.exponentialRampToValueAtTime((bright ? 0.14 : 0.12) * v.gain, t + 0.008)
    master.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    const o = ctx.createOscillator()
    o.type = bright ? 'square' : 'triangle'
    o.frequency.setValueAtTime(v.freq, t)
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(bright ? 3200 : 2400, t)
    filter.frequency.exponentialRampToValueAtTime(bright ? 900 : 600, t + dur)
    const og = ctx.createGain()
    og.gain.value = bright ? 0.45 : 1
    o.connect(filter)
    filter.connect(og)
    og.connect(master)
    o.start(t)
    o.stop(t + dur + 0.02)
    return
  }

  // flute — soft triangle + sine, light vibrato (Guan: slightly steel-ier)
  const steel = currentTheme === 'guan'
  master.gain.setValueAtTime(0.0001, t)
  master.gain.exponentialRampToValueAtTime(0.09 * v.gain, t + 0.08)
  master.gain.setValueAtTime(0.08 * v.gain, t + dur * 0.55)
  master.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.15)

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(v.freq * (steel ? 4.2 : 3.2), t)
  filter.Q.setValueAtTime(steel ? 1.1 : 0.7, t)
  filter.connect(master)

  for (const [type, mul, g] of [
    ['triangle', 1, 0.7],
    ['sine', 1, steel ? 0.55 : 0.45],
    ['sine', 2, steel ? 0.14 : 0.08],
  ] as const) {
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.setValueAtTime(v.freq * mul, t)
    const lfo = ctx.createOscillator()
    const lfoG = ctx.createGain()
    lfo.frequency.setValueAtTime(steel ? 5.2 : 4.6, t)
    lfoG.gain.setValueAtTime(v.freq * (steel ? 0.008 : 0.006), t)
    lfo.connect(lfoG)
    lfoG.connect(o.frequency)
    lfo.start(t)
    lfo.stop(t + dur + 0.2)
    const og = ctx.createGain()
    og.gain.value = g
    o.connect(og)
    og.connect(filter)
    o.start(t)
    o.stop(t + dur + 0.2)
  }
}

function scheduleLoop(ctx: AudioContext) {
  if (!running || !bus) return
  const t0 = ctx.currentTime + 0.05
  for (const v of activePhrase()) {
    scheduleVoice(ctx, bus, v, t0)
  }
  if (loopTimer) clearTimeout(loopTimer)
  loopTimer = setTimeout(() => {
    loopTimer = null
    if (running) scheduleLoop(ctx)
  }, HARBOR_BGM_LOOP_SEC * 1000 - 80)
}

function hardStopBus(): void {
  if (loopTimer) {
    clearTimeout(loopTimer)
    loopTimer = null
  }
  const b = bus
  bus = null
  running = false
  duckHoldCount = 0
  duckUntil = 0
  if (!b) return
  try {
    b.disconnect()
  } catch {
    /* ignore */
  }
}

/**
 * Start looping Harbor BGM (idempotent per theme).
 * Pass `'guan'` for the tropical paradise theme; default is riverside.
 */
export function startHarborBgm(theme: HarborBgmTheme = 'river'): void {
  if (typeof window === 'undefined') return
  if (running && currentTheme === theme) return
  if (running) hardStopBus()
  currentTheme = theme
  const ctx = ensureSharedAudioContext()
  running = true
  bus = ctx.createGain()
  bus.gain.setValueAtTime(0.0001, ctx.currentTime)
  bus.gain.exponentialRampToValueAtTime(HARBOR_BGM_GAIN, ctx.currentTime + 1.4)
  bus.connect(ctx.destination)
  scheduleLoop(ctx)
}

/** Fade out and stop Harbor BGM. */
export function stopHarborBgm(): void {
  running = false
  if (loopTimer) {
    clearTimeout(loopTimer)
    loopTimer = null
  }
  const b = bus
  bus = null
  if (!b) return
  try {
    const ctx = ensureSharedAudioContext()
    b.gain.cancelScheduledValues(ctx.currentTime)
    b.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.25)
    window.setTimeout(() => {
      try {
        b.disconnect()
      } catch {
        /* ignore */
      }
    }, 700)
  } catch {
    try {
      b.disconnect()
    } catch {
      /* ignore */
    }
  }
}

export function isHarborBgmPlaying(): boolean {
  return running
}

export function harborBgmTheme(): HarborBgmTheme {
  return currentTheme
}

/** Briefly duck BGM under fanfare / loud SFX. */
export function duckHarborBgm(ms = 4200): void {
  if (!bus || !running) return
  const ctx = ensureSharedAudioContext()
  const now = ctx.currentTime
  duckUntil = Math.max(duckUntil, now + ms / 1000)
  applyHarborBgmGain(HARBOR_BGM_DUCK_GAIN, 0.08)
  const restoreAt = (duckUntil - now) * 1000
  window.setTimeout(() => {
    restoreHarborBgmIfClear()
  }, restoreAt + 40)
}

/** Hold BGM ducked while Harbor TTS plays (nestable). */
export function holdHarborBgmDuck(): void {
  duckHoldCount += 1
  if (!bus || !running) return
  applyHarborBgmGain(HARBOR_BGM_DUCK_GAIN, 0.08)
}

/** Release one TTS duck hold; restore BGM when idle. */
export function releaseHarborBgmDuck(): void {
  if (duckHoldCount > 0) duckHoldCount -= 1
  restoreHarborBgmIfClear()
}

export function harborBgmDuckHeld(): boolean {
  return duckHoldCount > 0
}
