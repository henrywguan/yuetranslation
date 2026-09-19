/**
 * Harbor Quest · protagonist locomotion (standard MMO walk / idle / sit).
 * Procedural limb swings when dress-up is visible; anime Scout GLB gets
 * grounded sway / bob (single-mesh, no skin clips yet).
 * Clip names reserved for future CC0 KayKit retarget.
 */
import * as THREE from 'three'

/** Clip vocabulary aligned with KayKit Character Animations naming. */
export const HARBOR_PROTAGONIST_CLIPS = {
  idle: 'Idle',
  walk: 'Walking_A',
  sit: 'Sitting_Idle',
} as const

export type HarborProtagonistAnimMode = 'idle' | 'walk' | 'sit'

export type HarborProtagonistAnimState = {
  mode: HarborProtagonistAnimMode
  /** Phase in seconds. */
  t: number
}

/** Walk cycle angular speed — ~1.15 strides/sec, MMO jog feel (not frantic hop). */
export const HARBOR_WALK_CADENCE = 7.2

const LIMB_NAMES = ['hips', 'thigh_l', 'thigh_r', 'shin_l', 'shin_r', 'arm_l', 'arm_r', 'spine'] as const

/**
 * Ensure a standing Scout has a limb hierarchy for procedural / future clip anim.
 * Idempotent — safe to call every applyLook.
 */
export function ensureHarborProtagonistLimbs(root: THREE.Object3D): void {
  if (root.userData.harborLimbsReady) return
  const hips = new THREE.Object3D()
  hips.name = 'hips'
  hips.position.y = typeof root.userData.pelvisY === 'number' ? root.userData.pelvisY : 0.48
  // Marker empties — meshes stay parented to root for v1 wardrobe; rotations proxy feel.
  for (const n of LIMB_NAMES) {
    if (n === 'hips') continue
    const bone = new THREE.Object3D()
    bone.name = n
    if (n.startsWith('thigh')) bone.position.set(n.endsWith('_l') ? -0.1 : 0.1, -0.2, 0)
    else if (n.startsWith('shin')) bone.position.set(n.endsWith('_l') ? -0.1 : 0.1, -0.4, 0)
    else if (n.startsWith('arm')) bone.position.set(n.endsWith('_l') ? -0.24 : 0.24, 0.28, 0)
    else if (n === 'spine') bone.position.set(0, 0.22, 0)
    hips.add(bone)
  }
  root.add(hips)
  root.userData.harborLimbsReady = true
}

function findNamed(root: THREE.Object3D, name: string): THREE.Object3D | null {
  let found: THREE.Object3D | null = null
  root.traverse((o) => {
    if (o.name === name) found = o
  })
  return found
}

function dampRotX(o: THREE.Object3D | null, dt: number, rate = 8): void {
  if (!o) return
  o.rotation.x *= Math.max(0, 1 - dt * rate)
}

/** Capture plant pose once so walk/idle bob never drifts the canoe sink. */
function ensureScoutGlbAnimBase(glb: THREE.Object3D): void {
  if (glb.userData.scoutGlbAnimBaseReady) return
  glb.userData.scoutGlbAnimBaseY = glb.position.y
  glb.userData.scoutGlbAnimBaseRotX = glb.rotation.x
  glb.userData.scoutGlbAnimBaseRotZ = glb.rotation.z
  glb.userData.scoutGlbAnimBaseReady = true
}

/**
 * Single-mesh anime Scout: stride sway + light bob without leaving the ground.
 * Root stay planted; only the `scout-glb` child moves.
 */
function tickScoutGlbLocomotion(
  root: THREE.Object3D,
  mode: HarborProtagonistAnimMode,
  t: number,
  dt: number,
  amp: number,
): void {
  const glb = findNamed(root, 'scout-glb')
  if (!glb || !glb.visible) return
  ensureScoutGlbAnimBase(glb)
  const baseY = typeof glb.userData.scoutGlbAnimBaseY === 'number' ? glb.userData.scoutGlbAnimBaseY : 0
  const baseRX =
    typeof glb.userData.scoutGlbAnimBaseRotX === 'number' ? glb.userData.scoutGlbAnimBaseRotX : 0
  const baseRZ =
    typeof glb.userData.scoutGlbAnimBaseRotZ === 'number' ? glb.userData.scoutGlbAnimBaseRotZ : 0

  if (mode === 'walk') {
    const phase = t * HARBOR_WALK_CADENCE
    const sway = Math.sin(phase) * 0.07 * amp
    const lean = Math.sin(phase * 2) * 0.035 * amp
    // Soft stride bob (no Math.abs hip hop — feet stay grounded).
    const bob = (1 - Math.cos(phase * 2)) * 0.014 * amp
    glb.rotation.z = baseRZ + sway
    glb.rotation.x = baseRX + lean
    glb.position.y = baseY + bob
  } else if (mode === 'idle') {
    const breath = Math.sin(t * 2.0) * 0.012 * amp
    glb.position.y = baseY + breath
    glb.rotation.x = baseRX + breath * 0.4
    glb.rotation.z = baseRZ + (glb.rotation.z - baseRZ) * Math.max(0, 1 - dt * 8)
  } else {
    // sit — settle toward plant pose
    const ease = Math.max(0, 1 - dt * 6)
    glb.position.y = baseY + (glb.position.y - baseY) * ease
    glb.rotation.x = baseRX + (glb.rotation.x - baseRX) * ease
    glb.rotation.z = baseRZ + (glb.rotation.z - baseRZ) * ease
  }
}

/**
 * Tick idle / walk / sit on a standing Scout.
 * Walk: alternating leg + arm counter-swing with **feet planted** (no root / hip hop).
 * When the anime Scout GLB is showing, also sway/bob that mesh.
 */
export function tickHarborProtagonistAnim(
  root: THREE.Object3D,
  state: HarborProtagonistAnimState,
  dt: number,
  opts: { reduced?: boolean } = {},
): HarborProtagonistAnimState {
  ensureHarborProtagonistLimbs(root)
  const reduced = Boolean(opts.reduced)
  const next = { ...state, t: state.t + dt }
  const amp = reduced ? 0.12 : 1

  const thighL = findNamed(root, 'thigh_l')
  const thighR = findNamed(root, 'thigh_r')
  const armL = findNamed(root, 'arm_l')
  const armR = findNamed(root, 'arm_r')
  const spine = findNamed(root, 'spine')
  const hips = findNamed(root, 'hips')
  const legL = findNamed(root, 'hq-leg-l')
  const legR = findNamed(root, 'hq-leg-r')
  const meshArmL = findNamed(root, 'hq-arm-l')
  const meshArmR = findNamed(root, 'hq-arm-r')

  // Keep hips locked to pelvis — never bounce the root for “walk feel”.
  if (hips) {
    hips.position.y = typeof root.userData.pelvisY === 'number' ? root.userData.pelvisY : 0.48
  }

  tickScoutGlbLocomotion(root, state.mode, next.t, dt, amp)

  if (state.mode === 'walk') {
    const swing = Math.sin(next.t * HARBOR_WALK_CADENCE) * 0.38 * amp
    if (thighL) thighL.rotation.x = swing
    if (thighR) thighR.rotation.x = -swing
    if (armL) armL.rotation.x = -swing * 0.65
    if (armR) armR.rotation.x = swing * 0.65
    if (spine) spine.rotation.y = Math.sin(next.t * HARBOR_WALK_CADENCE) * 0.03 * amp

    // Prefer whole-limb groups (anime kit) over per-mesh pivots that look like hopping.
    if (legL) legL.rotation.x = swing * 0.55
    if (legR) legR.rotation.x = -swing * 0.55
    if (meshArmL) meshArmL.rotation.x = -swing * 0.4
    if (meshArmR) meshArmR.rotation.x = swing * 0.4

    // Fallback when groups are missing (older NPCs): gentle limb empties only — no shoe mesh twist.
  } else if (state.mode === 'idle') {
    const breath = Math.sin(next.t * 2.0) * 0.015 * amp
    if (spine) spine.position.y = 0.22 + breath
    if (armL) armL.rotation.z = 0.04 + breath
    if (armR) armR.rotation.z = -0.04 - breath
    dampRotX(thighL, dt)
    dampRotX(thighR, dt)
    dampRotX(armL, dt)
    dampRotX(armR, dt)
    dampRotX(legL, dt)
    dampRotX(legR, dt)
    dampRotX(meshArmL, dt)
    dampRotX(meshArmR, dt)
    if (spine) spine.rotation.y *= Math.max(0, 1 - dt * 8)
  } else {
    // sit — limbs settle
    for (const n of ['thigh_l', 'thigh_r', 'arm_l', 'arm_r'] as const) {
      const b = findNamed(root, n)
      if (b) {
        b.rotation.x *= Math.max(0, 1 - dt * 6)
        b.rotation.z *= Math.max(0, 1 - dt * 6)
      }
    }
    dampRotX(legL, dt, 6)
    dampRotX(legR, dt, 6)
    dampRotX(meshArmL, dt, 6)
    dampRotX(meshArmR, dt, 6)
  }

  return next
}

export function harborProtagonistClipName(mode: HarborProtagonistAnimMode): string {
  return HARBOR_PROTAGONIST_CLIPS[mode === 'walk' ? 'walk' : mode === 'sit' ? 'sit' : 'idle']
}
