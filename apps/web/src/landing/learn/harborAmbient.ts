/**
 * Harbor Quest · immersion ambient beds (Web Audio, no assets).
 * OSRS-style area layer: water + weather + sparse wildlife.
 * Original synthesis — not Jagex audio.
 */
import { ensureSharedAudioContext } from '../../lib/audioReactive'
import type { HarborWeather } from './harborWorld'

export const HARBOR_AMBIENT_GAIN = 0.07
export const HARBOR_WILDLIFE_GAIN = 0.09

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
  bp.frequency.value = 420
  bp.Q.value = 0.55
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 900
  const g = ctx.createGain()
  g.gain.value = 0.55
  src.connect(bp)
  bp.connect(lp)
  lp.connect(g)
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
  hp.frequency.value = 1800
  const g = ctx.createGain()
  g.gain.value = 0.28
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
  g.gain.value = 0.22
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

function playChirp(ctx: AudioContext, dest: AudioNode, kind: 'gull' | 'heron' | 'frog' | 'cicada'): void {
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
    g.gain.exponentialRampToValueAtTime(0.7, t0 + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16)
    o.connect(g)
    g.connect(bus)
    o.start(t0)
    o.stop(t0 + 0.2)
    return
  }

  if (kind === 'cicada') {
    for (let i = 0; i < 5; i++) {
      const o = ctx.createOscillator()
      o.type = 'square'
      o.frequency.setValueAtTime(2400 + i * 40, t0 + i * 0.04)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t0 + i * 0.04)
      g.gain.exponentialRampToValueAtTime(0.18, t0 + i * 0.04 + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.04 + 0.05)
      o.connect(g)
      g.connect(bus)
      o.start(t0 + i * 0.04)
      o.stop(t0 + i * 0.04 + 0.07)
    }
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
  g.gain.exponentialRampToValueAtTime(0.55, t0 + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22)
  o.connect(g)
  g.connect(bus)
  o.start(t0)
  o.stop(t0 + 0.28)
}

function scheduleWildlife(ctx: AudioContext, dest: AudioNode): void {
  clearWildlife()
  if (!running || paused || talking) return
  const delay = 7000 + Math.random() * 14000
  wildlifeTimer = setTimeout(() => {
    wildlifeTimer = null
    if (!running || paused || talking) return
    const pool: Array<'gull' | 'heron' | 'frog' | 'cicada'> =
      weather === 'night'
        ? ['frog', 'cicada', 'heron']
        : weather === 'rainy'
          ? ['frog', 'gull']
          : ['gull', 'heron', 'gull']
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
  g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.01)
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
  const delay = 9000 + Math.random() * 12000
  lanternTimer = setTimeout(() => {
    lanternTimer = null
    if (!running || paused || talking) return
    playLanternTick(ctx, dest)
    scheduleLantern(ctx, dest)
  }, delay)
}

function targetAmbientGain(): number {
  if (!running || paused) return 0.0001
  if (talking) return HARBOR_AMBIENT_GAIN * 0.22
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
  bus.gain.exponentialRampToValueAtTime(HARBOR_AMBIENT_GAIN, ctx.currentTime + 1.2)
  bus.connect(ctx.destination)

  const stops: Array<() => void> = [makeWaterBed(ctx, bus)]
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
