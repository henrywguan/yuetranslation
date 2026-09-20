/**
 * Offline smoke for fishing cast / catch animation kit.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  HARBOR_FISH_CAST_MS,
  HARBOR_FISH_CATCH_MS,
  HARBOR_FISH_RESOLVE_MS,
  HARBOR_FISH_WAIT_MS,
  buildHarborFishingRod,
  createHarborFishingPropKit,
  disposeHarborFishingPropKit,
  startHarborFishCast,
  startHarborFishCatch,
  tickHarborFishingAnim,
} from './harborFishingAnim'
import { buildHarborProtagonist } from './harborProtagonist'

assert.ok(HARBOR_FISH_CAST_MS >= 400, 'cast wind-up readable')
assert.ok(HARBOR_FISH_WAIT_MS >= 900, 'wait before bite feels like fishing')
assert.ok(HARBOR_FISH_RESOLVE_MS === HARBOR_FISH_CAST_MS + HARBOR_FISH_WAIT_MS, 'resolve = cast+wait')
assert.ok(HARBOR_FISH_CATCH_MS >= 700, 'catch celebration length')

const rod = buildHarborFishingRod()
assert.equal(rod.name, 'hq-fish-rod')
assert.ok(rod.children.length >= 3, 'rod has grip/shaft/reel')

const kit = createHarborFishingPropKit()
assert.ok(kit.rod && kit.line && kit.bobber && kit.catchFish, 'prop kit parts')

const scout = buildHarborProtagonist({ pose: 'standing' })
let state = startHarborFishCast(0)
assert.equal(state.phase, 'cast')

// Advance through cast into wait
for (let i = 0; i < 20; i++) {
  state = tickHarborFishingAnim(scout, kit, state, 0.05, {
    x: 5,
    y: 0,
    z: 56,
    waterX: 2,
    waterY: 0.06,
    waterZ: 56,
  })
}
assert.equal(state.phase, 'wait', 'cast completes into wait')
assert.ok(kit.rod.visible, 'rod visible while fishing')
assert.ok(kit.bobber.visible, 'bobber on water while waiting')

state = startHarborFishCatch(state, true)
for (let i = 0; i < 30; i++) {
  state = tickHarborFishingAnim(scout, kit, state, 0.05, {
    x: 5,
    y: 0,
    z: 56,
    waterX: 2,
    waterY: 0.06,
    waterZ: 56,
  })
}
assert.equal(state.phase, 'idle', 'catch returns to idle')
assert.equal(kit.rod.visible, false, 'rod hidden after catch')

disposeHarborFishingPropKit(kit)

const panelSrc = readFileSync(new URL('./HarborFishingPanel.tsx', import.meta.url), 'utf8')
assert.match(panelSrc, /HARBOR_FISH_RESOLVE_MS/, 'panel waits for cast+wait')
assert.match(panelSrc, /onCastResult/, 'panel notifies world of catch/miss')
assert.match(panelSrc, /is-casting-focus|hq-fish-cast-stage/, 'panel collapses to show 3D cast')
assert.match(panelSrc, /playHarborFishNibble/, 'panel schedules nibble SFX')
assert.match(panelSrc, /Fishing level: Lv\{level\}/, 'header is Fishing level: LvN')
assert.doesNotMatch(panelSrc, /Watch the sailor on the shore/, 'no cheap shore hint')

const sfxSrc = readFileSync(new URL('./harborFishingSfx.ts', import.meta.url), 'utf8')
assert.match(sfxSrc, /playHarborCoinChing/, 'catch plays coin reward chime')
assert.match(sfxSrc, /playHarborFishNibble/, 'wait phase nibble SFX')
assert.match(sfxSrc, /resumeSharedAudioContext/, 'cast unlocks audio on gesture')

const worldSrc = readFileSync(new URL('./harborWorld.ts', import.meta.url), 'utf8')
assert.match(worldSrc, /playFishingCatch/, 'world exposes catch pose API')
assert.match(worldSrc, /tickHarborFishingAnim/, 'world ticks fishing anim')
assert.match(worldSrc, /yawTarget = toSplash/, 'cast aims camera at splash')
assert.match(worldSrc, /keep the sailor in frame/, 'cast camera keeps the sailor on screen')
assert.match(worldSrc, /scoutWalk\.visible = true/, 'foot cast keeps scout visible')

console.log('harborFishingAnim.smoke: ok')
