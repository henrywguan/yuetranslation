/**
 * Harbor Quest · immersion ambient beds (Web Audio, no assets).
 * OSRS-style area layer: water + weather + fauna wildlife.
 * Original synthesis — not Jagex audio.
 */
import { ensureSharedAudioContext } from '../../lib/audioReactive'
import type { HarborWeather } from './harborWorld'

/** Bus gain — audible under BGM but never overpowering. */
export const HARBOR_AMBIENT_GAIN = 0.15
/** One-shot fauna chirps / splashes. */
export const HARBOR_WILDLIFE_GAIN = 0.18

export type HarborWildlifeKind =
  | 'gull'
  | 'heron'
  | 'frog'
  | 'cicada'
  | 'magpie'
  | 'deer'
  | 'ibis'
  | 'koi'
  | 'panda'
  | 'tiger'
  | 'salamander'

type AmbientHandles = {
  bus: GainNode
  stop: () => void
}

let ambient: AmbientHandles | null = null
let wildlifeTimer: ReturnType<typeof setTimeout> | null = null
let lanternTimer: ReturnType<typeof setTimeout> | null = null
let weather: HarborWeather = 'sunny'
let talking = false
let paused = false
let running = false

function clearWildlife(): void {
  if (wildlifeTimer) {
    clearTimeout(wildlifeTimer)
    wildlifeTimer = null
  }
}

function clearLantern(): void {
  if (lanternTimer) {
    clearTimeout(lanternTimer)
    lanternTimer = null
  }
}

function noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const n = Math.max(1, Math.floor(ctx.sampleRate * seconds))
  const buf = ctx.createBuffer(1, n, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1
  return buf
}

function makeWaterBed(ctx: AudioContext, dest: AudioNode): () => void {
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx, 2.5)
  src.loop = true
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 380
  bp.Q.value = 0.5
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 1100
  const g = ctx.createGain()
  g.gain.value = 0.82
  src.connect(bp)
  bp.connect(lp)
  lp.connect(g)
  g.connect(dest)
  src.start()

  // Softer second layer — slower “lapping” for river presence.
  const src2 = ctx.createBufferSource()
  src2.buffer = noiseBuffer(ctx, 3.2)
  src2.loop = true
  const bp2 = ctx.createBiquadFilter()
  bp2.type = 'bandpass'
  bp2.frequency.value = 220
  bp2.Q.value = 0.7
  const g2 = ctx.createGain()
  g2.gain.value = 0.38
  src2.connect(bp2)
  bp2.connect(g2)
  g2.connect(dest)
  src2.start()

  return () => {
    for (const s of [src, src2]) {
      try {
        s.stop()
        s.disconnect()
      } catch {
        /* ignore */
      }
    }
  }
}

/** Soft daytime bird bed — continuous high hush under sparse chirps. */
function makeBirdBed(ctx: AudioContext, dest: AudioNode): () => void {
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx, 1.6)
  src.loop = true
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 3200
  bp.Q.value = 1.2
  const g = ctx.createGain()
  g.gain.value = 0.16
  src.connect(bp)
  bp.connect(g)
  g.connect(dest)
  src.start()
  return () => {
    try {
      src.stop()
      src.disconnect()
    } catch {
      /* ignore */
    }
  }
}

function makeRainBed(ctx: AudioContext, dest: AudioNode): () => void {
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx, 1.8)
  src.loop = true
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 1600
  const g = ctx.createGain()
  g.gain.value = 0.4
  src.connect(hp)
  hp.connect(g)
  g.connect(dest)
  src.start()
  return () => {
    try {
      src.stop()
      src.disconnect()
    } catch {
      /* ignore */
    }
  }
}

function makeWindBed(ctx: AudioContext, dest: AudioNode): () => void {
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx, 3)
  src.loop = true
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 280
  bp.Q.value = 0.4
  const g = ctx.createGain()
  g.gain.value = 0.28
  src.connect(bp)
  bp.connect(g)
  g.connect(dest)
  src.start()
  return () => {
    try {
      src.stop()
      src.disconnect()
    } catch {
      /* ignore */
    }
  }
}

function noiseBurst(
  ctx: AudioContext,
  dest: AudioNode,
  t0: number,
  dur: number,
  cutoff: number,
  gain: number,
): void {
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx, Math.max(0.05, dur + 0.05))
  const f = ctx.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = cutoff
  f.Q.value = 0.8
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(f)
  f.connect(g)
  g.connect(dest)
  src.start(t0)
  src.stop(t0 + dur + 0.02)
}

function playChirp(ctx: AudioContext, dest: AudioNode, kind: HarborWildlifeKind): void {
  const t0 = ctx.currentTime + 0.01
  const bus = ctx.createGain()
  bus.gain.value = HARBOR_WILDLIFE_GAIN
  bus.connect(dest)

  if (kind === 'frog') {
    const o = ctx.createOscillator()
    o.type = 'triangle'
    o.frequency.setValueAtTime(140, t0)
    o.frequency.exponentialRampToValueAtTime(90, t0 + 0.12)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(0.85, t0 + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16)
    o.connect(g)
    g.connect(bus)
    o.start(t0)
    o.stop(t0 + 0.2)
    return
  }

  if (kind === 'cicada') {
    for (let i = 0; i < 6; i++) {
      const o = ctx.createOscillator()
      o.type = 'square'
      o.frequency.setValueAtTime(2400 + i * 40, t0 + i * 0.04)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t0 + i * 0.04)
      g.gain.exponentialRampToValueAtTime(0.22, t0 + i * 0.04 + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.04 + 0.05)
      o.connect(g)
      g.connect(bus)
      o.start(t0 + i * 0.04)
      o.stop(t0 + i * 0.04 + 0.07)
    }
    return
  }

  if (kind === 'magpie') {
    for (let i = 0; i < 4; i++) {
      const o = ctx.createOscillator()
      o.type = 'sine'
      const f0 = 1400 - i * 90
      o.frequency.setValueAtTime(f0, t0 + i * 0.07)
      o.frequency.exponentialRampToValueAtTime(f0 * 0.75, t0 + i * 0.07 + 0.06)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t0 + i * 0.07)
      g.gain.exponentialRampToValueAtTime(0.55, t0 + i * 0.07 + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.07 + 0.07)
      o.connect(g)
      g.connect(bus)
      o.start(t0 + i * 0.07)
      o.stop(t0 + i * 0.07 + 0.09)
    }
    return
  }

  if (kind === 'deer') {
    const o = ctx.createOscillator()
    o.type = 'triangle'
    o.frequency.setValueAtTime(220, t0)
    o.frequency.exponentialRampToValueAtTime(160, t0 + 0.22)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(0.55, t0 + 0.03)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28)
    o.connect(g)
    g.connect(bus)
    o.start(t0)
    o.stop(t0 + 0.32)
    return
  }

  if (kind === 'ibis') {
    const o = ctx.createOscillator()
    o.type = 'sawtooth'
    o.frequency.setValueAtTime(720, t0)
    o.frequency.exponentialRampToValueAtTime(380, t0 + 0.2)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(0.4, t0 + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.24)
    o.connect(g)
    g.connect(bus)
    o.start(t0)
    o.stop(t0 + 0.28)
    return
  }

  if (kind === 'koi') {
    noiseBurst(ctx, bus, t0, 0.14, 900, 0.7)
    noiseBurst(ctx, bus, t0 + 0.08, 0.1, 520, 0.45)
    return
  }

  if (kind === 'panda') {
    const o = ctx.createOscillator()
    o.type = 'triangle'
    o.frequency.setValueAtTime(110, t0)
    o.frequency.exponentialRampToValueAtTime(85, t0 + 0.18)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.025)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22)
    o.connect(g)
    g.connect(bus)
    o.start(t0)
    o.stop(t0 + 0.26)
    return
  }

  if (kind === 'tiger') {
    // Distant soft growl — rare, kept quiet.
    const o = ctx.createOscillator()
    o.type = 'sawtooth'
    o.frequency.setValueAtTime(70, t0)
    o.frequency.exponentialRampToValueAtTime(48, t0 + 0.45)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 180
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(0.28, t0 + 0.06)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5)
    o.connect(lp)
    lp.connect(g)
    g.connect(bus)
    o.start(t0)
    o.stop(t0 + 0.55)
    return
  }

  if (kind === 'salamander') {
    noiseBurst(ctx, bus, t0, 0.08, 640, 0.5)
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(260, t0 + 0.04)
    o.frequency.exponentialRampToValueAtTime(180, t0 + 0.14)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t0 + 0.04)
    g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.05)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16)
    o.connect(g)
    g.connect(bus)
    o.start(t0 + 0.04)
    o.stop(t0 + 0.18)
    return
  }

  // gull / heron — short descending chirp
  const base = kind === 'gull' ? 980 : 620
  const o = ctx.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(base, t0)
  o.frequency.exponentialRampToValueAtTime(base * 0.62, t0 + 0.18)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(0.7, t0 + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22)
  o.connect(g)
  g.connect(bus)
  o.start(t0)
  o.stop(t0 + 0.28)
}

function wildlifePool(w: HarborWeather): HarborWildlifeKind[] {
  if (w === 'night') {
    return ['frog', 'cicada', 'salamander', 'heron', 'tiger', 'frog', 'ibis']
  }
  if (w === 'rainy') {
    return ['frog', 'koi', 'gull', 'salamander', 'heron', 'koi']
  }
  // sunny / cloudy — match visible bank fauna
  return ['magpie', 'gull', 'heron', 'deer', 'ibis', 'koi', 'panda', 'cicada', 'magpie', 'deer']
}

function scheduleWildlife(ctx: AudioContext, dest: AudioNode): void {
  clearWildlife()
  if (!running || paused || talking) return
  const delay = 2800 + Math.random() * 5200
  wildlifeTimer = setTimeout(() => {
    wildlifeTimer = null
    if (!running || paused || talking) return
    const pool = wildlifePool(weather)
    playChirp(ctx, dest, pool[Math.floor(Math.random() * pool.length)]!)
    scheduleWildlife(ctx, dest)
  }, delay)
}

function playLanternTick(ctx: AudioContext, dest: AudioNode): void {
  const t0 = ctx.currentTime + 0.01
  const o = ctx.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(660, t0)
  o.frequency.exponentialRampToValueAtTime(420, t0 + 0.08)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(0.16, t0 + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12)
  o.connect(g)
  g.connect(dest)
  o.start(t0)
  o.stop(t0 + 0.15)
}

function scheduleLantern(ctx: AudioContext, dest: AudioNode): void {
  clearLantern()
  if (!running || paused || talking) return
  if (weather !== 'night' && weather !== 'rainy') return
  const delay = 7000 + Math.random() * 10000
  lanternTimer = setTimeout(() => {
    lanternTimer = null
    if (!running || paused || talking) return
    playLanternTick(ctx, dest)
    scheduleLantern(ctx, dest)
  }, delay)
}

function targetAmbientGain(): number {
  if (!running || paused) return 0.0001
  if (talking) return HARBOR_AMBIENT_GAIN * 0.28
  return HARBOR_AMBIENT_GAIN
}

function applyAmbientGain(): void {
  if (!ambient) return
  const ctx = ensureSharedAudioContext()
  ambient.bus.gain.cancelScheduledValues(ctx.currentTime)
  ambient.bus.gain.setTargetAtTime(targetAmbientGain(), ctx.currentTime, 0.25)
}

/** Start water + weather beds + wildlife scheduler. Idempotent. */
export function startHarborAmbient(nextWeather: HarborWeather): void {
  if (typeof window === 'undefined') return
  weather = nextWeather
  if (running) {
    // Rebuild beds when weather changes mid-session (rare).
    stopHarborAmbient()
  }
  const ctx = ensureSharedAudioContext()
  running = true
  paused = false
  const bus = ctx.createGain()
  bus.gain.setValueAtTime(0.0001, ctx.currentTime)
  bus.gain.exponentialRampToValueAtTime(HARBOR_AMBIENT_GAIN, ctx.currentTime + 0.9)
  bus.connect(ctx.destination)

  const stops: Array<() => void> = [makeWaterBed(ctx, bus)]
  if (weather === 'sunny' || weather === 'cloudy') stops.push(makeBirdBed(ctx, bus))
  if (weather === 'rainy') stops.push(makeRainBed(ctx, bus))
  if (weather === 'cloudy' || weather === 'rainy') stops.push(makeWindBed(ctx, bus))
  if (weather === 'night') stops.push(makeWindBed(ctx, bus))

  ambient = {
    bus,
    stop: () => {
      for (const s of stops) s()
      try {
        bus.disconnect()
      } catch {
        /* ignore */
      }
    },
  }
  scheduleWildlife(ctx, bus)
  scheduleLantern(ctx, bus)
}

export function stopHarborAmbient(): void {
  running = false
  clearWildlife()
  clearLantern()
  const a = ambient
  ambient = null
  if (!a) return
  try {
    const ctx = ensureSharedAudioContext()
    a.bus.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.2)
    window.setTimeout(() => a.stop(), 500)
  } catch {
    a.stop()
  }
}

export function setHarborAmbientWeather(next: HarborWeather): void {
  if (weather === next) return
  if (!running) {
    weather = next
    return
  }
  startHarborAmbient(next)
}

export function setHarborAmbientTalking(on: boolean): void {
  talking = on
  applyAmbientGain()
  if (on) {
    clearWildlife()
    clearLantern()
  } else if (running && ambient) {
    const ctx = ensureSharedAudioContext()
    scheduleWildlife(ctx, ambient.bus)
    scheduleLantern(ctx, ambient.bus)
  }
}

export function setHarborAmbientPaused(on: boolean): void {
  paused = on
  applyAmbientGain()
  if (on) {
    clearWildlife()
    clearLantern()
  } else if (running && ambient && !talking) {
    const ctx = ensureSharedAudioContext()
    scheduleWildlife(ctx, ambient.bus)
    scheduleLantern(ctx, ambient.bus)
  }
}

export function isHarborAmbientRunning(): boolean {
  return running
}

export function harborAmbientWeather(): HarborWeather {
  return weather
}

/**
 * Play a near-silent buffer so iOS / Safari unlock the AudioContext on gesture.
 * Safe to call repeatedly.
 */
export function primeHarborAmbientUnlock(): void {
  if (typeof window === 'undefined') return
  const ctx = ensureSharedAudioContext()
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  g.gain.value = 0.00001
  o.connect(g)
  g.connect(ctx.destination)
  const t = ctx.currentTime
  try {
    o.start(t)
    o.stop(t + 0.04)
  } catch {
    /* ignore */
  }
}
