/**
 * HarborRPG cosmetic runtime — load Quaternius outfit / attach GLBs (soft client).
 */
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { harborGlbMaterialToLambertCel } from './harborProtagonistGlb'
import {
  HARBOR_RPG_COSMETIC_DEFS,
  type HarborRpgCosmeticDef,
  type HarborRpgCosmeticId,
} from './harborRpgCosmetics'

export type HarborRpgCosmeticInstance = {
  id: HarborRpgCosmeticId
  root: THREE.Group
  def: HarborRpgCosmeticDef
}

const loader = new GLTFLoader()
const cache = new Map<string, THREE.Group>()

function plantAndCel(root: THREE.Object3D, scale: number, name: string): THREE.Group {
  const wrap = new THREE.Group()
  wrap.name = name
  wrap.add(root)
  wrap.scale.setScalar(scale)
  wrap.updateMatrixWorld(true)
  // Keep authored Y (hoods/pauldrons sit at head/shoulder in armature space).
  // Only center XZ so feet/root line up under the scout.
  const box = new THREE.Box3().setFromObject(wrap)
  wrap.position.x -= (box.min.x + box.max.x) * 0.5
  wrap.position.z -= (box.min.z + box.max.z) * 0.5
  if (name === 'rpg-cosmetic-outfit') {
    wrap.position.y -= box.min.y
  }
  wrap.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    m.castShadow = false
    m.receiveShadow = false
    m.material = harborGlbMaterialToLambertCel(m.material)
  })
  return wrap
}

export async function loadHarborRpgCosmetic(
  id: HarborRpgCosmeticId,
): Promise<HarborRpgCosmeticInstance | null> {
  const def = HARBOR_RPG_COSMETIC_DEFS[id]
  if (!def.src) return null
  let scene = cache.get(def.src)
  if (!scene) {
    try {
      const gltf = await loader.loadAsync(def.src)
      scene = gltf.scene.clone(true)
      cache.set(def.src, scene)
    } catch {
      return null
    }
  }
  const name = def.kind === 'outfit' ? 'rpg-cosmetic-outfit' : 'rpg-cosmetic-attach'
  const root = plantAndCel(scene.clone(true), def.scale, name)
  root.userData.rpgCosmeticId = id
  root.userData.rpgCosmeticKind = def.kind
  return { id, root, def }
}

export function disposeHarborRpgCosmetic(inst: HarborRpgCosmeticInstance): void {
  inst.root.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh) {
      m.geometry?.dispose()
      const mat = m.material
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
      else mat?.dispose()
    }
  })
}
