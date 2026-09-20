/**
 * Guan Harbor · armored patrol brothers (original craft).
 *
 * Six chunky RS-era silhouettes that roam the island. Original Harbor kits
 * only — no third-party OSRS character names or meshes. See RS-LIKE-CRAFT-BIBLE.md §7.
 */
import * as THREE from 'three'
import {
  HARBOR_CRAFT_PALETTE as P,
  hqBox,
  hqMat,
  hqPost,
} from './harborCraft'
import { harborFigureEars, harborFigureFace, harborFigureHead, harborFigureNeck } from './harborFigure'
import { buildNametagSprite } from './harborRemoteAvatars'
import { clampGuanFootTarget, guanGroundY, GUAN_LANDMARKS, isGuanLand } from './harborGuanRealm'
import { isHarborConstrainedGpu } from './harborIosGpu'

export const GUAN_PATROL_IDS = [
  'ironmound',
  'ashlance',
  'nightbow',
  'emberrod',
  'chainreap',
  'jadeguard',
] as const

export type GuanPatrolId = (typeof GUAN_PATROL_IDS)[number]

/** Display names — Harbor / Lingnan flavoured, not Jagex character names. */
export const GUAN_PATROL_LABEL: Record<GuanPatrolId, string> = {
  ironmound: '鐵冢 · Ironmound',
  ashlance: '灰矛 · Ashlance',
  nightbow: '玄弓 · Nightbow',
  emberrod: '焰杖 · Emberrod',
  chainreap: '鎖鐮 · Chainreap',
  jadeguard: '玉盾 · Jadeguard',
}

type PatrolKit = {
  plate: number
  trim: number
  pants: number
  accent: number
}

const KITS: Record<GuanPatrolId, PatrolKit> = {
  ironmound: { plate: 0x5a6068, trim: 0x8a9098, pants: 0x3a3834, accent: 0xc04040 },
  ashlance: { plate: 0x4a5048, trim: 0x7a8570, pants: 0x2a3028, accent: 0xa8b878 },
  nightbow: { plate: 0x2a3040, trim: 0x5a6880, pants: 0x1a2030, accent: 0x6a80a0 },
  emberrod: { plate: 0x4a3048, trim: 0x8a5080, pants: 0x2a1828, accent: 0xff6020 },
  chainreap: { plate: 0x3a4840, trim: 0x6a8070, pants: 0x243028, accent: 0xc4a040 },
  jadeguard: { plate: 0x3a5a58, trim: P.jade, pants: 0x1a3030, accent: P.trimGold },
}

/** Home anchors — spread across Guan so patrols don’t clump. */
function patrolHome(id: GuanPatrolId): { x: number; z: number; roam: number } {
  // Lazy read of landmarks avoids circular init with harborGuanRealm
  switch (id) {
    case 'ironmound':
      return { x: GUAN_LANDMARKS.musaPoint.x - 2.5, z: GUAN_LANDMARKS.musaPoint.z - 1.5, roam: 4.5 }
    case 'ashlance':
      return { x: GUAN_LANDMARKS.volcano.x + 3.5, z: GUAN_LANDMARKS.volcano.z - 2.0, roam: 5.0 }
    case 'nightbow':
      return { x: GUAN_LANDMARKS.brimhaven.x + 2.0, z: GUAN_LANDMARKS.brimhaven.z - 2.5, roam: 4.5 }
    case 'emberrod':
      return { x: GUAN_LANDMARKS.taiBwoWannai.x + 1.5, z: GUAN_LANDMARKS.taiBwoWannai.z + 2.0, roam: 5.5 }
    case 'chainreap':
      return { x: GUAN_LANDMARKS.shilo.x - 1.5, z: GUAN_LANDMARKS.shilo.z + 2.5, roam: 4.5 }
    case 'jadeguard':
      return { x: GUAN_LANDMARKS.shipYard.x - 2.0, z: GUAN_LANDMARKS.shipYard.z + 1.5, roam: 4.0 }
  }
}

export type GuanPatrolState = {
  id: GuanPatrolId
  homeX: number
  homeZ: number
  roam: number
  tx: number
  tz: number
  speed: number
  phase: number
  pause: number
  legL: THREE.Object3D
  legR: THREE.Object3D
  armL: THREE.Object3D
  armR: THREE.Object3D
}

function attachNametag(npc: THREE.Group, label: string) {
  if (typeof document !== 'undefined') {
    const tag = buildNametagSprite(label)
    tag.name = 'npc-nametag'
    tag.userData.npcNametag = true
    tag.position.set(0, 2.05, 0)
    tag.scale.set(1.7, 0.38, 1)
    npc.add(tag)
  } else {
    const plate = hqBox(0.7, 0.14, 0.04, 0x1a2830, 0, 2.05, 0)
    plate.name = 'npc-nametag'
    npc.add(plate)
  }
}

/** Shared chunky humanoid chassis — oversized head, mitten hands (era proportions). */
function armoredChassis(kit: PatrolKit): {
  root: THREE.Group
  legL: THREE.Group
  legR: THREE.Group
  armL: THREE.Group
  armR: THREE.Group
} {
  const root = new THREE.Group()
  const skin = hqMat(P.skin)

  const legL = new THREE.Group()
  legL.name = 'patrol-leg-l'
  legL.position.set(-0.1, 0.42, 0)
  legL.add(hqPost(0.07, 0.08, 0.42, kit.pants, 0, -0.21, 0))
  legL.add(hqBox(0.12, 0.08, 0.18, kit.plate, 0, -0.44, 0.02))
  root.add(legL)

  const legR = new THREE.Group()
  legR.name = 'patrol-leg-r'
  legR.position.set(0.1, 0.42, 0)
  legR.add(hqPost(0.07, 0.08, 0.42, kit.pants, 0, -0.21, 0))
  legR.add(hqBox(0.12, 0.08, 0.18, kit.plate, 0, -0.44, 0.02))
  root.add(legR)

  // Torso + oversized pauldrons
  root.add(hqBox(0.42, 0.52, 0.28, kit.plate, 0, 0.72, 0))
  root.add(hqBox(0.46, 0.1, 0.3, kit.trim, 0, 0.58, 0))
  root.add(hqBox(0.22, 0.14, 0.2, kit.plate, -0.28, 0.92, 0))
  root.add(hqBox(0.22, 0.14, 0.2, kit.plate, 0.28, 0.92, 0))

  const armL = new THREE.Group()
  armL.name = 'patrol-arm-l'
  armL.position.set(-0.28, 0.88, 0)
  armL.add(hqPost(0.06, 0.07, 0.36, kit.plate, 0, -0.18, 0))
  armL.add(hqBox(0.1, 0.1, 0.1, P.skin, 0, -0.38, 0.02))
  root.add(armL)

  const armR = new THREE.Group()
  armR.name = 'patrol-arm-r'
  armR.position.set(0.28, 0.88, 0)
  armR.add(hqPost(0.06, 0.07, 0.36, kit.plate, 0, -0.18, 0))
  armR.add(hqBox(0.1, 0.1, 0.1, P.skin, 0, -0.38, 0.02))
  root.add(armR)

  root.add(harborFigureHead(skin, 1.18, { r: 0.16 }))
  root.add(harborFigureNeck(skin, 1.18, 0.16))
  root.add(harborFigureEars(skin, 1.18, 0.16))
  root.add(harborFigureFace(skin, 1.18, { showBrows: true, showMouth: false }))

  return { root, legL, legR, armL, armR }
}

function kitIronmound(root: THREE.Group, armR: THREE.Group, kit: PatrolKit) {
  // Barrel helm + greataxe
  root.add(hqBox(0.34, 0.22, 0.34, kit.plate, 0, 1.28, 0))
  root.add(hqBox(0.12, 0.06, 0.28, kit.accent, 0, 1.22, 0.12))
  root.add(hqBox(0.08, 0.08, 0.08, kit.trim, -0.18, 1.38, 0))
  root.add(hqBox(0.08, 0.08, 0.08, kit.trim, 0.18, 1.38, 0))
  // Greataxe in right hand
  const axe = new THREE.Group()
  axe.add(hqPost(0.03, 0.035, 0.85, P.woodDark, 0, -0.2, 0))
  axe.add(hqBox(0.42, 0.28, 0.06, kit.plate, 0, 0.28, 0))
  axe.add(hqBox(0.18, 0.12, 0.05, kit.trim, 0, 0.28, 0.02))
  axe.position.set(0, -0.35, 0.08)
  axe.rotation.z = 0.15
  armR.add(axe)
}

function kitAshlance(root: THREE.Group, armR: THREE.Group, kit: PatrolKit) {
  // Crested helm + long spear
  root.add(hqBox(0.3, 0.2, 0.32, kit.plate, 0, 1.28, 0))
  root.add(hqBox(0.06, 0.28, 0.1, kit.accent, 0, 1.48, -0.02))
  const spear = new THREE.Group()
  spear.add(hqPost(0.025, 0.03, 1.35, P.woodMid, 0, 0.1, 0))
  spear.add(hqBox(0.06, 0.16, 0.06, kit.trim, 0, 0.82, 0))
  spear.position.set(0.05, -0.2, 0.1)
  spear.rotation.z = -0.2
  armR.add(spear)
}

function kitNightbow(root: THREE.Group, armL: THREE.Group, armR: THREE.Group, kit: PatrolKit) {
  // Hood + scale vest + bow
  root.add(hqBox(0.36, 0.18, 0.3, kit.plate, 0, 1.3, -0.04))
  root.add(hqBox(0.2, 0.1, 0.22, kit.trim, 0, 1.38, -0.08))
  root.add(hqBox(0.44, 0.2, 0.08, kit.accent, 0, 0.75, 0.14))
  const bow = new THREE.Group()
  bow.add(hqBox(0.05, 0.7, 0.05, P.woodDark, 0, 0, 0))
  bow.add(hqBox(0.04, 0.08, 0.22, kit.trim, 0, 0.32, 0.08))
  bow.add(hqBox(0.04, 0.08, 0.22, kit.trim, 0, -0.32, 0.08))
  bow.position.set(0, -0.15, 0.12)
  bow.rotation.x = 0.2
  armL.add(bow)
  // Quiver
  root.add(hqBox(0.1, 0.35, 0.1, kit.plate, -0.22, 0.85, -0.18))
  void armR
}

function kitEmberrod(root: THREE.Group, armR: THREE.Group, kit: PatrolKit) {
  // Hooded robes + glowing staff tip
  root.add(hqBox(0.4, 0.55, 0.3, kit.plate, 0, 0.72, 0))
  root.add(hqBox(0.38, 0.22, 0.34, kit.trim, 0, 1.28, 0))
  root.add(hqBox(0.16, 0.12, 0.2, kit.plate, 0, 1.4, -0.06))
  const staff = new THREE.Group()
  staff.add(hqPost(0.03, 0.035, 1.1, P.woodDark, 0, 0.05, 0))
  const tip = hqBox(0.12, 0.12, 0.12, kit.accent, 0, 0.65, 0)
  tip.userData.specialHostGlow = true
  tip.userData.glowBaseIntensity = 0.9
  staff.add(tip)
  if (!isHarborConstrainedGpu()) {
    const glow = new THREE.PointLight(kit.accent, 0.7, 3.5, 2)
    glow.position.set(0, 0.65, 0)
    glow.userData.harborLanternLight = true
    glow.userData.baseIntensity = 0.7
    staff.add(glow)
  }
  staff.position.set(0.04, -0.25, 0.1)
  armR.add(staff)
}

function kitChainreap(root: THREE.Group, armR: THREE.Group, kit: PatrolKit) {
  // Spiked spaulders + scythe
  root.add(hqBox(0.32, 0.2, 0.32, kit.plate, 0, 1.28, 0))
  for (const sx of [-1, 1] as const) {
    root.add(hqBox(0.08, 0.14, 0.08, kit.accent, sx * 0.32, 0.98, 0.05))
  }
  const scythe = new THREE.Group()
  scythe.add(hqPost(0.028, 0.032, 1.0, P.woodDark, 0, 0, 0))
  scythe.add(hqBox(0.55, 0.1, 0.05, kit.plate, 0.22, 0.48, 0))
  scythe.add(hqBox(0.12, 0.08, 0.04, kit.trim, 0.48, 0.48, 0.02))
  scythe.position.set(0.06, -0.15, 0.08)
  scythe.rotation.z = -0.35
  armR.add(scythe)
}

function kitJadeguard(root: THREE.Group, armL: THREE.Group, armR: THREE.Group, kit: PatrolKit) {
  // Polished helm + kite shield + short sword
  root.add(hqBox(0.32, 0.22, 0.34, kit.plate, 0, 1.28, 0))
  root.add(hqBox(0.14, 0.06, 0.28, kit.trim, 0, 1.22, 0.14))
  root.add(hqBox(0.1, 0.08, 0.08, kit.accent, 0, 1.4, 0))
  const shield = new THREE.Group()
  shield.add(hqBox(0.08, 0.48, 0.32, kit.plate, 0, -0.1, 0))
  shield.add(hqBox(0.06, 0.2, 0.2, kit.trim, 0.02, -0.05, 0))
  shield.position.set(-0.08, -0.15, 0.12)
  armL.add(shield)
  const sword = new THREE.Group()
  sword.add(hqPost(0.025, 0.03, 0.55, kit.trim, 0, 0, 0))
  sword.add(hqBox(0.16, 0.05, 0.05, kit.accent, 0, -0.22, 0))
  sword.position.set(0.04, -0.35, 0.08)
  armR.add(sword)
}

function pickRoamTarget(homeX: number, homeZ: number, roam: number, rng: () => number): {
  x: number
  z: number
} {
  for (let i = 0; i < 12; i++) {
    const a = rng() * Math.PI * 2
    const r = roam * (0.25 + rng() * 0.75)
    const x = homeX + Math.cos(a) * r
    const z = homeZ + Math.sin(a) * r
    if (!isGuanLand(x, z)) continue
    return clampGuanFootTarget(x, z)
  }
  return clampGuanFootTarget(homeX, homeZ)
}

/** Build one armored patrol brother (original kit). */
export function buildGuanPatrolBrother(id: GuanPatrolId, rng: () => number = Math.random): THREE.Group {
  const kit = KITS[id]
  const { root, legL, legR, armL, armR } = armoredChassis(kit)
  root.name = `guan-patrol-${id}`
  root.userData.guanPatrolId = id
  root.userData.fauna = 'guan-patrol' // indexed by rebuildFxIndex as anim node

  switch (id) {
    case 'ironmound':
      kitIronmound(root, armR, kit)
      break
    case 'ashlance':
      kitAshlance(root, armR, kit)
      break
    case 'nightbow':
      kitNightbow(root, armL, armR, kit)
      break
    case 'emberrod':
      kitEmberrod(root, armR, kit)
      break
    case 'chainreap':
      kitChainreap(root, armR, kit)
      break
    case 'jadeguard':
      kitJadeguard(root, armL, armR, kit)
      break
  }

  attachNametag(root, GUAN_PATROL_LABEL[id])

  const home = patrolHome(id)
  const start = pickRoamTarget(home.x, home.z, home.roam * 0.4, rng)
  const dest = pickRoamTarget(home.x, home.z, home.roam, rng)
  root.position.set(start.x, guanGroundY(start.x, start.z), start.z)
  root.rotation.y = Math.atan2(dest.x - start.x, dest.z - start.z)

  const state: GuanPatrolState = {
    id,
    homeX: home.x,
    homeZ: home.z,
    roam: home.roam,
    tx: dest.x,
    tz: dest.z,
    speed: 1.05 + rng() * 0.35,
    phase: rng() * Math.PI * 2,
    pause: 0,
    legL,
    legR,
    armL,
    armR,
  }
  root.userData.guanPatrol = state
  return root
}

/** Stamp all six patrol brothers into the Guan scene. */
export function stampGuanArmoredPatrol(root: THREE.Group, rng: () => number = Math.random) {
  const list: THREE.Group[] = []
  for (const id of GUAN_PATROL_IDS) {
    const brother = buildGuanPatrolBrother(id, rng)
    root.add(brother)
    list.push(brother)
  }
  root.userData.guanPatrolList = list
}

/**
 * Advance roam + limb walk cycle for stamped patrol brothers.
 * Call once per frame from createHarborWorld (Guan only).
 */
export function tickGuanArmoredPatrol(root: THREE.Group, dt: number, reduced: boolean) {
  const list = (root.userData.guanPatrolList as THREE.Group[] | undefined) ?? []
  for (const o of list) {
    const state = o.userData.guanPatrol as GuanPatrolState | undefined
    if (!state) continue

    if (state.pause > 0) {
      state.pause -= dt
      // Idle settle
      if (!reduced) {
        state.legL.rotation.x *= 0.85
        state.legR.rotation.x *= 0.85
        state.armL.rotation.x *= 0.85
        state.armR.rotation.x *= 0.85
      }
      if (state.pause <= 0) {
        const next = pickRoamTarget(state.homeX, state.homeZ, state.roam, Math.random)
        state.tx = next.x
        state.tz = next.z
      }
      continue
    }

    const dx = state.tx - o.position.x
    const dz = state.tz - o.position.z
    const dist = Math.hypot(dx, dz)
    if (dist < 0.35) {
      state.pause = 1.2 + Math.random() * 2.4
      continue
    }

    const step = Math.min(dist, state.speed * (reduced ? 0.45 : 1) * dt)
    o.position.x += (dx / dist) * step
    o.position.z += (dz / dist) * step
    o.position.y = guanGroundY(o.position.x, o.position.z)
    const face = Math.atan2(dx, dz)
    o.rotation.y += (face - o.rotation.y) * Math.min(1, dt * 6)

    if (!reduced) {
      state.phase += dt * 7.5
      const swing = Math.sin(state.phase) * 0.55
      state.legL.rotation.x = swing
      state.legR.rotation.x = -swing
      state.armL.rotation.x = -swing * 0.65
      state.armR.rotation.x = swing * 0.65
      // Subtle body bob
      o.position.y += Math.abs(Math.sin(state.phase)) * 0.03
    }
  }
}
