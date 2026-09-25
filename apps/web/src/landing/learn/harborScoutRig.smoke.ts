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
  alignScoutGlbHipsToSeat,
  HARBOR_CANOE_HIP_ABOVE_SEAT,
  HARBOR_CHAIR_HIP_ABOVE_SEAT,
  plantScoutGlbInCanoe,
  plantScoutGlbOnChair,
} from './harborProtagonistGlb'
import {
  findScoutBone,
  refreshScoutSkeleton,
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
assert.ok(Math.abs(armR.rotation.x) > 0.15, `walk swings hanging A-pose arm (got ${armR.rotation.x})`)

const idleArmX0 = armR.rotation.x
tickScoutSkeletonLocomotion(wrap, 'idle', 0.4, 0.016, 1, 7.2)
assert.ok(Math.abs(armR.rotation.x) < 0.2, 'idle keeps A-pose hang (no T-pose drop)')
assert.notEqual(armR.rotation.x, idleArmX0)

{
  const thigh0 = thighL.rotation.x
  assert.equal(tickScoutSkeletonLocomotion(wrap, 'sit', 0.2, 0.016, 1, 7.2), true, 'sit tick')
  assert.ok(thighL.rotation.x > 1.0, `sit folds thighs (got ${thighL.rotation.x})`)
  assert.ok(Math.abs(thighL.rotation.x - thigh0) > 0.5, 'sit differs from idle/walk thighs')
  assert.ok(armR.rotation.x > 0.35, 'sit brings A-pose hands onto the lap')
}

assert.equal(tickScoutSkeletonFish(wrap, 'wait', 0.4, 1), true, 'fish wait pose')
const waitX = armR.rotation.x
assert.ok(waitX > 0.6, 'wait holds the rod forward from an A-pose hang')
tickScoutSkeletonFish(wrap, 'catch', 0.55, 1)
assert.ok(Math.abs(armR.rotation.x - waitX) > 0.4, 'reel pose differs from wait')
assert.ok(armR.rotation.x < waitX, 'reel lifts the rod')

tickScoutSkeletonFish(wrap, 'cast', 0.15, 1)
assert.ok(armR.rotation.x < -0.5, 'cast winds the hanging arm back')

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
  const a0 = findScoutBone(npc, SCOUT_BONE.upperArmR)!.rotation.x
  tickHarborCastAnim(npc, 0.08, { mode: 'idle' })
  tickHarborCastAnim(npc, 0.08, { mode: 'idle' })
  const arm = findScoutBone(npc, SCOUT_BONE.upperArmR)!
  assert.ok(Math.abs(arm.rotation.x) > 0.02, 'cast idle breathes NPC A-pose arms')
  assert.notEqual(arm.rotation.x, a0)
}

{
  // A-pose bind: hanging-arm region (right hip sleeve) must move on cast.
  let mesh: THREE.SkinnedMesh | null = null
  wrap.traverse((o) => {
    const m = o as THREE.SkinnedMesh
    if (m.isSkinnedMesh && !mesh) mesh = m
  })
  assert.ok(mesh, 'dummy has SkinnedMesh')
  const worldSkin = (pred: (v: THREE.Vector3) => boolean) => {
    mesh!.updateMatrixWorld(true)
    mesh!.skeleton.update()
    const pos = mesh!.geometry.getAttribute('position')
    const idx = mesh!.geometry.getAttribute('skinIndex')
    const wgt = mesh!.geometry.getAttribute('skinWeight')
    const bones = mesh!.skeleton.bones
    const inv = mesh!.skeleton.boneInverses
    const out: THREE.Vector3[] = []
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i))
      if (!pred(v)) continue
      const acc = new THREE.Vector3()
      for (let k = 0; k < 4; k++) {
        const w = wgt.array[i * 4 + k]
        if (w <= 0) continue
        acc.add(
          v
            .clone()
            .applyMatrix4(new THREE.Matrix4().multiplyMatrices(bones[idx.array[i * 4 + k]].matrixWorld, inv[idx.array[i * 4 + k]]))
            .multiplyScalar(w),
        )
      }
      out.push(acc)
    }
    return out
  }
  const sleeve = (v: THREE.Vector3) => v.x > 0.12 && v.y > 0.45 && v.y < 1.15
  tickScoutSkeletonFish(wrap, 'idle', 0, 1)
  const bind = worldSkin(sleeve)
  tickScoutSkeletonFish(wrap, 'cast', 0.18, 1)
  const wind = worldSkin(sleeve)
  let max = 0
  for (let i = 0; i < bind.length; i++) max = Math.max(max, bind[i]!.distanceTo(wind[i]!))
  assert.ok(bind.length > 8, 'hanging-arm verts exist on dummy')
  assert.ok(max > 0.18, `cast moves hanging-arm verts (max ${max.toFixed(3)})`)
}

const fishAnimSrc = readFileSync(new URL('./harborFishingAnim.ts', import.meta.url), 'utf8')
assert.match(fishAnimSrc, /tickScoutSkeletonFish/, 'cast/reel drive auto-rig bones')
assert.match(fishAnimSrc, /scout-bone-hand-r|SCOUT_BONE\.handR/, 'rod parents to wrist bone')
assert.match(fishAnimSrc, /Extra readable torso|glb\.rotation\.x/, 'cast leans the Scout mesh')

const glbSrc = readFileSync(new URL('./harborProtagonistGlb.ts', import.meta.url), 'utf8')
assert.match(glbSrc, /rigHarborScoutGlb/, 'normalize auto-rigs Scout GLB')
assert.match(glbSrc, /cloneSkeleton|SkeletonUtils/, 'rigged clones keep the skeleton')
assert.match(glbSrc, /alignScoutGlbHipsToSeat/, 'sit plants hip-align after fold')
assert.match(glbSrc, /HARBOR_CANOE_HIP_ABOVE_SEAT/, 'canoe hip seat constant')
assert.match(glbSrc, /HARBOR_CHAIR_HIP_ABOVE_SEAT/, 'chair hip seat constant')

{
  const seat = new THREE.Group()
  const glb = dummyScoutMesh()
  assert.equal(rigHarborScoutGlb(glb), true)
  seat.add(glb)
  plantScoutGlbOnChair(glb)
  refreshScoutSkeleton(glb)
  seat.updateMatrixWorld(true)
  const hips = findScoutBone(glb, SCOUT_BONE.hips)!
  const hipWorld = new THREE.Vector3()
  hips.getWorldPosition(hipWorld)
  seat.worldToLocal(hipWorld)
  assert.ok(
    Math.abs(hipWorld.y - HARBOR_CHAIR_HIP_ABOVE_SEAT) < 0.08,
    `chair hips on cushion (got ${hipWorld.y.toFixed(3)}, want ~${HARBOR_CHAIR_HIP_ABOVE_SEAT})`,
  )

  const canoe = new THREE.Group()
  const glb2 = dummyScoutMesh()
  assert.equal(rigHarborScoutGlb(glb2), true)
  canoe.add(glb2)
  plantScoutGlbInCanoe(glb2)
  refreshScoutSkeleton(glb2)
  canoe.updateMatrixWorld(true)
  const hips2 = findScoutBone(glb2, SCOUT_BONE.hips)!
  const hip2 = new THREE.Vector3()
  hips2.getWorldPosition(hip2)
  canoe.worldToLocal(hip2)
  assert.ok(
    Math.abs(hip2.y - HARBOR_CANOE_HIP_ABOVE_SEAT) < 0.08,
    `canoe hips on deck (got ${hip2.y.toFixed(3)}, want ~${HARBOR_CANOE_HIP_ABOVE_SEAT})`,
  )
  // Second align is stable (idempotent).
  alignScoutGlbHipsToSeat(glb2, HARBOR_CANOE_HIP_ABOVE_SEAT)
  refreshScoutSkeleton(glb2)
  canoe.updateMatrixWorld(true)
  hips2.getWorldPosition(hip2)
  canoe.worldToLocal(hip2)
  assert.ok(
    Math.abs(hip2.y - HARBOR_CANOE_HIP_ABOVE_SEAT) < 0.08,
    `canoe hip align stays stable (got ${hip2.y.toFixed(3)})`,
  )
}

const rigSrc = readFileSync(new URL('./harborScoutRig.ts', import.meta.url), 'utf8')
assert.match(rigSrc, /A-pose \(sleeves hang/, 'auto-rig places arm bones on hanging sleeves')
assert.match(rigSrc, /refreshScoutSkeleton/, 'posed bones flush to the SkinnedMesh')

const here = dirname(fileURLToPath(import.meta.url))
const femaleGlb = join(here, '../../../public/assets/harbor-quest/scout-female.glb')
assert.ok(existsSync(femaleGlb), 'scout-female.glb is in public assets')

console.log('harborScoutRig.smoke: ok')
