/**
 * `#/chat` 3D companion ambient AI — wander / study / work / interact.
 * Run: npx tsx apps/web/src/lib/chatDeepAvatar3dBehavior.smoke.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CHAT_DEEP_AVATAR_3D_BEHAVIOR_ALIASES,
  CHAT_DEEP_AVATAR_3D_BEHAVIOR_CLIPS,
  CHAT_DEEP_AVATAR_3D_NEAR_DIST,
  CHAT_DEEP_AVATAR_3D_WANDER_MARGIN,
  chatDeepAvatar3dCompanionsNear,
  chatDeepAvatar3dMoodOverridesAmbient,
  chatDeepAvatar3dPoseDistance,
  clearChatDeepAvatar3dLivePoses,
  pickChatDeepAvatar3dBehavior,
  pickChatDeepAvatar3dDwellMs,
  pickChatDeepAvatar3dWanderTarget,
  publishChatDeepAvatar3dLivePose,
  readChatDeepAvatar3dPartnerPose,
  resolveChatDeepAvatar3dBehaviorClipName,
  stepChatDeepAvatar3dWalk,
} from './chatDeepAvatar3dBehavior.ts'

const here = dirname(fileURLToPath(import.meta.url))
const overlaySrc = readFileSync(join(here, '../pages/chat/aui/ChatDeepAvatar3D.tsx'), 'utf8')
const libSrc = readFileSync(join(here, 'chatDeepAvatar3d.ts'), 'utf8')

assert.deepEqual(
  [...CHAT_DEEP_AVATAR_3D_BEHAVIOR_CLIPS],
  ['Idle', 'Walk', 'Interact', 'Study', 'Work'],
)
assert.ok(CHAT_DEEP_AVATAR_3D_BEHAVIOR_ALIASES.idle.includes('Idle'))
assert.ok(CHAT_DEEP_AVATAR_3D_BEHAVIOR_ALIASES.walk.includes('Walk'))
assert.ok(CHAT_DEEP_AVATAR_3D_BEHAVIOR_ALIASES.interact.includes('Interact'))
assert.ok(CHAT_DEEP_AVATAR_3D_BEHAVIOR_ALIASES.study.includes('Study'))
assert.ok(CHAT_DEEP_AVATAR_3D_BEHAVIOR_ALIASES.work.includes('Work'))

assert.equal(chatDeepAvatar3dMoodOverridesAmbient('idle'), false)
assert.equal(chatDeepAvatar3dMoodOverridesAmbient('think'), false)
assert.equal(chatDeepAvatar3dMoodOverridesAmbient('speak'), true)
assert.equal(chatDeepAvatar3dMoodOverridesAmbient('wave'), true)
assert.equal(chatDeepAvatar3dMoodOverridesAmbient('celebrate'), true)

{
  let i = 0
  const seq = [0.1, 0.5, 0.9, 0.2, 0.7]
  const rng = () => seq[i++ % seq.length]!
  const t = pickChatDeepAvatar3dWanderTarget(rng)
  assert.ok(t.x >= CHAT_DEEP_AVATAR_3D_WANDER_MARGIN.xMin)
  assert.ok(t.x <= CHAT_DEEP_AVATAR_3D_WANDER_MARGIN.xMax)
  assert.ok(t.y >= CHAT_DEEP_AVATAR_3D_WANDER_MARGIN.yMin)
  assert.ok(t.y <= CHAT_DEEP_AVATAR_3D_WANDER_MARGIN.yMax)
}

assert.equal(chatDeepAvatar3dPoseDistance({ x: 0, y: 0 }, { x: 0.3, y: 0.4 }), 0.5)
assert.equal(
  chatDeepAvatar3dCompanionsNear({ x: 0.5, y: 0.5 }, { x: 0.55, y: 0.52 }, CHAT_DEEP_AVATAR_3D_NEAR_DIST),
  true,
)
assert.equal(
  chatDeepAvatar3dCompanionsNear({ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.9 }),
  false,
)

{
  const stepped = stepChatDeepAvatar3dWalk({ x: 0.2, y: 0.2 }, { x: 0.8, y: 0.2 }, 1, 0.055)
  assert.ok(stepped.x > 0.2)
  assert.equal(stepped.arrived, false)
  const arrive = stepChatDeepAvatar3dWalk({ x: 0.79, y: 0.2 }, { x: 0.8, y: 0.2 }, 1, 0.2)
  assert.equal(arrive.arrived, true)
  assert.equal(arrive.x, 0.8)
}

{
  // preferInteract biases toward Interact.
  let interactHits = 0
  for (let n = 0; n < 200; n++) {
    if (pickChatDeepAvatar3dBehavior(() => Math.random(), { preferInteract: true }) === 'interact') {
      interactHits += 1
    }
  }
  assert.ok(interactHits > 100, `expected Interact bias, got ${interactHits}/200`)
}

{
  const dwell = pickChatDeepAvatar3dDwellMs('study', () => 0.5)
  assert.ok(dwell >= 5200 && dwell <= 9000)
  assert.equal(pickChatDeepAvatar3dDwellMs('walk', () => 0.5), 0)
}

assert.equal(
  resolveChatDeepAvatar3dBehaviorClipName('walk', ['Idle', 'Walk', 'Interact', 'Study', 'Work']),
  'Walk',
)
assert.equal(
  resolveChatDeepAvatar3dBehaviorClipName('interact', ['Idle', 'Walk', 'Interact', 'Study', 'Work']),
  'Interact',
)
assert.equal(
  resolveChatDeepAvatar3dBehaviorClipName('study', ['Idle', 'Walk', 'Interact', 'Study', 'Work']),
  'Study',
)
assert.equal(
  resolveChatDeepAvatar3dBehaviorClipName('work', ['Idle', 'Walk', 'Interact', 'Study', 'Work']),
  'Work',
)
assert.equal(
  resolveChatDeepAvatar3dBehaviorClipName('walk', ['Armature|Casual_Walk_inplace|baselayer', 'Idle']),
  'Armature|Casual_Walk_inplace|baselayer',
)

clearChatDeepAvatar3dLivePoses()
publishChatDeepAvatar3dLivePose('boy', { x: 0.3, y: 0.4 })
assert.deepEqual(readChatDeepAvatar3dPartnerPose('girl'), { x: 0.3, y: 0.4 })
assert.equal(readChatDeepAvatar3dPartnerPose('boy'), null)
publishChatDeepAvatar3dLivePose('boy', null)
assert.equal(readChatDeepAvatar3dPartnerPose('girl'), null)

assert.match(overlaySrc, /chatDeepAvatar3dMoodOverridesAmbient/, 'overlay gates ambient on mood')
assert.match(overlaySrc, /pickChatDeepAvatar3dBehavior|setBehavior/, 'overlay runs ambient AI')
assert.match(overlaySrc, /stepChatDeepAvatar3dWalk/, 'overlay wanders on .ds-chat')
assert.match(overlaySrc, /preferInteract|chatDeepAvatar3dCompanionsNear/, 'Both near → interact')
assert.match(libSrc, /'Walk'/, 'canon clips include Walk')
assert.match(libSrc, /'Interact'/, 'canon clips include Interact')
assert.match(libSrc, /'Study'/, 'canon clips include Study')
assert.match(libSrc, /'Work'/, 'canon clips include Work')

console.log('chatDeepAvatar3dBehavior.smoke: ok')
