/**
 * Harbor Quest · immersion interaction SFX.
 * OSRS-style local cues + cinematic Higgsfield whoosh sample for UI/bag.
 * Original synthesis — not Jagex audio.
 */
import { ensureSharedAudioContext } from '../../lib/audioReactive'
import type { HarborVisitableId } from './harborWorld'
import { playHarborSample, preloadHarborSamples } from './harborSampleAudio'

export const HARBOR_INTERACT_SFX_GAIN = 0.34
export const HARBOR_UI_WHOOSH_SAMPLE = '/assets/harbor-quest/sfx-ui-whoosh.mp3'

export function preloadHarborInteractSamples(): void {
  preloadHarborSamples([HARBOR_UI_WHOOSH_SAMPLE])
}

function busAt(gain: number): { ctx: AudioContext; bus: GainNode; t0: number } {
  const ctx = ensureSharedAudioContext()
  const t0 = ctx.currentTime + 0.008
  const bus = ctx.createGain()
  bus.gain.setValueAtTime(gain, t0)
  bus.connect(ctx.destination)
  return { ctx, bus, t0 }
}

function tone(
  ctx: AudioContext,
  dest: AudioNode,
  t0: number,
  opts: {
    type?: OscillatorType
    f0: number
    f1?: number
    dur: number
    gain?: number
    attack?: number
  },
): void {
  const o = ctx.createOscillator()
  o.type = opts.type ?? 'sine'
  o.frequency.setValueAtTime(opts.f0, t0)
  if (opts.f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.f1), t0 + opts.dur)
  const g = ctx.createGain()
  const peak = opts.gain ?? 0.5
  const atk = opts.attack ?? 0.008
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(peak, t0 + atk)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur)
  o.connect(g)
  g.connect(dest)
  o.start(t0)
  o.stop(t0 + opts.dur + 0.02)
}

function noiseBurst(
  ctx: AudioContext,
  dest: AudioNode,
  t0: number,
  dur: number,
  freq: number,
  gain: number,
): void {
  const nLen = Math.max(1, Math.floor(ctx.sampleRate * dur))
  const buf = ctx.createBuffer(1, nLen, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < nLen; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (nLen * 0.4))
  const src = ctx.createBufferSource()
  src.buffer = buf
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.setValueAtTime(freq, t0)
  bp.Q.setValueAtTime(0.9, t0)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(bp)
  bp.connect(g)
  g.connect(dest)
  src.start(t0)
  src.stop(t0 + dur + 0.02)
}

/** Soft UI tick (tabs, filters). */
export function playHarborUiClick(): void {
  if (typeof window === 'undefined') return
  playHarborSample(HARBOR_UI_WHOOSH_SAMPLE, { gain: 0.35, channel: 'harbor-ui' })
  const { ctx, bus, t0 } = busAt(HARBOR_INTERACT_SFX_GAIN * 0.4)
  tone(ctx, bus, t0, { type: 'triangle', f0: 880, f1: 660, dur: 0.05, gain: 0.28 })
}

/** Inventory bag open — soft leather / wood + cinematic whoosh. */
export function playHarborBagOpen(): void {
  if (typeof window === 'undefined') return
  playHarborSample(HARBOR_UI_WHOOSH_SAMPLE, { gain: 0.55, channel: 'harbor-ui' })
  const { ctx, bus, t0 } = busAt(HARBOR_INTERACT_SFX_GAIN)
  noiseBurst(ctx, bus, t0, 0.1, 600, 0.45)
  tone(ctx, bus, t0 + 0.04, { type: 'triangle', f0: 220, f1: 160, dur: 0.12, gain: 0.4 })
}

/** Inventory bag close. */
export function playHarborBagClose(): void {
  if (typeof window === 'undefined') return
  const { ctx, bus, t0 } = busAt(HARBOR_INTERACT_SFX_GAIN * 0.9)
  tone(ctx, bus, t0, { type: 'triangle', f0: 180, f1: 120, dur: 0.1, gain: 0.4 })
  noiseBurst(ctx, bus, t0 + 0.03, 0.08, 400, 0.3)
}

/** Equip / wear gear. */
export function playHarborEquip(): void {
  if (typeof window === 'undefined') return
  const { ctx, bus, t0 } = busAt(HARBOR_INTERACT_SFX_GAIN)
  tone(ctx, bus, t0, { type: 'triangle', f0: 320, f1: 240, dur: 0.08, gain: 0.35 })
  tone(ctx, bus, t0 + 0.05, { type: 'sine', f0: 720, f1: 540, dur: 0.1, gain: 0.28 })
}

/** Bank deposit. */
export function playHarborBankDeposit(): void {
  if (typeof window === 'undefined') return
  const { ctx, bus, t0 } = busAt(HARBOR_INTERACT_SFX_GAIN)
  tone(ctx, bus, t0, { type: 'sine', f0: 520, f1: 390, dur: 0.12, gain: 0.4 })
  tone(ctx, bus, t0 + 0.07, { type: 'sine', f0: 780, dur: 0.1, gain: 0.25 })
}

/** Bank withdraw. */
export function playHarborBankWithdraw(): void {
  if (typeof window === 'undefined') return
  const { ctx, bus, t0 } = busAt(HARBOR_INTERACT_SFX_GAIN)
  tone(ctx, bus, t0, { type: 'sine', f0: 390, f1: 560, dur: 0.12, gain: 0.4 })
  tone(ctx, bus, t0 + 0.06, { type: 'sine', f0: 880, dur: 0.08, gain: 0.22 })
}

/** Enter dialogue / Talk. */
export function playHarborTalkStart(): void {
  if (typeof window === 'undefined') return
  const { ctx, bus, t0 } = busAt(HARBOR_INTERACT_SFX_GAIN * 0.85)
  noiseBurst(ctx, bus, t0, 0.12, 1400, 0.35)
  tone(ctx, bus, t0 + 0.05, { type: 'sine', f0: 440, f1: 520, dur: 0.14, gain: 0.3 })
}

/** Leave dialogue / Explore. */
export function playHarborExplore(): void {
  if (typeof window === 'undefined') return
  const { ctx, bus, t0 } = busAt(HARBOR_INTERACT_SFX_GAIN * 0.8)
  noiseBurst(ctx, bus, t0, 0.14, 900, 0.32)
  tone(ctx, bus, t0 + 0.02, { type: 'sine', f0: 330, f1: 260, dur: 0.16, gain: 0.28 })
}

/** Soft NPC greet when Talk opens. */
export function playHarborNpcGreet(): void {
  if (typeof window === 'undefined') return
  const { ctx, bus, t0 } = busAt(HARBOR_INTERACT_SFX_GAIN * 0.7)
  tone(ctx, bus, t0, { type: 'sine', f0: 523, dur: 0.1, gain: 0.32 })
  tone(ctx, bus, t0 + 0.09, { type: 'sine', f0: 659, dur: 0.14, gain: 0.28 })
}

/** Cast off / leave a landmark panel. */
export function playHarborCastOff(): void {
  if (typeof window === 'undefined') return
  const { ctx, bus, t0 } = busAt(HARBOR_INTERACT_SFX_GAIN)
  noiseBurst(ctx, bus, t0, 0.16, 500, 0.4)
  tone(ctx, bus, t0 + 0.04, { type: 'triangle', f0: 200, f1: 140, dur: 0.18, gain: 0.35 })
}

/** Landmark “door” / arrival cue — distinct per building. */
export function playHarborLandmarkOpen(id: HarborVisitableId): void {
  if (typeof window === 'undefined') return
  const { ctx, bus, t0 } = busAt(HARBOR_INTERACT_SFX_GAIN)
  switch (id) {
    case 'save-shack':
      // Wood door creak
      noiseBurst(ctx, bus, t0, 0.14, 350, 0.4)
      tone(ctx, bus, t0 + 0.03, { type: 'sawtooth', f0: 160, f1: 110, dur: 0.18, gain: 0.22 })
      break
    case 'outfitter':
      // Shop bell
      tone(ctx, bus, t0, { type: 'sine', f0: 1568, dur: 0.35, gain: 0.35 })
      tone(ctx, bus, t0, { type: 'sine', f0: 2349, dur: 0.28, gain: 0.18 })
      break
    case 'bank':
      // Jade chime
      tone(ctx, bus, t0, { type: 'sine', f0: 784, dur: 0.4, gain: 0.32 })
      tone(ctx, bus, t0 + 0.05, { type: 'sine', f0: 1175, dur: 0.35, gain: 0.2 })
      break
    case 'arena':
      // Soft drum
      tone(ctx, bus, t0, { type: 'triangle', f0: 90, f1: 55, dur: 0.22, gain: 0.55 })
      noiseBurst(ctx, bus, t0, 0.1, 180, 0.35)
      break
    case 'barber':
      // Curtain rustle
      noiseBurst(ctx, bus, t0, 0.16, 1200, 0.4)
      tone(ctx, bus, t0 + 0.06, { type: 'triangle', f0: 280, f1: 220, dur: 0.1, gain: 0.25 })
      break
    case 'cape-loom':
      // Soft loom / gold thread chime
      tone(ctx, bus, t0, { type: 'triangle', f0: 523, dur: 0.28, gain: 0.28 })
      tone(ctx, bus, t0 + 0.06, { type: 'sine', f0: 784, dur: 0.32, gain: 0.22 })
      tone(ctx, bus, t0 + 0.12, { type: 'sine', f0: 1047, dur: 0.22, gain: 0.14 })
      break
    case 'fishing-hut':
    case 'fishing-spot':
      // Soft splash + jade ping
      noiseBurst(ctx, bus, t0, 0.12, 500, 0.35)
      tone(ctx, bus, t0 + 0.04, { type: 'sine', f0: 660, dur: 0.25, gain: 0.28 })
      tone(ctx, bus, t0 + 0.1, { type: 'triangle', f0: 990, dur: 0.2, gain: 0.16 })
      break
  }
}

/** Footstep on bank grit. */
export function playHarborFootstep(): void {
  if (typeof window === 'undefined') return
  const { ctx, bus, t0 } = busAt(HARBOR_INTERACT_SFX_GAIN * 0.55)
  noiseBurst(ctx, bus, t0, 0.06, 280 + Math.random() * 80, 0.55)
  tone(ctx, bus, t0, { type: 'triangle', f0: 90, f1: 60, dur: 0.07, gain: 0.25 })
}

/** Soft paddle / water drip while canoeing. */
export function playHarborPaddle(): void {
  if (typeof window === 'undefined') return
  const { ctx, bus, t0 } = busAt(HARBOR_INTERACT_SFX_GAIN * 0.5)
  noiseBurst(ctx, bus, t0, 0.09, 520 + Math.random() * 120, 0.4)
  tone(ctx, bus, t0 + 0.02, { type: 'sine', f0: 180, f1: 120, dur: 0.1, gain: 0.22 })
}

/** Wood creak when sitting on a chair / stool. */
export function playHarborSit(): void {
  if (typeof window === 'undefined') return
  const { ctx, bus, t0 } = busAt(HARBOR_INTERACT_SFX_GAIN * 0.5)
  noiseBurst(ctx, bus, t0, 0.07, 240, 0.4)
  tone(ctx, bus, t0, { type: 'triangle', f0: 150, f1: 95, dur: 0.14, gain: 0.32 })
  tone(ctx, bus, t0 + 0.05, { type: 'sine', f0: 220, f1: 160, dur: 0.1, gain: 0.18 })
}

/** Barber confirm snip. */
export function playHarborBarberSnip(): void {
  if (typeof window === 'undefined') return
  const { ctx, bus, t0 } = busAt(HARBOR_INTERACT_SFX_GAIN)
  noiseBurst(ctx, bus, t0, 0.04, 3200, 0.5)
  tone(ctx, bus, t0 + 0.03, { type: 'square', f0: 1400, f1: 900, dur: 0.06, gain: 0.2 })
}

/** Arena panel open. */
export function playHarborArenaOpen(): void {
  if (typeof window === 'undefined') return
  const { ctx, bus, t0 } = busAt(HARBOR_INTERACT_SFX_GAIN)
  tone(ctx, bus, t0, { type: 'triangle', f0: 110, f1: 70, dur: 0.28, gain: 0.5 })
  tone(ctx, bus, t0 + 0.08, { type: 'sine', f0: 440, dur: 0.2, gain: 0.22 })
}

/** Public chat send — ink tick. */
export function playHarborChatSend(): void {
  if (typeof window === 'undefined') return
  const { ctx, bus, t0 } = busAt(HARBOR_INTERACT_SFX_GAIN * 0.6)
  noiseBurst(ctx, bus, t0, 0.05, 1800, 0.35)
  tone(ctx, bus, t0 + 0.02, { type: 'triangle', f0: 520, f1: 400, dur: 0.07, gain: 0.28 })
}

/** Teleport / chapter jump soft whoosh. */
export function playHarborTeleport(): void {
  if (typeof window === 'undefined') return
  const { ctx, bus, t0 } = busAt(HARBOR_INTERACT_SFX_GAIN)
  noiseBurst(ctx, bus, t0, 0.22, 700, 0.42)
  tone(ctx, bus, t0, { type: 'sine', f0: 260, f1: 520, dur: 0.28, gain: 0.3 })
}

let lastMoveAt = 0

/**
 * Drive footstep / paddle from pose ticks. Call ~10 Hz with movement flag.
 */
export function tickHarborMoveSfx(moving: boolean, mode: 'boat' | 'foot'): void {
  if (!moving) return
  const now = performance.now()
  const gap = mode === 'foot' ? 340 : 520
  if (now - lastMoveAt < gap) return
  lastMoveAt = now
  if (mode === 'foot') playHarborFootstep()
  else playHarborPaddle()
}
