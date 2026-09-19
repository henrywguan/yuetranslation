/**
 * Harbor Quest · in-engine albedo flatten (Phase 2, matches the Python batcher).
 * Bilateral-ish blur + saturation + black lift on procedural 128×128 maps so
 * wood / ground / thatch read as painterly color zones, not photo grit.
 */
import * as THREE from 'three'

export type HarborTextureRevampOpts = {
  /** Bilateral spatial radius (px). Soft ground uses 2; nearest props use 1. */
  radius?: number
  saturation?: number
  /** 0–1 lift applied in linear (crushed blacks → paper mid). */
  blackLift?: number
}

export const HARBOR_TEXTURE_REVAMP = {
  saturation: 1.26,
  blackLift: 0.06,
} as const

function srgbToLinear(c: number): number {
  const x = c / 255
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
}

function linearToSrgb(x: number): number {
  const y = x <= 0.0031308 ? x * 12.92 : 1.055 * x ** (1 / 2.4) - 0.055
  return Math.round(THREE.MathUtils.clamp(y, 0, 1) * 255)
}

function saturateRgb(r: number, g: number, b: number, sat: number): [number, number, number] {
  const mx = Math.max(r, g, b)
  const mn = Math.min(r, g, b)
  const chroma = mx - mn
  if (chroma < 1e-3 || mx < 1e-3) return [r, g, b]
  const s = chroma / mx
  const s2 = Math.min(1, s * sat)
  const scale = s2 / s
  const mean = (r + g + b) / 3
  return [
    THREE.MathUtils.clamp(mean + (r - mean) * scale, 0, 1),
    THREE.MathUtils.clamp(mean + (g - mean) * scale, 0, 1),
    THREE.MathUtils.clamp(mean + (b - mean) * scale, 0, 1),
  ]
}

/**
 * Edge-aware flatten in-place on RGBA8 (`w * h * 4`).
 * Spatial gaussian × range gaussian — cheap enough for 128² craft maps.
 */
export function revampHarborAlbedoRgba(
  data: Uint8Array,
  width: number,
  height: number,
  opts: HarborTextureRevampOpts = {},
): void {
  const radius = opts.radius ?? 2
  const saturation = opts.saturation ?? HARBOR_TEXTURE_REVAMP.saturation
  const blackLift = opts.blackLift ?? HARBOR_TEXTURE_REVAMP.blackLift
  const src = new Uint8Array(data)
  const sigmaSpace = Math.max(0.6, radius * 0.85)
  const sigmaColor = 0.14
  const twoSs = 2 * sigmaSpace * sigmaSpace
  const twoSc = 2 * sigmaColor * sigmaColor

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const sr = src[i] / 255
      const sg = src[i + 1] / 255
      const sb = src[i + 2] / 255
      let wr = 0
      let wg = 0
      let wb = 0
      let wsum = 0
      for (let dy = -radius; dy <= radius; dy++) {
        const yy = y + dy
        if (yy < 0 || yy >= height) continue
        for (let dx = -radius; dx <= radius; dx++) {
          const xx = x + dx
          if (xx < 0 || xx >= width) continue
          const j = (yy * width + xx) * 4
          const nr = src[j] / 255
          const ng = src[j + 1] / 255
          const nb = src[j + 2] / 255
          const space = Math.exp(-(dx * dx + dy * dy) / twoSs)
          const dc = (nr - sr) ** 2 + (ng - sg) ** 2 + (nb - sb) ** 2
          const range = Math.exp(-dc / twoSc)
          const w = space * range
          wr += nr * w
          wg += ng * w
          wb += nb * w
          wsum += w
        }
      }
      const inv = wsum > 1e-8 ? 1 / wsum : 1
      let [r, g, b] = saturateRgb(wr * inv, wg * inv, wb * inv, saturation)
      r = linearToSrgb(blackLift + srgbToLinear(r * 255) * (1 - blackLift))
      g = linearToSrgb(blackLift + srgbToLinear(g * 255) * (1 - blackLift))
      b = linearToSrgb(blackLift + srgbToLinear(b * 255) * (1 - blackLift))
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      // alpha unchanged
    }
  }
}

/** Apply the painterly flatten to a Harbor DataTexture (mutates the pixel buffer). */
export function revampHarborDataTexture(tex: THREE.DataTexture, opts: HarborTextureRevampOpts = {}): THREE.DataTexture {
  const img = tex.image as { data: Uint8Array; width: number; height: number }
  if (!img?.data || !img.width || !img.height) return tex
  if (tex.userData.harborTextureRevamped) return tex
  revampHarborAlbedoRgba(img.data, img.width, img.height, opts)
  tex.userData.harborTextureRevamped = true
  tex.needsUpdate = true
  return tex
}
