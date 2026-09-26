/**
 * Practice Partner · fail buzz (Web Audio, no assets).
 * Short descending “wrong” cue under the next TTS line.
 */
import { ensureSharedAudioContext } from './audioReactive'

/** Nominal length of the fail buzz (smoke-tested). */
export const PRACTICE_PARTNER_FAIL_SFX_DURATION_MS = 480

type Note = { freq: number; start: number; dur: number; gain: number }

/** Falling minor buzz — not the pass chime. */
export const PRACTICE_PARTNER_FAIL_SFX_NOTES: readonly Note[] = [
  { freq: 392.0, start: 0.0, dur: 0.12, gain: 0.7 }, // G4
  { freq: 311.13, start: 0.1, dur: 0.14, gain: 0.78 }, // Eb4
  { freq: 233.08, start: 0.2, dur: 0.22, gain: 0.85 }, // Bb3
] as const

let activeStop: (() => void) | null = null

export function practicePartnerFailSfxDurationMs(): number {
  let end = 0
  for (const n of PRACTICE_PARTNER_FAIL_SFX_NOTES) {
    end = Math.max(end, (n.start + n.dur + 0.1) * 1000)
  }
  return Math.max(end, PRACTICE_PARTNER_FAIL_SFX_DURATION_MS)
}

/** Play the fail buzz. Safe after a Talk / Send unlock. */
export function playPracticePartnerFailSfx(): void {
  if (typeof window === 'undefined') return
  stopPracticePartnerFailSfx()

  const ctx = ensureSharedAudioContext()
  const t0 = ctx.currentTime + 0.01
  const bus = ctx.createGain()
  bus.gain.setValueAtTime(0.68, t0)
  bus.connect(ctx.destination)

  for (const note of PRACTICE_PARTNER_FAIL_SFX_NOTES) {
    const t = t0 + note.start
    const o = ctx.createOscillator()
    o.type = 'sawtooth'
    o.frequency.setValueAtTime(note.freq, t)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.16 * note.gain, t + 0.015)
    g.gain.exponentialRampToValueAtTime(0.0001, t + note.dur)
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(1200, t)
    o.connect(filter)
    filter.connect(g)
    g.connect(bus)
    o.start(t)
    o.stop(t + note.dur + 0.04)
  }

  // Soft noise scrape for “wrong”
  const nLen = Math.floor(ctx.sampleRate * 0.08)
  const noiseBuf = ctx.createBuffer(1, nLen, ctx.sampleRate)
  const data = noiseBuf.getChannelData(0)
  for (let i = 0; i < nLen; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (nLen * 0.3))
  const noise = ctx.createBufferSource()
  noise.buffer = noiseBuf
  const nf = ctx.createBiquadFilter()
  nf.type = 'bandpass'
  nf.frequency.setValueAtTime(900, t0)
  nf.Q.setValueAtTime(1.2, t0)
  const ng = ctx.createGain()
  ng.gain.setValueAtTime(0.14, t0)
  ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1)
  noise.connect(nf)
  nf.connect(ng)
  ng.connect(bus)
  noise.start(t0)
  noise.stop(t0 + 0.11)

  const timer = window.setTimeout(() => {
    try {
      bus.disconnect()
    } catch {
      /* gone */
    }
    if (activeStop === stop) activeStop = null
  }, PRACTICE_PARTNER_FAIL_SFX_DURATION_MS + 80)

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

export function stopPracticePartnerFailSfx(): void {
  activeStop?.()
  activeStop = null
}
