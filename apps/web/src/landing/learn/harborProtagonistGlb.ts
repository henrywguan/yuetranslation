/**
 * Harbor Quest · Higgsfield / Meshy Scout GLB import (Henry-approved 2026-09-18).
 * Anime Scout is the only on-screen body — canoe, land, pier, Barber, profile.
 * Procedural dress-up stays as a load/fallback scaffold (hidden once GLB lands).
 * Scout GLBs ship unskinned — `rigHarborScoutGlb` paints a humanoid armature
 * so walk / idle / fish rotate bones instead of a frozen T-pose.
 * `setProceduralBodyVisible` must never toggle Scout GLB child meshes.
 */
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { SkeletonUtils } from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { HarborGender } from './harborAppearance'
import { applyHarborCel } from './harborCelShader'
import { HARBOR_FIGURE_PROPORTIONS } from './harborFigure'
import { rigHarborScoutGlb } from './harborScoutRig'

export const HARBOR_SCOUT_GLB_SRC = {
  female: '/assets/harbor-quest/scout-female.glb',
  male: '/assets/harbor-quest/scout-male.glb',
} as const

/**
 * Scout GLB gate — canoe plant + future skinned cast.
 * Materials convert to Lambert + harborCel (MeshStandard / MeshToon + cel
 * still fails to compile on iOS Safari and hid the body).
 */
export const HARBOR_SCOUT_GLB_ENABLED = true

/**
 * Land / standing / pier NPCs use the authored anime Scout GLB.
 * Walk / fish use the auto-rig armature (`harborScoutRig`).
 */
export const HARBOR_SCOUT_GLB_LAND = true

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
  rigHarborScoutGlb(wrap)
  return wrap
}

function cloneScoutGlb(src: THREE.Group): THREE.Group {
  const cloned = (src.userData.scoutRigged ? SkeletonUtils.clone(src) : src.clone(true)) as THREE.Group
  cloned.userData = { ...src.userData }
  return cloned
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
  if (hit) return cloneScoutGlb(hit)
  const pending = inflight.get(gender)
  if (pending) {
    const g = await pending
    return g ? cloneScoutGlb(g) : null
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
  return g ? cloneScoutGlb(g) : null
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
 *
 * `mode: 'canoe'` plants the standing A-pose mesh and hides geometry below the
 * deck line so the sailor sits in the boat without standing through the hull.
 */
export async function attachHarborScoutGlb(
  root: THREE.Group,
  gender: HarborGender,
  opts: { mode?: 'standing' | 'canoe' } = {},
): Promise<boolean> {
  if (!HARBOR_SCOUT_GLB_ENABLED) {
    setProceduralBodyVisible(root, true)
    root.userData.usesScoutGlb = false
    return false
  }
  const mode = opts.mode ?? 'standing'
  if (mode === 'standing' && !HARBOR_SCOUT_GLB_LAND) {
    const stale = root.getObjectByName('scout-glb')
    if (stale) stale.removeFromParent()
    setProceduralBodyVisible(root, true)
    root.userData.usesScoutGlb = false
    root.userData.characterStyle = 'anime-dressup'
    return false
  }
  // Hide dress-up immediately so iPhone never flashes blocky primitives.
  setProceduralBodyVisible(root, false)
  hideGlbRedundantClothing(root)
  const existing = root.getObjectByName('scout-glb')
  if (existing) {
    if (!isValidNormalizedScoutGlb(existing as THREE.Group)) {
      existing.removeFromParent()
      setProceduralBodyVisible(root, true)
      root.userData.usesScoutGlb = false
      return false
    }
    existing.visible = true
    if (!existing.userData.scoutRigged) rigHarborScoutGlb(existing as THREE.Group)
    setProceduralBodyVisible(root, false)
    hideGlbRedundantClothing(root)
    root.userData.usesScoutGlb = true
    if (mode === 'canoe') plantScoutGlbInCanoe(existing as THREE.Group)
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
  hideGlbRedundantClothing(root)
  root.userData.usesScoutGlb = true
  root.userData.characterStyle = 'anime-dressup-glb'
  if (mode === 'canoe') plantScoutGlbInCanoe(mesh)
  return true
}

/**
 * Tint a Scout/cast GLB toward a robe color so pier NPCs and landmark hosts
 * don't all wear the same Scout default. Clones materials so the cache stays clean.
 */
export function tintHarborCastGlb(root: THREE.Object3D, hex: number, amount = 0.38): void {
  const target = new THREE.Color(hex)
  root.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh || !m.userData.scoutGlbMesh) return
    const apply = (mat: THREE.Material): THREE.Material => {
      const next = mat.clone()
      if ('color' in next && next.color instanceof THREE.Color) {
        next.color.lerp(target, amount)
      }
      return next
    }
    m.material = Array.isArray(m.material) ? m.material.map(apply) : apply(m.material)
  })
}

/**
 * Attach the authored Scout mesh to a pier NPC / landmark host, then tint.
 * Held props must be tagged `userData.harborGear` so they stay visible.
 */
export async function attachHarborCastGlb(
  root: THREE.Group,
  gender: HarborGender,
  opts: { tint?: number; tintAmount?: number } = {},
): Promise<boolean> {
  if (!HARBOR_SCOUT_GLB_LAND) {
    setProceduralBodyVisible(root, true)
    root.userData.usesScoutGlb = false
    root.userData.characterStyle = 'anime-dressup'
    return false
  }
  const ok = await attachHarborScoutGlb(root, gender, { mode: 'standing' })
  if (!ok) return false
  if (opts.tint != null) tintHarborCastGlb(root, opts.tint, opts.tintAmount ?? 0.38)
  root.userData.characterStyle = 'anime-dressup-glb'
  return true
}

/**
 * Sink the standing Scout so the pelvis sits on the canoe seat.
 * Meshy Scout is a single mesh — do not hide by world AABB (that used to
 * vanish the sailor when the boat left the origin).
 */
export function plantScoutGlbInCanoe(glb: THREE.Group): void {
  // Idempotent — re-attach / wardrobe sync must not stack scale.
  if (glb.userData.scoutGlbCanoe) return
  glb.userData.scoutGlbCanoe = true
  // Seat height relative to boat local origin (canoe places scout at y≈0.38).
  glb.position.y = -0.55
  glb.scale.multiplyScalar(0.92)
  // Re-capture plant pose after canoe sink so walk/idle bob stays relative.
  glb.userData.scoutGlbAnimBaseReady = false
}

/** True when `o` is the Scout GLB root or any mesh under it. */
function isScoutGlbSubtree(o: THREE.Object3D): boolean {
  let cur: THREE.Object3D | null = o
  while (cur) {
    if (cur.name === 'scout-glb' || cur.userData.scoutGlb || cur.userData.scoutGlbMesh) return true
    cur = cur.parent
  }
  return false
}

/** True when `o` sits under clothing, held props, speech bubbles, or host glow. */
function isKeptCastProp(o: THREE.Object3D): boolean {
  let cur: THREE.Object3D | null = o
  while (cur) {
    if (
      cur.userData.harborClothing ||
      cur.userData.harborGear ||
      cur.userData.speechBubble ||
      cur.userData.specialHostGlow ||
      cur.userData.npcNametag
    ) {
      return true
    }
    cur = cur.parent
  }
  return false
}

/**
 * Show/hide procedural body parts (keep sockets + clothing overlays).
 * Never touch Scout GLB meshes — traverse visits children even when the
 * `scout-glb` root returns early, which previously hid the whole character.
 */
export function setProceduralBodyVisible(root: THREE.Object3D, visible: boolean): void {
  root.traverse((o) => {
    if (isScoutGlbSubtree(o)) return
    if (isKeptCastProp(o)) return
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

/**
 * Hide dress-up tops / bottoms / shoes that would sit on top of the anime mesh.
 * Hats + handheld gear stay as accessories.
 */
function hideGlbRedundantClothing(root: THREE.Object3D): void {
  root.traverse((o) => {
    if (!o.userData.harborClothing) return
    const slot = o.userData.harborClothSlot as string | undefined
    if (slot === 'top' || slot === 'bottom' || slot === 'shoes') o.visible = false
  })
}

/** Keep the anime Scout GLB on after wardrobe apply — never fall back to dress-up. */
export function syncScoutGlbWithLook(root: THREE.Object3D, _anyClothingSwap = false): void {
  const glb = root.getObjectByName('scout-glb')
  if (!glb) return
  if (!HARBOR_SCOUT_GLB_ENABLED || !isValidNormalizedScoutGlb(glb as THREE.Group)) {
    glb.visible = false
    setProceduralBodyVisible(root, true)
    root.userData.usesScoutGlb = false
    return
  }
  glb.visible = true
  setProceduralBodyVisible(root, false)
  hideGlbRedundantClothing(root)
  root.userData.usesScoutGlb = true
  root.userData.characterStyle = 'anime-dressup-glb'
}
