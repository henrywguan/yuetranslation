/**
 * `#/chat` 3D companion chrome stub — prefs, paths, snap, no Live2D.
 * Run: npx tsx apps/web/src/lib/chatDeepAvatar3d.smoke.ts
 */
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CHAT_DEEP_AVATAR_3D_DRAG_THRESHOLD_PX,
  CHAT_DEEP_AVATAR_3D_KEY,
  CHAT_DEEP_AVATAR_3D_POSE_KEY,
  CHAT_DEEP_AVATAR_3D_SNAP_PX,
  chatDeepAvatar3dStubTint,
  chatDeepAvatarGlbSrc,
  defaultChatDeepAvatar3dPose,
  isChatDeepAvatar3dPointerBlocked,
  normalizeChatDeepAvatar3dPose,
  normalizeChatDeepAvatar3dPoseMap,
  readChatDeepAvatar3dEnabled,
  readChatDeepAvatar3dPose,
  shouldSnapChatDeepAvatar3dHome,
  writeChatDeepAvatar3dEnabled,
  writeChatDeepAvatar3dPose,
} from './chatDeepAvatar3d.ts'
import { normalizeChatDeepAvatarCloudPrefs } from './chatDeepAvatarPersona.ts'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const overlaySrc = readFileSync(join(root, 'pages/chat/aui/ChatDeepAvatar3D.tsx'), 'utf8')
const threadSrc = readFileSync(join(root, 'pages/chat/aui/ChatAuiThread.tsx'), 'utf8')
const settingsSrc = readFileSync(join(root, 'pages/chat/inbox/InboxSettingsMenu.tsx'), 'utf8')
const auiCss = readFileSync(join(root, 'pages/chat/aui/ChatAui.css'), 'utf8')
const viteCfg = readFileSync(join(root, '../vite.config.ts'), 'utf8')
const readme = readFileSync(join(root, '../public/chat-avatar/README.md'), 'utf8')
const libSrc = readFileSync(join(here, 'chatDeepAvatar3d.ts'), 'utf8')
const cloudSync = readFileSync(join(here, 'chatDeepAvatarCloudSync.ts'), 'utf8')
const personaSrc = readFileSync(join(here, 'chatDeepAvatarPersona.ts'), 'utf8')
const apiPersona = readFileSync(join(root, '../../api/src/chatDeepAvatarPersona.ts'), 'utf8')

assert.match(libSrc, /CHAT_DEEP_AVATAR_3D_KEY/, '3d toggle localStorage key')
assert.match(libSrc, /CHAT_DEEP_AVATAR_3D_POSE_KEY/, '3d pose localStorage key')
assert.equal(CHAT_DEEP_AVATAR_3D_KEY, 'yue-deepseek-chat-avatar-3d-v1')
assert.equal(CHAT_DEEP_AVATAR_3D_POSE_KEY, 'yue-deepseek-chat-avatar-3d-pose-v1')
assert.ok(CHAT_DEEP_AVATAR_3D_SNAP_PX >= 48)
assert.ok(CHAT_DEEP_AVATAR_3D_DRAG_THRESHOLD_PX >= 4)

assert.equal(chatDeepAvatarGlbSrc('boy'), '/chat-avatar/boy/deep.glb')
assert.equal(chatDeepAvatarGlbSrc('girl'), '/chat-avatar/girl/deep.glb')
assert.notEqual(chatDeepAvatar3dStubTint('boy'), chatDeepAvatar3dStubTint('girl'))

assert.equal(normalizeChatDeepAvatar3dPose(null).docked, true)
assert.equal(normalizeChatDeepAvatar3dPose({ x: 2, y: -1, docked: false }).x, 1)
assert.equal(normalizeChatDeepAvatar3dPose({ x: 2, y: -1, docked: false }).y, 0)
assert.equal(normalizeChatDeepAvatar3dPose({ x: 0.5, y: 0.5, docked: false }).docked, false)

const map = normalizeChatDeepAvatar3dPoseMap({ boy: { x: 0.2, y: 0.3, docked: false } })
assert.equal(map.boy.x, 0.2)
assert.equal(map.girl.docked, true)

assert.equal(shouldSnapChatDeepAvatar3dHome(10, 10, 10, 10), true)
assert.equal(shouldSnapChatDeepAvatar3dHome(0, 0, 500, 500), false)
assert.equal(shouldSnapChatDeepAvatar3dHome(0, 0, 40, 40, 72), true)

{
  const g = globalThis as { localStorage?: Storage; window?: unknown }
  const mem = new Map<string, string>()
  const ls = {
    getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
    setItem: (k: string, v: string) => {
      mem.set(k, String(v))
    },
    removeItem: (k: string) => {
      mem.delete(k)
    },
  } as Storage
  g.localStorage = ls
  g.window = {
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  }
  mem.delete(CHAT_DEEP_AVATAR_3D_KEY)
  assert.equal(readChatDeepAvatar3dEnabled(), false, '3d defaults off → GIF')
  assert.equal(writeChatDeepAvatar3dEnabled(true), true)
  assert.equal(readChatDeepAvatar3dEnabled(), true)
  assert.equal(writeChatDeepAvatar3dEnabled(false), false)

  const pose = writeChatDeepAvatar3dPose('boy', { x: 0.4, y: 0.5, docked: false })
  assert.equal(pose.docked, false)
  assert.equal(readChatDeepAvatar3dPose('boy').x, 0.4)
  assert.equal(readChatDeepAvatar3dPose('girl').docked, defaultChatDeepAvatar3dPose().docked)
}

const cloud = normalizeChatDeepAvatarCloudPrefs({
  character: 'boy',
  companion3d: true,
  soundEnabled: true,
})
assert.equal(cloud?.companion3d, true)
assert.match(personaSrc, /companion3d/, 'web cloud prefs include companion3d')
assert.match(apiPersona, /companion3d/, 'api cloud prefs include companion3d')
assert.match(cloudSync, /readChatDeepAvatar3dEnabled|writeChatDeepAvatar3dEnabled/, 'cloud sync wires 3d')

assert.match(overlaySrc, /from 'three'/, 'overlay uses three.js')
assert.match(overlaySrc, /GLTFLoader/, 'overlay can load deep.glb when present')
assert.match(overlaySrc, /buildStubFigure|CapsuleGeometry|SphereGeometry/, 'procedural stub mesh')
assert.match(overlaySrc, /ChatDeepAvatar3DGate|useChatDeepAvatar3dEnabled/, 'toggle gate + hook')
assert.match(overlaySrc, /shouldSnapChatDeepAvatar3dHome|writeChatDeepAvatar3dPose/, 'snap + persist')
assert.match(overlaySrc, /isChatDeepAvatar3dPointerBlocked|DRAG_THRESHOLD/, 'mic/scroll safe drag')
assert.match(overlaySrc, /prefers-reduced-motion|usePrefersReducedMotion/, 'reduced-motion gate')
assert.match(overlaySrc, /createPortal|\.ds-chat/, 'portals onto .ds-chat for page-wide drag')
assert.doesNotMatch(overlaySrc, /[Ll]ive2[Dd]|Cubism/, 'no Live2D / Cubism in 3d overlay')
assert.doesNotMatch(libSrc, /[Ll]ive2[Dd]|Cubism/, 'no Live2D in 3d lib')

assert.match(threadSrc, /ChatDeepAvatar3DGate/, 'thread mounts 3d gate')
assert.match(threadSrc, /useChatDeepAvatar3dEnabled|companion3d/, 'thread reads 3d toggle')
assert.match(threadSrc, /layoutRef|is-3d-companion|hideGifFor3d/, 'layout hosts overlay + hides GIF')
assert.match(settingsSrc, /useChatDeepAvatar3dEnabled|3D companion/, 'Inbox Companion has 3D toggle')

assert.match(auiCss, /\.aui-deep-avatar-3d-handle\b/, '3d handle styles')
assert.match(auiCss, /\.aui-avatar-dock-frame\.is-3d-active\b/, 'dock hides GIF under 3d')
assert.match(
  auiCss,
  /prefers-reduced-motion[\s\S]*aui-deep-avatar-3d-handle/,
  'reduced-motion hides 3d handle',
)

assert.match(viteCfg, /chat-avatar\/\*\*\/\*\.glb/, 'SW globIgnores chat-avatar GLBs')
assert.match(readme, /3D companion|deep\.glb/, 'README documents 3d stub')

// Stub ships without baked GLBs (Higgsfield bake is a later phase).
assert.equal(
  existsSync(join(root, '../public/chat-avatar/boy/deep.glb')),
  false,
  'boy deep.glb not baked yet (procedural stub)',
)
assert.equal(
  existsSync(join(root, '../public/chat-avatar/girl/deep.glb')),
  false,
  'girl deep.glb not baked yet (procedural stub)',
)

// Synthetic pointer-block check via Element-like closest.
{
  const fakeDictate = {
    closest: (sel: string) => (sel.includes('.ds-chat-dictate') ? {} : null),
  } as unknown as Element
  assert.equal(isChatDeepAvatar3dPointerBlocked(fakeDictate), true)
  const fakeHandle = {
    closest: (sel: string) => (String(sel).includes('aui-deep-avatar-3d-handle') ? {} : null),
  } as unknown as Element
  assert.equal(isChatDeepAvatar3dPointerBlocked(fakeHandle), false)
}

console.log('chatDeepAvatar3d.smoke: ok')
