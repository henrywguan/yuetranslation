/**
 * HarborRPG · multi-zone adventure continent (separate game from Harbor Quest).
 * Procedural craft only — no KayKit preload on voyage phones.
 */
import * as THREE from 'three'
import { HARBOR_CRAFT_PALETTE as P, hqBox, hqMat, hqMatSmooth, hqPost } from './harborCraft'
import {
  HARBOR_RPG_BANK,
  HARBOR_RPG_CRAFT_BENCH,
  HARBOR_RPG_FINDER,
  HARBOR_RPG_GATHER_NODES,
  HARBOR_RPG_MARKET,
  HARBOR_RPG_MONSTER_DEFS,
  HARBOR_RPG_PORTALS,
  HARBOR_RPG_QUEST_BOARD,
  HARBOR_RPG_QUEST_EXIT,
  HARBOR_RPG_SHRINE,
  HARBOR_RPG_VENDOR,
  HARBOR_RPG_ZONE_BOUNDS,
  HARBOR_RPG_ZONE_META,
  HARBOR_RPG_ZONE_SPAWN,
  type HarborRpgZoneId,
  type HarborRpgZoneLook,
} from './harborRpgData'
import type { HarborRpgMonsterRuntime } from './harborRpgCombat'

export const HARBOR_RPG_META = { en: 'HarborRPG', zh: '冒險洲' } as const

/** @deprecated use HARBOR_RPG_ZONE_BOUNDS — kept for smoke / minimap imports */
export const HARBOR_RPG_BOUNDS = HARBOR_RPG_ZONE_BOUNDS
export const HARBOR_RPG_SPAWN = HARBOR_RPG_ZONE_SPAWN.meadow
export const HARBOR_RPG_LOOK = {
  ...HARBOR_RPG_ZONE_META.meadow.look,
  amb: 0xfff4e8,
  ambI: 1.35,
  sun: 0xffe8c0,
  sunI: 2.4,
  hemiSky: 0xd8ecff,
  hemiGround: 0x4a7a48,
  hemiI: 0.95,
  grassDeep: 0x2a7038,
  shrine: 0xc8b898,
  dummy: 0xb08060,
} as const

export { HARBOR_RPG_SHRINE, HARBOR_RPG_QUEST_EXIT as HARBOR_RPG_RETURN }

export function isRpgLand(x: number, z: number): boolean {
  const b = HARBOR_RPG_ZONE_BOUNDS
  return x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ
}

export function clampRpgFootTarget(x: number, z: number): { x: number; z: number } {
  const b = HARBOR_RPG_ZONE_BOUNDS
  return {
    x: Math.min(b.maxX, Math.max(b.minX, x)),
    z: Math.min(b.maxZ, Math.max(b.minZ, z)),
  }
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function grassPlane(look: HarborRpgZoneLook): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(
    HARBOR_RPG_ZONE_BOUNDS.maxX - HARBOR_RPG_ZONE_BOUNDS.minX + 4,
    HARBOR_RPG_ZONE_BOUNDS.maxZ - HARBOR_RPG_ZONE_BOUNDS.minZ + 4,
  )
  const mesh = new THREE.Mesh(geo, hqMat(look.grass))
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(0, 0.01, 0)
  mesh.name = 'rpg-grass'
  return mesh
}

function tree(rng: () => number, look: HarborRpgZoneLook): THREE.Group {
  const g = new THREE.Group()
  g.name = 'rpg-tree'
  const trunk = hqPost(0.14, 0.18, 1.2 + rng() * 0.8, look.dirt)
  trunk.position.y = 0.7
  g.add(trunk)
  const crown = new THREE.Mesh(
    new THREE.SphereGeometry(0.55 + rng() * 0.45, 8, 6),
    hqMat(look.accent),
  )
  crown.position.y = 1.6 + rng() * 0.4
  g.add(crown)
  return g
}

function bush(rng: () => number, look: HarborRpgZoneLook): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(0.28 + rng() * 0.22, 7, 5),
    hqMat(look.accent),
  )
  m.name = 'rpg-bush'
  m.position.y = 0.25
  return m
}

function flower(rng: () => number): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 6, 4),
    hqMatSmooth(rng() > 0.5 ? 0xf0a0c0 : 0xf0d060),
  )
  m.name = 'rpg-flower'
  m.position.y = 0.1
  return m
}

function bird(rng: () => number): THREE.Group {
  const g = new THREE.Group()
  g.name = 'rpg-bird'
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 6, 5),
    hqMat(0xe8e0d0),
  )
  g.add(body)
  const wing = hqBox(0.28, 0.03, 0.1, 0xd0c8b8, 0, 0.02, 0)
  g.add(wing)
  g.position.y = 2.2 + rng() * 1.5
  g.userData.rpgFauna = 'bird'
  g.userData.rpgPhase = rng() * Math.PI * 2
  return g
}

function rabbit(rng: () => number): THREE.Group {
  const g = new THREE.Group()
  g.name = 'rpg-rabbit'
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 7, 5),
    hqMat(0xd8c8b0),
  )
  body.position.y = 0.2
  g.add(body)
  const ear = hqBox(0.05, 0.22, 0.04, 0xd8c8b0, -0.06, 0.4, 0)
  g.add(ear)
  const ear2 = hqBox(0.05, 0.22, 0.04, 0xd8c8b0, 0.06, 0.4, 0)
  g.add(ear2)
  g.userData.rpgFauna = 'rabbit'
  g.userData.rpgPhase = rng() * Math.PI * 2
  return g
}

function building(
  w: number,
  d: number,
  h: number,
  look: HarborRpgZoneLook,
  roof = 0xa05040,
): THREE.Group {
  const g = new THREE.Group()
  g.name = 'rpg-building'
  const body = hqBox(w, h, d, look.stone)
  body.position.y = h / 2
  g.add(body)
  const roofMesh = hqBox(w * 1.1, 0.25, d * 1.1, roof)
  roofMesh.position.y = h + 0.1
  g.add(roofMesh)
  const door = hqBox(0.45, 0.85, 0.08, look.dirt, 0, 0.42, d / 2 + 0.02)
  g.add(door)
  return g
}

function portalPad(
  x: number,
  z: number,
  interactId: string,
  color = 0x4a6888,
): THREE.Group {
  const g = new THREE.Group()
  g.name = 'rpg-zone-portal'
  g.position.set(x, 0, z)
  const pad = hqBox(2.2, 0.12, 2.2, color)
  pad.position.y = 0.06
  g.add(pad)
  const archL = hqBox(0.22, 2.2, 0.22, color + 0x202020)
  archL.position.set(-0.85, 1.1, 0)
  g.add(archL)
  const archR = hqBox(0.22, 2.2, 0.22, color + 0x202020)
  archR.position.set(0.85, 1.1, 0)
  g.add(archR)
  const lintel = hqBox(2.0, 0.22, 0.22, color + 0x202020)
  lintel.position.set(0, 2.25, 0)
  g.add(lintel)
  const veil = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 1.8),
    new THREE.MeshBasicMaterial({
      color: 0x88c8ff,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  )
  veil.position.set(0, 1.1, 0)
  veil.name = 'rpg-portal-veil'
  g.add(veil)
  g.userData.rpgInteract = interactId
  return g
}

function shrine(): THREE.Group {
  const g = new THREE.Group()
  g.name = 'rpg-shrine'
  g.position.set(HARBOR_RPG_SHRINE.x, 0, HARBOR_RPG_SHRINE.z)
  const look = HARBOR_RPG_ZONE_META.meadow.look
  const base = hqBox(2.2, 0.35, 2.2, look.stone)
  base.position.y = 0.18
  g.add(base)
  const pillar = hqBox(0.7, 2.2, 0.7, look.accent)
  pillar.position.y = 1.3
  g.add(pillar)
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 12, 10),
    hqMatSmooth(0xffe08a),
  )
  glow.position.y = 2.85
  glow.name = 'rpg-shrine-glow'
  g.add(glow)
  g.userData.rpgInteract = HARBOR_RPG_SHRINE.id
  return g
}

function npcStall(
  x: number,
  z: number,
  interactId: string,
  color: number,
): THREE.Group {
  const g = new THREE.Group()
  g.name = 'rpg-npc-stall'
  g.position.set(x, 0, z)
  const counter = hqBox(1.6, 0.7, 0.9, 0x6a5030)
  counter.position.y = 0.35
  g.add(counter)
  const canopy = hqBox(1.9, 0.1, 1.2, color)
  canopy.position.y = 1.35
  g.add(canopy)
  const postL = hqPost(0.06, 0.06, 1.3, 0x5a4030, -0.7, 0.65, 0.4)
  g.add(postL)
  const postR = hqPost(0.06, 0.06, 1.3, 0x5a4030, 0.7, 0.65, 0.4)
  g.add(postR)
  const figure = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.3, 0.9, 8),
    hqMat(0x506888),
  )
  figure.position.set(0, 0.55, -0.35)
  g.add(figure)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), hqMat(P.skin))
  head.position.set(0, 1.15, -0.35)
  g.add(head)
  g.userData.rpgInteract = interactId
  return g
}

function buildMonsterMesh(kind: keyof typeof HARBOR_RPG_MONSTER_DEFS): THREE.Group {
  const def = HARBOR_RPG_MONSTER_DEFS[kind]
  const g = new THREE.Group()
  g.name = `rpg-monster-${kind}`
  if (kind === 'slime' || kind === 'toad') {
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(kind === 'toad' ? 0.5 : 0.45, 10, 8),
      hqMatSmooth(def.color),
    )
    body.position.y = 0.4
    body.scale.set(1, kind === 'toad' ? 0.55 : 0.75, 1.1)
    g.add(body)
  } else if (kind === 'wolf') {
    const body = hqBox(0.45, 0.4, 0.9, def.color, 0, 0.45, 0)
    g.add(body)
    const head = hqBox(0.35, 0.32, 0.35, def.color, 0, 0.55, 0.5)
    g.add(head)
  } else if (kind === 'bandit') {
    const body = hqBox(0.4, 0.85, 0.3, def.color, 0, 0.55, 0)
    g.add(body)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), hqMat(P.skin))
    head.position.y = 1.15
    g.add(head)
  } else if (kind === 'wraith') {
    const body = new THREE.Mesh(
      new THREE.ConeGeometry(0.45, 1.4, 8),
      hqMatSmooth(def.color),
    )
    body.position.y = 0.9
    g.add(body)
  } else if (kind === 'crypt-boss') {
    const body = hqBox(1.2, 1.8, 0.9, def.color, 0, 1.0, 0)
    g.add(body)
    const head = hqBox(0.7, 0.55, 0.6, def.color, 0, 2.15, 0)
    g.add(head)
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 10, 8),
      hqMatSmooth(0xffc060),
    )
    glow.position.set(0, 2.5, 0.35)
    g.add(glow)
  } else {
    const body = hqBox(0.9, 1.2, 0.7, def.color, 0, 0.7, 0)
    g.add(body)
    const head = hqBox(0.55, 0.45, 0.5, def.color, 0, 1.5, 0)
    g.add(head)
  }
  g.userData.rpgMonsterKind = kind
  return g
}

function scatterNature(
  root: THREE.Group,
  rng: () => number,
  look: HarborRpgZoneLook,
  zone: HarborRpgZoneId,
) {
  const treeN = zone === 'pinewood' ? 28 : zone === 'meadow' ? 10 : zone === 'ruins' ? 4 : 6
  const bushN = zone === 'town' ? 8 : 18
  const flowerN = zone === 'meadow' ? 30 : zone === 'town' ? 12 : 6
  for (let i = 0; i < treeN; i++) {
    const t = tree(rng, look)
    const ang = rng() * Math.PI * 2
    const rad = 5 + rng() * 22
    t.position.set(Math.cos(ang) * rad, 0, Math.sin(ang) * rad)
    root.add(t)
  }
  for (let i = 0; i < bushN; i++) {
    const b = bush(rng, look)
    const ang = rng() * Math.PI * 2
    const rad = 3 + rng() * 24
    b.position.set(Math.cos(ang) * rad, 0.25, Math.sin(ang) * rad)
    root.add(b)
  }
  for (let i = 0; i < flowerN; i++) {
    const f = flower(rng)
    f.position.set((rng() - 0.5) * 40, 0.1, (rng() - 0.5) * 40)
    root.add(f)
  }
  for (let i = 0; i < 16; i++) {
    const rock = hqBox(
      0.35 + rng() * 0.7,
      0.2 + rng() * 0.4,
      0.35 + rng() * 0.7,
      look.stone,
    )
    const ang = rng() * Math.PI * 2
    const rad = 4 + rng() * 22
    rock.position.set(Math.cos(ang) * rad, 0.12, Math.sin(ang) * rad)
    rock.rotation.y = rng() * Math.PI
    rock.name = 'rpg-rock'
    root.add(rock)
  }
  // Fauna
  const faunaN = zone === 'town' ? 2 : 6
  for (let i = 0; i < faunaN; i++) {
    if (rng() > 0.45) {
      const b = bird(rng)
      b.position.x = (rng() - 0.5) * 30
      b.position.z = (rng() - 0.5) * 30
      root.add(b)
    } else {
      const r = rabbit(rng)
      r.position.set((rng() - 0.5) * 28, 0, (rng() - 0.5) * 28)
      root.add(r)
    }
  }
}

function stampTown(root: THREE.Group, look: HarborRpgZoneLook) {
  const hall = building(4.2, 3.2, 2.4, look, 0x805030)
  hall.position.set(0, 0, -10)
  root.add(hall)
  const inn = building(3.2, 2.6, 2.0, look, 0x706040)
  inn.position.set(-10, 0, 2)
  root.add(inn)
  const shed = building(2.4, 2.0, 1.6, look, 0x5a4030)
  shed.position.set(11, 0, 3)
  root.add(shed)
  const marketHall = building(3.6, 2.4, 2.2, look, 0x907040)
  marketHall.position.set(10, 0, 10)
  root.add(marketHall)
  const path = hqBox(3.2, 0.06, 28, look.dirt, 0, 0.03, 0)
  path.name = 'rpg-town-path'
  root.add(path)
  root.add(npcStall(HARBOR_RPG_VENDOR.x, HARBOR_RPG_VENDOR.z, HARBOR_RPG_VENDOR.id, 0xc09050))
  root.add(
    npcStall(
      HARBOR_RPG_QUEST_BOARD.x,
      HARBOR_RPG_QUEST_BOARD.z,
      HARBOR_RPG_QUEST_BOARD.id,
      0x6080a0,
    ),
  )
  root.add(npcStall(HARBOR_RPG_FINDER.x, HARBOR_RPG_FINDER.z, HARBOR_RPG_FINDER.id, 0x70a070))
  root.add(npcStall(HARBOR_RPG_MARKET.x, HARBOR_RPG_MARKET.z, HARBOR_RPG_MARKET.id, 0xd0a040))
  root.add(npcStall(HARBOR_RPG_CRAFT_BENCH.x, HARBOR_RPG_CRAFT_BENCH.z, HARBOR_RPG_CRAFT_BENCH.id, 0x8090a0))
  root.add(npcStall(HARBOR_RPG_BANK.x, HARBOR_RPG_BANK.z, HARBOR_RPG_BANK.id, 0xc0c0d0))
}

function stampCrypt(root: THREE.Group, look: HarborRpgZoneLook, rng: () => number) {
  for (let i = 0; i < 10; i++) {
    const wall = hqBox(1.2 + rng() * 1.4, 2.2 + rng(), 0.45, look.stone)
    const ang = (i / 10) * Math.PI * 2
    wall.position.set(Math.cos(ang) * 11, 1.2, Math.sin(ang) * 11)
    wall.rotation.y = ang
    wall.name = 'rpg-crypt-wall'
    root.add(wall)
  }
  const dais = hqBox(4.5, 0.4, 4.5, look.accent, 0, 0.2, -4)
  dais.name = 'rpg-crypt-dais'
  root.add(dais)
}

function stampGatherNodes(root: THREE.Group, zone: HarborRpgZoneId) {
  for (const n of HARBOR_RPG_GATHER_NODES) {
    if (n.zone !== zone) continue
    const g = new THREE.Group()
    g.name = `rpg-node-${n.id}`
    g.position.set(n.x, 0, n.z)
    const color = n.profession === 'mining' ? 0x8a8680 : 0x4a9a50
    const mesh = new THREE.Mesh(
      n.profession === 'mining'
        ? new THREE.DodecahedronGeometry(0.45, 0)
        : new THREE.ConeGeometry(0.35, 0.7, 6),
      hqMat(color),
    )
    mesh.position.y = n.profession === 'mining' ? 0.35 : 0.4
    g.add(mesh)
    g.userData.rpgInteract = n.id
    root.add(g)
  }
}

function stampRuins(root: THREE.Group, look: HarborRpgZoneLook, rng: () => number) {
  for (let i = 0; i < 7; i++) {
    const pillar = hqBox(0.55, 1.4 + rng() * 1.2, 0.55, look.stone)
    const ang = (i / 7) * Math.PI * 2
    pillar.position.set(Math.cos(ang) * 7, (1.4 + rng()) / 2, Math.sin(ang) * 7)
    pillar.name = 'rpg-ruin-pillar'
    root.add(pillar)
  }
  const rubble = hqBox(3.5, 0.5, 2.2, look.accent, 0, 0.25, -4)
  rubble.name = 'rpg-rubble'
  root.add(rubble)
}

/** Build one zone scene. Monsters are separate runtime meshes synced by world tick. */
export function buildRpgZoneScene(zone: HarborRpgZoneId = 'meadow'): THREE.Group {
  const meta = HARBOR_RPG_ZONE_META[zone]
  const look = meta.look
  const rng = mulberry32(meta.seed)
  const root = new THREE.Group()
  root.name = 'harbor-rpg'
  root.userData.rpgZone = zone
  root.add(grassPlane(look))
  scatterNature(root, rng, look, zone)
  stampGatherNodes(root, zone)

  if (zone === 'meadow') {
    root.add(shrine())
    root.add(
      portalPad(
        HARBOR_RPG_QUEST_EXIT.x,
        HARBOR_RPG_QUEST_EXIT.z,
        HARBOR_RPG_QUEST_EXIT.id,
        0x3a5878,
      ),
    )
  }
  if (zone === 'town') stampTown(root, look)
  if (zone === 'ruins') stampRuins(root, look, rng)
  if (zone === 'crypt') stampCrypt(root, look, rng)
  if (zone === 'marsh') {
    for (let i = 0; i < 8; i++) {
      const pool = new THREE.Mesh(
        new THREE.CircleGeometry(1.2 + rng() * 1.4, 12),
        hqMatSmooth(0x3a6070),
      )
      pool.rotation.x = -Math.PI / 2
      pool.position.set((rng() - 0.5) * 24, 0.04, (rng() - 0.5) * 24)
      pool.name = 'rpg-marsh-pool'
      root.add(pool)
    }
  }
  if (zone === 'pinewood') {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(5, 6.2, 28),
      hqMat(look.dirt),
    )
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.02
    ring.name = 'rpg-path-ring'
    root.add(ring)
  }

  for (const p of HARBOR_RPG_PORTALS) {
    if (p.from !== zone) continue
    root.add(portalPad(p.x, p.z, p.id))
  }

  root.userData.rpgLook = look
  root.userData.rpgSpawn = HARBOR_RPG_ZONE_SPAWN[zone]
  return root
}

/** @deprecated alias — builds meadow for older smokes */
export function buildRpgContinentScene(): THREE.Group {
  return buildRpgZoneScene('meadow')
}

export function buildRpgMonsterObject(m: HarborRpgMonsterRuntime): THREE.Group {
  const mesh = buildMonsterMesh(m.kind)
  mesh.position.set(m.x, 0, m.z)
  mesh.userData.rpgMonsterId = m.id
  mesh.visible = m.alive
  return mesh
}

export type HarborRpgInteractId = string

export function nearestRpgInteract(
  x: number,
  z: number,
  zone: HarborRpgZoneId = 'meadow',
): HarborRpgInteractId | null {
  type T = { id: string; x: number; z: number; radius: number }
  const targets: T[] = []
  for (const p of HARBOR_RPG_PORTALS) {
    if (p.from === zone) targets.push({ id: p.id, x: p.x, z: p.z, radius: p.radius })
  }
  if (zone === 'meadow') {
    targets.push(HARBOR_RPG_SHRINE)
    targets.push(HARBOR_RPG_QUEST_EXIT)
  }
  if (zone === 'town') {
    targets.push(HARBOR_RPG_VENDOR)
    targets.push(HARBOR_RPG_QUEST_BOARD)
    targets.push(HARBOR_RPG_FINDER)
    targets.push(HARBOR_RPG_MARKET)
    targets.push(HARBOR_RPG_CRAFT_BENCH)
    targets.push(HARBOR_RPG_BANK)
  }
  for (const n of HARBOR_RPG_GATHER_NODES) {
    if (n.zone === zone) targets.push({ id: n.id, x: n.x, z: n.z, radius: n.radius })
  }
  let best: string | null = null
  let bestD = Infinity
  for (const t of targets) {
    const d = Math.hypot(t.x - x, t.z - z)
    if (d < t.radius && d < bestD) {
      bestD = d
      best = t.id
    }
  }
  return best
}

export function rpgZoneLookFor(zone: HarborRpgZoneId) {
  const look = HARBOR_RPG_ZONE_META[zone].look
  return {
    sky: look.sky,
    fog: look.fog,
    fogDensity: look.fogDensity,
    amb: 0xfff4e8,
    ambI: 1.35,
    sun: 0xffe8c0,
    sunI: 2.4,
    hemiSky: 0xd8ecff,
    hemiGround: look.grass,
    hemiI: 0.95,
  }
}
