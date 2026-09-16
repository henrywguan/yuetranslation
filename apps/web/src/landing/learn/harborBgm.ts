/**
 * Harbor Quest · Chinese-themed ambient BGM (Web Audio, no assets).
 * Sparse, looping riverside music in the spirit of classic RuneScape
 * area themes — pentatonic flute / soft pad / plucked accents.
 * Guan Harbor adds a warmer major / island theme (ukulele-ish plucks + steel-flute).
 * Original composition (not a Jagex track).
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
 * Warmer major / island scale (C E F G A B) — Guan Harbor paradise.
 */
export const GUAN_BGM_SCALE_HZ = [261.63, 329.63, 349.23, 392.0, 440.0, 493.88] as const

type Voice = { freq: number; start: number; dur: number; gain: number; kind: 'flute' | 'pluck' | 'pad' }

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
 * Guan Harbor loop — warmer pad, ukulele-like plucks, steel-flute-ish calls.
 */
export const GUAN_BGM_PHRASE: readonly Voice[] = [
  // Warm island pad
  { freq: 130.81, start: 0.0, dur: 14.0, gain: 0.38, kind: 'pad' },
  { freq: 164.81, start: 0.0, dur: 14.0, gain: 0.2, kind: 'pad' },
  { freq: 196.0, start: 14.0, dur: 12.0, gain: 0.34, kind: 'pad' },
  { freq: 246.94, start: 14.0, dur: 12.0, gain: 0.16, kind: 'pad' },
  { freq: 110.0, start: 26.0, dur: 10.0, gain: 0.32, kind: 'pad' },
  { freq: 174.61, start: 26.0, dur: 10.0, gain: 0.18, kind: 'pad' },

  // Steel-flute call — sunny open fifths
  { freq: 523.25, start: 1.0, dur: 1.5, gain: 0.68, kind: 'flute' },
  { freq: 659.25, start: 2.7, dur: 1.2, gain: 0.62, kind: 'flute' },
  { freq: 587.33, start: 4.1, dur: 1.6, gain: 0.7, kind: 'flute' },
  { freq: 440.0, start: 6.0, dur: 1.1, gain: 0.55, kind: 'flute' },
  { freq: 523.25, start: 7.4, dur: 2.0, gain: 0.6, kind: 'flute' },

  // Ukulele-ish pluck arpeggio
  { freq: 392.0, start: 1.5, dur: 0.28, gain: 0.42, kind: 'pluck' },
  { freq: 493.88, start: 1.85, dur: 0.28, gain: 0.38, kind: 'pluck' },
  { freq: 587.33, start: 2.2, dur: 0.3, gain: 0.4, kind: 'pluck' },
  { freq: 659.25, start: 3.4, dur: 0.32, gain: 0.36, kind: 'pluck' },
  { freq: 523.25, start: 5.2, dur: 0.3, gain: 0.34, kind: 'pluck' },
  { freq: 784.0, start: 8.2, dur: 0.35, gain: 0.3, kind: 'pluck' },

  // Phrase B — softer answer
  { freq: 392.0, start: 13.5, dur: 1.4, gain: 0.6, kind: 'flute' },
  { freq: 440.0, start: 15.1, dur: 1.1, gain: 0.58, kind: 'flute' },
  { freq: 523.25, start: 16.4, dur: 1.5, gain: 0.65, kind: 'flute' },
  { freq: 493.88, start: 18.2, dur: 1.2, gain: 0.52, kind: 'flute' },
  { freq: 349.23, start: 19.8, dur: 2.6, gain: 0.58, kind: 'flute' },

  { freq: 659.25, start: 14.8, dur: 0.28, gain: 0.32, kind: 'pluck' },
  { freq: 587.33, start: 17.0, dur: 0.28, gain: 0.3, kind: 'pluck' },
  { freq: 440.0, start: 19.2, dur: 0.3, gain: 0.28, kind: 'pluck' },

  // Closing — settle into lagoon hush
  { freq: 329.63, start: 25.5, dur: 1.4, gain: 0.52, kind: 'flute' },
  { freq: 392.0, start: 27.1, dur: 1.3, gain: 0.55, kind: 'flute' },
  { freq: 440.0, start: 28.6, dur: 1.5, gain: 0.62, kind: 'flute' },
  { freq: 392.0, start: 30.4, dur: 1.2, gain: 0.48, kind: 'flute' },
  { freq: 329.63, start: 31.8, dur: 3.0, gain: 0.52, kind: 'flute' },

  { freq: 523.25, start: 26.8, dur: 0.28, gain: 0.26, kind: 'pluck' },
  { freq: 659.25, start: 29.5, dur: 0.28, gain: 0.24, kind: 'pluck' },
  { freq: 493.88, start: 32.6, dur: 0.32, gain: 0.22, kind: 'pluck' },
] as const

let running = false
let bus: GainNode | null = null
let loopTimer: ReturnType<typeof setTimeout> | null = null
let duckUntil = 0
let currentTheme: HarborBgmTheme = 'river'

function activePhrase(): readonly Voice[] {
  return currentTheme === 'guan' ? GUAN_BGM_PHRASE : HARBOR_BGM_PHRASE
}

function scheduleVoice(ctx: AudioContext, dest: AudioNode, v: Voice, t0: number) {
  const t = t0 + v.start
  const dur = v.dur
  const master = ctx.createGain()
  master.connect(dest)

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
    // Guan: brighter short decay (ukulele-ish); river: softer triangle
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
  bus.gain.cancelScheduledValues(now)
  bus.gain.setTargetAtTime(HARBOR_BGM_GAIN * 0.28, now, 0.08)
  const restoreAt = (duckUntil - now) * 1000
  window.setTimeout(() => {
    if (!bus || !running) return
    const t = ensureSharedAudioContext().currentTime
    if (t + 0.05 < duckUntil) return
    bus.gain.setTargetAtTime(HARBOR_BGM_GAIN, t, 0.35)
  }, restoreAt + 40)
}
