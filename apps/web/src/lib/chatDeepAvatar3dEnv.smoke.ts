/**
 * `#/chat` 3D companion office env helpers.
 * Run: npx tsx apps/web/src/lib/chatDeepAvatar3dEnv.smoke.ts
 */
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CHAT_DEEP_AVATAR_3D_BEHAVIOR_SNAP,
  CHAT_DEEP_AVATAR_3D_ENV_SNAPS,
  CHAT_DEEP_AVATAR_3D_WALK_SNAPS,
  chatDeepAvatar3dEnvSrc,
  clampChatDeepAvatar3dEnvPos,
  pickChatDeepAvatar3dEnvWalkSnap,
} from './chatDeepAvatar3dEnv.ts'

const here = dirname(fileURLToPath(import.meta.url))
const envGlb = join(here, '../../public/chat-avatar/env/office-env.glb')

assert.equal(chatDeepAvatar3dEnvSrc(), '/chat-avatar/env/office-env.glb')
assert.ok(existsSync(envGlb), 'office-env.glb must ship under public/chat-avatar/env/')

assert.ok(CHAT_DEEP_AVATAR_3D_ENV_SNAPS.chair)
assert.ok(CHAT_DEEP_AVATAR_3D_ENV_SNAPS.snack)
assert.equal(CHAT_DEEP_AVATAR_3D_BEHAVIOR_SNAP.eat, 'snack')
assert.equal(CHAT_DEEP_AVATAR_3D_BEHAVIOR_SNAP.study, 'chair')
assert.ok(CHAT_DEEP_AVATAR_3D_WALK_SNAPS.includes('path_a'))

const clamped = clampChatDeepAvatar3dEnvPos(99, -99)
assert.ok(clamped.x <= 1.5 && clamped.x >= -1.5)
assert.ok(clamped.z <= 1.2 && clamped.z >= -1.35)

const snap = pickChatDeepAvatar3dEnvWalkSnap(() => 0)
assert.ok(CHAT_DEEP_AVATAR_3D_WALK_SNAPS.includes(snap))

console.log('chatDeepAvatar3dEnv.smoke.ts: ok')
