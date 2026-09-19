import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { revampHarborAlbedoRgba } from './harborTextureRevamp'
import { hqSoftGrassTexture, hqWoodTexture } from './harborCraft'

function main() {
  const src = readFileSync(new URL('./harborTextureRevamp.ts', import.meta.url), 'utf8')
  assert.match(src, /revampHarborAlbedoRgba/)
  assert.match(src, /blackLift/)
  assert.match(src, /saturation/)

  const craft = readFileSync(new URL('./harborCraft.ts', import.meta.url), 'utf8')
  assert.match(craft, /revampHarborAlbedoRgba/, 'procedural albedos run the painterly flatten')

  const w = 16
  const h = 16
  const data = new Uint8Array(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    const grit = (i * 17) % 80
    data[i * 4] = 70 + grit
    data[i * 4 + 1] = 50 + (grit >> 1)
    data[i * 4 + 2] = 40
    data[i * 4 + 3] = 255
  }
  // Hard jade square the bilateral must keep.
  for (let y = 5; y < 11; y++) {
    for (let x = 5; x < 11; x++) {
      const i = (y * w + x) * 4
      data[i] = 30
      data[i + 1] = 180
      data[i + 2] = 150
    }
  }
  const before = new Uint8Array(data)
  const std = (buf: Uint8Array) => {
    let sum = 0
    for (let i = 0; i < buf.length; i += 4) sum += buf[i]
    const mean = sum / (buf.length / 4)
    let v = 0
    for (let i = 0; i < buf.length; i += 4) v += (buf[i] - mean) ** 2
    return Math.sqrt(v / (buf.length / 4))
  }
  revampHarborAlbedoRgba(data, w, h, { radius: 2, saturation: 1.3, blackLift: 0.08 })
  assert.ok(std(data) < std(before), 'flatten reduces high-frequency variance')
  let min = 255
  for (let i = 0; i < data.length; i += 4) min = Math.min(min, data[i], data[i + 1], data[i + 2])
  assert.ok(min >= 8, `black lift raised crushed blacks (min=${min})`)
  const zoneG = data[(8 * w + 8) * 4 + 1]
  const fieldG = data[(1 * w + 1) * 4 + 1]
  assert.ok(zoneG > fieldG + 20, 'crisp painted edge survived the flatten')

  const wood = hqWoodTexture()
  assert.equal(wood.image.width, 128)
  const grass = hqSoftGrassTexture()
  assert.equal(grass.image.width, 128)

  console.log('harborTextureRevamp.smoke: ok')
}

main()
