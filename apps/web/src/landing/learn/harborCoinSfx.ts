/**
 * Harbor Quest · soft ferry-coin “ching”.
 * Prefers cinematic Higgsfield coin sample; falls back to soft synth.
 */
import { ensureSharedAudioContext } from '../../lib/audioReactive'
import { playHarborSample, preloadHarborSamples } from './harborSampleAudio'

/** Peak gain for the coin ching (kept soft under fanfare / BGM). */
export const HARBOR_COIN_CHING_GAIN = 0.22

export const HARBOR_COIN_SAMPLE = '/assets/harbor-quest/sfx-coin-chime.mp3'

let activeStop: (() => void) | null = null

export function preloadHarborCoinSfx(): void {
  preloadHarborSamples([HARBOR_COIN_SAMPLE])
}

/**
 * Play a brief money / ching cue. Safe from click handlers.
 * Layered high partials + tiny noise tick ≈ classic RPG coin pickup.
 */
export function playHarborCoinChing(): void {
  if (typeof window === 'undefined') return
  playHarborSample(HARBOR_COIN_SAMPLE, { gain: 0.75, channel: 'harbor-coin' })
  stopHarborCoinChing()

  const ctx = ensureSharedAudioContext()
  const t0 = ctx.currentTime + 0.01
  const bus = ctx.createGain()
  bus.gain.setValueAtTime(HARBOR_COIN_CHING_GAIN * 0.55, t0)
  bus.connect(ctx.destination)

  // Bright metallic stack (detuned sines) — soft “bling”
  const partials: Array<{ f: number; g: number; d: number }> = [
    { f: 1760, g: 0.55, d: 0.18 },
    { f: 2637, g: 0.38, d: 0.22 },
    { f: 3520, g: 0.22, d: 0.16 },
    { f: 4186, g: 0.12, d: 0.14 },
  ]
  for (const p of partials) {
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(p.f, t0)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(p.g, t0 + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + p.d)
    o.connect(g)
    g.connect(bus)
    o.start(t0)
    o.stop(t0 + p.d + 0.02)
  }

  // Soft second “clink” an octave down, slightly delayed
  const o2 = ctx.createOscillator()
  o2.type = 'triangle'
  o2.frequency.setValueAtTime(988, t0 + 0.05)
  const g2 = ctx.createGain()
  g2.gain.setValueAtTime(0.0001, t0 + 0.05)
  g2.gain.exponentialRampToValueAtTime(0.28, t0 + 0.06)
  g2.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28)
  o2.connect(g2)
  g2.connect(bus)
  o2.start(t0 + 0.05)
  o2.stop(t0 + 0.3)

  // Tiny noise sparkle (filtered) for metal grain
  const nLen = Math.floor(ctx.sampleRate * 0.06)
  const noiseBuf = ctx.createBuffer(1, nLen, ctx.sampleRate)
  const data = noiseBuf.getChannelData(0)
  for (let i = 0; i < nLen; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (nLen * 0.25))
  const noise = ctx.createBufferSource()
  noise.buffer = noiseBuf
  const nf = ctx.createBiquadFilter()
  nf.type = 'bandpass'
  nf.frequency.setValueAtTime(4200, t0)
  nf.Q.setValueAtTime(4, t0)
  const ng = ctx.createGain()
  ng.gain.setValueAtTime(0.18, t0)
  ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06)
  noise.connect(nf)
  nf.connect(ng)
  ng.connect(bus)
  noise.start(t0)
  noise.stop(t0 + 0.07)

  const timer = window.setTimeout(() => {
    try {
      bus.disconnect()
    } catch {
      /* gone */
    }
    if (activeStop === stop) activeStop = null
  }, 360)

  const stop = () => {
    window.clearTimeout(timer)
    try {
      bus.gain.cancelScheduledValues(ctx.currentTime)
      bus.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.02)
    } catch {
      /* ignore */
    }
    window.setTimeout(() => {
      try {
        bus.disconnect()
      } catch {
        /* ignore */
      }
    }, 60)
    if (activeStop === stop) activeStop = null
  }
  activeStop = stop
}

export function stopHarborCoinChing(): void {
  activeStop?.()
  activeStop = null
}
