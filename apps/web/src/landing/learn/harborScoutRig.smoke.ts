/**
 * Offline smoke — auto-rig Scout GLB + walk / fish bone poses.
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as THREE from 'three'
import { tickHarborCastAnim, tickHarborProtagonistAnim } from './harborProtagonistAnim'
import {
  findScoutBone,
  rigHarborScoutGlb,
  SCOUT_BONE,
  tickScoutSkeletonFish,
  tickScoutSkeletonLocomotion,
} from './harborScoutRig'

function dummyScoutMesh(): THREE.Group {
  const wrap = new THREE.Group()
  wrap.name = 'scout-glb'
  wrap.userData.scoutGlb = true
  const geo = new THREE.BoxGeometry(0.55, 1.7, 0.28, 4, 10, 2)
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0x88aa99 }))
  mesh.userData.scoutGlbMesh = true
  wrap.add(mesh)
  return wrap
}

const wrap = dummyScoutMesh()
assert.equal(rigHarborScoutGlb(wrap), true, 'dummy Scout auto-rigs')
assert.equal(wrap.userData.scoutRigged, true, 'rig flag set')
assert.equal(rigHarborScoutGlb(wrap), true, 'rig is idempotent')

function findSkinned(root: THREE.Object3D): THREE.SkinnedMesh | null {
  let found: THREE.SkinnedMesh | null = null
  root.traverse((o) => {
    const m = o as THREE.SkinnedMesh
    if (m.isSkinnedMesh && !found) found = m
  })
  return found
}

const skinned = findSkinned(wrap)
assert.ok(skinned, 'Mesh becomes SkinnedMesh')
assert.ok(skinned.skeleton.bones.length >= 16, 'humanoid bone count')
assert.ok(skinned.geometry.getAttribute('skinIndex'), 'skinIndex painted')
assert.ok(skinned.geometry.getAttribute('skinWeight'), 'skinWeight painted')
assert.ok(findScoutBone(wrap, SCOUT_BONE.thighL), 'left thigh bone')
assert.ok(findScoutBone(wrap, SCOUT_BONE.handR), 'right hand bone')

const thighL = findScoutBone(wrap, SCOUT_BONE.thighL)!
const armR = findScoutBone(wrap, SCOUT_BONE.upperArmR)!
assert.equal(
  tickScoutSkeletonLocomotion(wrap, 'walk', 0.35, 0.016, 1, 7.2),
  true,
  'walk tick finds bones',
)
assert.ok(Math.abs(thighL.rotation.x) > 0.15, `walk swings thigh (got ${thighL.rotation.x})`)
assert.ok(Math.abs(armR.rotation.y) > 0.1, `walk swings arm (got ${armR.rotation.y})`)

const idleArmZ0 = armR.rotation.z
tickScoutSkeletonLocomotion(wrap, 'idle', 0.4, 0.016, 1, 7.2)
assert.ok(Math.abs(armR.rotation.z) > 0.1, 'idle drops arms off T-pose')
assert.notEqual(armR.rotation.z, idleArmZ0)

{
  const thigh0 = thighL.rotation.x
  assert.equal(tickScoutSkeletonLocomotion(wrap, 'sit', 0.2, 0.016, 1, 7.2), true, 'sit tick')
  assert.ok(thighL.rotation.x > 1.0, `sit folds thighs (got ${thighL.rotation.x})`)
  assert.ok(Math.abs(thighL.rotation.x - thigh0) > 0.5, 'sit differs from idle/walk thighs')
  assert.ok(Math.abs(armR.rotation.z) > 0.35, 'sit drops arms off T-pose bind')
}

assert.equal(tickScoutSkeletonFish(wrap, 'wait', 0.4, 1), true, 'fish wait pose')
const waitX = armR.rotation.x
const waitY = armR.rotation.y
assert.ok(Math.abs(waitY) > 0.4, 'wait holds the rod forward, not T-pose')
tickScoutSkeletonFish(wrap, 'catch', 0.55, 1)
assert.ok(Math.abs(armR.rotation.x - waitX) > 0.2, 'reel pose differs from wait')
assert.ok(armR.rotation.x < waitX, 'reel lifts the rod')

tickScoutSkeletonFish(wrap, 'cast', 0.15, 1)
assert.ok(armR.rotation.x < -0.3, 'cast winds the rod back')

{
  const root = new THREE.Group()
  const glb = dummyScoutMesh()
  assert.equal(rigHarborScoutGlb(glb), true)
  root.add(glb)
  const plantedY = glb.position.y
  let st = tickHarborProtagonistAnim(root, { mode: 'walk', t: 0 }, 0.08)
  st = tickHarborProtagonistAnim(root, st, 0.08)
  assert.ok(Math.abs(glb.position.y - plantedY) < 1e-6, 'rigged walk keeps GLB root planted')
  assert.ok(Math.abs(glb.rotation.z) < 1e-6, 'rigged walk does not T-pose-sway the mesh root')
  const thigh = findScoutBone(root, SCOUT_BONE.thighL)
  assert.ok(thigh && Math.abs(thigh.rotation.x) > 0.05, 'protagonist walk drives auto-rig thigh')
}

const panelSrc = readFileSync(new URL('./HarborFishingPanel.tsx', import.meta.url), 'utf8')
assert.match(panelSrc, /Fishing level: Lv\{level\}/, 'fishing header says Fishing level: LvN')
assert.doesNotMatch(panelSrc, /Watch the sailor on the shore/, 'no cheap shore hint')
assert.match(panelSrc, /Reeling in/, 'reel status stays')

const animSrc = readFileSync(new URL('./harborProtagonistAnim.ts', import.meta.url), 'utf8')
assert.match(animSrc, /tickScoutSkeletonLocomotion/, 'walk ticks auto-rig bones')
assert.match(animSrc, /scoutRigged/, 'rigged Scout skips whole-mesh sway')
assert.match(animSrc, /tickHarborCastAnim/, 'NPC clones share player armature tick')

{
  const npc = dummyScoutMesh()
  assert.equal(rigHarborScoutGlb(npc), true)
  const a0 = findScoutBone(npc, SCOUT_BONE.upperArmR)!.rotation.z
  tickHarborCastAnim(npc, 0.08, { mode: 'idle' })
  tickHarborCastAnim(npc, 0.08, { mode: 'idle' })
  const arm = findScoutBone(npc, SCOUT_BONE.upperArmR)!
  assert.ok(Math.abs(arm.rotation.z) > 0.05, 'cast idle drops NPC arms off T-pose')
  assert.notEqual(arm.rotation.z, a0)
}

const fishAnimSrc = readFileSync(new URL('./harborFishingAnim.ts', import.meta.url), 'utf8')
assert.match(fishAnimSrc, /tickScoutSkeletonFish/, 'cast/reel drive auto-rig bones')
assert.match(fishAnimSrc, /scout-bone-hand-r|SCOUT_BONE\.handR/, 'rod parents to wrist bone')

const glbSrc = readFileSync(new URL('./harborProtagonistGlb.ts', import.meta.url), 'utf8')
assert.match(glbSrc, /rigHarborScoutGlb/, 'normalize auto-rigs Scout GLB')
assert.match(glbSrc, /cloneSkeleton|SkeletonUtils/, 'rigged clones keep the skeleton')
assert.match(glbSrc, /tickScoutSkeletonLocomotion\(glb,\s*'sit'/, 'canoe plant applies sit bones')
assert.match(glbSrc, /HARBOR_CANOE_GLB_SINK_Y/, 'canoe sink constant exported')

const here = dirname(fileURLToPath(import.meta.url))
const femaleGlb = join(here, '../../../public/assets/harbor-quest/scout-female.glb')
assert.ok(existsSync(femaleGlb), 'scout-female.glb is in public assets')

console.log('harborScoutRig.smoke: ok')
