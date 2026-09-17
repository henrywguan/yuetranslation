/**
 * Harbor Quest · fishing cast / splash / catch cues (Web Audio, no assets).
 */
import { ensureSharedAudioContext } from '../../lib/audioReactive'

const GAIN = 0.22

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

/** Cast line / swing net. */
export function playHarborFishCast(): void {
  if (typeof window === 'undefined') return
  const { ctx, bus, t0 } = busAt(0.2)
  tone(ctx, bus, t0, { type: 'triangle', f0: 420, f1: 180, dur: 0.22, gain: 0.35 })
  noiseBurst(ctx, bus, t0 + 0.05, 0.12, 900, 0.25)
}

/** Water splash / bite. */
export function playHarborFishSplash(): void {
  if (typeof window === 'undefined') return
  const { ctx, bus, t0 } = busAt(0.24)
  noiseBurst(ctx, bus, t0, 0.18, 400, 0.45)
  tone(ctx, bus, t0 + 0.02, { type: 'sine', f0: 220, f1: 90, dur: 0.2, gain: 0.28 })
}

/** Successful catch chime. */
export function playHarborFishCatch(): void {
  if (typeof window === 'undefined') return
  const { ctx, bus, t0 } = busAt(0.26)
  tone(ctx, bus, t0, { type: 'sine', f0: 660, dur: 0.18, gain: 0.32 })
  tone(ctx, bus, t0 + 0.08, { type: 'sine', f0: 990, dur: 0.22, gain: 0.22 })
  tone(ctx, bus, t0 + 0.16, { type: 'triangle', f0: 1320, dur: 0.28, gain: 0.16 })
}

/** Empty bite / fail. */
export function playHarborFishMiss(): void {
  if (typeof window === 'undefined') return
  const { ctx, bus, t0 } = busAt(0.16)
  tone(ctx, bus, t0, { type: 'triangle', f0: 180, f1: 90, dur: 0.25, gain: 0.22 })
}
