/**
 * Offline smoke — landmark NPC building-local roam.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as THREE from 'three'
import {
  hasHarborNpcRoam,
  stampHarborNpcRoam,
  tickHarborNpcRoam,
  type HarborNpcRoamState,
} from './harborNpcRoam'

const npc = new THREE.Group()
npc.name = 'landmark-host-test'
npc.position.set(0.9, 0.5, 2.0)
npc.rotation.y = -0.35
stampHarborNpcRoam(npc, { roam: 1.4, faceYaw: -0.35, rng: () => 0.42 })
assert.equal(hasHarborNpcRoam(npc), true, 'stamp sets npcRoam')
stampHarborNpcRoam(npc, { roam: 9 })
const state = npc.userData.npcRoam as HarborNpcRoamState
assert.equal(state.roam, 1.4, 'stamp is idempotent')
assert.equal(state.homeX, 0.9, 'home X from pose')
assert.equal(state.homeZ, 2.0, 'home Z from pose')

// Force a walk target far enough that one tick moves.
state.pause = 0
state.tx = state.homeX + 1.0
state.tz = state.homeZ
const x0 = npc.position.x
const mode = tickHarborNpcRoam(npc, 0.05, false)
assert.equal(mode, 'walk', 'moving toward target walks')
assert.ok(npc.position.x !== x0, 'XZ advances while walking')
assert.equal(npc.position.y, 0.5, 'Y stays on building terrace')

// Soft leash — yank past roam radius, next tick pulls back.
npc.position.x = state.homeX + state.roam * 1.4
npc.position.z = state.homeZ
tickHarborNpcRoam(npc, 0.05, false)
const away = Math.hypot(npc.position.x - state.homeX, npc.position.z - state.homeZ)
assert.ok(away <= state.roam * 1.06, `leash keeps NPC near building (away=${away})`)

const src = readFileSync(new URL('./harborNpcRoam.ts', import.meta.url), 'utf8')
assert.match(src, /tickHarborCastAnim/, 'roam drives Scout walk/idle')
assert.match(src, /homeX/, 'roam anchors to building home')

const worldSrc = readFileSync(new URL('./harborWorld.ts', import.meta.url), 'utf8')
assert.match(worldSrc, /stampHarborNpcRoam/, 'river landmark hosts stamp roam')
assert.match(worldSrc, /tickHarborNpcRoam/, 'world ticks building-local roam')

const guanSrc = readFileSync(new URL('./harborGuanRealm.ts', import.meta.url), 'utf8')
assert.match(guanSrc, /stampHarborNpcRoam\(officer/, 'Customs officer paces the pier')
assert.match(guanSrc, /stampHarborNpcRoam\(trimmer/, 'Cape trimmer paces the loom')

const fishSrc = readFileSync(new URL('./harborGuanFishingRealm.ts', import.meta.url), 'utf8')
assert.match(fishSrc, /stampHarborNpcRoam\(keeper/, 'Fishing keeper paces the hut')

console.log('harborNpcRoam.smoke: ok')
