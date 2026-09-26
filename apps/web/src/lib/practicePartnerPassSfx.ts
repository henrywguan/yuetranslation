/**
 * Practice Partner · pass chime (Web Audio, no assets).
 * Short jade ding under the next TTS line — do not delay speak for this.
 */
import { ensureSharedAudioContext } from './audioReactive'

/** Nominal length of the pass chime (smoke-tested). */
export const PRACTICE_PARTNER_PASS_SFX_DURATION_MS = 520

type Note = { freq: number; start: number; dur: number; gain: number }

/** Bright C-major sparkle, ~0.5s — not the Harbor Quest fanfare. */
export const PRACTICE_PARTNER_PASS_SFX_NOTES: readonly Note[] = [
  { freq: 783.99, start: 0.0, dur: 0.12, gain: 0.62 }, // G5
  { freq: 1046.5, start: 0.07, dur: 0.16, gain: 0.78 }, // C6
  { freq: 1318.5, start: 0.16, dur: 0.28, gain: 0.88 }, // E6
] as const

let activeStop: (() => void) | null = null

export function practicePartnerPassSfxDurationMs(): number {
  let end = 0
  for (const n of PRACTICE_PARTNER_PASS_SFX_NOTES) {
    end = Math.max(end, (n.start + n.dur + 0.1) * 1000)
  }
  return Math.max(end, PRACTICE_PARTNER_PASS_SFX_DURATION_MS)
}

/** Play the pass ding. Safe after a Talk / Send unlock. */
export function playPracticePartnerPassSfx(): void {
  if (typeof window === 'undefined') return
  stopPracticePartnerPassSfx()

  const ctx = ensureSharedAudioContext()
  const t0 = ctx.currentTime + 0.01
  const bus = ctx.createGain()
  bus.gain.setValueAtTime(0.72, t0)
  bus.connect(ctx.destination)

  for (const note of PRACTICE_PARTNER_PASS_SFX_NOTES) {
    const t = t0 + note.start
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(note.freq, t)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.2 * note.gain, t + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t + note.dur)
    o.connect(g)
    g.connect(bus)
    o.start(t)
    o.stop(t + note.dur + 0.04)
  }

  // Soft confirm thud under the sparkle
  const thud = ctx.createOscillator()
  thud.type = 'triangle'
  thud.frequency.setValueAtTime(196, t0)
  const tg = ctx.createGain()
  tg.gain.setValueAtTime(0.0001, t0)
  tg.gain.exponentialRampToValueAtTime(0.12, t0 + 0.01)
  tg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18)
  thud.connect(tg)
  tg.connect(bus)
  thud.start(t0)
  thud.stop(t0 + 0.2)

  const timer = window.setTimeout(() => {
    try {
      bus.disconnect()
    } catch {
      /* gone */
    }
    if (activeStop === stop) activeStop = null
  }, PRACTICE_PARTNER_PASS_SFX_DURATION_MS + 80)

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

export function stopPracticePartnerPassSfx(): void {
  activeStop?.()
  activeStop = null
}
