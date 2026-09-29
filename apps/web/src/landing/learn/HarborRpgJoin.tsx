/**
 * HarborRPG character lobby. Create (name, rigged body, class) or pick a sailor, then enter.
 */
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import type { HarborGender } from './harborAppearance'
import {
  HARBOR_RPG_CLASSES,
  HARBOR_RPG_CLASS_DEFS,
  type HarborRpgClassId,
} from './harborRpgClasses'
import {
  disposeHarborRpgCosmetic,
  loadHarborRpgCosmetic,
  type HarborRpgCosmeticInstance,
} from './harborRpgCosmeticRuntime'
import { loadHarborGlb } from './harborGlbAssets'
import {
  harborRpgComposeStarterLook,
  harborRpgDefaultStarterPick,
  harborRpgStarterBottoms,
  harborRpgStarterFeet,
  harborRpgStarterHair,
  harborRpgStarterTops,
  harborRpgWornLayerIds,
  type HarborRpgEquippedLooks,
} from './harborRpgLooks'
import { HARBOR_RPG_COSMETIC_DEFS, type HarborRpgCosmeticId } from './harborRpgCosmetics'
import { HARBOR_RPG_MAX_CHARS, type HarborRpgBag } from './harborRpgProgress'
import { harborRpgJoinPhase } from './harborRpgJoin'

type CreateStep = 'name' | 'body' | 'class' | 'confirm'

type Props = {
  bag: HarborRpgBag
  onCreate: (input: {
    name: string
    gender: HarborGender
    classId: HarborRpgClassId
    looks: HarborRpgEquippedLooks
  }) => void
  onEnter: (input: { characterId: string; classId: HarborRpgClassId | null }) => void
  onBack: () => void
}

/** Night festival behind the rotating sailor. Procedural lanterns stay if a GLB is missing. */
function paperLantern(color = 0xffb23a, emissive = 0xffd27a, withLight = false): THREE.Group {
  const g = new THREE.Group()
  g.name = 'rpg-join-lantern'
  g.userData.joinLantern = true
  const paper = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.13, 0.28, 12),
    new THREE.MeshLambertMaterial({ color, emissive, emissiveIntensity: 0.95 }),
  )
  const capMat = new THREE.MeshLambertMaterial({ color: 0x3a2214 })
  const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.12, 0.035, 10), capMat)
  capTop.position.y = 0.15
  const capBot = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.03, 10), capMat)
  capBot.position.y = -0.15
  const tassel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.02, 0.12, 6),
    new THREE.MeshLambertMaterial({ color: 0x8a3030 }),
  )
  tassel.position.y = -0.24
  g.add(paper, capTop, capBot, tassel)
  if (withLight) {
    const light = new THREE.PointLight(emissive, 1.35, 4.2, 2)
    g.add(light)
  }
  return g
}

function hangLantern(parent: THREE.Object3D, x: number, y: number, z: number): THREE.Group {
  const cord = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.42, 4),
    new THREE.MeshLambertMaterial({ color: 0x1a1012 }),
  )
  cord.position.set(x, y + 0.2, z)
  const lantern = paperLantern()
  lantern.position.set(x, y, z)
  parent.add(cord, lantern)
  return lantern
}

function windowGlow(x: number, y: number, z: number): THREE.Mesh {
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.26, 0.36),
    new THREE.MeshBasicMaterial({ color: 0xff4030, transparent: true, opacity: 0.82 }),
  )
  glow.position.set(x, y, z)
  return glow
}

async function placeJoinBuilding(
  scene: THREE.Scene,
  file: string,
  x: number,
  z: number,
  height: number,
  rot: number,
  alive: () => boolean,
): Promise<void> {
  const g = await loadHarborGlb(file, { targetHeight: height, name: 'rpg-join-building' })
  if (!g || !alive()) return
  g.position.set(x, 0, z)
  g.rotation.y = rot
  scene.add(g)
}

function festivalLantern(color: number, emissive: number, scale = 0.7): THREE.Group {
  const lamp = paperLantern(color, emissive, false)
  lamp.scale.setScalar(scale)
  return lamp
}

/** Catenary of lanterns. Original harbor festival, not a copied skyline. */
function lanternString(
  parent: THREE.Object3D,
  from: THREE.Vector3,
  to: THREE.Vector3,
  count: number,
  sag: number,
  color: number,
  emissive: number,
): THREE.Group[] {
  const points: THREE.Vector3[] = []
  const lanterns: THREE.Group[] = []
  for (let i = 0; i <= count; i++) {
    const t = i / count
    const y = from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * sag
    points.push(new THREE.Vector3(from.x + (to.x - from.x) * t, y, from.z + (to.z - from.z) * t))
  }
  const cord = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color: 0x8a3828 }),
  )
  parent.add(cord)
  for (let i = 1; i < points.length - 1; i++) {
    const at = points[i]!
    const lamp = festivalLantern(color, emissive, i % 4 === 0 ? 0.85 : 0.62)
    lamp.position.set(at.x, at.y - 0.22, at.z)
    parent.add(lamp)
    lanterns.push(lamp)
  }
  return lanterns
}

function lanternTower(parent: THREE.Object3D): THREE.Group[] {
  const tower = new THREE.Group()
  tower.name = 'rpg-join-tower'
  tower.position.set(2.85, 0, -3.55)
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.14, 7.4, 8),
    new THREE.MeshLambertMaterial({ color: 0x2a1c18 }),
  )
  mast.position.y = 3.7
  tower.add(mast)
  const lanterns: THREE.Group[] = []
  for (let tier = 0; tier < 6; tier++) {
    const y = 1.15 + tier * 1.05
    const radius = 1.25 - tier * 0.12
    const count = 7
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + tier * 0.35
      const crimson = (i + tier) % 5 === 0
      const lamp = festivalLantern(crimson ? 0xc4202a : 0xffb23a, crimson ? 0xff5a40 : 0xffd27a, 0.9)
      lamp.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius)
      tower.add(lamp)
      lanterns.push(lamp)
    }
  }
  for (let i = 0; i < 24; i++) {
    const t = i / 24
    const y = 0.7 + t * 6.4
    const angle = t * Math.PI * 6
    const radius = 0.72 + Math.sin(t * Math.PI) * 0.38
    const lamp = festivalLantern(i % 4 === 0 ? 0xe23a32 : 0xffc14a, i % 4 === 0 ? 0xff6040 : 0xffe0a0, 0.78)
    lamp.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius)
    tower.add(lamp)
    lanterns.push(lamp)
  }
  const eaveMat = new THREE.MeshLambertMaterial({ color: 0x6e2420, emissive: 0x3a1010, emissiveIntensity: 0.22 })
  for (let e = 0; e < 3; e++) {
    const eave = new THREE.Mesh(new THREE.ConeGeometry(1.55 - e * 0.28, 0.36, 6), eaveMat)
    eave.position.y = 2.35 + e * 2.05
    tower.add(eave)
  }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.15, 0.72, 6), eaveMat)
  roof.position.y = 7.45
  const finial = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0xffd27a, emissive: 0xffb23a, emissiveIntensity: 0.8 }),
  )
  finial.position.y = 7.9
  tower.add(roof, finial)
  const glow = new THREE.PointLight(0xffb060, 2.4, 16, 2)
  glow.position.set(0, 3.4, 0.4)
  tower.add(glow)
  parent.add(tower)
  return lanterns
}

/** Cool grove opposite the lantern tower: roots, a stone shrine, and a flower bank. */
function spiritGrove(scene: THREE.Scene) {
  const shrine = new THREE.Group()
  shrine.name = 'rpg-join-shrine'
  shrine.position.set(-3.6, 0, -4.6)
  const stone = new THREE.MeshLambertMaterial({ color: 0x2a2438 })
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.4, 0.28), stone)
  left.position.set(-0.7, 1.2, 0)
  const right = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.4, 0.28), stone)
  right.position.set(0.7, 1.2, 0)
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.28, 0.36), stone)
  lintel.position.y = 2.5
  const gate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 1.3),
    new THREE.MeshBasicMaterial({ color: 0xc45cff, transparent: true, opacity: 0.45 }),
  )
  gate.position.y = 1.35
  const shrineGlow = new THREE.PointLight(0xc45cff, 1.4, 9, 2)
  shrineGlow.position.set(0, 1.4, 0.6)
  shrine.add(left, right, lintel, gate, shrineGlow)
  scene.add(shrine)

  const rootMat = new THREE.MeshLambertMaterial({ color: 0x5a3a68 })
  const arches: THREE.Vector3[][] = [
    [new THREE.Vector3(-5.2, 0.2, -2.4), new THREE.Vector3(-2.4, 4.6, -1.2), new THREE.Vector3(0.4, 5.2, -3.4)],
    [new THREE.Vector3(5.4, 0.4, -2.8), new THREE.Vector3(3.2, 4.8, -1.6), new THREE.Vector3(0.8, 5.4, -4.2)],
    [new THREE.Vector3(-4.4, 0.3, -5.2), new THREE.Vector3(-1.2, 3.8, -4.4), new THREE.Vector3(1.6, 3.2, -5.6)],
  ]
  const blossomMat = new THREE.MeshBasicMaterial({ color: 0xd56bff })
  const sparkMat = new THREE.MeshBasicMaterial({ color: 0x6ef0ff })
  for (const pts of arches) {
    const curve = new THREE.CatmullRomCurve3(pts)
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.09, 6, false), rootMat))
    for (let i = 1; i < 9; i++) {
      const at = curve.getPoint(i / 9)
      const bud = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), i % 2 === 0 ? blossomMat : sparkMat)
      bud.position.copy(at)
      scene.add(bud)
    }
  }

  const bank = new THREE.Group()
  bank.name = 'rpg-join-flowers'
  const cyanPetal = new THREE.MeshBasicMaterial({ color: 0x5ef0ff })
  const magentaPetal = new THREE.MeshBasicMaterial({ color: 0xe060ff })
  for (let i = 0; i < 72; i++) {
    const petal = new THREE.Mesh(
      new THREE.SphereGeometry(0.04 + (i % 4) * 0.014, 6, 5),
      i % 2 === 0 ? cyanPetal : magentaPetal,
    )
    const t = (i % 36) / 36
    const row = i < 36 ? 0 : 1
    petal.position.set(-5.4 + t * 4.6, 0.05 + (i % 5) * 0.012, -1.35 - row * 0.28 - Math.sin(t * Math.PI) * 0.22)
    bank.add(petal)
  }
  scene.add(bank)

  // Side pool, clear of the camera dolly so zoom-in does not clip through it.
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 2.1),
    new THREE.MeshBasicMaterial({ color: 0x12304a, transparent: true, opacity: 0.62 }),
  )
  water.rotation.x = -Math.PI / 2
  water.position.set(-4.7, 0.02, -0.35)
  scene.add(water)
  for (let i = 0; i < 5; i++) {
    const streak = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15, 0.035),
      new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x7af6ff : 0xd070ff, transparent: true, opacity: 0.72 }),
    )
    streak.rotation.x = -Math.PI / 2
    streak.position.set(-5.6 + i * 0.55, 0.03, -0.55 + (i % 2) * 0.28)
    scene.add(streak)
  }
}

function dressJoinStreet(scene: THREE.Scene, alive: () => boolean): { lanterns: THREE.Group[]; clouds: THREE.Mesh[] } {
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(16, 32),
    new THREE.MeshLambertMaterial({ color: 0x12161c }),
  )
  ground.rotation.x = -Math.PI / 2
  const path = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 9),
    new THREE.MeshLambertMaterial({ color: 0x1c1816 }),
  )
  path.rotation.x = -Math.PI / 2
  path.position.y = 0.012
  scene.add(ground, path)

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(0.92, 28, 18),
    new THREE.MeshBasicMaterial({ color: 0xf7fbff }),
  )
  moon.name = 'rpg-join-moon'
  moon.position.set(-5.4, 7.1, -12)
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(1.55, 20, 14),
    new THREE.MeshBasicMaterial({ color: 0xb9d4ff, transparent: true, opacity: 0.22 }),
  )
  halo.position.copy(moon.position)
  scene.add(moon, halo)

  const clouds: THREE.Mesh[] = []
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xd5e4f8, transparent: true, opacity: 0.28 })
  for (const [x, y, z, sx] of [
    [-3.2, 6.2, -11.2, 2.4],
    [-1.1, 5.6, -10.4, 1.6],
    [1.4, 6.6, -11.6, 2.1],
  ] as const) {
    const cloud = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 8), cloudMat)
    cloud.scale.set(sx, 0.28, 1)
    cloud.position.set(x, y, z)
    scene.add(cloud)
    clouds.push(cloud)
  }

  spiritGrove(scene)
  const towerLanterns = lanternTower(scene)
  const strings = [
    lanternString(scene, new THREE.Vector3(2.4, 6.6, -3.4), new THREE.Vector3(-6.2, 3.1, -0.4), 9, 0.85, 0xffb23a, 0xffd27a),
    lanternString(scene, new THREE.Vector3(2.2, 5.4, -3.2), new THREE.Vector3(-4.6, 4.4, -7.2), 8, 0.7, 0xffc14a, 0xffe0a0),
    lanternString(scene, new THREE.Vector3(3.1, 4.2, -3.3), new THREE.Vector3(-1.2, 2.7, 1.1), 7, 0.55, 0xc4202a, 0xff5a40),
    lanternString(scene, new THREE.Vector3(2.6, 7.2, -3.5), new THREE.Vector3(6.4, 3.3, -1.2), 6, 0.6, 0xffb23a, 0xffd27a),
  ].flat()
  const near = [
    hangLantern(scene, -1.45, 2.25, 0.35),
    hangLantern(scene, 1.35, 2.35, 0.2),
    hangLantern(scene, -0.2, 2.55, -1.05),
  ]
  for (const lamp of near) {
    const bulb = new THREE.PointLight(0xffc56a, 0.8, 3.2, 2)
    lamp.add(bulb)
  }
  scene.add(windowGlow(-2.4, 1.4, -1.7), windowGlow(1.1, 1.55, -2.4))
  const buildings: Array<[string, number, number, number, number]> = [
    ['v2/house-village.glb', -3.1, -2.35, 2.45, 0.4],
    ['v2/house-village.glb', 0.4, -2.7, 2.2, -0.15],
    ['v2/stall-market.glb', -1.7, -3.3, 1.45, 0.25],
    ['v2/save-shack.glb', 4.6, -4.4, 2.3, -0.5],
  ]
  for (const [file, x, z, height, rot] of buildings) {
    void placeJoinBuilding(scene, file, x, z, height, rot, alive)
  }
  return { lanterns: [...towerLanterns, ...strings, ...near], clouds }
}

type JoinWeapon = 'sword' | 'dagger' | 'lantern' | 'staff' | 'mace' | 'bow' | 'oar' | 'axe'
type JoinArmor = 'plate' | 'hood' | 'circlet'

const JOIN_CLASS_KIT: Record<HarborRpgClassId, { armor: JoinArmor; weapon: JoinWeapon; shield: boolean }> = {
  tideblade: { armor: 'plate', weapon: 'sword', shield: false },
  reedshadow: { armor: 'hood', weapon: 'dagger', shield: false },
  lanternmancer: { armor: 'circlet', weapon: 'lantern', shield: false },
  jadeheart: { armor: 'circlet', weapon: 'staff', shield: false },
  ashbound: { armor: 'plate', weapon: 'mace', shield: true },
  starferry: { armor: 'hood', weapon: 'bow', shield: false },
  ironoar: { armor: 'plate', weapon: 'oar', shield: true },
  mistweaver: { armor: 'circlet', weapon: 'staff', shield: false },
  chopwright: { armor: 'plate', weapon: 'axe', shield: false },
}

function findJoinBone(root: THREE.Object3D, name: string): THREE.Object3D | null {
  let hit: THREE.Object3D | null = null
  root.traverse((o) => {
    if (o.name === name) hit = o
  })
  return hit
}

function joinMetal(color: number, glow = 0.16): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: glow })
}

function joinSword(color: number, length: number, width: number): THREE.Group {
  const g = new THREE.Group()
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.16, 8), joinMetal(0x3a2418, 0))
  handle.position.y = 0.08
  const guard = new THREE.Mesh(new THREE.BoxGeometry(width * 3.2, 0.02, 0.03), joinMetal(0xe0c080, 0.05))
  guard.position.y = 0.16
  const edge = new THREE.Mesh(new THREE.CylinderGeometry(0.008, width, length, 5), joinMetal(color, 0.22))
  edge.position.y = 0.16 + length / 2
  g.add(handle, guard, edge)
  g.position.set(0, 0.05, 0.02)
  return g
}

function joinStaff(color: number, orb: number): THREE.Group {
  const g = new THREE.Group()
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, 1.15, 8), joinMetal(0x4a3424, 0))
  pole.position.y = 0.62
  const gem = new THREE.Mesh(new THREE.SphereGeometry(orb, 12, 10), joinMetal(color, 0.55))
  gem.position.y = 1.22
  g.add(pole, gem)
  g.position.set(0, 0.02, 0.02)
  return g
}

function joinLanternFocus(color: number): THREE.Group {
  const g = new THREE.Group()
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.42, 6), joinMetal(0x3a2418, 0))
  stick.position.y = 0.22
  const lamp = paperLantern()
  lamp.scale.setScalar(0.7)
  lamp.position.y = 0.52
  const paper = lamp.children.find((c) => (c as THREE.Mesh).isMesh) as THREE.Mesh | undefined
  const mat = paper?.material
  if (mat && !Array.isArray(mat) && 'color' in mat) {
    ;(mat as THREE.MeshLambertMaterial).color.setHex(color)
    ;(mat as THREE.MeshLambertMaterial).emissive.setHex(color)
  }
  g.add(stick, lamp)
  g.position.set(0, 0.04, 0.02)
  return g
}

function joinBow(color: number): THREE.Group {
  const g = new THREE.Group()
  const limb = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.012, 6, 18, Math.PI), joinMetal(color, 0.2))
  limb.rotation.z = Math.PI / 2
  const string = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.66, 0.008), joinMetal(0xf2e6d0, 0.05))
  g.add(limb, string)
  g.position.set(0, 0.12, 0.04)
  g.rotation.y = Math.PI / 2
  return g
}

function joinOar(color: number): THREE.Group {
  const g = new THREE.Group()
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 1.25, 8), joinMetal(0x5a4030, 0))
  shaft.position.y = 0.7
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.38, 0.03), joinMetal(color, 0.15))
  blade.position.y = 1.35
  g.add(shaft, blade)
  g.position.set(0, 0.02, 0.02)
  return g
}

function joinAxe(color: number): THREE.Group {
  const g = new THREE.Group()
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.42, 8), joinMetal(0x4a3424, 0))
  handle.position.y = 0.22
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.04), joinMetal(color, 0.2))
  head.position.set(0.06, 0.4, 0)
  g.add(handle, head)
  g.position.set(0, 0.04, 0.02)
  return g
}

function joinMace(color: number): THREE.Group {
  const g = new THREE.Group()
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.4, 8), joinMetal(0x3a2418, 0))
  handle.position.y = 0.22
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), joinMetal(color, 0.2))
  head.position.y = 0.46
  g.add(handle, head)
  g.position.set(0, 0.04, 0.02)
  return g
}

function joinShield(color: number): THREE.Group {
  const g = new THREE.Group()
  const face = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.035, 16), joinMetal(color, 0.12))
  face.rotation.x = Math.PI / 2
  const boss = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), joinMetal(0xe8c878, 0.15))
  boss.position.z = 0.03
  g.add(face, boss)
  g.position.set(0, 0.1, 0.08)
  return g
}

function joinPlate(color: number): THREE.Group {
  const g = new THREE.Group()
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.07, 0.16), joinMetal(color, 0.12))
  plate.position.set(0, 0.02, 0.04)
  g.add(plate)
  return g
}

function joinHood(color: number): THREE.Group {
  const g = new THREE.Group()
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58),
    joinMetal(color, 0.08),
  )
  cap.position.y = 0.06
  g.add(cap)
  return g
}

function joinCirclet(color: number): THREE.Group {
  const g = new THREE.Group()
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 6, 18), joinMetal(color, 0.35))
  ring.rotation.x = Math.PI / 2
  ring.position.y = 0.12
  g.add(ring)
  return g
}

function mountClassGear(body: THREE.Object3D, classId: HarborRpgClassId): THREE.Object3D[] {
  const kit = JOIN_CLASS_KIT[classId]
  const color = HARBOR_RPG_CLASS_DEFS[classId].color
  const nodes: THREE.Object3D[] = []
  const handR = findJoinBone(body, 'hand_r')
  const handL = findJoinBone(body, 'hand_l')
  const hold = handR ?? body
  let weapon: THREE.Object3D
  if (kit.weapon === 'sword') weapon = joinSword(color, 0.72, 0.045)
  else if (kit.weapon === 'dagger') weapon = joinSword(color, 0.32, 0.028)
  else if (kit.weapon === 'lantern') weapon = joinLanternFocus(color)
  else if (kit.weapon === 'staff') weapon = joinStaff(color, classId === 'jadeheart' ? 0.09 : 0.055)
  else if (kit.weapon === 'mace') weapon = joinMace(color)
  else if (kit.weapon === 'bow') weapon = joinBow(color)
  else if (kit.weapon === 'oar') weapon = joinOar(color)
  else weapon = joinAxe(color)
  if (kit.weapon === 'bow' && handL) handL.add(weapon)
  else hold.add(weapon)
  nodes.push(weapon)
  if (kit.shield && handL) {
    const shield = joinShield(color)
    handL.add(shield)
    nodes.push(shield)
  }
  if (kit.armor === 'plate') {
    for (const boneName of ['clavicle_r', 'clavicle_l']) {
      const bone = findJoinBone(body, boneName)
      if (!bone) continue
      const plate = joinPlate(color)
      bone.add(plate)
      nodes.push(plate)
    }
    if (kit.shield) {
      const chest = findJoinBone(body, 'spine_02')
      if (chest) {
        const plate = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.08), joinMetal(color, 0.1))
        plate.position.set(0, 0.04, 0.14)
        chest.add(plate)
        nodes.push(plate)
      }
    }
  } else if (kit.armor === 'hood') {
    const head = findJoinBone(body, 'Head')
    if (head) {
      const hood = joinHood(color)
      head.add(hood)
      nodes.push(hood)
    }
  } else {
    const head = findJoinBone(body, 'Head')
    if (head) {
      const circlet = joinCirclet(color)
      head.add(circlet)
      nodes.push(circlet)
    }
  }
  return nodes
}

function disposeJoinNode(node: THREE.Object3D) {
  const geos = new Set<THREE.BufferGeometry>()
  const mats = new Set<THREE.Material>()
  node.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    if (mesh.geometry) geos.add(mesh.geometry)
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const mat of list) if (mat) mats.add(mat)
  })
  for (const geo of geos) geo.dispose()
  for (const mat of mats) mat.dispose()
}

function releaseJoinSailor(inst: HarborRpgCosmeticInstance) {
  const gear = inst.root.userData.joinGear as THREE.Object3D[] | undefined
  if (gear) {
    for (const node of gear) {
      node.parent?.remove(node)
      disposeJoinNode(node)
    }
    inst.root.userData.joinGear = undefined
  }
  inst.root.parent?.remove(inst.root)
  disposeHarborRpgCosmetic(inst)
}

function disposeJoinProps(scene: THREE.Scene) {
  const geos = new Set<THREE.BufferGeometry>()
  const mats = new Set<THREE.Material>()
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh
    const line = o as THREE.Line
    if (mesh.userData.harborGlbMesh) return
    if (!mesh.isMesh && !line.isLine) return
    if (mesh.geometry) geos.add(mesh.geometry)
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const mat of list) if (mat) mats.add(mat)
  })
  for (const geo of geos) geo.dispose()
  for (const mat of mats) mat.dispose()
}

function RpgLookPreview({
  looks,
  classId,
}: {
  looks: HarborRpgEquippedLooks
  classId: HarborRpgClassId | null
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const sailorsRef = useRef<HarborRpgCosmeticInstance[]>([])
  const zoomRef = useRef<(dir: -1 | 1) => void>(() => {})
  const pieceKey = [looks.body, ...harborRpgWornLayerIds(looks)].join('|')

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let disposed = false
    let raf = 0
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x071422)
    scene.fog = new THREE.FogExp2(0x0a1830, 0.028)
    sceneRef.current = scene
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 90)
    const look = new THREE.Vector3(0, 1.05, -0.35)
    const dolly = new THREE.Vector3(0.28, 0.7, 4.45)
    const spun = new THREE.Vector3()
    const yAxis = new THREE.Vector3(0, 1, 0)
    let zoom = 1
    let yaw = 0
    let yawVel = 0
    let holding = false
    let lastDragAt = 0
    const spotTarget = new THREE.Object3D()
    spotTarget.name = 'rpg-join-spot'
    spotTarget.position.set(0, 1.2, 0)
    const spot = new THREE.SpotLight(0xfff6ee, 260, 8.5, 0.72, 0.58, 2)
    spot.position.set(0.4, 3.1, 2.5)
    scene.add(spotTarget, spot)
    spot.target = spotTarget
    const keyTarget = new THREE.Object3D()
    keyTarget.position.set(0, 1.15, 0)
    const key = new THREE.DirectionalLight(0xfff0dc, 2.4)
    key.position.set(1.4, 3.4, 2.8)
    scene.add(keyTarget, key)
    key.target = keyTarget
    const spotPlace = new THREE.Vector3()
    const applyView = () => {
      spun.copy(dolly).applyAxisAngle(yAxis, yaw)
      camera.position.copy(look).addScaledVector(spun, zoom)
      camera.lookAt(look)
      // Keep a stage spot a fixed distance in front of the sailor so zoom does not blow it out.
      spotPlace.copy(camera.position).sub(spotTarget.position)
      const reach = spotPlace.length()
      if (reach > 0.05) {
        spotPlace.multiplyScalar(2.45 / reach)
        spot.position.copy(spotTarget.position).add(spotPlace)
        spot.position.y += 0.7
        key.position.copy(spot.position)
      }
    }
    applyView()
    const nudgeZoom = (dir: -1 | 1) => {
      zoom = THREE.MathUtils.clamp(zoom * (dir > 0 ? 1.14 : 0.88), 0.42, 2.35)
      applyView()
    }
    zoomRef.current = nudgeZoom
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault()
      const delta = ev.deltaMode === 1 ? ev.deltaY * 16 : ev.deltaY
      zoom = THREE.MathUtils.clamp(zoom * Math.exp(delta * 0.0011), 0.42, 2.35)
      applyView()
    }
    const pointers = new Map<number, { x: number; y: number }>()
    let pinchDist: number | null = null
    const onPointerDown = (ev: PointerEvent) => {
      if ((ev.target as HTMLElement).closest?.('button')) return
      pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY })
      holding = true
      yawVel = 0
      lastDragAt = performance.now()
      try {
        host.setPointerCapture(ev.pointerId)
      } catch {
        /* the canvas may already own the hit */
      }
    }
    const onPointerMove = (ev: PointerEvent) => {
      const prev = pointers.get(ev.pointerId)
      if (!prev) return
      const dx = ev.clientX - prev.x
      pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY })
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()]
        const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y)
        if (pinchDist != null && pinchDist > 0) {
          zoom = THREE.MathUtils.clamp(zoom * (pinchDist / dist), 0.42, 2.35)
          applyView()
        }
        pinchDist = dist
        return
      }
      if (pointers.size !== 1 || dx === 0) return
      const step = -dx * 0.006
      yaw += step
      const now = performance.now()
      const dt = Math.max(0.008, (now - lastDragAt) / 1000)
      yawVel = THREE.MathUtils.clamp(step / dt, -2.2, 2.2)
      lastDragAt = now
      applyView()
    }
    const onPointerUp = (ev: PointerEvent) => {
      pointers.delete(ev.pointerId)
      if (pointers.size < 2) pinchDist = null
      holding = pointers.size > 0
    }
    host.addEventListener('wheel', onWheel, { passive: false })
    host.addEventListener('pointerdown', onPointerDown)
    host.addEventListener('pointermove', onPointerMove)
    host.addEventListener('pointerup', onPointerUp)
    host.addEventListener('pointercancel', onPointerUp)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.08
    host.appendChild(renderer.domElement)
    scene.add(new THREE.AmbientLight(0x24344e, 0.72))
    const moonLight = new THREE.DirectionalLight(0xc5d7ff, 0.62)
    moonLight.position.set(-6, 8, -4)
    scene.add(moonLight)
    const lanternFill = new THREE.DirectionalLight(0xffb060, 0.42)
    lanternFill.position.set(3.2, 4.5, -2)
    scene.add(lanternFill)
    const spiritFill = new THREE.DirectionalLight(0x7a4cff, 0.32)
    spiritFill.position.set(-4.2, 2.4, 1.6)
    scene.add(spiritFill)
    const { lanterns, clouds } = dressJoinStreet(scene, () => !disposed && sceneRef.current === scene)
    const size = () => {
      const w = Math.max(1, host.clientWidth)
      const h = Math.max(1, host.clientHeight)
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    size()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(size) : null
    ro?.observe(host)
    const clock = new THREE.Clock()
    const loop = () => {
      if (disposed) return
      raf = requestAnimationFrame(loop)
      const dt = clock.getDelta()
      const t = clock.elapsedTime
      const insts = sailorsRef.current
      const leader = insts[0]
      if (leader) {
        leader.mixer?.update(dt)
        if (!holding) leader.root.rotation.y += dt * 0.35
      }
      if (!holding && Math.abs(yawVel) > 0.0008) {
        yaw += yawVel * dt
        yawVel *= Math.exp(-3.4 * dt)
        applyView()
      }
      for (const inst of insts.slice(1)) {
        if (leader) {
          inst.root.rotation.y = leader.root.rotation.y
          lockTime(leader, inst)
        }
        inst.mixer?.update(0)
      }
      for (const lantern of lanterns) {
        const sway = Math.sin(t * 0.85 + lantern.position.x * 2.2) * 0.07
        lantern.rotation.z = sway
        const bulb = lantern.children.find((c) => (c as THREE.PointLight).isPointLight) as THREE.PointLight | undefined
        if (bulb) bulb.intensity = 1.15 + Math.sin(t * 1.7 + lantern.position.x * 3) * 0.35
      }
      for (const cloud of clouds) {
        cloud.position.x += Math.sin(t * 0.12 + cloud.position.y) * dt * 0.08
      }
      renderer.render(scene, camera)
    }
    loop()
    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      ro?.disconnect()
      host.removeEventListener('wheel', onWheel)
      host.removeEventListener('pointerdown', onPointerDown)
      host.removeEventListener('pointermove', onPointerMove)
      host.removeEventListener('pointerup', onPointerUp)
      host.removeEventListener('pointercancel', onPointerUp)
      zoomRef.current = () => {}
      disposeJoinProps(scene)
      renderer.dispose()
      sceneRef.current = null
      if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement)
    }
  }, [])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    let cancelled = false
    const ids = pieceKey.split('|').filter((id): id is HarborRpgCosmeticId => Boolean(id))
    void Promise.all(ids.map((id) => loadHarborRpgCosmetic(id))).then((loaded) => {
      if (cancelled || sceneRef.current !== scene) {
        for (const inst of loaded) if (inst) disposeHarborRpgCosmetic(inst)
        return
      }
      for (const old of sailorsRef.current) releaseJoinSailor(old)
      const next: HarborRpgCosmeticInstance[] = []
      for (const inst of loaded) {
        if (!inst) continue
        inst.root.userData.joinSailor = true
        scene.add(inst.root)
        next.push(inst)
      }
      const body = next[0]
      if (classId && body) body.root.userData.joinGear = mountClassGear(body.root, classId)
      sailorsRef.current = next
    })
    return () => {
      cancelled = true
      for (const inst of sailorsRef.current) releaseJoinSailor(inst)
      sailorsRef.current = []
    }
  }, [pieceKey, classId])

  return (
    <div className="hq-rpg-join-preview" ref={hostRef}>
      <div className="hq-rpg-join-zoom">
        <button type="button" aria-label="Zoom in" onClick={() => zoomRef.current(-1)}>
          +
        </button>
        <button type="button" aria-label="Zoom out" onClick={() => zoomRef.current(1)}>
          −
        </button>
      </div>
    </div>
  )
}

function lockTime(leader: HarborRpgCosmeticInstance, follower: HarborRpgCosmeticInstance) {
  if (!leader.action || !follower.mixer) return
  const name = leader.action.getClip().name
  if (!follower.action || follower.action.getClip().name !== name) {
    const clip = follower.clips.find((c) => c.name === name)
    if (!clip) return
    const next = follower.mixer.clipAction(clip)
    next.reset()
    next.setLoop(THREE.LoopRepeat, Infinity)
    next.play()
    follower.action = next
  }
  if (follower.action) follower.action.time = leader.action.time
}

function pieceName(id: string | null | undefined): string | null {
  if (!id) return null
  const def = HARBOR_RPG_COSMETIC_DEFS[id as HarborRpgCosmeticId]
  return def?.name.en ?? null
}

function chipOf(id: HarborRpgCosmeticId): { id: HarborRpgCosmeticId; label: string } {
  return { id, label: HARBOR_RPG_COSMETIC_DEFS[id].name.en }
}

function LookRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { id: HarborRpgCosmeticId | null; label: string }[]
  value: HarborRpgCosmeticId | null
  onChange: (id: HarborRpgCosmeticId | null) => void
}) {
  return (
    <div>
      <p className="hq-rpg-join-row-label">{label}</p>
      <div className="hq-rpg-join-row">
        {options.map((opt) => (
          <button
            key={`${label}-${opt.label}`}
            type="button"
            className={`hq-rpg-join-chip${value === opt.id ? ' is-on' : ''}`}
            onClick={() => onChange(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function HarborRpgJoin({ bag, onCreate, onEnter, onBack }: Props) {
  const phase = harborRpgJoinPhase(bag.characters.length)
  const [making, setMaking] = useState(phase === 'create')
  const [step, setStep] = useState<CreateStep>('name')
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [gender, setGender] = useState<HarborGender>('male')
  const [pick, setPick] = useState(() => harborRpgDefaultStarterPick('male'))
  const [classId, setClassId] = useState<HarborRpgClassId | null>(bag.classId)
  const [pickedId, setPickedId] = useState<string | null>(bag.activeCharacterId ?? bag.characters[0]?.id ?? null)
  const picked = bag.characters.find((c) => c.id === pickedId) ?? bag.characters[0] ?? null
  const previewGender: HarborGender = making ? gender : (picked?.gender ?? 'male')
  const draftLooks = harborRpgComposeStarterLook(gender, pick)
  const previewLooks =
    making
      ? draftLooks
      : (picked?.looks ??
        harborRpgComposeStarterLook(previewGender, harborRpgDefaultStarterPick(previewGender)))
  const needsClass = !bag.classId
  const chooseGender = (next: HarborGender) => {
    setGender(next)
    setPick(harborRpgDefaultStarterPick(next))
  }

  const acceptName = () => {
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      setNameError('Use at least two letters.')
      return
    }
    const taken = bag.characters.some((c) => c.name.trim().toLowerCase() === trimmed.toLowerCase())
    if (taken) {
      setNameError('That name is already on the roster.')
      return
    }
    setName(trimmed)
    setNameError(null)
    setStep('body')
  }

  const finishCreate = () => {
    if (!classId) return
    onCreate({ name: name.trim(), gender, classId, looks: harborRpgComposeStarterLook(gender, pick) })
  }

  return (
    <div className="hq-rpg-join" role="dialog" aria-modal="true" aria-label="HarborRPG character">
      <div className="hq-rpg-join-stage">
        <RpgLookPreview
          looks={previewLooks}
          classId={making && (step === 'class' || step === 'confirm') ? classId : null}
        />
        <p className="hq-rpg-join-caption">
          {pieceName(previewLooks.head) ?? 'Bare'} · {pieceName(previewLooks.top)} · {pieceName(previewLooks.bottom)} · {pieceName(previewLooks.feet)}
          {making && (step === 'class' || step === 'confirm') && classId
            ? ` · ${HARBOR_RPG_CLASS_DEFS[classId].name.en}`
            : ''}
        </p>
      </div>
      <div className={`hq-rpg-join-sheet${making && step === 'class' ? ' is-class' : ''}`}>
        <p className="hq-rpg-join-kicker">HarborRPG</p>
        <h2>{making ? 'Create your sailor' : 'Choose a sailor'}</h2>
        {making ? (
          <>
            {step === 'name' ? (
              <form
                className="hq-rpg-create"
                onSubmit={(e) => {
                  e.preventDefault()
                  acceptName()
                }}
              >
                <label className="hq-rpg-create-label">
                  Name
                  <input
                    className="hq-rpg-create-input"
                    value={name}
                    autoFocus
                    maxLength={20}
                    onChange={(e) => {
                      setName(e.target.value)
                      setNameError(null)
                    }}
                  />
                </label>
                {nameError ? <p className="hq-rpg-join-error">{nameError}</p> : null}
                <div className="hq-rpg-create-actions">
                  <button type="submit" className="hq-btn hq-btn--solid">
                    Next
                  </button>
                </div>
              </form>
            ) : null}
            {step === 'body' ? (
              <div className="hq-rpg-join-choices">
                <p className="hq-rpg-hint">Body, hair, tunic, trousers, and shoes. Sleeves follow the tunic.</p>
                <div className="hq-rpg-join-row">
                  <button type="button" className={`hq-rpg-join-chip${gender === 'male' ? ' is-on' : ''}`} onClick={() => chooseGender('male')}>
                    Male
                  </button>
                  <button type="button" className={`hq-rpg-join-chip${gender === 'female' ? ' is-on' : ''}`} onClick={() => chooseGender('female')}>
                    Female
                  </button>
                </div>
                <LookRow
                  label="Hair"
                  options={harborRpgStarterHair(gender).map((row) => ({ id: row.id, label: row.label }))}
                  value={pick.hair}
                  onChange={(id) => setPick((prev) => ({ ...prev, hair: id }))}
                />
                <LookRow
                  label="Top"
                  options={harborRpgStarterTops(gender).map(chipOf)}
                  value={pick.top}
                  onChange={(id) => {
                    if (!id) return
                    setPick((prev) => ({ ...prev, top: id }))
                  }}
                />
                <LookRow
                  label="Bottom"
                  options={harborRpgStarterBottoms(gender).map(chipOf)}
                  value={pick.bottom}
                  onChange={(id) => {
                    if (!id) return
                    setPick((prev) => ({ ...prev, bottom: id }))
                  }}
                />
                <LookRow
                  label="Shoes"
                  options={harborRpgStarterFeet(gender).map(chipOf)}
                  value={pick.feet}
                  onChange={(id) => {
                    if (!id) return
                    setPick((prev) => ({ ...prev, feet: id }))
                  }}
                />
                <div className="hq-rpg-create-actions">
                  <button type="button" className="hq-btn hq-btn--solid" onClick={() => setStep(needsClass ? 'class' : 'confirm')}>
                    Next
                  </button>
                  <button type="button" className="hq-btn hq-btn--ghost" onClick={() => setStep('name')}>
                    Back
                  </button>
                </div>
              </div>
            ) : null}
            {step === 'class' ? (
              <div className="hq-rpg-join-choices">
                <p className="hq-rpg-hint">Pick a class. The sailor wears that weapon and armor.</p>
                <ul className="hq-rpg-join-classes is-fit">
                  {HARBOR_RPG_CLASSES.map((id) => {
                    const def = HARBOR_RPG_CLASS_DEFS[id]
                    const on = classId === id
                    return (
                      <li key={id}>
                        <button
                          type="button"
                          className={`hq-rpg-join-class${on ? ' is-on' : ''}`}
                          onClick={() => setClassId(id)}
                        >
                          <strong>{def.name.en}</strong>{' '}
                          <span lang="zh-HK">{def.name.zh}</span>
                          <small>
                            {def.role} · {def.pitch.en}
                          </small>
                        </button>
                      </li>
                    )
                  })}
                </ul>
                <div className="hq-rpg-create-actions">
                  <button
                    type="button"
                    className="hq-btn hq-btn--solid"
                    disabled={!classId}
                    onClick={() => setStep('confirm')}
                  >
                    Next
                  </button>
                  <button type="button" className="hq-btn hq-btn--ghost" onClick={() => setStep('body')}>
                    Back
                  </button>
                </div>
              </div>
            ) : null}
            {step === 'confirm' && classId ? (
              <div className="hq-rpg-join-choices">
                <p className="hq-rpg-hint">
                  {name.trim()} · {gender === 'female' ? 'Female' : 'Male'} · {pieceName(pick.hair) ?? 'Bare'} · {pieceName(pick.top)} · {HARBOR_RPG_CLASS_DEFS[classId].name.en}
                </p>
                <div className="hq-rpg-create-actions">
                  <button type="button" className="hq-btn hq-btn--solid" onClick={finishCreate}>
                    Enter the harbor
                  </button>
                  <button
                    type="button"
                    className="hq-btn hq-btn--ghost"
                    onClick={() => setStep(needsClass ? 'class' : 'body')}
                  >
                    Back
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="hq-rpg-join-choices">
            <div className="hq-rpg-chars">
              {bag.characters.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`hq-rpg-char${c.id === pickedId ? ' is-on' : ''}`}
                  onClick={() => setPickedId(c.id)}
                >
                  {c.name}
                </button>
              ))}
              {bag.characters.length < HARBOR_RPG_MAX_CHARS ? (
                <button
                  type="button"
                  className="hq-rpg-char hq-rpg-char--new"
                  onClick={() => {
                    setMaking(true)
                    setStep('name')
                    setName('')
                  }}
                >
                  + New
                </button>
              ) : null}
            </div>
            {needsClass ? (
              <>
                <p className="hq-rpg-hint">Choose a class before entering.</p>
                <ul className="hq-rpg-join-classes">
                  {HARBOR_RPG_CLASSES.map((id) => {
                    const def = HARBOR_RPG_CLASS_DEFS[id]
                    return (
                      <li key={id}>
                        <button
                          type="button"
                          className={`hq-rpg-join-class${classId === id ? ' is-on' : ''}`}
                          onClick={() => setClassId(id)}
                        >
                          <strong>{def.name.en}</strong> · {def.role}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </>
            ) : (
              <p className="hq-rpg-hint">
                {HARBOR_RPG_CLASS_DEFS[bag.classId!].name.en} · enter with {picked?.name ?? 'your sailor'}.
              </p>
            )}
            <div className="hq-rpg-create-actions">
              <button
                type="button"
                className="hq-btn hq-btn--solid"
                disabled={!picked || (needsClass && !classId)}
                onClick={() => {
                  if (!picked) return
                  onEnter({ characterId: picked.id, classId: needsClass ? classId : bag.classId })
                }}
              >
                Enter the harbor
              </button>
            </div>
          </div>
        )}
        <div className="hq-rpg-create-actions">
          {making && phase === 'select' ? (
            <button type="button" className="hq-btn hq-btn--ghost" onClick={() => setMaking(false)}>
              Sailors
            </button>
          ) : null}
          <button type="button" className="hq-btn hq-btn--ghost" onClick={onBack}>
            Back to the voyage
          </button>
        </div>
      </div>
    </div>
  )
}
