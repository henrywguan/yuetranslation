/** Azure Speech is most reliable with 16 kHz 16-bit mono PCM. */
export const AZURE_PCM_RATE = 16000

/**
 * Linear resampler that carries leftover samples across chunks so 48 kHz
 * ScriptProcessor buffers line up on 16 kHz output boundaries.
 */
export function createLinearResampler(inRate: number, outRate = AZURE_PCM_RATE) {
  let leftover = new Float32Array(0)
  const ratio = inRate / outRate

  return (input: Float32Array): Float32Array => {
    if (inRate === outRate) return input
    if (!input.length) return new Float32Array(0)

    const combined = new Float32Array(leftover.length + input.length)
    combined.set(leftover)
    combined.set(input, leftover.length)

    const outLen = Math.floor((combined.length - 1) / ratio)
    if (outLen < 1) {
      leftover = combined
      return new Float32Array(0)
    }

    const out = new Float32Array(outLen)
    for (let i = 0; i < outLen; i++) {
      const src = i * ratio
      const j = Math.floor(src)
      const f = src - j
      const a = combined[j] ?? 0
      const b = combined[j + 1] ?? a
      out[i] = a + (b - a) * f
    }

    const consumed = outLen * ratio
    leftover = combined.slice(Math.floor(consumed))
    return out
  }
}

export function floatTo16BitPcm(input: Float32Array): ArrayBuffer {
  const out = new ArrayBuffer(input.length * 2)
  const view = new DataView(out)
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i] ?? 0))
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return out
}
