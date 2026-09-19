/**
 * Offline smoke — painted Harbor anime face (not sticker-circle eyes).
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  HARBOR_EYE_STYLES,
  HARBOR_FACE_STYLES,
  type HarborEyeStyle,
} from './harborAppearance'
import { paintHarborAnimeFaceRgba, makeHarborAnimeFaceTexture } from './harborAnimeFace'
import { harborFigureFace, harborFigureMat } from './harborFigure'

const SIZE = 256

function hashRgba(data: Uint8Array): string {
  let h = 2166136261
  for (let i = 0; i < data.length; i += 17) {
    h ^= data[i]!
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16)
}

const base = {
  skin: 0xe8c4a8,
  iris: 0x2a4a58,
  brow: 0x1a1410,
  lip: 0xc86878,
}

const hashes = new Map<string, string>()
for (const eyeStyle of HARBOR_EYE_STYLES) {
  for (const faceStyle of HARBOR_FACE_STYLES) {
    const data = paintHarborAnimeFaceRgba({ ...base, eyeStyle, faceStyle })
    assert.equal(data.length, SIZE * SIZE * 4, '256² RGBA8 face card')
    assert.equal(data[3], 255, 'opaque skin fill (no transparent postage stamp)')
    hashes.set(`${eyeStyle}:${faceStyle}`, hashRgba(data))
  }
}
const unique = new Set(hashes.values())
assert.equal(unique.size, HARBOR_EYE_STYLES.length * HARBOR_FACE_STYLES.length, 'each eye×face style paints a distinct card')

const sleepy = paintHarborAnimeFaceRgba({ ...base, eyeStyle: 'sleepy' })
const round = paintHarborAnimeFaceRgba({ ...base, eyeStyle: 'round' })
assert.notEqual(hashRgba(sleepy), hashRgba(round), 'sleepy ≠ round (half-lidded crescents, never black sunglass)')

const tex = makeHarborAnimeFaceTexture({ ...base, eyeStyle: 'bright' })
assert.equal(tex.userData.harborAnimeFace, true)
assert.equal(makeHarborAnimeFaceTexture({ ...base, eyeStyle: 'bright' }), tex, 'face textures are cached')

const skin = harborFigureMat(0xe8c4a8)
const face = harborFigureFace(skin, 1.1, { eyeStyle: 'almond' as HarborEyeStyle, showBrows: true })
let card = 0
let brows = 0
face.traverse((o) => {
  const m = o as import('three').Mesh
  if (!m.isMesh) return
  if (m.userData.harborAnimeFace) card += 1
  if (m.userData.harborBrow) brows += 1
})
assert.equal(card, 1, 'figure face exposes one painted card')
assert.equal(brows, 2, 'figure face keeps eyebrow strokes')

const src = readFileSync(new URL('./harborAnimeFace.ts', import.meta.url), 'utf8')
assert.match(src, /half-lidded crescents|never black sunglass/, 'sleepy path documented')
assert.match(src, /catchlights|Large irises/, 'anime eye grammar locked')

console.log('harborAnimeFace.smoke: ok', unique.size, 'style cards')
