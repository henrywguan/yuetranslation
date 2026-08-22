import type { TonePoint } from './tonesData'

let sharedCtx: AudioContext | null = null

function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!sharedCtx) sharedCtx = new AC()
  return sharedCtx
}

/** Soft sine hum that follows a tone’s pitch shape — no paid TTS. */
export async function humContour(freqs: number[], durationMs = 720): Promise<void> {
  const audio = ctx()
  if (!audio || freqs.length === 0) return
  if (audio.state === 'suspended') await audio.resume()

  const now = audio.currentTime
  const dur = durationMs / 1000
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  osc.type = 'sine'
  osc.connect(gain)
  gain.connect(audio.destination)

  const first = freqs[0]!
  osc.frequency.setValueAtTime(first, now)
  for (let i = 1; i < freqs.length; i++) {
    const t = now + (dur * i) / (freqs.length - 1)
    osc.frequency.linearRampToValueAtTime(freqs[i]!, t)
  }

  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.085, now + 0.05)
  gain.gain.setValueAtTime(0.085, now + dur * 0.72)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur)

  osc.start(now)
  osc.stop(now + dur + 0.02)
}

export function humFromPoints(points: TonePoint[], baseLow = 120, baseHigh = 300, durationMs = 720) {
  const freqs = points.map((p) => baseLow + p.y * (baseHigh - baseLow))
  return humContour(freqs, durationMs)
}
