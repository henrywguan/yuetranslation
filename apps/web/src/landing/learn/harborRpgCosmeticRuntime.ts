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

/**
 * How much of the bind-pose cross-section to keep.
 * The universal base body is bulkier than the modular shells, so untouched
 * skin draws in front of the tunic, sleeves, and shoes.
 */
const BODY_SKIN_TUCK: Record<'male' | 'female', Array<[RegExp, number]>> = {
  male: [
    [/^(Head|neck_01|hand_|index_|middle_|ring_|pinky_|thumb_)/, 1],
    [/^spine_03/, 0.73],
    [/^spine_02/, 0.81],
    [/^lowerarm_/, 0.71],
    [/^upperarm_/, 0.77],
    [/^foot_|^ball_/, 0.88],
    [/^thigh_|^calf_|^spine_01|^pelvis|^clavicle_|^root$/, 0.96],
  ],
  female: [
    [/^(Head|neck_01|hand_|index_|middle_|ring_|pinky_|thumb_)/, 1],
    [/^upperarm_/, 0.83],
    [/^calf_/, 0.8],
    [/^thigh_/, 0.91],
    [/^spine_|^pelvis|^clavicle_|^foot_|^ball_|^lowerarm_|^root$/, 0.94],
  ],
}

function bodySkinKeep(gender: 'male' | 'female', boneName: string): number {
  for (const [re, keep] of BODY_SKIN_TUCK[gender]) {
    if (re.test(boneName)) return keep
  }
  return 0.94
}

const tuckHead = new THREE.Vector3()
const tuckTail = new THREE.Vector3()
const tuckAxis = new THREE.Vector3()
const tuckVert = new THREE.Vector3()
const tuckPoint = new THREE.Vector3()

/** Slim covered skin toward each bone so modular clothes sit outside the body. */
export function tuckHarborBodySkin(root: THREE.Object3D, gender: 'male' | 'female'): void {
  root.updateMatrixWorld(true)
  root.traverse((o) => {
    const mesh = o as THREE.SkinnedMesh
    if (!mesh.isSkinnedMesh) return
    if (/Eye|Brow|Face/i.test(mesh.name)) return
    const geo = mesh.geometry.clone()
    mesh.geometry = geo
    const pos = geo.attributes.position
    const skinIndex = geo.attributes.skinIndex
    const skinWeight = geo.attributes.skinWeight
    if (!pos || !skinIndex || !skinWeight) return
    mesh.skeleton.update()
    const bones = mesh.skeleton.bones
    for (let i = 0; i < pos.count; i++) {
      tuckVert.fromBufferAttribute(pos, i)
      let best = 0
      let boneIndex = 0
      for (let k = 0; k < 4; k++) {
        const weight = skinWeight.getComponent(i, k)
        if (weight > best) {
          best = weight
          boneIndex = skinIndex.getComponent(i, k)
        }
      }
      const bone = bones[boneIndex]
      const keep = bodySkinKeep(gender, bone?.name ?? '')
      if (!bone || keep >= 0.999) continue
      tuckHead.set(0, 0, 0)
      bone.localToWorld(tuckHead)
      mesh.worldToLocal(tuckHead)
      const child = bone.children.find((c) => (c as THREE.Bone).isBone)
      if (child) {
        tuckTail.set(0, 0, 0)
        child.localToWorld(tuckTail)
        mesh.worldToLocal(tuckTail)
      } else {
        tuckTail.copy(tuckHead)
        tuckTail.y += 0.05
      }
      tuckAxis.subVectors(tuckTail, tuckHead)
      const len2 = tuckAxis.lengthSq()
      if (len2 < 1e-8) continue
      const along = THREE.MathUtils.clamp(tuckPoint.copy(tuckVert).sub(tuckHead).dot(tuckAxis) / len2, 0, 1)
      tuckPoint.copy(tuckHead).addScaledVector(tuckAxis, along)
      tuckVert.lerp(tuckPoint, 1 - keep)
      pos.setXYZ(i, tuckVert.x, tuckVert.y, tuckVert.z)
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()
  })
}

function plantAndCel(
  root: THREE.Object3D,
  scale: number,
  name: string,
  bindWithBody = false,
): THREE.Group {
  const wrap = new THREE.Group()
  wrap.name = name
  wrap.add(root)
  wrap.scale.setScalar(scale)
  wrap.updateMatrixWorld(true)
  // Modular hair and clothes stay on the authored origin so they share one skeleton.
  // Other meshes center XZ; full outfits also drop to the feet.
  if (!bindWithBody) {
    const box = new THREE.Box3().setFromObject(wrap)
    wrap.position.x -= (box.min.x + box.max.x) * 0.5
    wrap.position.z -= (box.min.z + box.max.z) * 0.5
    if (name === 'rpg-cosmetic-outfit') {
      wrap.position.y -= box.min.y
    }
  }
  wrap.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    m.castShadow = false
    m.receiveShadow = false
    m.material = harborGlbMaterialToLambertCel(m.material)
    if (name === 'rpg-cosmetic-attach') {
      m.renderOrder = 2
      const mats = Array.isArray(m.material) ? m.material : [m.material]
      for (const mat of mats) {
        mat.polygonOffset = true
        mat.polygonOffsetFactor = -2
        mat.polygonOffsetUnits = -2
      }
    }
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
  const root = plantAndCel(cloned, def.scale, name, def.bindWithBody === true)
  if (id === 'rpg-base-m' || id === 'rpg-base-f') tuckHarborBodySkin(root, id === 'rpg-base-f' ? 'female' : 'male')
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
