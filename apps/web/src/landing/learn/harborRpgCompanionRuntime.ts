/**
 * HarborRPG companion — Gobkit Free Minion (CC0), idle / attack clips.
 */
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { harborGlbMaterialToLambertCel } from './harborProtagonistGlb'

export const HARBOR_RPG_COMPANION_SRC = '/assets/harbor-quest/companions/gobkit/minion-a01.glb'

export type HarborRpgCompanionInstance = {
  root: THREE.Group
  mixer: THREE.AnimationMixer
  idle: THREE.AnimationClip | null
  attack: THREE.AnimationClip | null
  action: THREE.AnimationAction | null
  mode: 'idle' | 'attack'
}

const loader = new GLTFLoader()
let template: { scene: THREE.Group; clips: THREE.AnimationClip[] } | null = null
let loading: Promise<{ scene: THREE.Group; clips: THREE.AnimationClip[] } | null> | null = null

function plant(root: THREE.Object3D): THREE.Group {
  const wrap = new THREE.Group()
  wrap.name = 'rpg-companion'
  wrap.add(root)
  wrap.scale.setScalar(0.72)
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

async function loadTemplate() {
  if (template) return template
  if (!loading) {
    loading = loader
      .loadAsync(HARBOR_RPG_COMPANION_SRC)
      .then((gltf) => {
        template = { scene: gltf.scene, clips: gltf.animations.slice() }
        return template
      })
      .catch(() => null)
  }
  return loading
}

export async function loadHarborRpgCompanion(name: string): Promise<HarborRpgCompanionInstance | null> {
  const hit = await loadTemplate()
  if (!hit) return null
  const root = plant(cloneSkinned(hit.scene))
  root.userData.companionName = name
  const mixer = new THREE.AnimationMixer(root)
  const idle = hit.clips.find((c) => c.name.toLowerCase() === 'idle') ?? hit.clips[0] ?? null
  const attack = hit.clips.find((c) => c.name.toLowerCase() === 'attack') ?? null
  const inst: HarborRpgCompanionInstance = {
    root,
    mixer,
    idle,
    attack,
    action: null,
    mode: 'idle',
  }
  play(inst, 'idle')
  return inst
}

function play(inst: HarborRpgCompanionInstance, mode: 'idle' | 'attack') {
  const clip = mode === 'attack' && inst.attack ? inst.attack : inst.idle
  if (!clip) return
  if (inst.mode === mode && inst.action) return
  const next = inst.mixer.clipAction(clip)
  next.reset()
  next.enabled = true
  if (mode === 'attack') {
    next.setLoop(THREE.LoopOnce, 1)
    next.clampWhenFinished = true
  } else {
    next.setLoop(THREE.LoopRepeat, Infinity)
    next.clampWhenFinished = false
  }
  if (inst.action && inst.action !== next) inst.action.crossFadeTo(next, 0.12, false)
  next.play()
  inst.action = next
  inst.mode = mode
}

export function tickHarborRpgCompanion(
  inst: HarborRpgCompanionInstance,
  dt: number,
  attacking: boolean,
): void {
  play(inst, attacking && inst.attack ? 'attack' : 'idle')
  inst.mixer.update(dt)
}

export function disposeHarborRpgCompanion(inst: HarborRpgCompanionInstance): void {
  inst.mixer.stopAllAction()
  inst.root.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    const mat = m.material
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
    else mat?.dispose()
  })
}
