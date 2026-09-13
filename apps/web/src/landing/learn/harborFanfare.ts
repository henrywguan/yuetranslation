/**
 * Harbor Quest · correct-answer trumpet fanfare (Web Audio, no assets).
 * Brass-ish saw + filter; ~4.5s classic ascending fanfare.
 */
import { ensureSharedAudioContext } from '../../lib/audioReactive'

/** Nominal length of the jingle (smoke-tested). */
export const HARBOR_FANFARE_DURATION_MS = 4500

/** Minimum / maximum allowed length for the correct-answer jingle. */
export const HARBOR_FANFARE_DURATION_BOUNDS_MS = { min: 3000, max: 6000 } as const

type Note = { freq: number; start: number; dur: number; gain: number }

/**
 * C-major trumpet fanfare (seconds from gesture).
 * Total span ≈ 4.5s including final sustain/decay.
 */
export const HARBOR_FANFARE_NOTES: readonly Note[] = [
  { freq: 523.25, start: 0.0, dur: 0.28, gain: 0.9 }, // C5
  { freq: 659.25, start: 0.3, dur: 0.28, gain: 0.92 }, // E5
  { freq: 783.99, start: 0.6, dur: 0.38, gain: 0.95 }, // G5
  { freq: 1046.5, start: 1.05, dur: 0.55, gain: 1 }, // C6
  { freq: 783.99, start: 1.7, dur: 0.22, gain: 0.85 }, // G5
  { freq: 880.0, start: 1.95, dur: 0.22, gain: 0.88 }, // A5
  { freq: 987.77, start: 2.2, dur: 0.28, gain: 0.92 }, // B5
  { freq: 1046.5, start: 2.55, dur: 0.7, gain: 1 }, // C6
  { freq: 1318.5, start: 3.35, dur: 0.95, gain: 0.95 }, // E6 flourish
] as const

let activeStop: (() => void) | null = null

function trumpetVoice(
  ctx: AudioContext,
  dest: AudioNode,
  note: Note,
  t0: number,
): OscillatorNode[] {
  const t = t0 + note.start
  const dur = note.dur
  const master = ctx.createGain()
  master.gain.setValueAtTime(0.0001, t)
  master.gain.exponentialRampToValueAtTime(0.18 * note.gain, t + 0.035)
  master.gain.setValueAtTime(0.16 * note.gain, t + dur * 0.55)
  master.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12)
  master.connect(dest)

  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(note.freq * 1.8, t)
  filter.Q.setValueAtTime(1.4, t)
  filter.connect(master)

  const oscs: OscillatorNode[] = []
  for (const [type, mul, g] of [
    ['sawtooth', 1, 0.55],
    ['square', 1, 0.22],
    ['sawtooth', 2, 0.12],
  ] as const) {
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.setValueAtTime(note.freq * mul, t)
    // Light vibrato on the body of the note
    const lfo = ctx.createOscillator()
    const lfoGain = ctx.createGain()
    lfo.frequency.setValueAtTime(5.2, t)
    lfoGain.gain.setValueAtTime(note.freq * 0.008, t)
    lfo.connect(lfoGain)
    lfoGain.connect(o.frequency)
    lfo.start(t)
    lfo.stop(t + dur + 0.15)

    const og = ctx.createGain()
    og.gain.setValueAtTime(g, t)
    o.connect(og)
    og.connect(filter)
    o.start(t)
    o.stop(t + dur + 0.15)
    oscs.push(o, lfo)
  }
  return oscs
}

/** Play the Harbor Quest correct-answer fanfare. Safe to call from a click handler. */
export function playHarborCorrectFanfare(): void {
  if (typeof window === 'undefined') return
  stopHarborCorrectFanfare()

  const ctx = ensureSharedAudioContext()
  const t0 = ctx.currentTime + 0.02

  const bus = ctx.createGain()
  bus.gain.setValueAtTime(0.85, t0)
  bus.connect(ctx.destination)

  // Soft low brass pad under the melody
  const pad = ctx.createOscillator()
  pad.type = 'triangle'
  pad.frequency.setValueAtTime(130.81, t0) // C3
  const padGain = ctx.createGain()
  padGain.gain.setValueAtTime(0.0001, t0)
  padGain.gain.exponentialRampToValueAtTime(0.06, t0 + 0.2)
  padGain.gain.setValueAtTime(0.05, t0 + 3.6)
  padGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 4.5)
  pad.connect(padGain)
  padGain.connect(bus)
  pad.start(t0)
  pad.stop(t0 + 4.55)

  for (const note of HARBOR_FANFARE_NOTES) {
    trumpetVoice(ctx, bus, note, t0)
  }

  const endAt = t0 + HARBOR_FANFARE_DURATION_MS / 1000
  const timer = window.setTimeout(() => {
    try {
      bus.disconnect()
    } catch {
      /* already gone */
    }
    if (activeStop === stop) activeStop = null
  }, HARBOR_FANFARE_DURATION_MS + 80)

  const stop = () => {
    window.clearTimeout(timer)
    try {
      bus.gain.cancelScheduledValues(ctx.currentTime)
      bus.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.04)
    } catch {
      /* ignore */
    }
    window.setTimeout(() => {
      try {
        bus.disconnect()
      } catch {
        /* ignore */
      }
    }, 120)
    if (activeStop === stop) activeStop = null
  }
  activeStop = stop
  void endAt
}

export function stopHarborCorrectFanfare(): void {
  activeStop?.()
  activeStop = null
}

/** Pure check that the scheduled melody spans 3–6 seconds (no AudioContext). */
export function harborFanfareDurationMs(): number {
  let end = 0
  for (const n of HARBOR_FANFARE_NOTES) {
    end = Math.max(end, (n.start + n.dur + 0.12) * 1000)
  }
  // Include pad sustain to match HARBOR_FANFARE_DURATION_MS
  return Math.max(end, HARBOR_FANFARE_DURATION_MS)
}
