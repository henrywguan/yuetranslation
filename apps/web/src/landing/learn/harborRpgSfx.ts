/**
 * Soft HarborRPG SFX — local WebAudio only (no paid APIs).
 */
import { ensureSharedAudioContext } from '../../lib/audioReactive'

function beep(opts: {
  freq: number
  dur: number
  gain?: number
  type?: OscillatorType
  slide?: number
}) {
  try {
    const ctx = ensureSharedAudioContext()
    if (!ctx) return
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = opts.type ?? 'triangle'
    osc.frequency.setValueAtTime(opts.freq, now)
    if (opts.slide) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(40, opts.freq * opts.slide),
        now + opts.dur,
      )
    }
    g.gain.setValueAtTime(0.0001, now)
    g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.08, now + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, now + opts.dur)
    osc.connect(g)
    g.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + opts.dur + 0.02)
  } catch {
    /* ignore */
  }
}

/** Entering an instance dungeon portal. */
export function playHarborRpgDungeonEnter(): void {
  beep({ freq: 220, dur: 0.18, gain: 0.07, type: 'sine' })
  window.setTimeout(() => beep({ freq: 330, dur: 0.22, gain: 0.06, type: 'sine' }), 90)
}

/** Boss phase transition — readable sting. */
export function playHarborRpgBossPhase(): void {
  beep({ freq: 160, dur: 0.28, gain: 0.1, type: 'sawtooth', slide: 1.8 })
  window.setTimeout(() => beep({ freq: 420, dur: 0.16, gain: 0.07, type: 'triangle' }), 120)
}

/** Soft party invite chime. */
export function playHarborRpgPartyInvite(): void {
  beep({ freq: 520, dur: 0.12, gain: 0.06, type: 'sine' })
  window.setTimeout(() => beep({ freq: 660, dur: 0.14, gain: 0.05, type: 'sine' }), 80)
}

/** Player defeated — descending sting (overworld soft respawn / instance wipe). */
export function playHarborRpgPlayerDown(): void {
  beep({ freq: 280, dur: 0.22, gain: 0.09, type: 'sawtooth', slide: 0.45 })
  window.setTimeout(() => beep({ freq: 140, dur: 0.28, gain: 0.07, type: 'triangle', slide: 0.6 }), 100)
}
