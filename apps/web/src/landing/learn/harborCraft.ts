/**
 * Harbor Quest · shared RS-era craft kit (original).
 * Locked palette + flat Lambert helpers used by world / NPC / prop builders.
 * Principles from docs/harbor-quest/RS-LIKE-CRAFT-BIBLE.md — not Jagex assets.
 */
import * as THREE from 'three'

/** Posterized Harbor swatches (~era HSL survival). Prefer these over one-off hexes. */
export const HARBOR_CRAFT_PALETTE = {
  // Brand
  jade: 0x3dcfb6,
  ink: 0x1a2430,
  harbor: 0x1e3a48,
  // Skin / hair
  skin: 0xe8c4a8,
  hair: 0x1a1410,
  // Wood
  woodLight: 0x8a6a48,
  woodMid: 0x6a4a30,
  woodDark: 0x4a3220,
  woodDeep: 0x3a2818,
  // Stone / plaster
  plaster: 0xf0ebe0,
  plasterWarm: 0xe8e0d0,
  stone: 0x8a8680,
  brick: 0x9a9690,
  roofTile: 0x2a2e32,
  roofClay: 0x8a4030,
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
  // Misc
  straw: 0xc4a860,
  lantern: 0xf0c060,
  waterFoam: 0xa8d8e8,
  banner: 0xc04040,
  pants: 0x3a3028,
  rock: 0x6a7078,
  rockWarm: 0x8a8578,
} as const

export type HarborCraftColor = keyof typeof HARBOR_CRAFT_PALETTE

/** Facet count for posts / limbs / piles (era cylinders, not smooth tubes). */
export const HARBOR_FACETS = 6

export function hqMat(
  color: number,
  extra?: ConstructorParameters<typeof THREE.MeshLambertMaterial>[0],
) {
  return new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra })
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
  // Frame lips
  g.add(hqBox(w, 0.04, 0.05, colorFrame, 0, h / 2, 0.01))
  g.add(hqBox(w, 0.04, 0.05, colorFrame, 0, -h / 2, 0.01))
  g.add(hqBox(0.04, h, 0.05, colorFrame, -w / 2, 0, 0.01))
  g.add(hqBox(0.04, h, 0.05, colorFrame, w / 2, 0, 0.01))
  // Mullion
  g.add(hqBox(w * 0.9, 0.03, 0.04, colorFrame, 0, 0, 0.02))
  g.position.set(hqSnap(x), hqSnap(y), hqSnap(z))
  return g
}

/** Low-poly canopy blob — faceted, not smooth sphere. */
export function hqCanopy(r: number, color: number, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), hqMat(color))
  m.position.set(hqSnap(x), hqSnap(y), hqSnap(z))
  m.scale.y = 0.7
  return m
}

/** Faceted rock chunk (boxy, not organic subd). */
export function hqRock(rng: () => number, color: number = HARBOR_CRAFT_PALETTE.rock): THREE.Mesh {
  const s = 0.35 + rng() * 0.45
  const m = new THREE.Mesh(new THREE.BoxGeometry(s, s * (0.55 + rng() * 0.35), s * (0.8 + rng() * 0.3)), hqMat(color))
  m.rotation.set(rng() * 0.4, rng() * Math.PI, rng() * 0.3)
  m.scale.set(1 + rng() * 0.35, 1, 1 + rng() * 0.25)
  return m
}
