/**
 * Harbor Quest · shared RS-era craft kit (original).
 * Locked palette + flat/smooth Lambert helpers + modular props.
 * Principles from docs/harbor-quest/RS-LIKE-CRAFT-BIBLE.md — not Jagex assets.
 *
 * Detail comes from face-color steps, extruded trim, and clutter density —
 * not from raising poly counts.
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

/** Flat Lambert — architecture / planks / armor plates. */
export function hqMat(
  color: number,
  extra?: ConstructorParameters<typeof THREE.MeshLambertMaterial>[0],
) {
  return new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra })
}

/**
 * Smooth Lambert — rocks, fruit, heads, lava blobs.
 * Keep a single hue; let lighting vary value only (era Gouraud habit).
 */
export function hqMatSmooth(
  color: number,
  extra?: ConstructorParameters<typeof THREE.MeshLambertMaterial>[0],
) {
  return new THREE.MeshLambertMaterial({ color, flatShading: false, ...extra })
}

/** Procedural 128×128 albedo cache (nearest — era idiom size). */
const texCache = new Map<string, THREE.DataTexture>()

function make128DataTex(key: string, fill: (data: Uint8Array) => void): THREE.DataTexture {
  const hit = texCache.get(key)
  if (hit) return hit
  const data = new Uint8Array(128 * 128 * 4)
  fill(data)
  const tex = new THREE.DataTexture(data, 128, 128)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.needsUpdate = true
  texCache.set(key, tex)
  return tex
}

function setPx(data: Uint8Array, x: number, y: number, r: number, g: number, b: number) {
  const i = ((y & 127) * 128 + (x & 127)) * 4
  data[i] = r
  data[i + 1] = g
  data[i + 2] = b
  data[i + 3] = 255
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

/** Flat material with optional 128px albedo (tint via color). */
export function hqMatTex(
  color: number,
  map: THREE.Texture,
  extra?: ConstructorParameters<typeof THREE.MeshLambertMaterial>[0],
) {
  return new THREE.MeshLambertMaterial({
    color,
    map,
    flatShading: true,
    ...extra,
  })
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
  return m
}

/** Faceted rock chunk — smooth shading, boxy silhouette. */
export function hqRock(rng: () => number, color: number = HARBOR_CRAFT_PALETTE.rock): THREE.Mesh {
  const s = 0.35 + rng() * 0.45
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(s, s * (0.55 + rng() * 0.35), s * (0.8 + rng() * 0.3)),
    hqMatSmooth(color),
  )
  m.rotation.set(rng() * 0.4, rng() * Math.PI, rng() * 0.3)
  m.scale.set(1 + rng() * 0.35, 1, 1 + rng() * 0.25)
  return m
}

// —— Modular props (clutter density = “RS detail”) ——

/** Shipping crate — multi-swatch wood + iron bands. */
export function hqCrate(rng: () => number = Math.random): THREE.Group {
  const g = new THREE.Group()
  g.name = 'hq-crate'
  const s = 0.38 + rng() * 0.12
  const wood = hqWoodTexture()
  g.add(hqBoxTex(s, s * 0.85, s, HARBOR_CRAFT_PALETTE.woodMid, wood, 0, s * 0.42, 0))
  // Lid (lighter value step)
  g.add(hqBoxTex(s * 1.02, 0.05, s * 1.02, HARBOR_CRAFT_PALETTE.woodLight, wood, 0, s * 0.88, 0))
  // Iron bands
  g.add(hqBox(s * 1.04, 0.04, s * 1.04, HARBOR_CRAFT_PALETTE.iron, 0, s * 0.25, 0))
  g.add(hqBox(s * 1.04, 0.04, s * 1.04, HARBOR_CRAFT_PALETTE.iron, 0, s * 0.65, 0))
  // Corner nails (color chips, not micro-geo rivets)
  for (const sx of [-1, 1] as const) {
    for (const sz of [-1, 1] as const) {
      g.add(
        hqBox(0.04, 0.04, 0.04, HARBOR_CRAFT_PALETTE.woodDeep, sx * s * 0.42, s * 0.88, sz * s * 0.42),
      )
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
    new THREE.CylinderGeometry(0.22, 0.24, h, HARBOR_FACETS),
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
      g.add(hqBoxTex(0.06, 0.06, 0.5, HARBOR_CRAFT_PALETTE.woodLight, wood, 0, y, z))
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
  g.add(hqBox(0.08, 0.1, 0.08, HARBOR_CRAFT_PALETTE.rope, 0, 0.3, 0))
  return g
}

/** Market stall — plank counter + thatch awning + crate under. */
export function hqMarketStall(rng: () => number = Math.random): THREE.Group {
  const g = new THREE.Group()
  g.name = 'hq-market-stall'
  const wood = hqWoodTexture()
  const thatch = hqThatchTexture()
  g.add(hqBoxTex(1.2, 0.08, 0.55, HARBOR_CRAFT_PALETTE.woodMid, wood, 0, 0.55, 0))
  for (const x of [-0.5, 0.5] as const) {
    g.add(hqPost(0.04, 0.05, 0.55, HARBOR_CRAFT_PALETTE.woodDark, x, 0.28, 0.2, 5))
    g.add(hqPost(0.04, 0.05, 1.1, HARBOR_CRAFT_PALETTE.woodDark, x, 0.9, -0.2, 5))
  }
  g.add(hqBoxTex(1.35, 0.08, 0.7, HARBOR_CRAFT_PALETTE.straw, thatch, 0, 1.35, -0.05))
  g.add(hqBoxTex(1.0, 0.06, 0.5, HARBOR_CRAFT_PALETTE.strawDark, thatch, 0, 1.42, -0.05))
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
      g.add(hqPost(0.035, 0.04, 0.4, HARBOR_CRAFT_PALETTE.woodDark, x, 0.2, z, 5))
    }
  }
  g.add(hqBoxTex(0.38, 0.05, 0.38, HARBOR_CRAFT_PALETTE.woodMid, wood, 0, 0.42, 0))
  g.add(hqBoxTex(0.38, 0.06, 0.05, HARBOR_CRAFT_PALETTE.woodLight, wood, 0, 0.45, 0.12))
  // Backrest
  g.add(hqPost(0.035, 0.04, 0.55, HARBOR_CRAFT_PALETTE.woodDeep, -0.15, 0.7, -0.16, 5))
  g.add(hqPost(0.035, 0.04, 0.55, HARBOR_CRAFT_PALETTE.woodDeep, 0.15, 0.7, -0.16, 5))
  g.add(hqBoxTex(0.36, 0.42, 0.04, HARBOR_CRAFT_PALETTE.woodDark, wood, 0, 0.72, -0.16))
  g.add(hqBox(0.32, 0.04, 0.04, HARBOR_CRAFT_PALETTE.trimGold, 0, 0.92, -0.14))
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
      g.add(hqPost(0.03, 0.035, 0.38, HARBOR_CRAFT_PALETTE.woodDark, x, 0.19, z, 5))
    }
  }
  g.add(hqBoxTex(0.32, 0.05, 0.32, HARBOR_CRAFT_PALETTE.woodMid, wood, 0, 0.4, 0))
  g.add(hqBox(0.34, 0.03, 0.34, HARBOR_CRAFT_PALETTE.woodDeep, 0, 0.37, 0))
  return g
}

/** Place sit-able chairs/stools at world spots (yaw = seat facing). */
export function hqStampChairs(
  root: THREE.Group,
  spots: readonly { x: number; z: number; yaw?: number; stool?: boolean }[],
  rng: () => number = Math.random,
) {
  for (const spot of spots) {
    const useStool = spot.stool ?? rng() > 0.55
    const chair = useStool ? hqStool() : hqChair()
    chair.position.set(spot.x, 0.02, spot.z)
    chair.rotation.y = spot.yaw ?? rng() * Math.PI * 2
    root.add(chair)
  }
}

/**
 * Stamp a few props around (cx,cz) on dry land.
 * `isLand` optional — when provided, skip wet samples.
 */
export function hqStampClutter(
  root: THREE.Group,
  rng: () => number,
  cx: number,
  cz: number,
  radius: number,
  count: number,
  isLand?: (x: number, z: number) => boolean,
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
    prop.position.set(x, 0.02, z)
    prop.rotation.y += rng() * Math.PI * 0.5
    if (prop.name !== 'hq-fence') prop.scale.setScalar(0.85 + rng() * 0.3)
    root.add(prop)
  }
}
