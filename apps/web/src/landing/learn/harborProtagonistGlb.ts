/**
 * Harbor Quest · Meshy Scout GLB import (Henry-approved 2026-09-18).
 * Standing pose uses cinematic mesh; seated canoe stays procedural.
 */
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { HarborGender } from './harborAppearance'
import { applyHarborCel, makeHarborIlmMap } from './harborCelShader'
import { HARBOR_FIGURE_PROPORTIONS } from './harborFigure'

export const HARBOR_SCOUT_GLB_SRC = {
  female: '/assets/harbor-quest/scout-female.glb',
  male: '/assets/harbor-quest/scout-male.glb',
} as const

/** Target standing height (feet → crown) matching procedural fashion kit. */
export const HARBOR_SCOUT_GLB_TARGET_H = HARBOR_FIGURE_PROPORTIONS.standingH

const cache = new Map<HarborGender, THREE.Group>()
const inflight = new Map<HarborGender, Promise<THREE.Group | null>>()

function normalizeScoutGlb(root: THREE.Object3D, gender: HarborGender): THREE.Group {
  const wrap = new THREE.Group()
  wrap.name = 'scout-glb'
  wrap.userData.scoutGlb = true
  wrap.userData.gender = gender
  wrap.userData.characterStyle = 'anime-dressup-glb'

  const clone = root.clone(true)
  wrap.add(clone)

  // Bake world transforms into a measurable box
  wrap.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(wrap)
  const size = new THREE.Vector3()
  box.getSize(size)
  const h = Math.max(0.001, size.y)
  const scale = HARBOR_SCOUT_GLB_TARGET_H / h
  wrap.scale.setScalar(scale)
  wrap.updateMatrixWorld(true)

  const box2 = new THREE.Box3().setFromObject(wrap)
  // Feet on y=0, centered on XZ
  wrap.position.x -= (box2.min.x + box2.max.x) * 0.5
  wrap.position.z -= (box2.min.z + box2.max.z) * 0.5
  wrap.position.y -= box2.min.y

  wrap.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    m.castShadow = false
    m.receiveShadow = false
    m.userData.scoutGlbMesh = true
    // Keep materials; soft lighting already in scene.
    const mat = m.material as THREE.Material | THREE.Material[]
    const mats = Array.isArray(mat) ? mat : [mat]
    for (const mm of mats) {
      if ('flatShading' in mm) (mm as THREE.MeshStandardMaterial).flatShading = false
      applyHarborCel(mm, { preset: 'character', ilmMap: makeHarborIlmMap('face') })
      mm.needsUpdate = true
    }
  })

  return wrap
}

async function fetchScoutGlb(gender: HarborGender): Promise<THREE.Group | null> {
  const hit = cache.get(gender)
  if (hit) return hit.clone(true)
  const pending = inflight.get(gender)
  if (pending) {
    const g = await pending
    return g ? g.clone(true) : null
  }
  const job = (async () => {
    try {
      const url = HARBOR_SCOUT_GLB_SRC[gender]
      const loader = new GLTFLoader()
      const gltf = await loader.loadAsync(url)
      const normalized = normalizeScoutGlb(gltf.scene, gender)
      cache.set(gender, normalized)
      return normalized
    } catch {
      return null
    } finally {
      inflight.delete(gender)
    }
  })()
  inflight.set(gender, job)
  const g = await job
  return g ? g.clone(true) : null
}

/** Warm both gender meshes after a user gesture / learn mount. */
export function preloadHarborScoutGlbs(): void {
  if (typeof window === 'undefined') return
  void fetchScoutGlb('female')
  void fetchScoutGlb('male')
}

export function isHarborScoutGlbCached(gender: HarborGender): boolean {
  return cache.has(gender)
}

/**
 * Attach cinematic Scout mesh to a procedural protagonist group.
 * Hides procedural body meshes while GLB is visible (sockets stay).
 */
export async function attachHarborScoutGlb(
  root: THREE.Group,
  gender: HarborGender,
): Promise<boolean> {
  const existing = root.getObjectByName('scout-glb')
  if (existing) {
    existing.visible = true
    setProceduralBodyVisible(root, false)
    root.userData.usesScoutGlb = true
    return true
  }
  const mesh = await fetchScoutGlb(gender)
  if (!mesh) return false
  root.add(mesh)
  setProceduralBodyVisible(root, false)
  root.userData.usesScoutGlb = true
  root.userData.characterStyle = 'anime-dressup-glb'
  return true
}

/** Show/hide procedural body parts (keep sockets + clothing overlays). */
export function setProceduralBodyVisible(root: THREE.Object3D, visible: boolean): void {
  root.traverse((o) => {
    if (o.name === 'scout-glb' || o.userData.scoutGlb) return
    if (o.userData.harborClothing || o.userData.harborGear) return
    if (
      o.name === 'hand_r' ||
      o.name === 'hand_l' ||
      o.name === 'head' ||
      o.name === 'back' ||
      o.name === 'hip_l'
    ) {
      return
    }
    const m = o as THREE.Mesh
    if (m.isMesh) m.visible = visible
    // Hair / face groups
    if (o.userData.harborHair || o.userData.harborFace || o.userData.harborEyes) {
      o.visible = visible
    }
  })
}

/** Toggle GLB vs procedural when wardrobe swaps unique silhouettes. */
export function syncScoutGlbWithLook(root: THREE.Object3D, anyClothingSwap: boolean): void {
  const glb = root.getObjectByName('scout-glb')
  if (!glb) return
  if (anyClothingSwap) {
    glb.visible = false
    setProceduralBodyVisible(root, true)
  } else {
    glb.visible = true
    setProceduralBodyVisible(root, false)
  }
}
