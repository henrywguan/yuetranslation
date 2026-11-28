/**
 * `#/chat` 3D companion office env helpers.
 * Run: npx tsx apps/web/src/lib/chatDeepAvatar3dEnv.smoke.ts
 */
import assert from 'node:assert/strict'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CHAT_DEEP_AVATAR_3D_BEHAVIOR_SNAP,
  CHAT_DEEP_AVATAR_3D_ENV_PROPS,
  CHAT_DEEP_AVATAR_3D_ENV_PROPS_MAX_BYTES,
  CHAT_DEEP_AVATAR_3D_ENV_SNAPS,
  CHAT_DEEP_AVATAR_3D_WALK_SNAPS,
  chatDeepAvatar3dEnvSrc,
  clampChatDeepAvatar3dEnvPos,
  pickChatDeepAvatar3dEnvWalkSnap,
} from './chatDeepAvatar3dEnv.ts'

const here = dirname(fileURLToPath(import.meta.url))
const envDir = join(here, '../../public/chat-avatar/env')
const envGlb = join(envDir, 'office-env.glb')
const propsDir = join(envDir, 'props')

assert.equal(chatDeepAvatar3dEnvSrc(), '/chat-avatar/env/office-env.glb')
assert.ok(existsSync(envGlb), 'office-env.glb must ship under public/chat-avatar/env/')

assert.ok(CHAT_DEEP_AVATAR_3D_ENV_SNAPS.chair)
assert.ok(CHAT_DEEP_AVATAR_3D_ENV_SNAPS.snack)
assert.equal(CHAT_DEEP_AVATAR_3D_BEHAVIOR_SNAP.eat, 'snack')
assert.equal(CHAT_DEEP_AVATAR_3D_BEHAVIOR_SNAP.study, 'chair')
assert.ok(CHAT_DEEP_AVATAR_3D_WALK_SNAPS.includes('path_a'))

// glTF SNAP_* / CAM_main use −Z open front — regressions flip Z and grey-wall the dock.
assert.ok(CHAT_DEEP_AVATAR_3D_ENV_SNAPS.chair.z > 0, 'chair snap Z matches SNAP_chair (+Z)')
assert.ok(CHAT_DEEP_AVATAR_3D_ENV_SNAPS.desk.z > CHAT_DEEP_AVATAR_3D_ENV_SNAPS.chair.z)
assert.ok(CHAT_DEEP_AVATAR_3D_ENV_SNAPS.snack.z < 0, 'snack snap Z matches SNAP_snack (−Z)')
assert.ok(
  CHAT_DEEP_AVATAR_3D_ENV_PROPS.find((p) => p.id === 'desk')!.z > 0,
  'desk prop Z matches room (+Z back)',
)

const clamped = clampChatDeepAvatar3dEnvPos(99, -99)
assert.ok(clamped.x <= 1.5 && clamped.x >= -1.5)
assert.ok(clamped.z <= 1.35 && clamped.z >= -1.2)

const snap = pickChatDeepAvatar3dEnvWalkSnap(() => 0)
assert.ok(CHAT_DEEP_AVATAR_3D_WALK_SNAPS.includes(snap))

assert.ok(CHAT_DEEP_AVATAR_3D_ENV_PROPS.length >= 8, 'expect full Meshy prop set')
let propsBytes = 0
for (const prop of CHAT_DEEP_AVATAR_3D_ENV_PROPS) {
  const file = join(here, '../../public', prop.src.replace(/^\//, ''))
  assert.ok(existsSync(file), `missing prop ${prop.id}: ${file}`)
  const bytes = statSync(file).size
  assert.ok(bytes > 10_000, `${prop.id} too small`)
  assert.ok(bytes < 1.5 * 1024 * 1024, `${prop.id} too large for mobile (${bytes})`)
  propsBytes += bytes
}
assert.ok(
  propsBytes < CHAT_DEEP_AVATAR_3D_ENV_PROPS_MAX_BYTES,
  `props folder too large (${propsBytes} >= ${CHAT_DEEP_AVATAR_3D_ENV_PROPS_MAX_BYTES})`,
)
assert.ok(existsSync(propsDir))
assert.ok(readdirSync(propsDir).filter((f) => f.endsWith('.glb')).length >= 8)

console.log('chatDeepAvatar3dEnv.smoke.ts: ok')
