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
  /** Night-only birds */
  | 'owl'
  | 'nightjar'
  | 'night-heron'

/** Night wildlife is nocturnal birds only (no frogs / mammals / day birds). */
export const HARBOR_NIGHT_BIRDS: readonly HarborWildlifeKind[] = [
  'owl',
  'nightjar',
  'night-heron',
]

type AmbientHandles = {
  bus: GainNode
  stop: () => void
}

let ambient: AmbientHandles | null = null
let wildlifeTimer: ReturnType<typeof setTimeout> | null = null
let lanternTimer: ReturnType<typeof setTimeout> | null = null
let rainDropTimer: ReturnType<typeof setTimeout> | null = null
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

function clearRainDrops(): void {
  if (rainDropTimer) {
    clearTimeout(rainDropTimer)
    rainDropTimer = null
  }
}

function noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const n = Math.max(1, Math.floor(ctx.sampleRate * seconds))
  const buf = ctx.createBuffer(1, n, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1
  return buf
}

function loopNoiseBed(
  ctx: AudioContext,
  dest: AudioNode,
  opts: {
    seconds: number
    type: BiquadFilterType
    frequency: number
    Q?: number
    gain: number
    peakHz?: number
    peakQ?: number
    peakGain?: number
  },
): () => void {
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(ctx, opts.seconds)
  src.loop = true
  const f = ctx.createBiquadFilter()
  f.type = opts.type
  f.frequency.value = opts.frequency
  f.Q.value = opts.Q ?? 0.7
  const g = ctx.createGain()
  g.gain.value = opts.gain
  src.connect(f)
  let last: AudioNode = f
  if (opts.peakHz != null) {
    const peak = ctx.createBiquadFilter()
    peak.type = 'peaking'
    peak.frequency.value = opts.peakHz
    peak.Q.value = opts.peakQ ?? 4
    peak.gain.value = opts.peakGain ?? 8
    f.connect(peak)
    last = peak
  }
  last.connect(g)
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

function makeWaterBed(ctx: AudioContext, dest: AudioNode, rainy = false): () => void {
  // Under rain, keep a quieter river bed so surface rain reads clearly.
  const main = rainy ? 0.38 : 0.82
  const lap = rainy ? 0.18 : 0.38
  const stop1 = loopNoiseBed(ctx, dest, {
    seconds: 2.5,
    type: 'bandpass',
    frequency: 380,
    Q: 0.5,
    gain: main,
  })
  const src2 = ctx.createBufferSource()
  src2.buffer = noiseBuffer(ctx, 3.2)
  src2.loop = true
  const bp2 = ctx.createBiquadFilter()
  bp2.type = 'bandpass'
  bp2.frequency.value = 220
  bp2.Q.value = 0.7
  const g2 = ctx.createGain()
  g2.gain.value = lap
  src2.connect(bp2)
  bp2.connect(g2)
  g2.connect(dest)
  src2.start()
  return () => {
    stop1()
    try {
      src2.stop()
      src2.disconnect()
    } catch {
      /* ignore */
    }
  }
}

/** Soft daytime bird bed — continuous high hush under sparse chirps. */
function makeBirdBed(ctx: AudioContext, dest: AudioNode): () => void {
  return loopNoiseBed(ctx, dest, {
    seconds: 1.6,
    type: 'bandpass',
    frequency: 3200,
    Q: 1.2,
    gain: 0.16,
  })
}

/** Soft night hush — lower / darker than day birds. */
function makeNightBirdBed(ctx: AudioContext, dest: AudioNode): () => void {
  return loopNoiseBed(ctx, dest, {
    seconds: 2.2,
    type: 'bandpass',
    frequency: 1800,
    Q: 0.9,
    gain: 0.12,
  })
}

/**
 * Rain on three surfaces — tin (bright metallic), grass (soft mid), water (ploppy).
 * Combined stop keeps the public `makeRainBed` name for smoke.
 */
function makeRainBed(ctx: AudioContext, dest: AudioNode): () => void {
  const stops = [
    // Tin roof — bright hiss + metallic ring peak
    loopNoiseBed(ctx, dest, {
      seconds: 1.4,
      type: 'highpass',
      frequency: 2200,
      Q: 0.6,
      gain: 0.42,
      peakHz: 2800,
      peakQ: 6,
      peakGain: 10,
    }),
    // Grass / leaves — duller mid absorption
    loopNoiseBed(ctx, dest, {
      seconds: 1.9,
      type: 'bandpass',
      frequency: 1100,
      Q: 0.55,
      gain: 0.36,
    }),
    // Open water — lower ploppy wash
    loopNoiseBed(ctx, dest, {
      seconds: 2.1,
      type: 'bandpass',
      frequency: 420,
      Q: 0.65,
      gain: 0.4,
      peakHz: 680,
      peakQ: 2.5,
      peakGain: 5,
    }),
  ]
  return () => {
    for (const s of stops) s()
  }
}

function makeWindBed(ctx: AudioContext, dest: AudioNode): () => void {
  return loopNoiseBed(ctx, dest, {
    seconds: 3,
    type: 'bandpass',
    frequency: 280,
    Q: 0.4,
    gain: 0.28,
  })
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

/** Discrete raindrop hits — tin ping, grass thud, water plop. */
function playRainDrop(
  ctx: AudioContext,
  dest: AudioNode,
  surface: 'tin' | 'grass' | 'water',
): void {
  const t0 = ctx.currentTime + 0.01
  const bus = ctx.createGain()
  bus.gain.value = 0.55
  bus.connect(dest)

  if (surface === 'tin') {
    noiseBurst(ctx, bus, t0, 0.035, 3200, 0.55)
    const o = ctx.createOscillator()
    o.type = 'sine'
    const f0 = 2400 + Math.random() * 900
    o.frequency.setValueAtTime(f0, t0)
    o.frequency.exponentialRampToValueAtTime(f0 * 0.7, t0 + 0.12)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14)
    o.connect(g)
    g.connect(bus)
    o.start(t0)
    o.stop(t0 + 0.16)
    return
  }

  if (surface === 'grass') {
    noiseBurst(ctx, bus, t0, 0.05, 900 + Math.random() * 400, 0.45)
    return
  }

  noiseBurst(ctx, bus, t0, 0.06, 500 + Math.random() * 200, 0.5)
  const o = ctx.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(180 + Math.random() * 40, t0)
  o.frequency.exponentialRampToValueAtTime(90, t0 + 0.1)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(0.28, t0 + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12)
  o.connect(g)
  g.connect(bus)
  o.start(t0)
  o.stop(t0 + 0.14)
}

function scheduleRainDrops(ctx: AudioContext, dest: AudioNode): void {
  clearRainDrops()
  if (!running || paused || talking || weather !== 'rainy') return
  const delay = 90 + Math.random() * 220
  rainDropTimer = setTimeout(() => {
    rainDropTimer = null
    if (!running || paused || talking || weather !== 'rainy') return
    const surfaces: Array<'tin' | 'grass' | 'water'> = ['tin', 'grass', 'water', 'tin', 'water']
    playRainDrop(ctx, dest, surfaces[Math.floor(Math.random() * surfaces.length)]!)
    if (Math.random() < 0.22) {
      window.setTimeout(() => {
        if (!running || paused || talking || weather !== 'rainy') return
        playRainDrop(ctx, dest, 'tin')
      }, 40 + Math.random() * 80)
    }
    scheduleRainDrops(ctx, dest)
  }, delay)
}

function playChirp(ctx: AudioContext, dest: AudioNode, kind: HarborWildlifeKind): void {
  const t0 = ctx.currentTime + 0.01
  const bus = ctx.createGain()
  bus.gain.value = HARBOR_WILDLIFE_GAIN
  bus.connect(dest)

  if (kind === 'owl') {
    for (let i = 0; i < 2; i++) {
      const o = ctx.createOscillator()
      o.type = 'sine'
      const f0 = i === 0 ? 320 : 280
      o.frequency.setValueAtTime(f0, t0 + i * 0.28)
      o.frequency.exponentialRampToValueAtTime(f0 * 0.92, t0 + i * 0.28 + 0.22)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t0 + i * 0.28)
      g.gain.exponentialRampToValueAtTime(0.55, t0 + i * 0.28 + 0.04)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.28 + 0.28)
      o.connect(g)
      g.connect(bus)
      o.start(t0 + i * 0.28)
      o.stop(t0 + i * 0.28 + 0.32)
    }
    return
  }

  if (kind === 'nightjar') {
    for (let i = 0; i < 5; i++) {
      const o = ctx.createOscillator()
      o.type = 'triangle'
      o.frequency.setValueAtTime(480 + (i % 2) * 40, t0 + i * 0.06)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t0 + i * 0.06)
      g.gain.exponentialRampToValueAtTime(0.28, t0 + i * 0.06 + 0.015)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.06 + 0.07)
      o.connect(g)
      g.connect(bus)
      o.start(t0 + i * 0.06)
      o.stop(t0 + i * 0.06 + 0.09)
    }
    return
  }

  if (kind === 'night-heron') {
    const o = ctx.createOscillator()
    o.type = 'sawtooth'
    o.frequency.setValueAtTime(420, t0)
    o.frequency.exponentialRampToValueAtTime(260, t0 + 0.22)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 900
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(0.38, t0 + 0.025)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28)
    o.connect(lp)
    lp.connect(g)
    g.connect(bus)
    o.start(t0)
    o.stop(t0 + 0.32)
    return
  }

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

/** Weather → wildlife pool. Night is nocturnal birds only. */
export function harborWildlifePool(w: HarborWeather): HarborWildlifeKind[] {
  if (w === 'night') {
    return [...HARBOR_NIGHT_BIRDS, 'owl', 'nightjar']
  }
  if (w === 'rainy') {
    // Rain fauna stays sparse under the rain beds — frogs + water stir
    return ['frog', 'koi', 'salamander', 'frog', 'koi']
  }
  // sunny / cloudy — match visible bank fauna
  return ['magpie', 'gull', 'heron', 'deer', 'ibis', 'koi', 'panda', 'cicada', 'magpie', 'deer']
}

function scheduleWildlife(ctx: AudioContext, dest: AudioNode): void {
  clearWildlife()
  if (!running || paused || talking) return
  const delay =
    weather === 'night'
      ? 4500 + Math.random() * 8000
      : weather === 'rainy'
        ? 5000 + Math.random() * 9000
        : 2800 + Math.random() * 5200
  wildlifeTimer = setTimeout(() => {
    wildlifeTimer = null
    if (!running || paused || talking) return
    const pool = harborWildlifePool(weather)
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
    stopHarborAmbient()
  }
  const ctx = ensureSharedAudioContext()
  running = true
  paused = false
  const bus = ctx.createGain()
  bus.gain.setValueAtTime(0.0001, ctx.currentTime)
  bus.gain.exponentialRampToValueAtTime(HARBOR_AMBIENT_GAIN, ctx.currentTime + 0.9)
  bus.connect(ctx.destination)

  const rainy = weather === 'rainy'
  const stops: Array<() => void> = [makeWaterBed(ctx, bus, rainy)]
  if (weather === 'sunny' || weather === 'cloudy') stops.push(makeBirdBed(ctx, bus))
  if (weather === 'night') stops.push(makeNightBirdBed(ctx, bus))
  if (rainy) stops.push(makeRainBed(ctx, bus))
  if (weather === 'cloudy' || rainy) stops.push(makeWindBed(ctx, bus))
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
  if (rainy) scheduleRainDrops(ctx, bus)
}

export function stopHarborAmbient(): void {
  running = false
  clearWildlife()
  clearLantern()
  clearRainDrops()
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
    clearRainDrops()
  } else if (running && ambient) {
    const ctx = ensureSharedAudioContext()
    scheduleWildlife(ctx, ambient.bus)
    scheduleLantern(ctx, ambient.bus)
    if (weather === 'rainy') scheduleRainDrops(ctx, ambient.bus)
  }
}

export function setHarborAmbientPaused(on: boolean): void {
  paused = on
  applyAmbientGain()
  if (on) {
    clearWildlife()
    clearLantern()
    clearRainDrops()
  } else if (running && ambient && !talking) {
    const ctx = ensureSharedAudioContext()
    scheduleWildlife(ctx, ambient.bus)
    scheduleLantern(ctx, ambient.bus)
    if (weather === 'rainy') scheduleRainDrops(ctx, ambient.bus)
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
 * Safe to call repeatedly. Prefer calling after `await resumeSharedAudioContext()`.
 */
export function primeHarborAmbientUnlock(): void {
  if (typeof window === 'undefined') return
  const ctx = ensureSharedAudioContext()
  // Buffer source unlocks more reliably than a zero-gain oscillator on iOS.
  try {
    const n = Math.max(1, Math.floor(ctx.sampleRate * 0.05))
    const buf = ctx.createBuffer(1, n, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * 0.0004
    const src = ctx.createBufferSource()
    const g = ctx.createGain()
    g.gain.value = 0.02
    src.buffer = buf
    src.connect(g)
    g.connect(ctx.destination)
    src.start(0)
  } catch {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    g.gain.value = 0.0001
    o.connect(g)
    g.connect(ctx.destination)
    const t = ctx.currentTime
    try {
      o.start(t)
      o.stop(t + 0.05)
    } catch {
      /* ignore */
    }
  }
}

/**
 * Gesture-time unlock used by Splash + LearnPlay.
 * Waits until the shared AudioContext is actually `running` (iPhone often
 * leaves it suspended through the first resume tick), primes a buffer, then
 * force-rebuilds BGM/ambient so mount-time silent graphs aren't stuck.
 */
export async function unlockHarborAudioBeds(opts?: {
  theme?: 'river' | 'guan'
  weather?: HarborWeather
}): Promise<boolean> {
  if (typeof window === 'undefined') return false
  try {
    let ctx = ensureSharedAudioContext()
    // Up to ~600ms of resume retries — first gesture on iOS is flaky.
    for (let i = 0; i < 8; i++) {
      if (ctx.state === 'closed') ctx = ensureSharedAudioContext()
      if (ctx.state === 'running') break
      await ctx.resume().catch(() => undefined)
      await new Promise<void>((r) => window.setTimeout(r, 40 + i * 20))
    }
    if (ctx.state !== 'running') return false
    primeHarborAmbientUnlock()
    const { stopHarborBgm, startHarborBgm, harborBgmTheme } = await import('./harborBgm')
    stopHarborBgm()
    startHarborBgm(opts?.theme ?? harborBgmTheme())
    stopHarborAmbient()
    startHarborAmbient(opts?.weather ?? weather)
    return true
  } catch {
    return false
  }
}
