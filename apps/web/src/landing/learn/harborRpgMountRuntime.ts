/**
 * HarborRPG mount runtime — load GLB + play idle/walk/gallop clips (soft client).
 */
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { harborGlbMaterialToLambertCel } from './harborProtagonistGlb'
import {
  HARBOR_RPG_MOUNT_DEFS,
  type HarborRpgMountDef,
  type HarborRpgMountId,
} from './harborRpgMounts'

export type HarborRpgMountInstance = {
  id: HarborRpgMountId
  root: THREE.Group
  mixer: THREE.AnimationMixer
  clips: THREE.AnimationClip[]
  def: HarborRpgMountDef
  mode: 'idle' | 'walk' | 'gallop'
  action: THREE.AnimationAction | null
}

const loader = new GLTFLoader()
const cache = new Map<
  string,
  { scene: THREE.Group; clips: THREE.AnimationClip[] }
>()

function pickClip(
  clips: THREE.AnimationClip[],
  prefs: string[],
): THREE.AnimationClip | null {
  for (const pref of prefs) {
    const hit = clips.find((c) => c.name.toLowerCase() === pref.toLowerCase())
    if (hit) return hit
  }
  for (const pref of prefs) {
    const hit = clips.find((c) =>
      c.name.toLowerCase().includes(pref.toLowerCase()),
    )
    if (hit) return hit
  }
  return clips[0] ?? null
}

function plantAndCel(root: THREE.Object3D, scale: number): THREE.Group {
  const wrap = new THREE.Group()
  wrap.name = 'rpg-mount'
  wrap.add(root)
  wrap.scale.setScalar(scale)
  wrap.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(wrap)
  wrap.position.x -= (box.min.x + box.max.x) * 0.5
  wrap.position.z -= (box.min.z + box.max.z) * 0.5
  wrap.position.y -= box.min.y
  wrap.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    m.castShadow = false
    m.receiveShadow = false
    m.material = harborGlbMaterialToLambertCel(m.material)
  })
  return wrap
}

export async function loadHarborRpgMount(
  id: HarborRpgMountId,
): Promise<HarborRpgMountInstance | null> {
  const def = HARBOR_RPG_MOUNT_DEFS[id]
  let hit = cache.get(def.src)
  if (!hit) {
    try {
      const gltf = await loader.loadAsync(def.src)
      const scene = gltf.scene.clone(true)
      hit = { scene, clips: gltf.animations.slice() }
      cache.set(def.src, hit)
    } catch {
      return null
    }
  }
  const root = plantAndCel(hit.scene.clone(true), def.scale)
  root.userData.rpgMountId = id
  const mixer = new THREE.AnimationMixer(root)
  const inst: HarborRpgMountInstance = {
    id,
    root,
    mixer,
    clips: hit.clips,
    def,
    mode: 'idle',
    action: null,
  }
  playHarborRpgMountAnim(inst, 'idle')
  return inst
}

export function playHarborRpgMountAnim(
  inst: HarborRpgMountInstance,
  mode: 'idle' | 'walk' | 'gallop',
): void {
  if (inst.mode === mode && inst.action) return
  const prefs =
    mode === 'gallop'
      ? inst.def.clips.gallop
      : mode === 'walk'
        ? inst.def.clips.walk
        : inst.def.clips.idle
  const clip = pickClip(inst.clips, prefs)
  if (!clip) return
  const next = inst.mixer.clipAction(clip)
  next.reset()
  next.setLoop(THREE.LoopRepeat, Infinity)
  next.clampWhenFinished = false
  next.enabled = true
  if (inst.action && inst.action !== next) {
    inst.action.crossFadeTo(next, 0.2, false)
  }
  next.play()
  inst.action = next
  inst.mode = mode
}

export function tickHarborRpgMount(
  inst: HarborRpgMountInstance,
  dt: number,
  moving: boolean,
  sprint: boolean,
): void {
  if (moving) playHarborRpgMountAnim(inst, sprint ? 'gallop' : 'walk')
  else playHarborRpgMountAnim(inst, 'idle')
  inst.mixer.update(dt)
}

export function disposeHarborRpgMount(inst: HarborRpgMountInstance): void {
  inst.mixer.stopAllAction()
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
