/**
 * Harbor Quest · Meshy Scout GLB import (Henry-approved 2026-09-18).
 * Standing pose *may* use cinematic mesh; seated canoe stays procedural.
 * Land: do not attach until the mesh path is validated — procedural Scout stays visible.
 * When a GLB does load, apply harborCelMaterial (anime / wuxia cel foundation).
 */
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { HarborGender } from './harborAppearance'
import { applyHarborCel } from './harborCelShader'
import { HARBOR_FIGURE_PROPORTIONS } from './harborFigure'

export const HARBOR_SCOUT_GLB_SRC = {
  female: '/assets/harbor-quest/scout-female.glb',
  male: '/assets/harbor-quest/scout-male.glb',
} as const

/**
 * Standing Scout uses the authored character GLB (textured mesh, not stacked
 * primitives). Materials are converted to Lambert + harborCel — MeshStandard /
 * MeshToon cel still fails to compile on iOS Safari and hid the body.
 */
export const HARBOR_SCOUT_GLB_ENABLED = true

/** Target standing height (feet → crown) matching procedural fashion kit. */
export const HARBOR_SCOUT_GLB_TARGET_H = HARBOR_FIGURE_PROPORTIONS.standingH

/** Reject normalized meshes that are empty / collapsed / absurdly scaled. */
const MIN_VALID_GLB_H = HARBOR_SCOUT_GLB_TARGET_H * 0.35
const MAX_VALID_GLB_H = HARBOR_SCOUT_GLB_TARGET_H * 2.5

const cache = new Map<HarborGender, THREE.Group>()
const inflight = new Map<HarborGender, Promise<THREE.Group | null>>()

function countScoutGlbMeshes(root: THREE.Object3D): number {
  let n = 0
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) n += 1
  })
  return n
}

function isValidNormalizedScoutGlb(wrap: THREE.Group): boolean {
  if (countScoutGlbMeshes(wrap) < 1) return false
  wrap.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(wrap)
  if (box.isEmpty()) return false
  const size = new THREE.Vector3()
  box.getSize(size)
  if (!(size.y >= MIN_VALID_GLB_H && size.y <= MAX_VALID_GLB_H)) return false
  if (!(size.x > 0.05 && size.z > 0.05)) return false
  return true
}

function normalizeScoutGlb(root: THREE.Object3D, gender: HarborGender): THREE.Group | null {
  const wrap = new THREE.Group()
  wrap.name = 'scout-glb'
  wrap.userData.scoutGlb = true
  wrap.userData.gender = gender
  wrap.userData.characterStyle = 'anime-dressup-glb'

  const clone = root.clone(true)
  wrap.add(clone)

  wrap.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(wrap)
  if (box.isEmpty()) return null
  const size = new THREE.Vector3()
  box.getSize(size)
  const h = size.y
  if (!(h > 0.05)) return null
  const scale = HARBOR_SCOUT_GLB_TARGET_H / h
  wrap.scale.setScalar(scale)
  wrap.updateMatrixWorld(true)

  const box2 = new THREE.Box3().setFromObject(wrap)
  if (box2.isEmpty()) return null
  // Feet on y=0, centered on XZ
  wrap.position.x -= (box2.min.x + box2.max.x) * 0.5
  wrap.position.z -= (box2.min.z + box2.max.z) * 0.5
  wrap.position.y -= box2.min.y

  wrap.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    m.castShadow = false
    m.receiveShadow = false
    m.frustumCulled = false
    m.userData.scoutGlbMesh = true
    m.material = harborGlbMaterialToLambertCel(m.material)
  })

  if (!isValidNormalizedScoutGlb(wrap)) return null
  return wrap
}

/**
 * iOS-safe GLB materials: copy albedo onto MeshLambert, then Harbor cel.
 * Never leave MeshStandard / MeshToon + cel on imported characters.
 */
export function harborGlbMaterialToLambertCel(
  material: THREE.Material | THREE.Material[],
): THREE.Material | THREE.Material[] {
  const convert = (src: THREE.Material): THREE.Material => {
    if (src.userData.harborCelApplied && src instanceof THREE.MeshLambertMaterial) return src
    const color =
      'color' in src && src.color instanceof THREE.Color ? src.color.getHex() : 0xffffff
    const map = 'map' in src && src.map instanceof THREE.Texture ? src.map : null
    const lambert = new THREE.MeshLambertMaterial({
      color,
      map,
      flatShading: false,
      transparent: src.transparent,
      opacity: src.opacity,
      side: src.side,
      alphaTest: src.alphaTest,
    })
    lambert.name = src.name || 'harbor-glb-lambert'
    lambert.userData = { ...src.userData }
    return applyHarborCel(lambert, { preset: 'character' })
  }
  return Array.isArray(material) ? material.map(convert) : convert(material)
}

async function fetchScoutGlb(gender: HarborGender): Promise<THREE.Group | null> {
  if (!HARBOR_SCOUT_GLB_ENABLED) return null
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
      if (!normalized) return null
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
  if (!HARBOR_SCOUT_GLB_ENABLED) return
  if (typeof window === 'undefined') return
  void fetchScoutGlb('female')
  void fetchScoutGlb('male')
}

export function isHarborScoutGlbCached(gender: HarborGender): boolean {
  return cache.has(gender)
}

/**
 * Attach cinematic Scout mesh to a procedural protagonist group.
 * Hides procedural body meshes only after a validated GLB is on the root.
 * On failure / disabled gate: leave procedural visible (land nametag-only bug).
 */
export async function attachHarborScoutGlb(
  root: THREE.Group,
  gender: HarborGender,
): Promise<boolean> {
  if (!HARBOR_SCOUT_GLB_ENABLED) {
    setProceduralBodyVisible(root, true)
    root.userData.usesScoutGlb = false
    return false
  }
  const existing = root.getObjectByName('scout-glb')
  if (existing) {
    if (!isValidNormalizedScoutGlb(existing as THREE.Group)) {
      existing.removeFromParent()
      setProceduralBodyVisible(root, true)
      root.userData.usesScoutGlb = false
      return false
    }
    existing.visible = true
    setProceduralBodyVisible(root, false)
    root.userData.usesScoutGlb = true
    return true
  }
  const mesh = await fetchScoutGlb(gender)
  if (!mesh || !isValidNormalizedScoutGlb(mesh)) {
    setProceduralBodyVisible(root, true)
    root.userData.usesScoutGlb = false
    return false
  }
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
    if (o.userData.harborHair || o.userData.harborFace || o.userData.harborEyes) {
      o.visible = visible
    }
  })
}

/** Toggle GLB vs procedural when wardrobe swaps unique silhouettes. */
export function syncScoutGlbWithLook(root: THREE.Object3D, anyClothingSwap: boolean): void {
  const glb = root.getObjectByName('scout-glb')
  if (!glb) return
  if (!HARBOR_SCOUT_GLB_ENABLED || anyClothingSwap || !isValidNormalizedScoutGlb(glb as THREE.Group)) {
    glb.visible = false
    setProceduralBodyVisible(root, true)
    root.userData.usesScoutGlb = false
    return
  }
  glb.visible = true
  setProceduralBodyVisible(root, false)
  root.userData.usesScoutGlb = true
}
