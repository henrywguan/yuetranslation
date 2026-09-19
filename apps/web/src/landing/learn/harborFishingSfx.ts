/**
 * Harbor Quest · fishing cast / splash / catch cues.
 * Splash prefers cinematic water sample; catch layers coin reward chime.
 */
import { ensureSharedAudioContext, resumeSharedAudioContext } from '../../lib/audioReactive'
import { playHarborCoinChing, preloadHarborCoinSfx } from './harborCoinSfx'
import { playHarborSample, preloadHarborSamples } from './harborSampleAudio'

const GAIN = 0.28

export const HARBOR_FISH_SPLASH_SAMPLE = '/assets/harbor-quest/sfx-water-splash.mp3'

export function preloadHarborFishSfx(): void {
  preloadHarborSamples([HARBOR_FISH_SPLASH_SAMPLE])
  preloadHarborCoinSfx()
}

function busAt(g = GAIN) {
  const ctx = ensureSharedAudioContext()
  const bus = ctx.createGain()
  bus.gain.value = g
  bus.connect(ctx.destination)
  return { ctx, bus, t0: ctx.currentTime + 0.01 }
}

function tone(
  ctx: AudioContext,
  dest: AudioNode,
  t: number,
  opts: { type?: OscillatorType; f0: number; f1?: number; dur: number; gain: number },
) {
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = opts.type ?? 'sine'
  o.frequency.setValueAtTime(opts.f0, t)
  if (opts.f1 != null) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.f1), t + opts.dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(opts.gain, t + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur)
  o.connect(g)
  g.connect(dest)
  o.start(t)
  o.stop(t + opts.dur + 0.05)
}

function noiseBurst(ctx: AudioContext, dest: AudioNode, t: number, dur: number, hp: number, gain: number) {
  const n = Math.floor(ctx.sampleRate * dur)
  const buf = ctx.createBuffer(1, n, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n)
  const src = ctx.createBufferSource()
  src.buffer = buf
  const filter = ctx.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = hp
  const g = ctx.createGain()
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(filter)
  filter.connect(g)
  g.connect(dest)
  src.start(t)
  src.stop(t + dur + 0.02)
}

/** Unlock audio on the Cast tap, then play sync in the gesture. */
function withFishAudio(play: () => void): void {
  if (typeof window === 'undefined') return
  void resumeSharedAudioContext().catch(() => undefined)
  play()
}

/** Cast line / swing net. */
export function playHarborFishCast(): void {
  withFishAudio(() => {
    const { ctx, bus, t0 } = busAt(0.32)
    tone(ctx, bus, t0, { type: 'triangle', f0: 480, f1: 160, dur: 0.28, gain: 0.42 })
    tone(ctx, bus, t0 + 0.04, { type: 'sine', f0: 320, f1: 140, dur: 0.2, gain: 0.2 })
    noiseBurst(ctx, bus, t0 + 0.04, 0.16, 800, 0.32)
  })
}

/** Water splash / bite. */
export function playHarborFishSplash(): void {
  withFishAudio(() => {
    playHarborSample(HARBOR_FISH_SPLASH_SAMPLE, { gain: 0.85, channel: 'harbor-splash' })
    const { ctx, bus, t0 } = busAt(0.22)
    noiseBurst(ctx, bus, t0, 0.22, 350, 0.38)
    tone(ctx, bus, t0 + 0.02, { type: 'sine', f0: 240, f1: 80, dur: 0.24, gain: 0.22 })
  })
}

/** Soft nibble while the bobber waits. */
export function playHarborFishNibble(): void {
  withFishAudio(() => {
    const { ctx, bus, t0 } = busAt(0.14)
    tone(ctx, bus, t0, { type: 'sine', f0: 380, f1: 220, dur: 0.09, gain: 0.2 })
    noiseBurst(ctx, bus, t0 + 0.02, 0.06, 1200, 0.12)
  })
}

/** Successful catch chime + ferry-coin reward bling. */
export function playHarborFishCatch(): void {
  withFishAudio(() => {
    playHarborSample(HARBOR_FISH_SPLASH_SAMPLE, { gain: 0.5, channel: 'harbor-splash' })
    const { ctx, bus, t0 } = busAt(0.34)
    tone(ctx, bus, t0, { type: 'sine', f0: 660, dur: 0.2, gain: 0.38 })
    tone(ctx, bus, t0 + 0.08, { type: 'sine', f0: 990, dur: 0.24, gain: 0.28 })
    tone(ctx, bus, t0 + 0.16, { type: 'triangle', f0: 1320, dur: 0.32, gain: 0.2 })
    window.setTimeout(() => playHarborCoinChing(), 90)
  })
}

/** Empty bite / fail. */
export function playHarborFishMiss(): void {
  withFishAudio(() => {
    const { ctx, bus, t0 } = busAt(0.22)
    tone(ctx, bus, t0, { type: 'triangle', f0: 200, f1: 70, dur: 0.32, gain: 0.3 })
    noiseBurst(ctx, bus, t0 + 0.05, 0.14, 500, 0.18)
  })
}
