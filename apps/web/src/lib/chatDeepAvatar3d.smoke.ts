/**
 * `#/chat` 3D companion — prefs, GLB paths, clip map, shared Both office, no Live2D.
 * Run: npx tsx apps/web/src/lib/chatDeepAvatar3d.smoke.ts
 */
import assert from 'node:assert/strict'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CHAT_DEEP_AVATAR_3D_CANON_CLIPS,
  CHAT_DEEP_AVATAR_3D_CLIP_ALIASES,
  CHAT_DEEP_AVATAR_3D_DRAG_THRESHOLD_PX,
  CHAT_DEEP_AVATAR_3D_DUO_OFFSET_PX,
  CHAT_DEEP_AVATAR_3D_KEY,
  CHAT_DEEP_AVATAR_3D_POSE_KEY,
  CHAT_DEEP_AVATAR_3D_SNAP_PX,
  chatDeepAvatar3dDuoDockOffsetX,
  chatDeepAvatar3dSolosToMount,
  chatDeepAvatar3dStubTint,
  chatDeepAvatarGlbSrc,
  defaultChatDeepAvatar3dPose,
  isChatDeepAvatar3dPointerBlocked,
  normalizeChatDeepAvatar3dPose,
  normalizeChatDeepAvatar3dPoseMap,
  readChatDeepAvatar3dEnabled,
  readChatDeepAvatar3dPose,
  resolveChatDeepAvatar3dClipName,
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
assert.ok(CHAT_DEEP_AVATAR_3D_DUO_OFFSET_PX >= 24)

assert.equal(chatDeepAvatarGlbSrc('boy'), '/chat-avatar/boy/deep.glb')
assert.equal(chatDeepAvatarGlbSrc('girl'), '/chat-avatar/girl/deep.glb')
assert.equal(chatDeepAvatarGlbSrc('both'), '/chat-avatar/boy/deep.glb', 'both primary solo → boy glb helper')
assert.notEqual(chatDeepAvatar3dStubTint('boy'), chatDeepAvatar3dStubTint('girl'))

assert.deepEqual([...chatDeepAvatar3dSolosToMount('boy')], ['boy'])
assert.deepEqual([...chatDeepAvatar3dSolosToMount('girl')], ['girl'])
assert.deepEqual([...chatDeepAvatar3dSolosToMount('both')], ['boy', 'girl'])
assert.equal(chatDeepAvatar3dDuoDockOffsetX('boy'), -CHAT_DEEP_AVATAR_3D_DUO_OFFSET_PX)
assert.equal(chatDeepAvatar3dDuoDockOffsetX('girl'), CHAT_DEEP_AVATAR_3D_DUO_OFFSET_PX)

assert.equal(normalizeChatDeepAvatar3dPose(null, 'boy').docked, true)
assert.equal(normalizeChatDeepAvatar3dPose({ x: 2, y: -1, docked: false }).x, 1)
assert.equal(normalizeChatDeepAvatar3dPose({ x: 2, y: -1, docked: false }).y, 0)
assert.equal(normalizeChatDeepAvatar3dPose({ x: 0.5, y: 0.5, docked: false }).docked, false)

const map = normalizeChatDeepAvatar3dPoseMap({ boy: { x: 0.2, y: 0.3, docked: false } })
assert.equal(map.boy.x, 0.2)
assert.equal(map.girl.docked, true)

assert.equal(shouldSnapChatDeepAvatar3dHome(10, 10, 10, 10), true)
assert.equal(shouldSnapChatDeepAvatar3dHome(0, 0, 500, 500), false)
assert.equal(shouldSnapChatDeepAvatar3dHome(0, 0, 40, 40, 72), true)

// Clip mapping — play-bus moods → AnimationMixer names.
assert.ok(CHAT_DEEP_AVATAR_3D_CLIP_ALIASES.idle.includes('Idle'))
assert.ok(CHAT_DEEP_AVATAR_3D_CLIP_ALIASES.wave.includes('Wave'))
assert.ok(CHAT_DEEP_AVATAR_3D_CLIP_ALIASES.think.includes('Think'))
assert.ok(CHAT_DEEP_AVATAR_3D_CLIP_ALIASES.sleepy.some((n) => /sit/i.test(n)))
assert.ok(CHAT_DEEP_AVATAR_3D_CANON_CLIPS.includes('Idle'))
assert.ok(CHAT_DEEP_AVATAR_3D_CANON_CLIPS.includes('Walk'))
assert.ok(CHAT_DEEP_AVATAR_3D_CANON_CLIPS.includes('Interact'))
assert.ok(CHAT_DEEP_AVATAR_3D_CANON_CLIPS.includes('Study'))
assert.ok(CHAT_DEEP_AVATAR_3D_CANON_CLIPS.includes('Work'))
assert.ok(CHAT_DEEP_AVATAR_3D_CANON_CLIPS.includes('Eat'))
assert.ok(CHAT_DEEP_AVATAR_3D_CANON_CLIPS.includes('DeskNap'))
assert.equal(
  resolveChatDeepAvatar3dClipName('wave', ['Idle', 'Wave', 'Sit', 'Think']),
  'Wave',
)
assert.equal(resolveChatDeepAvatar3dClipName('idle', ['Idle', 'Wave', 'Sit', 'Think']), 'Idle')
assert.equal(resolveChatDeepAvatar3dClipName('think', ['Idle', 'Wave', 'Sit', 'Think']), 'Think')
assert.equal(resolveChatDeepAvatar3dClipName('sleepy', ['Idle', 'Wave', 'Sit', 'Think']), 'Sit')
assert.equal(
  resolveChatDeepAvatar3dClipName('idle', ['Armature|Idle|baselayer']),
  'Armature|Idle|baselayer',
  'Meshy Armature|Idle|baselayer matches Idle alias',
)
assert.equal(resolveChatDeepAvatar3dClipName('nod', []), null, 'no clips → null (idle bob)')
assert.equal(
  resolveChatDeepAvatar3dClipName('fist', ['Take 001']),
  'Take 001',
  'unknown mood falls back to first clip',
)

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
  assert.equal(readChatDeepAvatar3dPose('girl').docked, defaultChatDeepAvatar3dPose('girl').docked)

  // Dual Both poses stay independent.
  writeChatDeepAvatar3dPose('girl', { x: 0.7, y: 0.6, docked: false })
  assert.equal(readChatDeepAvatar3dPose('girl').x, 0.7)
  assert.equal(readChatDeepAvatar3dPose('boy').x, 0.4)
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
assert.match(overlaySrc, /AnimationMixer/, 'mood → clip mixer')
assert.match(overlaySrc, /resolveChatDeepAvatar3dClipName/, 'clip resolve wired')
assert.match(overlaySrc, /chatDeepAvatar3dBehavior|setBehavior|ambient/, 'ambient idle AI wired')
assert.match(overlaySrc, /stepChatDeepAvatar3dWalk|preferInteract/, 'wander + Both interact')
assert.match(overlaySrc, /buildStubFigure|CapsuleGeometry|SphereGeometry/, 'procedural stub mesh')
assert.match(overlaySrc, /ChatDeepAvatar3DGate|useChatDeepAvatar3dEnabled/, 'toggle gate + hook')
assert.match(overlaySrc, /chatDeepAvatar3dSolosToMount/, 'Both solos → shared scene helper')
assert.match(overlaySrc, /data-shared-office|shared office/, 'shared office frame (not dual rooms)')
assert.match(overlaySrc, /shouldSnapChatDeepAvatar3dHome|writeChatDeepAvatar3dPose/, 'snap + persist')
assert.match(overlaySrc, /isChatDeepAvatar3dPointerBlocked|DRAG_THRESHOLD/, 'mic/scroll safe drag')
assert.match(overlaySrc, /prefers-reduced-motion|usePrefersReducedMotion/, 'reduced-motion gate')
assert.match(overlaySrc, /createPortal|\.ds-chat/, 'portals onto .ds-chat for page-wide drag')
// Regression: portal canvas is created only after surfaceEl — mountScene must
// re-run when surfaceEl appears or WebGL never attaches (invisible 3D).
assert.match(
  overlaySrc,
  /mountScene\([\s\S]*?\[solosKey,\s*onActiveChange,\s*surfaceEl\]/,
  'WebGL mount deps include surfaceEl (portal canvas race)',
)
assert.match(overlaySrc, /if\s*\(\s*!surfaceEl\s*\)\s*return/, 'skip mount until portal surface ready')
assert.doesNotMatch(overlaySrc, /[Ll]ive2[Dd]|Cubism/, 'no Live2D / Cubism in 3d overlay')
assert.doesNotMatch(libSrc, /[Ll]ive2[Dd]|Cubism/, 'no Live2D in 3d lib')

assert.match(threadSrc, /ChatDeepAvatar3DGate/, 'thread mounts 3d gate')
assert.match(threadSrc, /useChatDeepAvatar3dEnabled|companion3d/, 'thread reads 3d toggle')
assert.match(threadSrc, /layoutRef|is-3d-companion|hideGifFor3d/, 'layout hosts overlay + hides GIF')
assert.match(
  threadSrc,
  /ChatDeepAvatar3DGate[\s\S]*?enabled=\{companion3d\}[\s\S]*?character=\{avatarCharacter\}/,
  '3D gate wired to companion3d enable + character (Boy/Girl/Both)',
)
assert.match(settingsSrc, /useChatDeepAvatar3dEnabled|3D companion/, 'Inbox Companion has 3D toggle')
assert.match(
  settingsSrc,
  /setCompanion3d\(!companion3d\)/,
  'Inbox 3D companion toggle flips enable pref',
)

// Gate mounts ONE overlay; Both puts boy+girl inside the shared office scene.
assert.match(
  overlaySrc,
  /<ChatDeepAvatar3DOverlay[\s\S]*?solos=\{solos\}/,
  'Gate mounts a single ChatDeepAvatar3DOverlay with solos list',
)
assert.doesNotMatch(
  overlaySrc,
  /solos\.map\(\(solo\)\s*=>\s*\([\s\S]*?<ChatDeepAvatar3DOverlay/,
  'must not dual-mount separate overlays per solo (dual-room bug)',
)
assert.doesNotMatch(
  overlaySrc,
  /split\s*=\s*Boolean\(duoOffset\)/,
  'must not half-width split the shared office frame',
)
assert.doesNotMatch(
  overlaySrc,
  /Math\.floor\(\s*(?:split\s*\?\s*)?dr\.width\s*\/\s*2\s*\)/,
  'must not size the office to half the dock width',
)
assert.match(
  overlaySrc,
  /Math\.max\(FRAME_MIN_PX,\s*Math\.floor\(dr\.width\)\)/,
  'docked office fills the full avatar frame width',
)
assert.match(
  overlaySrc,
  /if\s*\(\s*b\s*\)\s*b\.resize\(HANDLE_SIZE_PX,\s*HANDLE_SIZE_PX\)/,
  'undock always resizes renderer (env may still be loaded)',
)
assert.doesNotMatch(
  overlaySrc,
  /if\s*\(\s*b\s*&&\s*!b\.env\s*\)\s*b\.resize\(HANDLE_SIZE_PX/,
  'undock resize must not skip when env is present',
)
assert.match(
  overlaySrc,
  /chatDeepAvatar3dRoomCompanionsNear|publishChatDeepAvatar3dLiveRoomPose/,
  'Both interact uses shared-room proximity',
)
assert.match(
  overlaySrc,
  /agents:\s*Map|mountCharacter/,
  'one scene hosts multiple CharAgents',
)
// Office open front is −Z (Jutsu CAM_main). +Z camera paints ENV_wall_back → grey spheres.
assert.match(
  overlaySrc,
  /camera\.position\.set\(\s*0\.15\s*,\s*1\.55\s*,\s*-3\.55\s*\)/,
  'office camera matches CAM_main (−Z open front)',
)
assert.doesNotMatch(
  overlaySrc,
  /camera\.position\.set\(\s*0\.12\s*,\s*1\.55\s*,\s*3\.45\s*\)/,
  'must not keep flipped +Z office camera',
)

assert.match(auiCss, /\.aui-deep-avatar-3d-handle\b/, '3d handle styles')
assert.match(auiCss, /\.aui-avatar-dock-frame\.is-3d-active\b/, 'dock hides GIF under 3d')
assert.match(
  auiCss,
  /prefers-reduced-motion[\s\S]*aui-deep-avatar-3d-handle/,
  'reduced-motion hides 3d handle',
)

assert.match(viteCfg, /chat-avatar\/\*\*\/\*\.glb/, 'SW globIgnores chat-avatar GLBs')
assert.match(readme, /deep\.glb|3D companion/, 'README documents 3d companion / deep.glb')

// Baked runtime GLBs (Higgsfield Meshy) — keep under Harbor-ish mobile budget.
const boyGlb = join(root, '../public/chat-avatar/boy/deep.glb')
const girlGlb = join(root, '../public/chat-avatar/girl/deep.glb')
assert.equal(existsSync(boyGlb), true, 'boy deep.glb shipped')
assert.equal(existsSync(girlGlb), true, 'girl deep.glb shipped')
assert.equal(chatDeepAvatarGlbSrc('boy'), '/chat-avatar/boy/deep.glb', 'boy glb public src')
assert.equal(chatDeepAvatarGlbSrc('girl'), '/chat-avatar/girl/deep.glb', 'girl glb public src')
assert.deepEqual(
  [...chatDeepAvatar3dSolosToMount('both')].map((id) => chatDeepAvatarGlbSrc(id)),
  ['/chat-avatar/boy/deep.glb', '/chat-avatar/girl/deep.glb'],
  'Both shared scene → boy + girl deep.glb srcs',
)
{
  const boyBytes = statSync(boyGlb).size
  const girlBytes = statSync(girlGlb).size
  assert.ok(boyBytes > 10_000, 'boy glb non-empty')
  assert.ok(girlBytes > 10_000, 'girl glb non-empty')
  // Soft ceiling — Harbor scouts are ~5 MiB; fail loud if we ship a 40 MiB Hunyuan.
  assert.ok(boyBytes < 12 * 1024 * 1024, `boy glb too large for iPhone WebGL (${boyBytes})`)
  assert.ok(girlBytes < 12 * 1024 * 1024, `girl glb too large for iPhone WebGL (${girlBytes})`)
  // glTF container magic — catches accidental HTML/LFS pointer commits.
  const magic = (p: string) => readFileSync(p).subarray(0, 4).toString('utf8')
  assert.equal(magic(boyGlb), 'glTF', 'boy deep.glb is a real GLB')
  assert.equal(magic(girlGlb), 'glTF', 'girl deep.glb is a real GLB')
  // Ambient clip vocabulary must be present after Meshy merge.
  const animNames = (p: string) => {
    const buf = readFileSync(p)
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
    const jsonLen = view.getUint32(12, true)
    const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8')) as {
      animations?: { name?: string }[]
    }
    return (json.animations ?? []).map((a) => a.name ?? '')
  }
  for (const who of [boyGlb, girlGlb]) {
    const names = animNames(who)
    for (const need of [
      'Idle',
      'Walk',
      'Interact',
      'Study',
      'Work',
      'Wave',
      'Sit',
      'Think',
      'Eat',
      'DeskNap',
    ]) {
      assert.ok(names.includes(need), `${who} missing clip ${need} (have ${names.join(',')})`)
    }
  }
}

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
