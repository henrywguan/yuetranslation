/**
 * Harbor Quest answer SFX — plays original WAVs under /assets/harbor-quest/.
 * Procedural recreations inspired by classic game hits; not ripped assets.
 */
import { ensureSharedAudioContext } from '../../lib/audioReactive'

export type HarborMissStyle = 'thud' | 'oof'

/** Public URLs for committed Harbor Quest miss cues. */
export const HARBOR_MISS_SRC: Record<HarborMissStyle, string> = {
  /** Fantasy-RPG body-hit / grunt feel (RuneScape-inspired, original). */
  thud: '/assets/harbor-quest/miss-thud.wav',
  /** Short vocal oof (block-game-inspired, original). */
  oof: '/assets/harbor-quest/miss-oof.wav',
}

const buffers = new Map<HarborMissStyle, AudioBuffer>()
let loading: Promise<void> | null = null
let activeSource: AudioBufferSourceNode | null = null

async function ensureBuffers(): Promise<void> {
  if (buffers.size === 2) return
  if (loading) return loading
  loading = (async () => {
    const ctx = ensureSharedAudioContext()
    await Promise.all(
      (Object.keys(HARBOR_MISS_SRC) as HarborMissStyle[]).map(async (key) => {
        if (buffers.has(key)) return
        const res = await fetch(HARBOR_MISS_SRC[key])
        if (!res.ok) throw new Error(`Harbor miss SFX missing: ${key}`)
        const raw = await res.arrayBuffer()
        const buf = await ctx.decodeAudioData(raw.slice(0))
        buffers.set(key, buf)
      }),
    )
  })().finally(() => {
    loading = null
  })
  return loading
}

/** Warm the miss buffers after a user gesture (optional). */
export function preloadHarborMissSfx(): void {
  void ensureBuffers().catch(() => {
    /* ignore — first play will retry */
  })
}

/**
 * Play a miss cue. Default `thud` = RPG hit grunt; pass `oof` for the block-game vibe.
 * Safe from click handlers.
 */
export function playHarborMiss(style: HarborMissStyle = 'thud'): void {
  const ctx = ensureSharedAudioContext()
  void (async () => {
    try {
      await ensureBuffers()
      const buf = buffers.get(style)
      if (!buf) return
      stopHarborMiss()
      const src = ctx.createBufferSource()
      src.buffer = buf
      const gain = ctx.createGain()
      gain.gain.value = 0.9
      src.connect(gain)
      gain.connect(ctx.destination)
      activeSource = src
      src.onended = () => {
        if (activeSource === src) activeSource = null
      }
      src.start(0)
    } catch {
      /* autoplay / decode failure — never block the quest UI */
    }
  })()
}

export function stopHarborMiss(): void {
  try {
    activeSource?.stop()
  } catch {
    /* already stopped */
  }
  activeSource = null
}
