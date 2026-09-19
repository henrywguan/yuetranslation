/**
 * Guan Harbor expansion — satellite islands, fishing spots, Fisher Overseer.
 * Original craft only (RS-LIKE-CRAFT-BIBLE).
 */
import * as THREE from 'three'
import {
  GUAN_FISH_SPOTS,
  GUAN_FISHING_HUT,
  GUAN_FISHING_OVERSEER_NAME,
  GUAN_SATELLITE_ISLANDS,
} from './harborFishing'
import {
  hqBox,
  hqCanopy,
  hqMat,
  hqMatSmooth,
  hqPost,
  hqRock,
} from './harborCraft'
import { harborFigureEars, harborFigureFace, harborFigureHead, harborFigureNeck } from './harborFigure'
import { buildNametagSprite } from './harborRemoteAvatars'
import { attachHarborCastGlb } from './harborProtagonistGlb'
import { stampHarborNpcRoam } from './harborNpcRoam'

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function islandDisk(r: number, color: number, y = 0.22): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, 0.4, 10), hqMat(color))
  mesh.position.y = y
  mesh.receiveShadow = true
  return mesh
}

function floraPalm(rng: () => number, tint = 0x2a8a40): THREE.Group {
  const g = new THREE.Group()
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.12, 1.4 + rng() * 0.5, 5),
    hqMat(0x8a6038),
  )
  trunk.position.y = 0.7
  g.add(trunk)
  for (let i = 0; i < 5; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.15, 4), hqMat(tint))
    leaf.position.set(Math.cos((i / 5) * Math.PI * 2) * 0.35, 1.35, Math.sin((i / 5) * Math.PI * 2) * 0.35)
    leaf.rotation.z = 0.9
    leaf.rotation.y = (i / 5) * Math.PI * 2
    g.add(leaf)
  }
  return g
}

function faunaCrab(color: number): THREE.Group {
  const g = new THREE.Group()
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 4), hqMatSmooth(color))
  body.scale.set(1.2, 0.55, 1)
  g.add(body)
  g.userData.fauna = true
  g.userData.faunaBob = 0.08
  return g
}

function faunaHeron(): THREE.Group {
  const g = new THREE.Group()
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), hqMat(0xe8e4d8))
  body.scale.set(0.7, 1.4, 0.7)
  body.position.y = 0.35
  g.add(body)
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.35, 4), hqMat(0xe8e4d8))
  neck.position.set(0.05, 0.65, 0)
  neck.rotation.z = -0.4
  g.add(neck)
  g.userData.bird = true
  return g
}

export function fishingSpotBuoy(spotId: string): THREE.Group {
  const g = new THREE.Group()
  g.name = `guan-fish-spot-${spotId}`
  g.userData.landmarkHost = 'fishing-spot'
  g.userData.fishingSpotId = spotId
  g.userData.hasDialogue = true
  g.userData.specialHostGlow = true
  g.userData.glowBaseIntensity = 0.55
  g.userData.fishSpotBob = true

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.55, 0.06, 6, 12),
    hqMatSmooth(0x3dcfb6),
  )
  ring.rotation.x = Math.PI / 2
  ring.position.y = 0.08
  g.add(ring)

  const pole = hqPost(0.06, 0.08, 0.9, 0xc4a860)
  pole.position.y = 0.45
  g.add(pole)

  const icon = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 0.28, 5),
    hqMatSmooth(0x7ef0dc),
  )
  icon.position.y = 1.05
  icon.rotation.z = Math.PI
  icon.userData.fishIconSpin = true
  g.add(icon)

  if (typeof document !== 'undefined') {
    const bubble = buildNametagSprite('Fish')
    bubble.position.y = 1.45
    bubble.userData.billboard = true
    bubble.userData.speechBubble = true
    g.add(bubble)
  }

  return g
}

function fishingOverseer(): THREE.Group {
  const g = new THREE.Group()
  g.name = 'guan-fishing-overseer'
  g.userData.landmarkHost = 'fishing-hut'
  g.userData.hasDialogue = true
  g.userData.specialNpc = true
  g.userData.specialHostGlow = true
  g.userData.glowBaseIntensity = 0.7
  g.userData.npc = 'fishing-hut'

  const hut = hqBox(1.6, 1.1, 1.4, 0x6a4a30)
  hut.position.y = 0.55
  g.add(hut)
  const roof = hqCanopy(1.9, 1.7, 0x3a6a48)
  roof.position.y = 1.25
  g.add(roof)

  const keeper = new THREE.Group()
  keeper.name = 'guan-fishing-keeper'
  keeper.position.set(0.85, 0, 0.55)
  keeper.userData.scoutCast = true
  keeper.userData.npc = 'fishing-hut'
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.7, 6), hqMat(0x1e3a48))
  body.position.set(0, 0.45, 0)
  keeper.add(body)
  const fishSkin = hqMat(0xe8c4a8)
  const bust = new THREE.Group()
  bust.position.set(0, 0.95, 0)
  bust.add(harborFigureHead(fishSkin, 0, { r: 0.16 }))
  bust.add(harborFigureNeck(fishSkin, 0, 0.16))
  bust.add(harborFigureEars(fishSkin, 0, 0.16))
  bust.add(harborFigureFace(fishSkin, 0, { showBrows: true, showMouth: true }))
  keeper.add(bust)
  stampHarborNpcRoam(keeper, { roam: 1.1, faceYaw: 0 })
  g.add(keeper)
  void attachHarborCastGlb(keeper, 'male', { tint: 0x1e3a48, tintAmount: 0.36 })

  // Floating fishing icon above overseer (animated in world tick)
  const iconRoot = new THREE.Group()
  iconRoot.name = 'guan-fish-icon'
  iconRoot.position.set(0.85, 1.55, 0.55)
  iconRoot.userData.fishIconFloat = true
  const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), hqMatSmooth(0x3dcfb6))
  diamond.userData.fishIconSpin = true
  iconRoot.add(diamond)
  const fishBody = new THREE.Mesh(
    new THREE.ConeGeometry(0.1, 0.28, 5),
    hqMatSmooth(0x7ef0dc),
  )
  fishBody.rotation.z = Math.PI / 2
  fishBody.position.y = 0.02
  iconRoot.add(fishBody)
  g.add(iconRoot)

  if (typeof document !== 'undefined') {
    const tag = buildNametagSprite(GUAN_FISHING_OVERSEER_NAME)
    tag.position.set(0.85, 1.95, 0.55)
    tag.userData.billboard = true
    g.add(tag)

    const speech = buildNametagSprite('Fish')
    speech.position.set(0.85, 2.25, 0.55)
    speech.userData.billboard = true
    speech.userData.speechBubble = true
    g.add(speech)
  }

  return g
}

function stampSatelliteIsland(
  root: THREE.Group,
  island: (typeof GUAN_SATELLITE_ISLANDS)[number],
  rng: () => number,
): void {
  const baseColor =
    island.biome === 'coral'
      ? 0xd8b878
      : island.biome === 'mist'
        ? 0x8a9a88
        : island.biome === 'jade'
          ? 0x3a8a58
          : island.biome === 'reed'
            ? 0x6a8a48
            : island.biome === 'wreck'
              ? 0x5a5850
              : 0x5a4030
  const disk = islandDisk(island.r, baseColor, island.biome === 'ember' ? 0.28 : 0.2)
  disk.position.set(island.x, 0, island.z)
  disk.name = `guan-sat-${island.id}`
  root.add(disk)

  const grass = islandDisk(
    island.r * 0.78,
    island.biome === 'ember'
      ? 0x4a3020
      : island.biome === 'wreck'
        ? 0x3a4840
        : island.biome === 'reed'
          ? 0x4a7a38
          : 0x2a7a40,
    0.42,
  )
  grass.position.set(island.x, 0, island.z)
  root.add(grass)

  // Unique flora / fauna per biome
  if (island.biome === 'coral') {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      const coral = new THREE.Mesh(
        new THREE.ConeGeometry(0.18 + rng() * 0.1, 0.5 + rng() * 0.3, 5),
        hqMatSmooth(i % 2 ? 0xff8090 : 0x80e0d0),
      )
      coral.position.set(
        island.x + Math.cos(a) * (island.r * 0.55),
        0.55,
        island.z + Math.sin(a) * (island.r * 0.55),
      )
      root.add(coral)
    }
    const crab = faunaCrab(0xd05040)
    crab.position.set(island.x + 0.8, 0.5, island.z - 0.4)
    root.add(crab)
  } else if (island.biome === 'mist') {
    for (let i = 0; i < 6; i++) {
      const palm = floraPalm(rng, 0x4a6a58)
      const a = (i / 6) * Math.PI * 2
      palm.position.set(
        island.x + Math.cos(a) * (island.r * 0.45),
        0.4,
        island.z + Math.sin(a) * (island.r * 0.45),
      )
      palm.scale.setScalar(0.85 + rng() * 0.3)
      root.add(palm)
    }
    const heron = faunaHeron()
    heron.position.set(island.x - 0.6, 0.45, island.z + 0.7)
    root.add(heron)
    const mist = new THREE.Mesh(
      new THREE.SphereGeometry(island.r * 0.9, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xc8d8e0, transparent: true, opacity: 0.12 }),
    )
    mist.position.set(island.x, 1.2, island.z)
    mist.userData.mistPulse = true
    root.add(mist)
  } else if (island.biome === 'jade') {
    for (let i = 0; i < 10; i++) {
      const reed = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.04, 0.9 + rng() * 0.4, 4),
        hqMat(0x5a8a40),
      )
      const a = rng() * Math.PI * 2
      const d = rng() * island.r * 0.7
      reed.position.set(island.x + Math.cos(a) * d, 0.7, island.z + Math.sin(a) * d)
      root.add(reed)
    }
    const koi = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.32, 5), hqMatSmooth(0xe07050))
    koi.rotation.z = Math.PI / 2
    koi.position.set(island.x + 1.2, 0.15, island.z)
    koi.userData.fish = true
    root.add(koi)
  } else if (island.biome === 'reed') {
    for (let i = 0; i < 14; i++) {
      const reed = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.035, 1.1 + rng() * 0.5, 4),
        hqMat(i % 2 ? 0x6a9a48 : 0x4a7a30),
      )
      const a = rng() * Math.PI * 2
      const d = rng() * island.r * 0.75
      reed.position.set(island.x + Math.cos(a) * d, 0.75, island.z + Math.sin(a) * d)
      reed.rotation.z = (rng() - 0.5) * 0.2
      root.add(reed)
    }
    const duck = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), hqMatSmooth(0xe8c040))
    duck.scale.set(1.2, 0.7, 0.9)
    duck.position.set(island.x - 0.9, 0.48, island.z + 0.5)
    duck.userData.fauna = 'duck'
    root.add(duck)
  } else if (island.biome === 'wreck') {
    const hull = hqBox(1.8, 0.45, 0.7, 0x4a4038)
    hull.position.set(island.x + 0.3, 0.55, island.z)
    hull.rotation.y = 0.4
    hull.rotation.z = 0.15
    root.add(hull)
    const mast = hqPost(0.07, 0.09, 1.4, 0x6a5a48)
    mast.position.set(island.x + 0.2, 1.1, island.z)
    mast.rotation.z = 0.35
    root.add(mast)
    for (let i = 0; i < 4; i++) {
      const barnacle = new THREE.Mesh(
        new THREE.SphereGeometry(0.08 + rng() * 0.04, 5, 4),
        hqMatSmooth(0x8a9080),
      )
      const a = (i / 4) * Math.PI * 2
      barnacle.position.set(
        island.x + Math.cos(a) * (island.r * 0.5),
        0.48,
        island.z + Math.sin(a) * (island.r * 0.5),
      )
      root.add(barnacle)
    }
    const crab = faunaCrab(0x608070)
    crab.position.set(island.x - 0.7, 0.5, island.z - 0.5)
    root.add(crab)
  } else {
    // ember
    for (let i = 0; i < 5; i++) {
      const rock = hqRock(rng, 0x3a3030)
      const a = (i / 5) * Math.PI * 2
      rock.position.set(
        island.x + Math.cos(a) * (island.r * 0.5),
        0.45,
        island.z + Math.sin(a) * (island.r * 0.5),
      )
      rock.scale.setScalar(0.6 + rng() * 0.4)
      root.add(rock)
    }
    const fern = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.5, 5), hqMat(0x3a5028))
    fern.position.set(island.x, 0.55, island.z)
    root.add(fern)
    const ember = new THREE.PointLight(0xff8040, 0.55, 6)
    ember.position.set(island.x, 1.2, island.z)
    ember.userData.specialHostGlow = true
    ember.userData.glowBaseIntensity = 0.55
    root.add(ember)
  }

  if (typeof document !== 'undefined') {
    const label = buildNametagSprite(`${island.name.en}`)
    label.position.set(island.x, 2.2, island.z)
    label.userData.billboard = true
    root.add(label)
  }
}

/** Stamp fishing lodge, spots, and four satellite islands onto Guan root. */
export function stampGuanFishingRealm(root: THREE.Group): void {
  const rng = mulberry32(0xf15c0b57)

  for (const island of GUAN_SATELLITE_ISLANDS) {
    stampSatelliteIsland(root, island, rng)
  }

  const hut = fishingOverseer()
  // Musa shore terrace (~grass height) — avoid importing guanGroundY (cycle).
  hut.position.set(GUAN_FISHING_HUT.x, 0.46, GUAN_FISHING_HUT.z)
  root.add(hut)

  for (const spot of GUAN_FISH_SPOTS) {
    const buoy = fishingSpotBuoy(spot.id)
    buoy.position.set(spot.x, 0.02, spot.z)
    root.add(buoy)
  }
}

/** True when xz is on a satellite island disk. */
export function isGuanSatelliteLand(x: number, z: number): boolean {
  for (const island of GUAN_SATELLITE_ISLANDS) {
    if (Math.hypot(x - island.x, z - island.z) <= island.r * 0.92) return true
  }
  return false
}

export function guanSatelliteGroundY(x: number, z: number): number | null {
  for (const island of GUAN_SATELLITE_ISLANDS) {
    const d = Math.hypot(x - island.x, z - island.z)
    if (d <= island.r * 0.92) {
      return d <= island.r * 0.65 ? 0.42 : 0.22
    }
  }
  return null
}
