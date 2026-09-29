/**
 * HarborRPG cosmetic runtime — Quaternius outfits / attaches.
 * Full outfits play UAL1 + UAL2 in place. Attaches stay on the bind pose.
 */
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { harborGlbMaterialToLambertCel } from './harborProtagonistGlb'
import {
  HARBOR_RPG_LOCO_CLIPS,
  HARBOR_RPG_UAL_SRCS,
  harborRpgAnimLoops,
  isHarborRpgAnimClip,
} from './harborRpgAnims'
import {
  HARBOR_RPG_COSMETIC_DEFS,
  type HarborRpgCosmeticDef,
  type HarborRpgCosmeticId,
} from './harborRpgCosmetics'

export type HarborRpgCosmeticMode = 'idle' | 'walk' | 'sprint' | 'perform'

export type HarborRpgCosmeticInstance = {
  id: HarborRpgCosmeticId
  root: THREE.Group
  def: HarborRpgCosmeticDef
  mixer: THREE.AnimationMixer | null
  clips: THREE.AnimationClip[]
  action: THREE.AnimationAction | null
  mode: HarborRpgCosmeticMode
  performClip: string | null
  performLoop: boolean
  performUntil: number
}

const loader = new GLTFLoader()
const cache = new Map<string, THREE.Group>()
let ualClips: THREE.AnimationClip[] | null = null
let ualPromise: Promise<THREE.AnimationClip[]> | null = null

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

function stripRootTracks(clip: THREE.AnimationClip): THREE.AnimationClip {
  const tracks = clip.tracks.filter((t) => !t.name.startsWith('root.'))
  return new THREE.AnimationClip(clip.name, clip.duration, tracks)
}

function pickClip(clips: THREE.AnimationClip[], prefs: readonly string[]): THREE.AnimationClip | null {
  for (const pref of prefs) {
    const hit = clips.find((c) => c.name === pref)
    if (hit) return hit
  }
  return null
}

async function loadScene(src: string): Promise<THREE.Group | null> {
  const cached = cache.get(src)
  if (cached) return cached
  try {
    const gltf = await loader.loadAsync(src)
    cache.set(src, gltf.scene)
    return gltf.scene
  } catch {
    return null
  }
}

/** Shared in-place UAL clips (root tracks dropped so the world plant stays put). */
export async function loadHarborRpgUalClips(): Promise<THREE.AnimationClip[]> {
  if (ualClips) return ualClips
  if (!ualPromise) {
    ualPromise = (async () => {
      const clips: THREE.AnimationClip[] = []
      for (const src of HARBOR_RPG_UAL_SRCS) {
        try {
          const gltf = await loader.loadAsync(src)
          for (const clip of gltf.animations) {
            const next = stripRootTracks(clip)
            if (next.tracks.length > 0) clips.push(next)
          }
        } catch {
          /* A missing library must not block the wardrobe mesh. */
        }
      }
      ualClips = clips
      return clips
    })()
  }
  return ualPromise
}

function playLoco(inst: HarborRpgCosmeticInstance, mode: 'idle' | 'walk' | 'sprint'): void {
  if (!inst.mixer) return
  if (inst.mode === mode && inst.action) return
  const prefs = HARBOR_RPG_LOCO_CLIPS[mode]
  const clip = pickClip(inst.clips, prefs)
  if (!clip) return
  const next = inst.mixer.clipAction(clip)
  next.reset()
  next.setLoop(THREE.LoopRepeat, Infinity)
  next.clampWhenFinished = false
  next.enabled = true
  if (inst.action && inst.action !== next) inst.action.crossFadeTo(next, 0.18, false)
  next.play()
  inst.action = next
  inst.mode = mode
  inst.performClip = null
  inst.performLoop = false
  inst.performUntil = 0
}

export async function loadHarborRpgCosmetic(
  id: HarborRpgCosmeticId,
): Promise<HarborRpgCosmeticInstance | null> {
  const def = HARBOR_RPG_COSMETIC_DEFS[id]
  if (!def.src) return null
  const skinned = def.kind === 'outfit' || def.kind === 'attach'
  const [scene, clips] = await Promise.all([
    loadScene(def.src),
    skinned ? loadHarborRpgUalClips() : Promise.resolve([] as THREE.AnimationClip[]),
  ])
  if (!scene) return null
  const name = def.kind === 'outfit' ? 'rpg-cosmetic-outfit' : 'rpg-cosmetic-attach'
  const cloned = skinned ? cloneSkinned(scene) : scene.clone(true)
  const root = plantAndCel(cloned, def.scale, name)
  root.userData.rpgCosmeticId = id
  root.userData.rpgCosmeticKind = def.kind
  const mixer = skinned && clips.length > 0 ? new THREE.AnimationMixer(root) : null
  const inst: HarborRpgCosmeticInstance = {
    id,
    root,
    def,
    mixer,
    clips,
    action: null,
    mode: 'idle',
    performClip: null,
    performLoop: false,
    performUntil: 0,
  }
  if (mixer) playLoco(inst, 'idle')
  return inst
}

/**
 * Play an allowlisted UAL clip on a full outfit.
 * Returns false when a one-shot is already locked (unless `force`, used for death).
 */
export function playHarborRpgCosmeticClip(
  inst: HarborRpgCosmeticInstance,
  clipName: string,
  loop = harborRpgAnimLoops(clipName),
  force = false,
): boolean {
  if (!inst.mixer || !isHarborRpgAnimClip(clipName)) return false
  if (inst.mode === 'perform' && inst.performClip === clipName && inst.action) return true
  if (
    inst.mode === 'perform' &&
    !inst.performLoop &&
    inst.performUntil > performance.now() &&
    !force
  ) {
    return false
  }
  const clip = pickClip(inst.clips, [clipName])
  if (!clip) return false
  const next = inst.mixer.clipAction(clip)
  next.reset()
  next.enabled = true
  if (loop) {
    next.setLoop(THREE.LoopRepeat, Infinity)
    next.clampWhenFinished = false
  } else {
    next.setLoop(THREE.LoopOnce, 1)
    next.clampWhenFinished = true
  }
  if (inst.action && inst.action !== next) inst.action.crossFadeTo(next, force ? 0.05 : 0.12, false)
  next.play()
  inst.action = next
  inst.mode = 'perform'
  inst.performClip = clipName
  inst.performLoop = loop
  inst.performUntil = loop ? Number.POSITIVE_INFINITY : performance.now() + clip.duration * 1000
  return true
}

export function cancelHarborRpgCosmeticPerform(inst: HarborRpgCosmeticInstance): void {
  if (inst.mode !== 'perform') return
  inst.performUntil = 0
  inst.performLoop = false
}

export function harborRpgCosmeticPerforming(inst: HarborRpgCosmeticInstance): boolean {
  return inst.mode === 'perform' && (inst.performLoop || inst.performUntil > performance.now())
}

export function tickHarborRpgCosmetic(
  inst: HarborRpgCosmeticInstance,
  dt: number,
  moving: boolean,
  sprint: boolean,
  holdClip?: string | null,
): void {
  if (!inst.mixer) return
  if (holdClip && isHarborRpgAnimClip(holdClip)) {
    playHarborRpgCosmeticClip(inst, holdClip, harborRpgAnimLoops(holdClip), true)
    inst.mixer.update(dt)
    return
  }
  if (inst.mode === 'perform') {
    const expired = !inst.performLoop && performance.now() >= inst.performUntil
    // Loops and the shrine death pose yield as soon as you walk.
    // Other one-shots (swing, greet) finish so locomotion cannot cut them.
    const walkOff = moving && (inst.performLoop || inst.performClip === 'Death01')
    if (walkOff || expired || inst.performUntil <= 0) {
      playLoco(inst, moving ? (sprint ? 'sprint' : 'walk') : 'idle')
    }
  } else if (moving) {
    playLoco(inst, sprint ? 'sprint' : 'walk')
  } else {
    playLoco(inst, 'idle')
  }
  inst.mixer.update(dt)
}

/** Keep a layered hood / pauldron on the same frame as the body. */
export function lockHarborRpgCosmeticTime(
  leader: HarborRpgCosmeticInstance,
  follower: HarborRpgCosmeticInstance,
): void {
  if (!leader.action || !follower.mixer) return
  const name = leader.action.getClip().name
  const loop = leader.mode !== 'perform' || leader.performLoop
  if (!follower.action || follower.action.getClip().name !== name) {
    playHarborRpgCosmeticClip(follower, name, loop, true)
  }
  if (follower.action) follower.action.time = leader.action.time
}

export function disposeHarborRpgCosmetic(inst: HarborRpgCosmeticInstance): void {
  inst.mixer?.stopAllAction()
  inst.root.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    // Geometry and maps stay with the cached GLB. Only the cel lambert is unique.
    const mat = m.material
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
    else mat?.dispose()
  })
}
