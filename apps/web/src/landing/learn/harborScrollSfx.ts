/**
 * Harbor Quest · Chinese scroll open / close cues (Web Audio, no assets).
 * Soft paper rustle + light wood roller — original, not a game rip.
 */
import { ensureSharedAudioContext } from '../../lib/audioReactive'

/** Peak gain for scroll cues (kept soft under BGM). */
export const HARBOR_SCROLL_SFX_GAIN = 0.28

let activeStop: (() => void) | null = null

function stopActive(): void {
  activeStop?.()
  activeStop = null
}

function noiseBurst(
  ctx: AudioContext,
  bus: GainNode,
  t0: number,
  dur: number,
  freq: number,
  q: number,
  gain: number,
): void {
  const nLen = Math.max(1, Math.floor(ctx.sampleRate * dur))
  const noiseBuf = ctx.createBuffer(1, nLen, ctx.sampleRate)
  const data = noiseBuf.getChannelData(0)
  for (let i = 0; i < nLen; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (nLen * 0.35))
  }
  const noise = ctx.createBufferSource()
  noise.buffer = noiseBuf
  const nf = ctx.createBiquadFilter()
  nf.type = 'bandpass'
  nf.frequency.setValueAtTime(freq, t0)
  nf.Q.setValueAtTime(q, t0)
  const ng = ctx.createGain()
  ng.gain.setValueAtTime(0.0001, t0)
  ng.gain.exponentialRampToValueAtTime(gain, t0 + 0.012)
  ng.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  noise.connect(nf)
  nf.connect(ng)
  ng.connect(bus)
  noise.start(t0)
  noise.stop(t0 + dur + 0.02)
}

function woodTick(ctx: AudioContext, bus: GainNode, t0: number, freq: number, gain: number): void {
  const o = ctx.createOscillator()
  o.type = 'triangle'
  o.frequency.setValueAtTime(freq, t0)
  o.frequency.exponentialRampToValueAtTime(freq * 0.55, t0 + 0.08)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.006)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12)
  o.connect(g)
  g.connect(bus)
  o.start(t0)
  o.stop(t0 + 0.14)
}

/**
 * Unfurl cue — paper rustle then soft wooden roller settle.
 * Safe from click handlers.
 */
export function playHarborScrollOpen(): void {
  if (typeof window === 'undefined') return
  stopActive()

  const ctx = ensureSharedAudioContext()
  const t0 = ctx.currentTime + 0.01
  const bus = ctx.createGain()
  bus.gain.setValueAtTime(HARBOR_SCROLL_SFX_GAIN, t0)
  bus.connect(ctx.destination)

  // Paper unroll (descending filtered noise)
  noiseBurst(ctx, bus, t0, 0.22, 2800, 1.2, 0.55)
  noiseBurst(ctx, bus, t0 + 0.08, 0.28, 1600, 0.9, 0.38)
  noiseBurst(ctx, bus, t0 + 0.16, 0.32, 900, 0.8, 0.22)
  // Roller knock as the scroll settles open
  woodTick(ctx, bus, t0 + 0.26, 220, 0.42)
  woodTick(ctx, bus, t0 + 0.32, 160, 0.28)

  const timer = window.setTimeout(() => {
    try {
      bus.disconnect()
    } catch {
      /* gone */
    }
    if (activeStop === stop) activeStop = null
  }, 520)

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

/**
 * Roll-up cue — soft wood knock then paper gather.
 * Safe from click handlers.
 */
export function playHarborScrollClose(): void {
  if (typeof window === 'undefined') return
  stopActive()

  const ctx = ensureSharedAudioContext()
  const t0 = ctx.currentTime + 0.01
  const bus = ctx.createGain()
  bus.gain.setValueAtTime(HARBOR_SCROLL_SFX_GAIN * 0.92, t0)
  bus.connect(ctx.destination)

  woodTick(ctx, bus, t0, 180, 0.36)
  woodTick(ctx, bus, t0 + 0.05, 240, 0.22)
  // Paper gather (ascending rustle)
  noiseBurst(ctx, bus, t0 + 0.04, 0.2, 1100, 1.0, 0.4)
  noiseBurst(ctx, bus, t0 + 0.12, 0.18, 2100, 1.1, 0.32)
  noiseBurst(ctx, bus, t0 + 0.2, 0.14, 3200, 1.3, 0.2)

  const timer = window.setTimeout(() => {
    try {
      bus.disconnect()
    } catch {
      /* gone */
    }
    if (activeStop === stop) activeStop = null
  }, 420)

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

export function stopHarborScrollSfx(): void {
  stopActive()
}
