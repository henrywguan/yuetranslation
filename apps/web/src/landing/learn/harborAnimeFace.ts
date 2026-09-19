/**
 * Harbor Quest · painted anime face (Genshin / Wuxia-readable at play camera).
 * Rasterized into a DataTexture so it works in Node smokes and iOS WebGL
 * (Lambert + map — same path as world albedos).
 */
import * as THREE from 'three'
import type { HarborEyeStyle, HarborFaceStyle } from './harborAppearance'

export type HarborAnimeFacePaint = {
  skin: number
  iris: number
  brow: number
  lip: number
  eyeStyle?: HarborEyeStyle
  faceStyle?: HarborFaceStyle
  blush?: number | null
}

const SIZE = 256

function hexRgb(hex: number): [number, number, number] {
  return [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff]
}

function mix(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t)
}

function put(data: Uint8Array, w: number, x: number, y: number, r: number, g: number, b: number, a: number) {
  if (x < 0 || y < 0 || x >= w || y >= w) return
  const i = (y * w + x) * 4
  const destA = data[i + 3] / 255
  const srcA = a / 255
  const outA = srcA + destA * (1 - srcA)
  if (outA < 1e-4) return
  data[i] = Math.round((r * srcA + data[i] * destA * (1 - srcA)) / outA)
  data[i + 1] = Math.round((g * srcA + data[i + 1] * destA * (1 - srcA)) / outA)
  data[i + 2] = Math.round((b * srcA + data[i + 2] * destA * (1 - srcA)) / outA)
  data[i + 3] = Math.round(outA * 255)
}

function ellipse(
  data: Uint8Array,
  w: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  r: number,
  g: number,
  b: number,
  a: number,
) {
  const x0 = Math.max(0, Math.floor(cx - rx - 1))
  const x1 = Math.min(w - 1, Math.ceil(cx + rx + 1))
  const y0 = Math.max(0, Math.floor(cy - ry - 1))
  const y1 = Math.min(w - 1, Math.ceil(cy + ry + 1))
  const rx2 = rx * rx
  const ry2 = ry * ry
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const u = (x - cx) / rx
      const v = (y - cy) / ry
      const d = u * u + v * v
      if (d > 1) continue
      const edge = d > 0.72 ? 1 - (d - 0.72) / 0.28 : 1
      put(data, w, x, y, r, g, b, Math.round(a * edge))
    }
  }
}

function eyeMetrics(style: HarborEyeStyle) {
  if (style === 'almond') return { rx: 36, ry: 18, tilt: 0.22, iris: 0.68 }
  if (style === 'bright') return { rx: 38, ry: 32, tilt: 0.04, iris: 0.74 }
  if (style === 'sleepy') return { rx: 34, ry: 13, tilt: 0.08, iris: 0.58 }
  return { rx: 34, ry: 28, tilt: 0.06, iris: 0.7 }
}

/**
 * Paint a front-facing anime face into RGBA8 (origin top-left).
 * Large irises, lash line, catchlights, blush — not sticker circles.
 */
export function paintHarborAnimeFaceRgba(opts: HarborAnimeFacePaint, size = SIZE): Uint8Array {
  const data = new Uint8Array(size * size * 4)
  const style = opts.eyeStyle ?? 'round'
  const [skR, skG, skB] = hexRgb(opts.skin)
  const [irR, irG, irB] = hexRgb(opts.iris)
  const [brR, brG, brB] = hexRgb(opts.brow)
  const [lpR, lpG, lpB] = hexRgb(opts.lip)
  const blushHex = opts.blush === null ? null : (opts.blush ?? 0xffb0b8)
  const cheerful = opts.faceStyle === 'cheerful'
  const sharp = opts.faceStyle === 'sharp'

  // Opaque skin fill — plane corners must not go transparent on iOS.
  for (let i = 0; i < data.length; i += 4) {
    data[i] = skR
    data[i + 1] = skG
    data[i + 2] = skB
    data[i + 3] = 255
  }
  // Soft chin shade so the card reads as an oval, not a postage stamp.
  ellipse(data, size, 128, 210, 78, 36, mix(skR, 40, 0.12), mix(skG, 20, 0.12), mix(skB, 16, 0.12), 70)

  if (blushHex != null) {
    const [blR, blG, blB] = hexRgb(blushHex)
    ellipse(data, size, 72, 150, 22, 12, blR, blG, blB, cheerful ? 120 : 80)
    ellipse(data, size, 184, 150, 22, 12, blR, blG, blB, cheerful ? 120 : 80)
  }

  const m = eyeMetrics(style)
  const eyeY = style === 'sleepy' ? 118 : style === 'bright' ? 108 : 112
  const spread = style === 'bright' ? 40 : 38

  for (const side of [-1, 1] as const) {
    const cx = 128 + side * spread
    const cy = eyeY
    // Sclera
    ellipse(data, size, cx, cy, m.rx, m.ry, 255, 248, 242, 255)
    // Iris
    const iR = m.rx * m.iris * 0.72
    const iRy = m.ry * m.iris
    ellipse(data, size, cx, cy + 2, iR, iRy, irR, irG, irB, 255)
    // Inner iris glow
    ellipse(
      data,
      size,
      cx,
      cy + 1,
      iR * 0.55,
      iRy * 0.55,
      mix(irR, 255, 0.25),
      mix(irG, 255, 0.25),
      mix(irB, 255, 0.35),
      220,
    )
    // Pupil
    ellipse(data, size, cx, cy + 3, iR * 0.32, iRy * 0.38, 18, 14, 16, 255)
    // Catchlights — the anime sparkle
    ellipse(data, size, cx - side * 6, cy - 5, 5, 6, 255, 255, 255, 255)
    ellipse(data, size, cx + side * 4, cy + 4, 2.4, 2.8, 255, 255, 255, 220)
    // Upper lash (thick)
    ellipse(data, size, cx, cy - m.ry * 0.62, m.rx * 0.98, m.ry * 0.38, 22, 16, 14, 255)
    if (style === 'sleepy') {
      // Half-lidded crescents (never black sunglass bars)
      ellipse(data, size, cx, cy - 2, m.rx * 1.02, m.ry * 0.85, skR, skG, skB, 235)
      ellipse(data, size, cx, cy + 3, m.rx * 0.95, m.ry * 0.42, 255, 248, 242, 255)
      ellipse(data, size, cx, cy + 4, iR * 0.9, iRy * 0.45, irR, irG, irB, 255)
      ellipse(data, size, cx - side * 5, cy + 1, 4, 3.5, 255, 255, 255, 255)
    }
    // Lower lash hint
    ellipse(data, size, cx, cy + m.ry * 0.78, m.rx * 0.7, 2.2, 40, 28, 26, 90)
    // Brow — arched, not a box
    const browY = cy - m.ry - (style === 'sleepy' ? 10 : 14)
    const browTilt = side * (sharp ? 8 : 5)
    ellipse(
      data,
      size,
      cx + browTilt * 0.15,
      browY,
      m.rx * 0.85,
      style === 'sleepy' ? 3.2 : 4.2,
      brR,
      brG,
      brB,
      255,
    )
  }

  // Tiny nose
  ellipse(data, size, 128, 148, 3.2, 4.5, mix(skR, 80, 0.18), mix(skG, 50, 0.18), mix(skB, 40, 0.18), 160)
  // Small mouth
  const mouthY = opts.faceStyle === 'calm' ? 176 : 172
  const mouthW = cheerful ? 16 : 11
  ellipse(data, size, 128, mouthY, mouthW, cheerful ? 5 : 3.4, lpR, lpG, lpB, 230)
  if (cheerful) ellipse(data, size, 128, mouthY + 1, 8, 2.2, mix(lpR, 255, 0.35), mix(lpG, 200, 0.2), mix(lpB, 200, 0.2), 180)

  return data
}

const faceCache = new Map<string, THREE.DataTexture>()

export function makeHarborAnimeFaceTexture(opts: HarborAnimeFacePaint): THREE.DataTexture {
  const key = [
    opts.skin,
    opts.iris,
    opts.brow,
    opts.lip,
    opts.eyeStyle ?? 'round',
    opts.faceStyle ?? 'soft',
    opts.blush === null ? 'x' : (opts.blush ?? 0xffb0b8),
  ].join(':')
  const hit = faceCache.get(key)
  if (hit) return hit
  const data = paintHarborAnimeFaceRgba(opts)
  const tex = new THREE.DataTexture(data, SIZE, SIZE)
  tex.flipY = true
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearFilter
  tex.generateMipmaps = false
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  tex.userData.harborAnimeFace = true
  faceCache.set(key, tex)
  return tex
}
