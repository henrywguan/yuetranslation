/**
 * Harbor Quest · low-poly Habitat-style grass (original craft).
 *
 * Shared ConeGeometry + materials keep draw/GC cost calm when scattering
 * hundreds of tufts along the river and Guan meadows. Silhouette inspired by
 * classic MMO tall-grass soil beds (bright rim blades, dark basal leaves,
 * segmented tan stalks with cream crowns) — not Jagex meshes.
 */
import * as THREE from 'three'
import { hqBox, hqMat, hqMatTex, hqSoftDirtTexture } from './harborCraft'
import { harborSkipBankGrass } from './harborIosGpu'

/** Palette locked to Habitat meadow read (lime rim / deep leaf / tan cane). */
export const HARBOR_GRASS_LOOK = {
  bladeLite: 0x7ed050,
  blade: 0x6ec860,
  bladeDeep: 0x2a7038,
  leafDeep: 0x186830,
  stalk: 0xd4b878,
  stalkDeep: 0xb89858,
  crown: 0xf5f0e0,
  dirt: 0x5a3a20,
  dirtRich: 0x3e2814,
} as const

/** Nature grass kinds placed in voyage biomes (smoke-tested). */
export const HARBOR_NATURE_GRASS = ['grass-tuft', 'habitat-tall-grass'] as const
export type HarborNatureGrass = (typeof HARBOR_NATURE_GRASS)[number]

/** One shared blade cone — every tuft reuses this buffer. */
const BLADE_GEO = new THREE.ConeGeometry(1, 1, 3)
BLADE_GEO.translate(0, 0.5, 0) // pivot at roots

const bladeMatCache = new Map<number, THREE.MeshLambertMaterial>()
function bladeMat(color: number) {
  let m = bladeMatCache.get(color)
  if (!m) {
    m = hqMat(color)
    bladeMatCache.set(color, m)
  }
  return m
}

/**
 * Pointed low-poly blade — scaled shared cone (cheap Habitat turf read).
 * Callers own lean via rotation; do not dispose the shared geometry.
 */
export function hqGrassBlade(
  h: number,
  color: number,
  x: number,
  z: number,
  leanX = 0,
  leanZ = 0,
): THREE.Mesh {
  const w = 0.035 + h * 0.03
  const blade = new THREE.Mesh(BLADE_GEO, bladeMat(color))
  blade.position.set(x, 0, z)
  blade.scale.set(w, h, w)
  blade.rotation.z = leanX
  blade.rotation.x = leanZ
  blade.frustumCulled = true
  // Mark so chunk dispose skips shared geo
  blade.userData.sharedGrassGeo = true
  return blade
}

/** Dense short tuft — bright blades readable at foot level. */
export function hqGrassTuft(rng: () => number): THREE.Group {
  const g = new THREE.Group()
  g.name = 'grass-tuft'
  if (harborSkipBankGrass()) return g
  const n = 3 + Math.floor(rng() * 3)
  for (let i = 0; i < n; i++) {
    const h = 0.2 + rng() * 0.32
    const color =
      i % 3 === 0
        ? HARBOR_GRASS_LOOK.bladeDeep
        : i % 2
          ? HARBOR_GRASS_LOOK.bladeLite
          : HARBOR_GRASS_LOOK.blade
    g.add(
      hqGrassBlade(
        h,
        color,
        (rng() - 0.5) * 0.22,
        (rng() - 0.5) * 0.22,
        (rng() - 0.5) * 0.4,
        (rng() - 0.5) * 0.28,
      ),
    )
  }
  return g
}

/** Broader / taller meadow clump (no dirt bed). */
export function hqTallGrassClump(rng: () => number): THREE.Group {
  const g = new THREE.Group()
  g.name = 'tall-grass'
  if (harborSkipBankGrass()) return g
  const n = 4 + Math.floor(rng() * 3)
  for (let i = 0; i < n; i++) {
    const h = 0.34 + rng() * 0.4
    if (i === 0) {
      const blade = hqBox(
        0.05 + rng() * 0.02,
        h,
        0.018,
        HARBOR_GRASS_LOOK.leafDeep,
        (rng() - 0.5) * 0.22,
        h / 2,
        (rng() - 0.5) * 0.22,
      )
      blade.rotation.z = (rng() - 0.5) * 0.4
      blade.rotation.x = (rng() - 0.5) * 0.22
      g.add(blade)
    } else {
      g.add(
        hqGrassBlade(
          h,
          i % 2 ? HARBOR_GRASS_LOOK.blade : HARBOR_GRASS_LOOK.bladeLite,
          (rng() - 0.5) * 0.28,
          (rng() - 0.5) * 0.28,
          (rng() - 0.5) * 0.45,
          (rng() - 0.5) * 0.3,
        ),
      )
    }
  }
  return g
}

function herbStalk(rng: () => number, h = 0.85): THREE.Group {
  const g = new THREE.Group()
  g.name = 'herb-stalk'
  const segs = 3 + Math.floor(rng() * 2)
  const segH = h / segs
  for (let i = 0; i < segs; i++) {
    const y = segH * i + segH * 0.5
    g.add(
      hqBox(
        0.045 - i * 0.004,
        segH * 0.92,
        0.045 - i * 0.004,
        i % 2 ? HARBOR_GRASS_LOOK.stalk : HARBOR_GRASS_LOOK.stalkDeep,
        0,
        y,
        0,
      ),
    )
    if (i > 0) {
      g.add(hqBox(0.06, 0.025, 0.06, HARBOR_GRASS_LOOK.stalkDeep, 0, segH * i, 0))
    }
  }
  const crownY = h + 0.02
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2
    const petal = hqBox(0.07, 0.03, 0.12, HARBOR_GRASS_LOOK.crown, 0, crownY, 0.06)
    petal.rotation.y = a
    petal.rotation.x = -0.55
    g.add(petal)
  }
  g.add(hqBox(0.05, 0.04, 0.05, HARBOR_GRASS_LOOK.crown, 0, crownY, 0))
  g.rotation.z = (rng() - 0.5) * 0.12
  g.rotation.x = (rng() - 0.5) * 0.1
  return g
}

function basalLeaf(rng: () => number): THREE.Mesh {
  const leaf = hqBox(
    0.08 + rng() * 0.04,
    0.02,
    0.16 + rng() * 0.08,
    rng() > 0.5 ? HARBOR_GRASS_LOOK.leafDeep : HARBOR_GRASS_LOOK.bladeDeep,
    0,
    0.04,
    0.06,
  )
  leaf.rotation.x = -0.35 - rng() * 0.25
  leaf.rotation.y = rng() * Math.PI * 2
  leaf.rotation.z = (rng() - 0.5) * 0.4
  return leaf
}

/**
 * Full Habitat tall-grass soil bed — dirt mound, lime rim blades, dark basal
 * leaves, segmented tan stalks with cream crowns. Matches the classic MMO
 * meadow vignette silhouette (original Harbor geometry).
 */
export function hqHabitatTallGrass(rng: () => number, radius = 0.48): THREE.Group {
  const g = new THREE.Group()
  g.name = 'habitat-tall-grass'
  if (harborSkipBankGrass()) return g
  const dirt = hqSoftDirtTexture()
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.92, radius, 0.08, 7),
    hqMatTex(HARBOR_GRASS_LOOK.dirtRich, dirt),
  )
  base.position.y = 0.03
  g.add(base)
  // Soft irregular rim blobs
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + rng() * 0.35
    const r = radius * (0.5 + rng() * 0.3)
    const blob = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.4, r * 0.48, 0.05, 6),
      hqMatTex(HARBOR_GRASS_LOOK.dirt, dirt),
    )
    blob.position.set(Math.cos(a) * radius * 0.5, 0.028, Math.sin(a) * radius * 0.5)
    g.add(blob)
  }
  // Bright lime perimeter blades
  const rimN = 7 + Math.floor(rng() * 4)
  for (let i = 0; i < rimN; i++) {
    const a = (i / rimN) * Math.PI * 2 + rng() * 0.2
    const rr = radius * (0.72 + rng() * 0.2)
    const h = 0.16 + rng() * 0.22
    g.add(
      hqGrassBlade(
        h,
        i % 2 ? HARBOR_GRASS_LOOK.bladeLite : HARBOR_GRASS_LOOK.blade,
        Math.cos(a) * rr,
        Math.sin(a) * rr,
        Math.cos(a) * 0.25,
        Math.sin(a) * 0.2,
      ),
    )
  }
  // Dark broad leaves at soil line
  const leafN = 3 + Math.floor(rng() * 2)
  for (let i = 0; i < leafN; i++) {
    const leaf = basalLeaf(rng)
    const a = (i / leafN) * Math.PI * 2 + rng() * 0.4
    leaf.position.set(Math.cos(a) * radius * 0.28, 0.04, Math.sin(a) * radius * 0.28)
    g.add(leaf)
  }
  // Central tall stalks
  const stalks = 3 + Math.floor(rng() * 2)
  for (let i = 0; i < stalks; i++) {
    const stalk = herbStalk(rng, 0.65 + rng() * 0.4)
    stalk.position.set((rng() - 0.5) * radius * 0.45, 0.05, (rng() - 0.5) * radius * 0.45)
    stalk.scale.setScalar(0.9 + rng() * 0.2)
    g.add(stalk)
  }
  return g
}
