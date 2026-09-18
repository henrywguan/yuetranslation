/**
 * Harbor Quest · shared RS-era craft kit (original).
 * Locked palette + flat/smooth Lambert helpers + modular props.
 * Principles from docs/harbor-quest/RS-LIKE-CRAFT-BIBLE.md — not Jagex assets.
 *
 * Detail comes from face-color steps, extruded trim, and clutter density —
 * not from raising poly counts.
 */
import * as THREE from 'three'
import { applyHarborCel } from './harborCelShader'
import { revampHarborAlbedoRgba } from './harborTextureRevamp'
import { auditHarborMesh } from './harborMeshAudit'

/** Posterized Harbor swatches (~era HSL survival). Prefer these over one-off hexes. */
export const HARBOR_CRAFT_PALETTE = {
  // Brand
  jade: 0x3dcfb6,
  ink: 0x1a2430,
  harbor: 0x1e3a48,
  // Skin / hair
  skin: 0xe8c4a8,
  hair: 0x1a1410,
  // Wood — four value steps (use all four on every plank prop)
  woodLight: 0x8a6a48,
  woodMid: 0x6a4a30,
  woodDark: 0x4a3220,
  woodDeep: 0x3a2818,
  // Stone / plaster
  plaster: 0xf0ebe0,
  plasterWarm: 0xe8e0d0,
  stone: 0x8a8680,
  stoneDark: 0x6a6860,
  stoneLite: 0xa8a49a,
  brick: 0x9a9690,
  brickDark: 0x7a7068,
  roofTile: 0x2a2e32,
  roofClay: 0x8a4030,
  // Thatch / straw value steps
  straw: 0xc4a860,
  strawLite: 0xd8c078,
  strawDark: 0x9a7840,
  // Cloth / role accents
  clothNavy: 0x2a3a6a,
  clothSage: 0x5a6a48,
  clothCrimson: 0x8a3048,
  clothGrey: 0x6a7a8a,
  clothTeal: 0x4a5a58,
  clothChild: 0xc45a48,
  trimGold: 0xc4a060,
  trimIvory: 0xe8e0d0,
  trimChild: 0xf0d060,
  // Nature
  leafDeep: 0x1f5a38,
  leafMid: 0x2f6a40,
  leafLite: 0x3a7a48,
  leafGold: 0xc4a040,
  blossom: 0xf4b8cc,
  blossomDeep: 0xe8a0b8,
  reed: 0x3d7a4a,
  reedTip: 0x8ab85a,
  sand: 0xd8c090,
  sandDark: 0xb8a070,
  // Misc
  lantern: 0xf0c060,
  waterFoam: 0xa8d8e8,
  banner: 0xc04040,
  pants: 0x3a3028,
  rock: 0x6a7078,
  rockWarm: 0x8a8578,
  glass: 0x1a3040,
  iron: 0x5a6068,
  rope: 0x9a7a48,
  lava: 0xff6020,
  lavaDeep: 0xc03010,
  ash: 0x3a3834,
} as const

export type HarborCraftColor = keyof typeof HARBOR_CRAFT_PALETTE

/** Facet count for posts / limbs / piles (era cylinders, not smooth tubes). */
export const HARBOR_FACETS = 6

/** Named modular props (smoke-tested kit). */
export const HARBOR_CRAFT_PROPS = [
  'crate',
  'barrel',
  'fence',
  'sack',
  'door',
  'wall-window',
  'market-stall',
  'chair',
  'stool',
] as const
export type HarborCraftProp = (typeof HARBOR_CRAFT_PROPS)[number]

/** Flat Lambert + Harbor cel — architecture / planks / armor plates. */
export function hqMat(
  color: number,
  extra?: ConstructorParameters<typeof THREE.MeshLambertMaterial>[0],
) {
  // Soft world (no RS facets) + Harbor cel (iOS-safe Lambert path).
  return applyHarborCel(new THREE.MeshLambertMaterial({ color, flatShading: false, ...extra }), {
    preset: extra?.emissive && extra.emissiveIntensity ? 'lantern' : 'terrain',
  })
}

/**
 * Smooth Lambert + Harbor cel — rocks, fruit, heads, lava blobs.
 * Cel ramp owns value steps; albedo stays a single hue.
 */
export function hqMatSmooth(
  color: number,
  extra?: ConstructorParameters<typeof THREE.MeshLambertMaterial>[0],
) {
  return applyHarborCel(new THREE.MeshLambertMaterial({ color, flatShading: false, ...extra }), {
    preset: 'item',
  })
}

/** Procedural 128×128 albedo cache (nearest — era idiom size). */
const texCache = new Map<string, THREE.DataTexture>()

function make128DataTex(key: string, fill: (data: Uint8Array) => void): THREE.DataTexture {
  const hit = texCache.get(key)
  if (hit) return hit
  const data = new Uint8Array(128 * 128 * 4)
  fill(data)
  revampHarborAlbedoRgba(data, 128, 128, { radius: 1, saturation: 1.18, blackLift: 0.04 })
  const tex = new THREE.DataTexture(data, 128, 128)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.needsUpdate = true
  texCache.set(key, tex)
  return tex
}

/**
 * Soft 128 albedo — LinearFilter painterly look (no nearest pixel stair-steps).
 * Used for world ground / roofs (river banks + Guan). Wood / stone / lava stay
 * on `make128DataTex` nearest for chunky prop read.
 *
 * No mipmaps: DataTexture + mipmapped linear clones go white on many
 * mobile GPUs (iOS Safari). Mag/min LinearFilter is enough for soft blotches.
 */
function makeSoft128DataTex(key: string, fill: (data: Uint8Array) => void): THREE.DataTexture {
  const hit = texCache.get(key)
  if (hit) return hit
  const data = new Uint8Array(128 * 128 * 4)
  fill(data)
  revampHarborAlbedoRgba(data, 128, 128, { radius: 2, saturation: 1.28, blackLift: 0.07 })
  const tex = new THREE.DataTexture(data, 128, 128)
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearFilter
  tex.generateMipmaps = false
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.needsUpdate = true
  texCache.set(key, tex)
  return tex
}

/**
 * Unique UV-repeat view of a DataTexture.
 * Shares the pixel buffer (read-only GPU upload) — avoids Texture.clone()
 * dropping image data / going white on mobile. Preserves mag/min filters.
 */
export function hqSoftMapRepeat(
  tex: THREE.DataTexture,
  repeatU: number,
  repeatV = repeatU,
): THREE.DataTexture {
  const img = tex.image as { data: Uint8Array; width: number; height: number }
  const map = new THREE.DataTexture(img.data, img.width, img.height)
  map.magFilter = tex.magFilter
  map.minFilter = tex.minFilter
  map.generateMipmaps = false
  map.colorSpace = tex.colorSpace
  map.wrapS = map.wrapT = THREE.RepeatWrapping
  map.repeat.set(repeatU, repeatV)
  map.needsUpdate = true
  return map
}

function setPx(data: Uint8Array, x: number, y: number, r: number, g: number, b: number) {
  const i = ((y & 127) * 128 + (x & 127)) * 4
  data[i] = r
  data[i + 1] = g
  data[i + 2] = b
  data[i + 3] = 255
}

/** Soft-edge disc blend (painterly blotches — no hard rings). */
function softBlendDisc(
  data: Uint8Array,
  cx: number,
  cy: number,
  rad: number,
  r: number,
  g: number,
  b: number,
  strength = 0.85,
) {
  const r2 = rad * rad
  const y0 = Math.floor(cy - rad)
  const y1 = Math.ceil(cy + rad)
  const x0 = Math.floor(cx - rad)
  const x1 = Math.ceil(cx + rad)
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy)
      if (d2 > r2) continue
      const t = (1 - Math.sqrt(d2) / rad) * strength
      const i = ((y & 127) * 128 + (x & 127)) * 4
      data[i] = Math.round(data[i]! * (1 - t) + r * t)
      data[i + 1] = Math.round(data[i + 1]! * (1 - t) + g * t)
      data[i + 2] = Math.round(data[i + 2]! * (1 - t) + b * t)
      data[i + 3] = 255
    }
  }
}

/** Low-frequency value noise in 0..1 (no XOR line artifacts). */
function softNoise2(x: number, y: number): number {
  const n = Math.sin(x * 0.11 + y * 0.07) * 12.9898 + Math.cos(x * 0.05 - y * 0.13) * 78.233
  return n - Math.floor(n)
}

/** Wood grain — vertical value bands (hand-painted feel, not photo scan). */
export function hqWoodTexture(): THREE.DataTexture {
  return make128DataTex('wood', (data) => {
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) {
        const band = Math.floor(x / (3 + (x % 5)))
        const lite = band % 2 === 0
        if (lite) setPx(data, x, y, 0x8a, 0x6a, 0x48)
        else setPx(data, x, y, 0x4a, 0x32, 0x20)
      }
    }
    for (let i = 0; i < 40; i++) {
      const x = (i * 31) % 128
      const y0 = (i * 47) % 128
      const dark = i % 2 === 0
      for (let dy = 0; dy < 6 + (i % 8); dy++) {
        if (dark) setPx(data, x, y0 + dy, 0x3a, 0x28, 0x18)
        else setPx(data, x, y0 + dy, 0x7a, 0x5a, 0x38)
      }
    }
  })
}

/** Thatch speck — diagonal straw strokes. */
export function hqThatchTexture(): THREE.DataTexture {
  return make128DataTex('thatch', (data) => {
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) setPx(data, x, y, 0xc4, 0xa8, 0x60)
    }
    for (let i = 0; i < 90; i++) {
      const x0 = (i * 13) % 128
      const y0 = (i * 29) % 128
      const lite = i % 3 !== 0
      for (let t = 0; t < 12; t++) {
        if (lite) setPx(data, x0 + t, y0 + t, 0xd8, 0xc0, 0x78)
        else setPx(data, x0 + t, y0 + t, 0x9a, 0x78, 0x40)
      }
    }
  })
}

/** Lava blotches for crater / forge accents. */
export function hqLavaTexture(): THREE.DataTexture {
  return make128DataTex('lava', (data) => {
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) setPx(data, x, y, 0xc0, 0x30, 0x10)
    }
    for (let i = 0; i < 28; i++) {
      const cx = (i * 37) % 128
      const cy = (i * 53) % 128
      const rad = 6 + (i % 10)
      const hot = i % 2 === 0
      for (let y = cy - rad; y <= cy + rad; y++) {
        for (let x = cx - rad; x <= cx + rad; x++) {
          if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= rad * rad) {
            if (hot) setPx(data, x, y, 0xff, 0x60, 0x20)
            else setPx(data, x, y, 0xff, 0x90, 0x40)
          }
        }
      }
    }
  })
}

/** Stone speck. */
export function hqStoneTexture(): THREE.DataTexture {
  return make128DataTex('stone', (data) => {
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) setPx(data, x, y, 0x8a, 0x86, 0x80)
    }
    for (let i = 0; i < 120; i++) {
      const x = (i * 19) % 128
      const y = (i * 41) % 128
      if (i % 3 === 0) setPx(data, x, y, 0x6a, 0x68, 0x60)
      else setPx(data, x, y, 0xa8, 0xa4, 0x9a)
    }
  })
}

/** Tropical grass turf — mottled painterly greens + short blade strokes (era 128). */
export function hqGrassTexture(): THREE.DataTexture {
  return make128DataTex('grass', (data) => {
    // Base mottled turf (several value steps — not flat green)
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) {
        const n = ((x * 17 + y * 31) ^ (x * y * 3)) & 15
        const blotch = (((x >> 3) * 13 + (y >> 3) * 7) ^ (x + y)) & 7
        if (blotch < 2) setPx(data, x, y, 0x14, 0x48, 0x28)
        else if (n < 3) setPx(data, x, y, 0x1a, 0x5a, 0x30)
        else if (n < 7) setPx(data, x, y, 0x2a, 0x6e, 0x38)
        else if (n < 11) setPx(data, x, y, 0x34, 0x7c, 0x40)
        else if (n < 14) setPx(data, x, y, 0x3e, 0x8a, 0x48)
        else setPx(data, x, y, 0x4a, 0x98, 0x52)
      }
    }
    // Soft irregular darker soil freckles under the blades
    for (let i = 0; i < 48; i++) {
      const cx = (i * 37) % 128
      const cy = (i * 53) % 128
      const rad = 2 + (i % 4)
      for (let y = cy - rad; y <= cy + rad; y++) {
        for (let x = cx - rad; x <= cx + rad; x++) {
          if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= rad * rad) {
            setPx(data, x, y, 0x3a, 0x58, 0x28)
          }
        }
      }
    }
    // Painted upright blade strokes (darker + lime tips)
    for (let i = 0; i < 220; i++) {
      const x = (i * 23) % 128
      const y = (i * 47) % 128
      const h = 3 + (i % 5)
      for (let t = 0; t < h; t++) {
        if (t < h - 1) setPx(data, x, y + t, 0x12, 0x42, 0x24)
        else setPx(data, x, y + t, 0x58, 0xa0, 0x48)
      }
      if (i % 4 === 0) {
        for (let t = 0; t < h - 1; t++) setPx(data, x + 1, y + t, 0x1a, 0x52, 0x2a)
      }
    }
  })
}

/** Shallow pond water — soft horizontal ripples (era 128 nearest). */
export function hqPondTexture(): THREE.DataTexture {
  return make128DataTex('pond', (data) => {
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) {
        const band = Math.floor(y / 4 + Math.sin(x * 0.18) * 1.2) & 3
        if (band === 0) setPx(data, x, y, 0x6a, 0x8a, 0xa0)
        else if (band === 1) setPx(data, x, y, 0x7a, 0x9a, 0xb0)
        else if (band === 2) setPx(data, x, y, 0x8a, 0xaa, 0xc0)
        else setPx(data, x, y, 0x5a, 0x7a, 0x90)
      }
    }
    // Specular flecks
    for (let i = 0; i < 40; i++) {
      const x = (i * 31) % 128
      const y = (i * 47) % 128
      setPx(data, x, y, 0xb0, 0xc8, 0xd8)
      setPx(data, x + 1, y, 0xa0, 0xb8, 0xc8)
    }
  })
}

/** Beach sand — warm grain, pebble freckles, wetter speckles. */
export function hqSandTexture(): THREE.DataTexture {
  return make128DataTex('sand', (data) => {
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) {
        const n = (x * 5 + y * 11) & 7
        if (n === 0) setPx(data, x, y, 0xa8, 0x90, 0x62)
        else if (n === 1) setPx(data, x, y, 0xb8, 0xa0, 0x70)
        else if (n === 2) setPx(data, x, y, 0xc8, 0xb0, 0x80)
        else if (n === 3) setPx(data, x, y, 0xd8, 0xc0, 0x90)
        else if (n < 6) setPx(data, x, y, 0xe4, 0xd0, 0xa0)
        else setPx(data, x, y, 0xf0, 0xde, 0xb0)
      }
    }
    // Darker wet speckles + tiny pebble dots
    for (let i = 0; i < 90; i++) {
      const x = (i * 29) % 128
      const y = (i * 41) % 128
      if (i % 3 === 0) {
        setPx(data, x, y, 0x9a, 0x80, 0x58)
        setPx(data, x + 1, y, 0x9a, 0x80, 0x58)
      } else {
        setPx(data, x, y, 0x8a, 0x78, 0x58)
      }
    }
  })
}

/** Dirt / packed path — clumpy brown with pebble grit (Habitat-style soil). */
export function hqDirtTexture(): THREE.DataTexture {
  return make128DataTex('dirt', (data) => {
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) {
        const n = (x * 7 + y * 11) & 7
        if (n === 0) setPx(data, x, y, 0x4a, 0x32, 0x1a)
        else if (n === 1) setPx(data, x, y, 0x5a, 0x3e, 0x22)
        else if (n === 2) setPx(data, x, y, 0x6a, 0x4a, 0x28)
        else if (n === 3) setPx(data, x, y, 0x7a, 0x58, 0x30)
        else if (n < 6) setPx(data, x, y, 0x8a, 0x68, 0x38)
        else setPx(data, x, y, 0x9a, 0x78, 0x44)
      }
    }
    // Soft clump blobs (richer soil patches)
    for (let i = 0; i < 36; i++) {
      const cx = (i * 41) % 128
      const cy = (i * 59) % 128
      const rad = 3 + (i % 5)
      const dark = i % 2 === 0
      for (let y = cy - rad; y <= cy + rad; y++) {
        for (let x = cx - rad; x <= cx + rad; x++) {
          if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= rad * rad) {
            if (dark) setPx(data, x, y, 0x3a, 0x28, 0x14)
            else setPx(data, x, y, 0xa8, 0x80, 0x48)
          }
        }
      }
    }
    // Pebble grit
    for (let i = 0; i < 140; i++) {
      const x = (i * 19) % 128
      const y = (i * 47) % 128
      if (i % 5 === 0) setPx(data, x, y, 0xb0, 0xa0, 0x80)
      else if (i % 3 === 0) setPx(data, x, y, 0x2a, 0x1e, 0x12)
      else setPx(data, x, y, 0x6a, 0x52, 0x30)
    }
  })
}

/**
 * Soft sand — cream beach / riverbank with gentle value noise (no stroke lines).
 * LinearFilter so tiled ground reads smooth (Guan lagoon + river voyage).
 */
export function hqSoftSandTexture(): THREE.DataTexture {
  return makeSoft128DataTex('soft-sand', (data) => {
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) {
        const n = softNoise2(x, y)
        const n2 = softNoise2(x * 0.45 + 20, y * 0.4 + 8)
        const v = 0.72 + n * 0.12 + n2 * 0.08
        setPx(
          data,
          x,
          y,
          Math.round(0xe8 * v + 18),
          Math.round(0xd4 * v + 14),
          Math.round(0xb0 * v + 10),
        )
      }
    }
    // Large soft warm / cool patches (painterly, not freckles)
    for (let i = 0; i < 14; i++) {
      const cx = (i * 47 + 11) % 128
      const cy = (i * 61 + 7) % 128
      const rad = 14 + (i % 5) * 3
      if (i % 2 === 0) softBlendDisc(data, cx, cy, rad, 0xf4, 0xe4, 0xc0, 0.35)
      else softBlendDisc(data, cx, cy, rad, 0xd0, 0xb8, 0x90, 0.3)
    }
  })
}

/**
 * Soft grass turf — lush saturated greens via soft discs (no blade strokes).
 */
export function hqSoftGrassTexture(): THREE.DataTexture {
  return makeSoft128DataTex('soft-grass', (data) => {
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) {
        const n = softNoise2(x * 0.7, y * 0.7)
        const n2 = softNoise2(x * 0.25 + 40, y * 0.3)
        const v = 0.78 + n * 0.14 + n2 * 0.1
        setPx(
          data,
          x,
          y,
          Math.round(0x28 * v),
          Math.round(0x88 * v + 20),
          Math.round(0x38 * v + 8),
        )
      }
    }
    for (let i = 0; i < 18; i++) {
      const cx = (i * 37 + 5) % 128
      const cy = (i * 53 + 19) % 128
      const rad = 12 + (i % 6) * 3
      if (i % 3 === 0) softBlendDisc(data, cx, cy, rad, 0x12, 0x58, 0x28, 0.45)
      else if (i % 3 === 1) softBlendDisc(data, cx, cy, rad, 0x48, 0xb0, 0x52, 0.4)
      else softBlendDisc(data, cx, cy, rad, 0x1a, 0x70, 0x34, 0.4)
    }
  })
}

/**
 * Soft dirt path — chocolate soil with rounded stone blotches (no grit lines).
 */
export function hqSoftDirtTexture(): THREE.DataTexture {
  return makeSoft128DataTex('soft-dirt', (data) => {
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) {
        const n = softNoise2(x * 0.55, y * 0.5)
        const v = 0.7 + n * 0.18
        setPx(
          data,
          x,
          y,
          Math.round(0x6a * v + 8),
          Math.round(0x48 * v + 6),
          Math.round(0x2e * v + 4),
        )
      }
    }
    // Soft purple-brown stones + richer soil pools
    for (let i = 0; i < 22; i++) {
      const cx = (i * 41 + 9) % 128
      const cy = (i * 59 + 13) % 128
      const rad = 5 + (i % 5) * 2
      if (i % 2 === 0) softBlendDisc(data, cx, cy, rad, 0x5a, 0x48, 0x42, 0.55)
      else softBlendDisc(data, cx, cy, rad, 0x3a, 0x28, 0x18, 0.5)
    }
    for (let i = 0; i < 10; i++) {
      const cx = (i * 71 + 23) % 128
      const cy = (i * 83 + 31) % 128
      softBlendDisc(data, cx, cy, 8 + (i % 4), 0x8a, 0x68, 0x40, 0.35)
    }
  })
}

/**
 * Soft thatch — golden roof with gentle value bands (no diagonal straw lines).
 */
export function hqSoftThatchTexture(): THREE.DataTexture {
  return makeSoft128DataTex('soft-thatch', (data) => {
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) {
        const band = softNoise2(x * 0.08, y * 0.35)
        const n = softNoise2(x * 0.4, y * 0.15)
        const v = 0.78 + band * 0.14 + n * 0.08
        setPx(
          data,
          x,
          y,
          Math.round(0xe0 * v + 12),
          Math.round(0xb8 * v + 8),
          Math.round(0x58 * v + 4),
        )
      }
    }
    for (let i = 0; i < 12; i++) {
      const cy = (i * 11 + 6) % 128
      softBlendDisc(data, 64, cy, 28 + (i % 4) * 4, 0xc8, 0x98, 0x48, 0.22)
    }
  })
}

/** @deprecated Prefer hqSoft* — kept for call sites mid-rename. */
export const hqGuanSandTexture = hqSoftSandTexture
export const hqGuanGrassTexture = hqSoftGrassTexture
export const hqGuanDirtTexture = hqSoftDirtTexture
export const hqGuanThatchTexture = hqSoftThatchTexture

/** Flat material with optional 128px albedo (tint via color) + Harbor cel. */
export function hqMatTex(
  color: number,
  map: THREE.Texture,
  extra?: ConstructorParameters<typeof THREE.MeshLambertMaterial>[0],
) {
  return applyHarborCel(
    new THREE.MeshLambertMaterial({
      color,
      map,
      flatShading: false,
      ...extra,
    }),
    { preset: 'terrain' },
  )
}

/** Snap to coarse grid so verts feel integer-ish at play scale. */
export function hqSnap(v: number, step = 0.05): number {
  return Math.round(v / step) * step
}

export function hqBox(
  w: number,
  h: number,
  d: number,
  color: number,
  x = 0,
  y = 0,
  z = 0,
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), hqMat(color))
  m.position.set(hqSnap(x), hqSnap(y), hqSnap(z))
  return m
}

/** Textured box — wood planks / thatch roofs / stone plinths. */
export function hqBoxTex(
  w: number,
  h: number,
  d: number,
  color: number,
  map: THREE.Texture,
  x = 0,
  y = 0,
  z = 0,
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), hqMatTex(color, map))
  m.position.set(hqSnap(x), hqSnap(y), hqSnap(z))
  return m
}

export function hqPost(
  rTop: number,
  rBot: number,
  h: number,
  color: number,
  x = 0,
  y = 0,
  z = 0,
  facets = HARBOR_FACETS,
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, facets), hqMat(color))
  m.position.set(hqSnap(x), hqSnap(y), hqSnap(z))
  return m
}

/** Recessed window: dark inset + protruding frame (Jagex 2002 “extruded” rule). */
export function hqWindow(
  w: number,
  h: number,
  colorFrame: number,
  colorGlass: number,
  x: number,
  y: number,
  z: number,
): THREE.Group {
  const g = new THREE.Group()
  const glass = hqBox(w * 0.85, h * 0.85, 0.03, colorGlass, 0, 0, 0)
  g.add(glass)
  g.add(hqBox(w, 0.04, 0.05, colorFrame, 0, h / 2, 0.01))
  g.add(hqBox(w, 0.04, 0.05, colorFrame, 0, -h / 2, 0.01))
  g.add(hqBox(0.04, h, 0.05, colorFrame, -w / 2, 0, 0.01))
  g.add(hqBox(0.04, h, 0.05, colorFrame, w / 2, 0, 0.01))
  g.add(hqBox(w * 0.9, 0.03, 0.04, colorFrame, 0, 0, 0.02))
  g.position.set(hqSnap(x), hqSnap(y), hqSnap(z))
  return g
}

/** Extruded door slab + frame + handle. */
export function hqDoor(
  w = 0.34,
  h = 0.58,
  x = 0,
  y = 0.3,
  z = 0,
): THREE.Group {
  const g = new THREE.Group()
  g.name = 'hq-door'
  g.add(hqBox(w + 0.08, h + 0.08, 0.05, HARBOR_CRAFT_PALETTE.woodDeep, 0, 0, -0.02))
  g.add(hqBoxTex(w, h, 0.08, HARBOR_CRAFT_PALETTE.woodDark, hqWoodTexture(), 0, 0, 0))
  g.add(hqBox(0.04, 0.04, 0.05, HARBOR_CRAFT_PALETTE.trimGold, w * 0.28, 0, 0.05))
  g.position.set(hqSnap(x), hqSnap(y), hqSnap(z))
  return g
}

/**
 * Soft Chinese anime hip roof — stepped curved plates + upturned eaves + ridge.
 * Replaces flat RS roof slabs for Harbor Quest buildings (Henry anime revamp).
 */
export function hqAnimeHipRoof(
  w: number,
  d: number,
  wallH: number,
  color: number,
  opts: { pitch?: number; overhang?: number; ridgeColor?: number } = {},
): THREE.Group {
  const g = new THREE.Group()
  g.name = 'hq-anime-roof'
  g.userData.animeRoof = true
  const pitch = opts.pitch ?? 0.48
  const overhang = opts.overhang ?? 0.24
  const ridgeColor = opts.ridgeColor ?? 0x1a1c22
  const ridgeY = wallH + pitch * 0.88

  const ridge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.085, w + overhang * 2.3, 14),
    hqMat(ridgeColor),
  )
  ridge.rotation.z = Math.PI / 2
  ridge.position.y = ridgeY
  g.add(ridge)

  for (const side of [-1, 1] as const) {
    for (let i = 0; i < 3; i++) {
      const t = i / 2
      const plateW = w + overhang * 2 - i * 0.1
      const plateD = d * (0.4 - i * 0.04)
      const plate = new THREE.Mesh(new THREE.BoxGeometry(plateW, 0.065, plateD), hqMat(color))
      plate.position.set(0, wallH + pitch * (0.78 - t * 0.32), side * (d * (0.1 + t * 0.3)))
      plate.rotation.x = side * (-0.52 + t * 0.14)
      g.add(plate)
    }
    for (const sx of [-1, 1] as const) {
      const tip = new THREE.Mesh(
        new THREE.TorusGeometry(0.11, 0.035, 8, 14, Math.PI * 0.55),
        hqMat(color),
      )
      tip.position.set(sx * (w * 0.5 + overhang * 0.55), wallH + pitch * 0.38, side * (d * 0.42))
      tip.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2
      tip.rotation.z = side * 0.35
      g.add(tip)
    }
  }

  for (const sx of [-1, 1] as const) {
    const gable = new THREE.Mesh(new THREE.ConeGeometry(d * 0.28, pitch * 0.7, 10), hqMat(color))
    gable.position.set(sx * (w * 0.48 + overhang * 0.15), wallH + pitch * 0.45, 0)
    gable.rotation.z = sx * -0.15
    g.add(gable)
  }

  return g
}

/** Wall panel with optional extruded window — modular building brick. */
export function hqWallWindow(
  w: number,
  h: number,
  d: number,
  wallColor: number,
  x = 0,
  y = 0,
  z = 0,
): THREE.Group {
  const g = new THREE.Group()
  g.name = 'hq-wall-window'
  g.add(hqBox(w, h, d, wallColor, 0, h / 2, 0))
  g.add(hqBox(w + 0.06, 0.06, d + 0.04, HARBOR_CRAFT_PALETTE.woodDeep, 0, h + 0.02, 0))
  g.add(
    hqWindow(
      Math.min(0.36, w * 0.45),
      Math.min(0.3, h * 0.4),
      HARBOR_CRAFT_PALETTE.trimGold,
      HARBOR_CRAFT_PALETTE.glass,
      0,
      h * 0.55,
      d / 2 + 0.04,
    ),
  )
  g.position.set(hqSnap(x), hqSnap(y), hqSnap(z))
  return g
}

/** Low-poly canopy blob — faceted, not smooth sphere. */
export function hqCanopy(r: number, color: number, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), hqMat(color))
  m.position.set(hqSnap(x), hqSnap(y), hqSnap(z))
  m.scale.y = 0.7
  return auditHarborMesh(m, 'terrain')
}

/** Soft boulder — rounded anime rock (not a Minecraft cube). */
export function hqRock(rng: () => number, color: number = HARBOR_CRAFT_PALETTE.rock): THREE.Mesh {
  const s = 0.35 + rng() * 0.45
  const m = new THREE.Mesh(new THREE.SphereGeometry(s * 0.55, 12, 10), hqMatSmooth(color))
  m.scale.set(1 + rng() * 0.35, 0.55 + rng() * 0.35, 0.8 + rng() * 0.3)
  m.rotation.set(rng() * 0.4, rng() * Math.PI, rng() * 0.3)
  return auditHarborMesh(m, 'terrain')
}

// —— Modular props (clutter density = “RS detail”) ——

/** Soft shipping crate — rounded wood body + iron hoop bands. */
export function hqCrate(rng: () => number = Math.random): THREE.Group {
  const g = new THREE.Group()
  g.name = 'hq-crate'
  const s = 0.38 + rng() * 0.12
  const wood = hqWoodTexture()
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(s, s * 0.85, s),
    hqMatTex(HARBOR_CRAFT_PALETTE.woodMid, wood),
  )
  body.position.y = s * 0.42
  // Soften corners via slight sphere overlay read
  body.scale.set(1, 1, 1)
  g.add(body)
  const lid = new THREE.Mesh(
    new THREE.CylinderGeometry(s * 0.55, s * 0.55, 0.05, 12),
    hqMatTex(HARBOR_CRAFT_PALETTE.woodLight, wood),
  )
  lid.position.y = s * 0.88
  lid.scale.set(1.15, 1, 1.15)
  g.add(lid)
  for (const y of [s * 0.25, s * 0.65] as const) {
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(s * 0.55, 0.02, 6, 14),
      hqMat(HARBOR_CRAFT_PALETTE.iron),
    )
    band.rotation.x = Math.PI / 2
    band.position.y = y
    band.scale.set(1, 1, 0.95)
    g.add(band)
  }
  for (const sx of [-1, 1] as const) {
    for (const sz of [-1, 1] as const) {
      const nail = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 8, 6),
        hqMat(HARBOR_CRAFT_PALETTE.woodDeep),
      )
      nail.position.set(sx * s * 0.42, s * 0.88, sz * s * 0.42)
      g.add(nail)
    }
  }
  return g
}

/** Barrel — faceted stave cylinder + hoop value steps. */
export function hqBarrel(rng: () => number = Math.random): THREE.Group {
  const g = new THREE.Group()
  g.name = 'hq-barrel'
  const h = 0.55 + rng() * 0.1
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.24, h, 14),
    hqMatTex(HARBOR_CRAFT_PALETTE.woodMid, hqWoodTexture()),
  )
  body.position.y = h / 2
  g.add(body)
  g.add(hqPost(0.245, 0.245, 0.04, HARBOR_CRAFT_PALETTE.iron, 0, h * 0.25, 0, HARBOR_FACETS))
  g.add(hqPost(0.245, 0.245, 0.04, HARBOR_CRAFT_PALETTE.iron, 0, h * 0.75, 0, HARBOR_FACETS))
  g.add(hqPost(0.2, 0.2, 0.05, HARBOR_CRAFT_PALETTE.woodDark, 0, h + 0.02, 0, HARBOR_FACETS))
  return g
}

/** Short fence run — posts + rails (path edges / village yards). */
export function hqFence(segments = 3): THREE.Group {
  const g = new THREE.Group()
  g.name = 'hq-fence'
  const wood = hqWoodTexture()
  for (let i = 0; i <= segments; i++) {
    const z = i * 0.55
    g.add(hqPost(0.04, 0.05, 0.7, HARBOR_CRAFT_PALETTE.woodDark, 0, 0.35, z, 5))
  }
  for (const y of [0.25, 0.5] as const) {
    for (let i = 0; i < segments; i++) {
      const z = i * 0.55 + 0.275
      const rail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.03, 0.5, 8),
        hqMatTex(HARBOR_CRAFT_PALETTE.woodLight, wood),
      )
      rail.rotation.x = Math.PI / 2
      rail.position.set(0, y, z)
      g.add(rail)
    }
  }
  return g
}

/** Cloth sack — smooth blob + flat tie. */
export function hqSack(rng: () => number = Math.random): THREE.Group {
  const g = new THREE.Group()
  g.name = 'hq-sack'
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 6, 5),
    hqMatSmooth(rng() > 0.5 ? HARBOR_CRAFT_PALETTE.clothSage : HARBOR_CRAFT_PALETTE.strawDark),
  )
  body.scale.set(1.1, 0.85, 1)
  body.position.y = 0.14
  g.add(body)
  const tie = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.04, 0.1, 10),
    hqMat(HARBOR_CRAFT_PALETTE.rope),
  )
  tie.position.y = 0.3
  g.add(tie)
  return g
}

/** Market stall — plank counter + soft thatch awning + crate under. */
export function hqMarketStall(rng: () => number = Math.random): THREE.Group {
  const g = new THREE.Group()
  g.name = 'hq-market-stall'
  const wood = hqWoodTexture()
  g.add(hqBoxTex(1.2, 0.08, 0.55, HARBOR_CRAFT_PALETTE.woodMid, wood, 0, 0.55, 0))
  for (const x of [-0.5, 0.5] as const) {
    g.add(hqPost(0.04, 0.05, 0.55, HARBOR_CRAFT_PALETTE.woodDark, x, 0.28, 0.2, 8))
    g.add(hqPost(0.04, 0.05, 1.1, HARBOR_CRAFT_PALETTE.woodDark, x, 0.9, -0.2, 8))
  }
  g.add(
    hqAnimeHipRoof(1.2, 0.55, 1.15, HARBOR_CRAFT_PALETTE.straw, {
      pitch: 0.28,
      overhang: 0.12,
      ridgeColor: HARBOR_CRAFT_PALETTE.strawDark,
    }),
  )
  const crate = hqCrate(rng)
  crate.position.set(-0.35, 0, 0.15)
  crate.scale.setScalar(0.7)
  g.add(crate)
  return g
}

/**
 * Low-poly wood chair — sit-able (userData.harborChair).
 * Seat faces local +Z; backrest sits on −Z.
 */
export function hqChair(): THREE.Group {
  const g = new THREE.Group()
  g.name = 'hq-chair'
  g.userData.harborChair = true
  g.userData.seatY = 0.42
  const wood = hqWoodTexture()
  for (const x of [-0.14, 0.14] as const) {
    for (const z of [-0.14, 0.14] as const) {
      g.add(hqPost(0.035, 0.04, 0.4, HARBOR_CRAFT_PALETTE.woodDark, x, 0.2, z, 8))
    }
  }
  const seat = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.22, 0.05, 14),
    hqMatTex(HARBOR_CRAFT_PALETTE.woodMid, wood),
  )
  seat.position.y = 0.42
  g.add(seat)
  const cushion = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 12, 10),
    hqMatTex(HARBOR_CRAFT_PALETTE.woodLight, wood),
  )
  cushion.scale.set(1.1, 0.25, 1.0)
  cushion.position.set(0, 0.46, 0.04)
  g.add(cushion)
  // Soft backrest
  g.add(hqPost(0.035, 0.04, 0.55, HARBOR_CRAFT_PALETTE.woodDeep, -0.15, 0.7, -0.16, 8))
  g.add(hqPost(0.035, 0.04, 0.55, HARBOR_CRAFT_PALETTE.woodDeep, 0.15, 0.7, -0.16, 8))
  const back = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 0.4, 12),
    hqMatTex(HARBOR_CRAFT_PALETTE.woodDark, wood),
  )
  back.scale.set(2.0, 1, 0.35)
  back.position.set(0, 0.72, -0.16)
  g.add(back)
  const rail = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.018, 0.32, 8),
    hqMat(HARBOR_CRAFT_PALETTE.trimGold),
  )
  rail.rotation.z = Math.PI / 2
  rail.position.set(0, 0.92, -0.14)
  g.add(rail)
  return g
}

/** Backless stool — also sit-able. */
export function hqStool(): THREE.Group {
  const g = new THREE.Group()
  g.name = 'hq-stool'
  g.userData.harborChair = true
  g.userData.seatY = 0.4
  const wood = hqWoodTexture()
  for (const x of [-0.12, 0.12] as const) {
    for (const z of [-0.12, 0.12] as const) {
      g.add(hqPost(0.03, 0.035, 0.38, HARBOR_CRAFT_PALETTE.woodDark, x, 0.19, z, 8))
    }
  }
  const seat = new THREE.Mesh(
    new THREE.CylinderGeometry(0.17, 0.18, 0.05, 14),
    hqMatTex(HARBOR_CRAFT_PALETTE.woodMid, wood),
  )
  seat.position.y = 0.4
  g.add(seat)
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.175, 0.015, 6, 14),
    hqMat(HARBOR_CRAFT_PALETTE.woodDeep),
  )
  rim.rotation.x = Math.PI / 2
  rim.position.y = 0.37
  g.add(rim)
  return g
}

/** Place sit-able chairs/stools at world spots (yaw = seat facing). */
export function hqStampChairs(
  root: THREE.Group,
  spots: readonly { x: number; z: number; yaw?: number; stool?: boolean }[],
  rng: () => number = Math.random,
  groundY?: (x: number, z: number) => number,
) {
  for (const spot of spots) {
    const useStool = spot.stool ?? rng() > 0.55
    const chair = useStool ? hqStool() : hqChair()
    const y = groundY ? groundY(spot.x, spot.z) : 0.02
    chair.position.set(spot.x, y, spot.z)
    chair.rotation.y = spot.yaw ?? rng() * Math.PI * 2
    root.add(chair)
  }
}

/**
 * Stamp a few props around (cx,cz) on dry land.
 * `isLand` optional — when provided, skip wet samples.
 * `groundY` optional — terrace / height-map foot for layered islands.
 */
export function hqStampClutter(
  root: THREE.Group,
  rng: () => number,
  cx: number,
  cz: number,
  radius: number,
  count: number,
  isLand?: (x: number, z: number) => boolean,
  groundY?: (x: number, z: number) => number,
) {
  for (let i = 0; i < count; i++) {
    const a = rng() * Math.PI * 2
    const r = radius * (0.2 + rng() * 0.8)
    const x = cx + Math.cos(a) * r
    const z = cz + Math.sin(a) * r
    if (isLand && !isLand(x, z)) continue
    const roll = rng()
    let prop: THREE.Group
    if (roll > 0.7) prop = hqBarrel(rng)
    else if (roll > 0.4) prop = hqCrate(rng)
    else if (roll > 0.2) prop = hqSack(rng)
    else {
      prop = hqFence(1 + Math.floor(rng() * 2))
      prop.rotation.y = a
    }
    const y = groundY ? groundY(x, z) : 0.02
    prop.position.set(x, y, z)
    prop.rotation.y += rng() * Math.PI * 0.5
    if (prop.name !== 'hq-fence') prop.scale.setScalar(0.85 + rng() * 0.3)
    root.add(prop)
  }
}
