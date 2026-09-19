/**
 * Harbor Quest · auto-rig the baked Scout GLB (Meshy, no skins).
 * Distance-to-bone heat weights → SkinnedMesh so walk / idle / fish
 * can rotate a real armature instead of T-pose + root sway.
 */
import * as THREE from 'three'

export const SCOUT_BONE = {
  hips: 'scout-bone-hips',
  spine: 'scout-bone-spine',
  chest: 'scout-bone-chest',
  head: 'scout-bone-head',
  upperArmL: 'scout-bone-upper-arm-l',
  lowerArmL: 'scout-bone-lower-arm-l',
  handL: 'scout-bone-hand-l',
  upperArmR: 'scout-bone-upper-arm-r',
  lowerArmR: 'scout-bone-lower-arm-r',
  handR: 'scout-bone-hand-r',
  thighL: 'scout-bone-thigh-l',
  shinL: 'scout-bone-shin-l',
  footL: 'scout-bone-foot-l',
  thighR: 'scout-bone-thigh-r',
  shinR: 'scout-bone-shin-r',
  footR: 'scout-bone-foot-r',
} as const

export type ScoutBoneId = (typeof SCOUT_BONE)[keyof typeof SCOUT_BONE]

type BoneDef = {
  name: ScoutBoneId
  parent: ScoutBoneId | null
  /** Mesh-local bind position. */
  p: THREE.Vector3
}

function findMesh(root: THREE.Object3D): THREE.Mesh | null {
  let found: THREE.Mesh | null = null
  root.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh && m.userData.scoutGlbMesh && !found) found = m
  })
  return found
}

export function findScoutBone(root: THREE.Object3D, name: ScoutBoneId): THREE.Bone | null {
  let found: THREE.Bone | null = null
  root.traverse((o) => {
    if (o.name === name && (o as THREE.Bone).isBone) found = o as THREE.Bone
  })
  return found
}

export function isHarborScoutRigged(root: THREE.Object3D): boolean {
  return Boolean(root.userData.scoutRigged)
}

function distToSegment(p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3): number {
  const ab = b.clone().sub(a)
  const len = ab.length()
  if (len < 1e-5) return p.distanceTo(a)
  const t = THREE.MathUtils.clamp(p.clone().sub(a).dot(ab) / (len * len), 0, 1)
  return p.distanceTo(a.clone().add(ab.multiplyScalar(t)))
}

function layoutBones(min: THREE.Vector3, size: THREE.Vector3): BoneDef[] {
  const H = size.y
  const W = Math.max(size.x, 0.2)
  const feet = min.y
  const xL = -W * 0.11
  const xR = W * 0.11
  const shY = feet + H * 0.78
  const shX = W * 0.22
  const elY = feet + H * 0.76
  const wrY = feet + H * 0.74
  const wrX = W * 0.46
  return [
    { name: SCOUT_BONE.hips, parent: null, p: new THREE.Vector3(0, feet + H * 0.5, 0) },
    { name: SCOUT_BONE.spine, parent: SCOUT_BONE.hips, p: new THREE.Vector3(0, feet + H * 0.62, 0) },
    { name: SCOUT_BONE.chest, parent: SCOUT_BONE.spine, p: new THREE.Vector3(0, feet + H * 0.72, 0) },
    { name: SCOUT_BONE.head, parent: SCOUT_BONE.chest, p: new THREE.Vector3(0, feet + H * 0.9, 0) },
    { name: SCOUT_BONE.upperArmL, parent: SCOUT_BONE.chest, p: new THREE.Vector3(-shX, shY, 0) },
    { name: SCOUT_BONE.lowerArmL, parent: SCOUT_BONE.upperArmL, p: new THREE.Vector3(-W * 0.34, elY, 0) },
    { name: SCOUT_BONE.handL, parent: SCOUT_BONE.lowerArmL, p: new THREE.Vector3(-wrX, wrY, 0) },
    { name: SCOUT_BONE.upperArmR, parent: SCOUT_BONE.chest, p: new THREE.Vector3(shX, shY, 0) },
    { name: SCOUT_BONE.lowerArmR, parent: SCOUT_BONE.upperArmR, p: new THREE.Vector3(W * 0.34, elY, 0) },
    { name: SCOUT_BONE.handR, parent: SCOUT_BONE.lowerArmR, p: new THREE.Vector3(wrX, wrY, 0) },
    { name: SCOUT_BONE.thighL, parent: SCOUT_BONE.hips, p: new THREE.Vector3(xL, feet + H * 0.48, 0) },
    { name: SCOUT_BONE.shinL, parent: SCOUT_BONE.thighL, p: new THREE.Vector3(xL, feet + H * 0.25, 0) },
    { name: SCOUT_BONE.footL, parent: SCOUT_BONE.shinL, p: new THREE.Vector3(xL, feet + H * 0.03, 0.04) },
    { name: SCOUT_BONE.thighR, parent: SCOUT_BONE.hips, p: new THREE.Vector3(xR, feet + H * 0.48, 0) },
    { name: SCOUT_BONE.shinR, parent: SCOUT_BONE.thighR, p: new THREE.Vector3(xR, feet + H * 0.25, 0) },
    { name: SCOUT_BONE.footR, parent: SCOUT_BONE.shinR, p: new THREE.Vector3(xR, feet + H * 0.03, 0.04) },
  ]
}

/**
 * Replace the Scout's static Mesh with a SkinnedMesh + humanoid armature.
 * Idempotent. Returns false when the mesh is missing / already skinned.
 */
export function rigHarborScoutGlb(wrap: THREE.Group): boolean {
  if (wrap.userData.scoutRigged) return true
  const mesh = findMesh(wrap)
  if (!mesh || (mesh as THREE.SkinnedMesh).isSkinnedMesh) {
    if ((mesh as THREE.SkinnedMesh | null)?.isSkinnedMesh) {
      wrap.userData.scoutRigged = true
      return true
    }
    return false
  }
  const geo = mesh.geometry
  if (!geo.getAttribute('position')) return false
  geo.computeBoundingBox()
  const bb = geo.boundingBox
  if (!bb || bb.isEmpty()) return false
  const size = new THREE.Vector3()
  bb.getSize(size)
  if (!(size.y > 0.2)) return false

  const defs = layoutBones(bb.min, size)
  const bones: THREE.Bone[] = []
  const byName = new Map<string, THREE.Bone>()
  for (const d of defs) {
    const b = new THREE.Bone()
    b.name = d.name
    byName.set(d.name, b)
    bones.push(b)
  }
  for (const d of defs) {
    const b = byName.get(d.name)!
    if (d.parent) {
      const p = byName.get(d.parent)!
      p.add(b)
      const parentDef = defs.find((x) => x.name === d.parent)!
      b.position.copy(d.p).sub(parentDef.p)
    } else {
      b.position.copy(d.p)
    }
  }

  const rootBone = byName.get(SCOUT_BONE.hips)!
  const skeleton = new THREE.Skeleton(bones)

  const pos = geo.getAttribute('position')
  const n = pos.count
  const skinIndex = new THREE.BufferAttribute(new Uint16Array(n * 4), 4)
  const skinWeight = new THREE.BufferAttribute(new Float32Array(n * 4), 4)
  const sigma = size.y * 0.09
  const inv2s = 1 / (2 * sigma * sigma)
  const v = new THREE.Vector3()
  const segs: { i: number; a: THREE.Vector3; b: THREE.Vector3 }[] = []
  const hipsDef = defs[0]!
  segs.push({
    i: 0,
    a: new THREE.Vector3(0, bb.min.y + size.y * 0.42, 0),
    b: hipsDef.p,
  })
  for (const d of defs) {
    if (!d.parent) continue
    const parent = defs.find((x) => x.name === d.parent)!
    segs.push({ i: defs.indexOf(d), a: parent.p, b: d.p })
  }

  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(pos, i)
    const scored: { i: number; w: number }[] = []
    for (const s of segs) {
      const dist = distToSegment(v, s.a, s.b)
      scored.push({ i: s.i, w: Math.exp(-dist * dist * inv2s) })
    }
    scored.sort((a, b) => b.w - a.w)
    let sum = 0
    for (let k = 0; k < 4; k++) sum += scored[k]?.w ?? 0
    if (sum < 1e-8) {
      skinIndex.setXYZW(i, 0, 0, 0, 0)
      skinWeight.setXYZW(i, 1, 0, 0, 0)
      continue
    }
    skinIndex.setXYZW(
      i,
      scored[0]?.i ?? 0,
      scored[1]?.i ?? 0,
      scored[2]?.i ?? 0,
      scored[3]?.i ?? 0,
    )
    skinWeight.setXYZW(
      i,
      (scored[0]?.w ?? 0) / sum,
      (scored[1]?.w ?? 0) / sum,
      (scored[2]?.w ?? 0) / sum,
      (scored[3]?.w ?? 0) / sum,
    )
  }
  geo.setAttribute('skinIndex', skinIndex)
  geo.setAttribute('skinWeight', skinWeight)

  const skinned = new THREE.SkinnedMesh(geo, mesh.material)
  skinned.name = mesh.name
  skinned.userData = { ...mesh.userData, scoutGlbMesh: true }
  skinned.castShadow = mesh.castShadow
  skinned.receiveShadow = mesh.receiveShadow
  skinned.frustumCulled = false
  skinned.position.copy(mesh.position)
  skinned.rotation.copy(mesh.rotation)
  skinned.scale.copy(mesh.scale)
  skinned.add(rootBone)
  skinned.updateMatrixWorld(true)
  skinned.bind(skeleton)

  const parent = mesh.parent
  parent?.add(skinned)
  mesh.removeFromParent()
  wrap.userData.scoutRigged = true
  wrap.userData.scoutSkeleton = skeleton
  return true
}

export type ScoutLocomotionMode = 'idle' | 'walk' | 'sit'

/** Drive the auto-rig: MMO walk / idle breath. Returns true when bones moved. */
export function tickScoutSkeletonLocomotion(
  root: THREE.Object3D,
  mode: ScoutLocomotionMode,
  t: number,
  dt: number,
  amp: number,
  cadence: number,
): boolean {
  const thighL = findScoutBone(root, SCOUT_BONE.thighL)
  const thighR = findScoutBone(root, SCOUT_BONE.thighR)
  const shinL = findScoutBone(root, SCOUT_BONE.shinL)
  const shinR = findScoutBone(root, SCOUT_BONE.shinR)
  const armL = findScoutBone(root, SCOUT_BONE.upperArmL)
  const armR = findScoutBone(root, SCOUT_BONE.upperArmR)
  const lowL = findScoutBone(root, SCOUT_BONE.lowerArmL)
  const lowR = findScoutBone(root, SCOUT_BONE.lowerArmR)
  const spine = findScoutBone(root, SCOUT_BONE.spine)
  const hips = findScoutBone(root, SCOUT_BONE.hips)
  if (!thighL || !thighR || !armL || !armR) return false

  const damp = (o: THREE.Bone | null, rate = 8) => {
    if (!o) return
    o.rotation.x *= Math.max(0, 1 - dt * rate)
    o.rotation.z *= Math.max(0, 1 - dt * rate)
    o.rotation.y *= Math.max(0, 1 - dt * rate)
  }

  if (mode === 'walk') {
    const phase = t * cadence
    const swing = Math.sin(phase) * 0.72 * amp
    const knee = Math.max(0, Math.sin(phase)) * 0.58 * amp
    const kneeR = Math.max(0, Math.sin(phase + Math.PI)) * 0.58 * amp
    thighL.rotation.x = swing
    thighR.rotation.x = -swing
    if (shinL) shinL.rotation.x = knee
    if (shinR) shinR.rotation.x = kneeR
    // T-pose bind: drop arms toward the body, then swing opposite the legs.
    armL.rotation.z = 0.42 * amp
    armR.rotation.z = -0.42 * amp
    armL.rotation.y = -swing * 0.85
    armR.rotation.y = -swing * 0.85
    armL.rotation.x = 0
    armR.rotation.x = 0
    if (lowL) lowL.rotation.set(0, swing * 0.22, 0.18 * amp)
    if (lowR) lowR.rotation.set(0, swing * 0.22, -0.18 * amp)
    if (spine) {
      spine.rotation.y = Math.sin(phase) * 0.1 * amp
      spine.rotation.x = Math.sin(phase * 2) * 0.04 * amp
    }
    if (hips) hips.rotation.y = Math.sin(phase) * 0.07 * amp
  } else if (mode === 'idle') {
    const breath = Math.sin(t * 2.0) * 0.03 * amp
    if (spine) spine.rotation.set(breath, 0, 0)
    armL.rotation.set(0, 0, 0.28 * amp + breath)
    armR.rotation.set(0, 0, -0.28 * amp - breath)
    if (lowL) lowL.rotation.set(0, 0, 0.1 * amp)
    if (lowR) lowR.rotation.set(0, 0, -0.1 * amp)
    damp(thighL)
    damp(thighR)
    damp(shinL)
    damp(shinR)
  } else {
    // sit — fold thighs so the canoe plant is not a standing T-pose
    thighL.rotation.x = 1.15 * amp
    thighR.rotation.x = 1.15 * amp
    if (shinL) shinL.rotation.x = 0.35 * amp
    if (shinR) shinR.rotation.x = 0.35 * amp
    armL.rotation.set(0.15 * amp, 0, 0.35 * amp)
    armR.rotation.set(0.15 * amp, 0, -0.35 * amp)
    if (lowL) lowL.rotation.set(0, 0, 0.2 * amp)
    if (lowR) lowR.rotation.set(0, 0, -0.2 * amp)
    if (spine) spine.rotation.set(0.12 * amp, 0, 0)
    if (hips) hips.rotation.set(0.08 * amp, 0, 0)
  }
  return true
}

export type ScoutFishPhase = 'idle' | 'cast' | 'wait' | 'catch' | 'miss'

/** Cast / wait / reel poses on the auto-rig. Returns true when bones exist. */
export function tickScoutSkeletonFish(
  root: THREE.Object3D,
  phase: ScoutFishPhase,
  t: number,
  amp: number,
): boolean {
  const armR = findScoutBone(root, SCOUT_BONE.upperArmR)
  const lowR = findScoutBone(root, SCOUT_BONE.lowerArmR)
  const armL = findScoutBone(root, SCOUT_BONE.upperArmL)
  const spine = findScoutBone(root, SCOUT_BONE.spine)
  const hips = findScoutBone(root, SCOUT_BONE.hips)
  if (!armR) return false

  const easeOut = (u: number) => 1 - (1 - Math.min(1, Math.max(0, u))) ** 3
  const easeInOut = (u: number) => {
    const x = Math.min(1, Math.max(0, u))
    return x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2
  }

  if (phase === 'idle') {
    armR.rotation.set(0, 0, -0.28 * amp)
    if (lowR) lowR.rotation.set(0, 0, -0.08 * amp)
    if (armL) armL.rotation.set(0, 0, 0.28 * amp)
    if (spine) spine.rotation.set(0, 0, 0)
    if (hips) hips.rotation.set(0, 0, 0)
    return true
  }

  if (phase === 'cast') {
    const u = Math.min(1, t / 0.65)
    const wind = u < 0.35 ? easeInOut(u / 0.35) : 1
    const fling = u < 0.35 ? 0 : easeOut((u - 0.35) / 0.65)
    // Wind the rod back over the shoulder, then fling toward the water.
    armR.rotation.set(
      (-1.15 * wind + 1.55 * fling) * amp,
      (0.55 * wind - 0.95 * fling) * amp,
      (-0.55 + 0.12 * fling) * amp,
    )
    if (lowR) lowR.rotation.set(0, (0.55 * wind - 0.05 * fling) * amp, -0.2 * amp)
    if (armL) armL.rotation.set(0.28 * fling * amp, 0.2 * fling * amp, 0.32 * amp)
    if (spine) spine.rotation.set((0.18 * wind - 0.28 * fling) * amp, 0.12 * wind * amp, 0)
    if (hips) hips.rotation.set(0.04 * wind * amp, 0.08 * wind * amp, 0)
    return true
  }

  if (phase === 'wait') {
    const bob = Math.sin(t * 5.5) * 0.08 * amp
    const hold = Math.sin(t * 2.2) * 0.04 * amp
    armR.rotation.set((0.22 + bob) * amp, (-0.85 + hold) * amp, -0.55 * amp)
    if (lowR) lowR.rotation.set(0, (0.35 + bob) * amp, -0.15 * amp)
    if (armL) armL.rotation.set(0.18 * amp, 0.42 * amp, 0.38 * amp)
    if (spine) spine.rotation.set(0.16 * amp, 0.06 * amp, 0)
    if (hips) hips.rotation.set(0.04 * amp, 0, 0)
    return true
  }

  if (phase === 'catch') {
    const u = Math.min(1, t / 1.1)
    const lift = easeOut(u)
    const crank = Math.sin(t * 14) * 0.42 * amp
    // Reel: lift the rod and crank the right forearm.
    armR.rotation.set((-1.05 * lift + crank * 0.35) * amp, (-0.55 + 0.2 * lift) * amp, -0.28 * amp)
    if (lowR) lowR.rotation.set(crank * 0.25, (0.25 + 0.55 * lift + crank) * amp, -0.12 * amp)
    if (armL) armL.rotation.set((-0.65 * lift) * amp, 0.2 * amp, 0.28 * amp)
    if (spine) spine.rotation.set((-0.22 * lift) * amp, 0.08 * lift * amp, 0)
    if (hips) hips.rotation.set((-0.1 * lift) * amp, 0, 0)
    return true
  }

  // miss — rod drops, shoulders sag
  const u = Math.min(1, t / 0.7)
  const drop = easeInOut(u)
  armR.rotation.set(0.22 * (1 - drop) * amp, -0.85 * (1 - drop) * amp, (-0.55 + 0.2 * drop) * amp)
  if (lowR) lowR.rotation.set(0, 0.35 * (1 - drop) * amp, -0.1 * (1 - drop) * amp)
  if (armL) armL.rotation.set(0, 0.2 * (1 - drop) * amp, (0.38 - 0.1 * drop) * amp)
  if (spine) spine.rotation.set((0.16 - 0.22 * drop) * amp, 0, 0)
  if (hips) hips.rotation.set(0, 0, 0)
  return true
}
