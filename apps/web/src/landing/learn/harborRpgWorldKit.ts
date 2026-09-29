/**
 * HarborRPG world dressing from free Quaternius packs.
 * MegaKit Standard (village, props, nature) plus the CC0 Pirate Kit and
 * Modular Dungeons pack. Google Drive copies of the older full packs were
 * still over quota, so ships, dock houses, and a few props come from the
 * Pirate Kit mirror of the same CC0 files.
 */
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { loadHarborGlb } from './harborGlbAssets'
import { harborGlbMaterialToLambertCel } from './harborProtagonistGlb'
import {
  HARBOR_RPG_BANK,
  HARBOR_RPG_CRAFT_BENCH,
  HARBOR_RPG_GATHER_NODES,
  HARBOR_RPG_MARKET,
  HARBOR_RPG_QUEST_BOARD,
  HARBOR_RPG_VENDOR,
  type HarborRpgZoneId,
} from './harborRpgData'
import { HARBOR_RPG_STABLE } from './harborRpgMounts'

const KIT = '/assets/harbor-quest/world/quaternius'

export const HARBOR_RPG_WORLD_KIT_FILES = [
  'tree-common-1.glb',
  'tree-common-3.glb',
  'tree-pine-1.glb',
  'tree-dead-1.glb',
  'bush-1.glb',
  'bush-flowers.glb',
  'flower-1.glb',
  'rock-1.glb',
  'plant-1.glb',
  'fern-1.glb',
  'mushroom-1.glb',
  'clover-1.glb',
  'fence.glb',
  'vine.glb',
  'door.glb',
  'wall.glb',
  'wall-door.glb',
  'roof.glb',
  'stall.glb',
  'chest.glb',
  'sword.glb',
  'bottle.glb',
  'anvil.glb',
  'torch.glb',
  'cauldron.glb',
  'crate-carrot.glb',
  'key.glb',
  'banner.glb',
  'dock.glb',
  'house-1.glb',
  'house-2.glb',
  'palm-1.glb',
  'palm-2.glb',
  'ship.glb',
  'cannon.glb',
  'barrel.glb',
  'shark.glb',
  'skeleton.glb',
  'cutlass.glb',
  'wheat.glb',
  'gold.glb',
  'dungeon-arch.glb',
  'dungeon-wall.glb',
  'dungeon-pillar.glb',
] as const

function src(file: string): string {
  return `${KIT}/${file}`
}

type Spot = {
  file: string
  x: number
  z: number
  height: number
  rot?: number
  /** Play the first clip. Used for shark and skeleton. */
  animate?: boolean
}

function treesFor(zone: HarborRpgZoneId): string[] {
  if (zone === 'pinewood') return ['tree-pine-1.glb', 'tree-common-1.glb', 'tree-common-3.glb']
  if (zone === 'ruins' || zone === 'crypt' || zone === 'delve') return ['tree-dead-1.glb', 'tree-common-3.glb']
  if (zone === 'marsh' || zone === 'echoisle' || zone === 'moonpier') return ['palm-1.glb', 'palm-2.glb', 'tree-common-1.glb']
  return ['tree-common-1.glb', 'tree-common-3.glb', 'tree-pine-1.glb']
}

function spotsFor(zone: HarborRpgZoneId): Spot[] {
  const town: Spot[] = [
    { file: 'stall.glb', x: HARBOR_RPG_VENDOR.x, z: HARBOR_RPG_VENDOR.z + 1.2, height: 1.7, rot: Math.PI },
    { file: 'sword.glb', x: HARBOR_RPG_VENDOR.x + 0.8, z: HARBOR_RPG_VENDOR.z, height: 0.9 },
    { file: 'bottle.glb', x: HARBOR_RPG_VENDOR.x - 0.7, z: HARBOR_RPG_VENDOR.z + 0.3, height: 0.35 },
    { file: 'chest.glb', x: HARBOR_RPG_MARKET.x + 1.4, z: HARBOR_RPG_MARKET.z, height: 0.7 },
    { file: 'cauldron.glb', x: HARBOR_RPG_MARKET.x - 1.2, z: HARBOR_RPG_MARKET.z + 0.6, height: 0.8 },
    { file: 'anvil.glb', x: HARBOR_RPG_CRAFT_BENCH.x + 1.1, z: HARBOR_RPG_CRAFT_BENCH.z, height: 0.7 },
    { file: 'torch.glb', x: HARBOR_RPG_CRAFT_BENCH.x - 1.1, z: HARBOR_RPG_CRAFT_BENCH.z, height: 1.3 },
    { file: 'banner.glb', x: HARBOR_RPG_QUEST_BOARD.x, z: HARBOR_RPG_QUEST_BOARD.z - 1.1, height: 2.2 },
    { file: 'key.glb', x: HARBOR_RPG_BANK.x + 0.8, z: HARBOR_RPG_BANK.z, height: 0.25 },
    { file: 'gold.glb', x: HARBOR_RPG_BANK.x - 0.6, z: HARBOR_RPG_BANK.z + 0.4, height: 0.22 },
    { file: 'cutlass.glb', x: HARBOR_RPG_STABLE.x + 1.2, z: HARBOR_RPG_STABLE.z, height: 0.85 },
    { file: 'fence.glb', x: -8, z: 7, height: 1.1, rot: 0.2 },
    { file: 'fence.glb', x: -6, z: 7.3, height: 1.1 },
    { file: 'fence.glb', x: 7, z: 7, height: 1.1, rot: -0.2 },
    { file: 'vine.glb', x: -10, z: 3.2, height: 1.6 },
    { file: 'door.glb', x: 0.6, z: -8.6, height: 2.1 },
    { file: 'crate-carrot.glb', x: 4.6, z: -4.2, height: 0.55 },
    { file: 'wheat.glb', x: -3.2, z: 5.4, height: 0.7 },
  ]
  const water: Spot[] = [
    { file: 'dock.glb', x: 0, z: 4, height: 0.45, rot: 0 },
    { file: 'ship.glb', x: 3.2, z: 7.5, height: 2.6, rot: 0.6 },
    { file: 'cannon.glb', x: -2.4, z: 3.2, height: 0.9, rot: 0.4 },
    { file: 'barrel.glb', x: -1.2, z: 2.4, height: 0.7 },
    { file: 'palm-1.glb', x: -6, z: 8, height: 3.4 },
    { file: 'palm-2.glb', x: 6.5, z: 9, height: 3.2 },
  ]
  if (zone === 'town') return town
  if (zone === 'echoisle' || zone === 'moonpier') return water
  if (zone === 'crypt' || zone === 'delve') {
    return [
      { file: 'dungeon-arch.glb', x: 0, z: -2, height: 3.2 },
      { file: 'dungeon-wall.glb', x: -6, z: -6, height: 2.6, rot: 0.4 },
      { file: 'dungeon-pillar.glb', x: 5, z: -5, height: 2.8 },
      { file: 'chest.glb', x: 2.2, z: -4, height: 0.7 },
      { file: 'skeleton.glb', x: -1.5, z: -6, height: 1.7, rot: 0.8, animate: true },
      { file: 'barrel.glb', x: 3.4, z: 2, height: 0.65 },
    ]
  }
  if (zone === 'ruins') {
    return [
      { file: 'wall.glb', x: -5, z: -3, height: 2.4, rot: 0.5 },
      { file: 'wall-door.glb', x: 4, z: -2, height: 2.4, rot: -0.4 },
      { file: 'roof.glb', x: 0, z: -5, height: 1.2 },
      { file: 'dungeon-arch.glb', x: 0, z: 2, height: 3 },
      { file: 'chest.glb', x: 1.5, z: -4.5, height: 0.65 },
    ]
  }
  if (zone === 'tidehollow' || zone === 'tideraid') {
    return [
      { file: 'dungeon-pillar.glb', x: -4, z: -6, height: 3 },
      { file: 'ship.glb', x: 0, z: 6, height: 2.4, rot: 1.2 },
      { file: 'barrel.glb', x: 2, z: 3, height: 0.6 },
    ]
  }
  if (zone === 'marsh') {
    return [
      { file: 'fern-1.glb', x: 3, z: 2, height: 0.8 },
      { file: 'mushroom-1.glb', x: -2, z: 4, height: 0.45 },
      { file: 'shark.glb', x: 5, z: -3, height: 1.1, rot: 0.7, animate: true },
      { file: 'palm-1.glb', x: -8, z: -6, height: 3.6 },
    ]
  }
  if (zone === 'chronicle') {
    return [
      { file: 'banner.glb', x: 0, z: -6, height: 2.4 },
      { file: 'chest.glb', x: 2, z: -3, height: 0.7 },
    ]
  }
  if (zone === 'meadow' || zone === 'pinewood' || zone === 'ashreach') {
    return [
      { file: 'mushroom-1.glb', x: 3, z: 6, height: 0.4 },
      { file: 'clover-1.glb', x: -4, z: 5, height: 0.25 },
    ]
  }
  return []
}

async function drop(
  parent: THREE.Object3D,
  file: string,
  x: number,
  z: number,
  height: number,
  rot = 0,
): Promise<THREE.Group | null> {
  const g = await loadHarborGlb(src(file), {
    targetHeight: height,
    name: `rpg-kit-${file.replace('.glb', '')}`,
  })
  if (!g) return null
  g.position.set(x, 0, z)
  g.rotation.y = rot
  g.userData.rpgKit = file
  parent.add(g)
  return g
}

async function replaceNamed(
  root: THREE.Group,
  objectName: string,
  files: string[],
  height: number,
  alive: () => boolean,
): Promise<void> {
  const nodes: THREE.Object3D[] = []
  root.traverse((o) => {
    if (o.name === objectName) nodes.push(o)
  })
  for (let i = 0; i < nodes.length; i++) {
    if (!alive()) return
    const node = nodes[i]!
    const g = await loadHarborGlb(src(files[i % files.length]!), {
      targetHeight: height,
      name: `rpg-kit-${objectName}`,
    })
    if (!g || !node.parent) continue
    g.position.copy(node.position)
    g.rotation.y = node.rotation.y
    g.userData.rpgKit = files[i % files.length]
    node.parent.add(g)
    node.visible = false
  }
}

const animLoader = new GLTFLoader()

async function dropAnimated(parent: THREE.Object3D, spot: Spot, alive: () => boolean): Promise<void> {
  if (!alive()) return
  try {
    const gltf = await animLoader.loadAsync(src(spot.file))
    if (!alive()) return
    const root = gltf.scene
    root.name = `rpg-kit-${spot.file.replace('.glb', '')}`
    root.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.castShadow = false
      m.receiveShadow = false
      m.userData.harborGlbMesh = true
      m.material = harborGlbMaterialToLambertCel(m.material)
    })
    const box = new THREE.Box3().setFromObject(root)
    const size = new THREE.Vector3()
    box.getSize(size)
    const h = Math.max(0.001, size.y)
    root.scale.setScalar(spot.height / h)
    root.updateMatrixWorld(true)
    const box2 = new THREE.Box3().setFromObject(root)
    root.position.set(
      spot.x - (box2.min.x + box2.max.x) * 0.5,
      -box2.min.y,
      spot.z - (box2.min.z + box2.max.z) * 0.5,
    )
    root.rotation.y = spot.rot ?? 0
    const clip =
      gltf.animations.find((a) => /idle|walk|swim/i.test(a.name)) ?? gltf.animations[0]
    if (clip) {
      const mixer = new THREE.AnimationMixer(root)
      mixer.clipAction(clip).play()
      root.userData.rpgKitMixer = mixer
    }
    root.userData.rpgKit = spot.file
    parent.add(root)
  } catch {
    /* missing pack slice stays on the procedural stand-in */
  }
}

/** Swap procedural trees, rocks, stalls, and nodes for the free pack meshes. */
export async function dressHarborRpgWorldKit(
  root: THREE.Group,
  zone: HarborRpgZoneId,
  alive: () => boolean = () => true,
): Promise<void> {
  await replaceNamed(root, 'rpg-tree', treesFor(zone), zone === 'town' ? 2.8 : 3.6, alive)
  await replaceNamed(root, 'rpg-bush', ['bush-1.glb', 'bush-flowers.glb'], 0.7, alive)
  await replaceNamed(root, 'rpg-rock', ['rock-1.glb'], 0.55, alive)
  await replaceNamed(root, 'rpg-flower', ['flower-1.glb', 'clover-1.glb'], 0.28, alive)
  await replaceNamed(root, 'rpg-building', ['house-1.glb', 'house-2.glb'], 3.6, alive)

  const nodes: THREE.Object3D[] = []
  root.traverse((o) => {
    if (typeof o.name === 'string' && o.name.startsWith('rpg-node-')) nodes.push(o)
  })
  for (const node of nodes) {
    if (!alive()) return
    const id = node.name.slice('rpg-node-'.length)
    const def = HARBOR_RPG_GATHER_NODES.find((n) => n.id === id)
    const file = def?.profession === 'mining' ? 'rock-1.glb' : 'plant-1.glb'
    const height = def?.profession === 'mining' ? 0.7 : 0.65
    const g = await loadHarborGlb(src(file), { targetHeight: height, name: `rpg-kit-${id}` })
    if (!g) continue
    node.add(g)
    node.children.forEach((child) => {
      if (child !== g) child.visible = false
    })
  }

  for (const spot of spotsFor(zone)) {
    if (!alive()) return
    if (spot.animate) {
      await dropAnimated(root, spot, alive)
    } else {
      await drop(root, spot.file, spot.x, spot.z, spot.height, spot.rot ?? 0)
    }
  }
}
