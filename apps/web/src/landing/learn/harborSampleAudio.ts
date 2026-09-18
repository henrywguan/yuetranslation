/**
 * Harbor Quest · shared sample decode / oneshot / loop helpers.
 * Files live under `/assets/harbor-quest/` (Vite public).
 */
import { ensureSharedAudioContext } from '../../lib/audioReactive'

const bufferCache = new Map<string, AudioBuffer>()
const inflight = new Map<string, Promise<AudioBuffer | null>>()

export async function loadHarborSample(url: string): Promise<AudioBuffer | null> {
  const hit = bufferCache.get(url)
  if (hit) return hit
  const pending = inflight.get(url)
  if (pending) return pending
  const job = (async () => {
    try {
      const ctx = ensureSharedAudioContext()
      const res = await fetch(url)
      if (!res.ok) return null
      const raw = await res.arrayBuffer()
      const buf = await ctx.decodeAudioData(raw.slice(0))
      bufferCache.set(url, buf)
      return buf
    } catch {
      return null
    } finally {
      inflight.delete(url)
    }
  })()
  inflight.set(url, job)
  return job
}

/** Fire-and-forget warm for a list of public URLs. */
export function preloadHarborSamples(urls: readonly string[]): void {
  for (const url of urls) void loadHarborSample(url)
}

export type HarborSamplePlayOpts = {
  gain?: number
  /** Duck / stop previous oneshot on this channel id. */
  channel?: string
}

const channelSources = new Map<string, AudioBufferSourceNode>()

/** Play a decoded (or fetch-on-demand) oneshot. Never throws into UI. */
export function playHarborSample(url: string, opts: HarborSamplePlayOpts = {}): void {
  if (typeof window === 'undefined') return
  const gain = opts.gain ?? 0.85
  const channel = opts.channel
  void (async () => {
    try {
      const buf = await loadHarborSample(url)
      if (!buf) return
      const ctx = ensureSharedAudioContext()
      if (channel) {
        const prev = channelSources.get(channel)
        if (prev) {
          try {
            prev.stop()
          } catch {
            /* ignore */
          }
          channelSources.delete(channel)
        }
      }
      const src = ctx.createBufferSource()
      src.buffer = buf
      const g = ctx.createGain()
      g.gain.value = gain
      src.connect(g)
      g.connect(ctx.destination)
      if (channel) {
        channelSources.set(channel, src)
        src.onended = () => {
          if (channelSources.get(channel) === src) channelSources.delete(channel)
        }
      }
      src.start(0)
    } catch {
      /* autoplay / decode — never block quest UI */
    }
  })()
}

export type HarborSampleLoopHandle = {
  stop: (fadeMs?: number) => void
}

/** Start a looping bed once the buffer is ready. Returns a stop handle immediately. */
export function startHarborSampleLoop(
  url: string,
  opts: { gain?: number } = {},
): HarborSampleLoopHandle {
  let stopped = false
  let src: AudioBufferSourceNode | null = null
  let gainNode: GainNode | null = null
  const targetGain = opts.gain ?? 0.28

  void (async () => {
    try {
      const buf = await loadHarborSample(url)
      if (!buf || stopped) return
      const ctx = ensureSharedAudioContext()
      src = ctx.createBufferSource()
      src.buffer = buf
      src.loop = true
      gainNode = ctx.createGain()
      gainNode.gain.setValueAtTime(0.0001, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(targetGain, ctx.currentTime + 0.4)
      src.connect(gainNode)
      gainNode.connect(ctx.destination)
      src.start(0)
    } catch {
      /* ignore */
    }
  })()

  return {
    stop(fadeMs = 500) {
      stopped = true
      const g = gainNode
      const s = src
      gainNode = null
      src = null
      if (!g || !s) return
      try {
        const ctx = ensureSharedAudioContext()
        g.gain.cancelScheduledValues(ctx.currentTime)
        g.gain.setTargetAtTime(0.0001, ctx.currentTime, Math.max(0.05, fadeMs / 1000 / 3))
        window.setTimeout(() => {
          try {
            s.stop()
          } catch {
            /* ignore */
          }
          try {
            g.disconnect()
          } catch {
            /* ignore */
          }
        }, fadeMs + 80)
      } catch {
        try {
          s.stop()
        } catch {
          /* ignore */
        }
      }
    },
  }
}
