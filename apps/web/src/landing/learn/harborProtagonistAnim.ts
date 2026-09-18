/**
 * Harbor Quest · v4 protagonist locomotion (KayKit-style clip vocabulary).
 * Procedural limb swings now; clip names reserved for future CC0 KayKit retarget.
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

/**
 * Tick idle / walk / sit on a standing Scout.
 * Walk: alternating thigh + arm counter-swing (replaces world-only Y bob as the primary read).
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
  const amp = reduced ? 0.15 : 1

  const thighL = findNamed(root, 'thigh_l')
  const thighR = findNamed(root, 'thigh_r')
  const armL = findNamed(root, 'arm_l')
  const armR = findNamed(root, 'arm_r')
  const spine = findNamed(root, 'spine')
  const hips = findNamed(root, 'hips')

  if (state.mode === 'walk') {
    const swing = Math.sin(next.t * 9) * 0.45 * amp
    if (thighL) thighL.rotation.x = swing
    if (thighR) thighR.rotation.x = -swing
    if (armL) armL.rotation.x = -swing * 0.7
    if (armR) armR.rotation.x = swing * 0.7
    if (spine) spine.rotation.y = Math.sin(next.t * 9) * 0.04 * amp
    // Soft mesh bob for legs that aren't reparented yet
    root.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh || !mesh.userData.harborPart) return
      if (mesh.userData.harborPart === 'bottom' || mesh.userData.harborPart === 'shoes') {
        const side = mesh.position.x < 0 ? -1 : 1
        mesh.rotation.x = side * swing * 0.35
      }
      if (mesh.userData.harborPart === 'top' && Math.abs(mesh.position.x) > 0.15) {
        const side = mesh.position.x < 0 ? -1 : 1
        mesh.rotation.x = -side * swing * 0.25
      }
    })
    if (hips) hips.position.y = (typeof root.userData.pelvisY === 'number' ? root.userData.pelvisY : 0.48) + Math.abs(Math.sin(next.t * 9)) * 0.02 * amp
  } else if (state.mode === 'idle') {
    const breath = Math.sin(next.t * 2.2) * 0.02 * amp
    if (spine) spine.position.y = 0.22 + breath
    if (armL) armL.rotation.z = 0.04 + breath
    if (armR) armR.rotation.z = -0.04 - breath
    root.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      if (mesh.userData.harborPart === 'bottom' || mesh.userData.harborPart === 'shoes') {
        mesh.rotation.x *= Math.max(0, 1 - dt * 8)
      }
      if (mesh.userData.harborPart === 'top' && Math.abs(mesh.position.x) > 0.15) {
        mesh.rotation.x *= Math.max(0, 1 - dt * 8)
      }
    })
    if (thighL) thighL.rotation.x *= Math.max(0, 1 - dt * 8)
    if (thighR) thighR.rotation.x *= Math.max(0, 1 - dt * 8)
  } else {
    // sit — limbs settle
    for (const n of ['thigh_l', 'thigh_r', 'arm_l', 'arm_r'] as const) {
      const b = findNamed(root, n)
      if (b) {
        b.rotation.x *= Math.max(0, 1 - dt * 6)
        b.rotation.z *= Math.max(0, 1 - dt * 6)
      }
    }
  }

  return next
}

export function harborProtagonistClipName(mode: HarborProtagonistAnimMode): string {
  return HARBOR_PROTAGONIST_CLIPS[mode === 'walk' ? 'walk' : mode === 'sit' ? 'sit' : 'idle']
}
