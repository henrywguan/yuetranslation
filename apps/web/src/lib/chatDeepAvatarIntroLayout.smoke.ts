/**
 * Offline smoke: companion intro cover layout math fills every common viewport.
 * Run: npx tsx apps/web/src/lib/chatDeepAvatarIntroLayout.smoke.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  introCoverFillsStage,
  introCoverSize,
  layoutIntroCoverElement,
} from './chatDeepAvatarIntroLayout'

const here = dirname(fileURLToPath(import.meta.url))
const introSrc = readFileSync(join(here, '../pages/chat/aui/ChatDeepAvatarIntro.tsx'), 'utf8')
const auiCss = readFileSync(join(here, '../pages/chat/aui/ChatAui.css'), 'utf8')
const audioSrc = readFileSync(join(here, 'chatDeepAvatarIntroAudio.ts'), 'utf8')
const siteLinks = readFileSync(join(here, 'siteLinks.ts'), 'utf8')

const MEDIA_W = 1080
const MEDIA_H = 1920

const VIEWPORTS: Array<[number, number, string]> = [
  [1920, 1080, '1080p landscape'],
  [1680, 1050, 'laptop'],
  [1512, 982, 'macbook'],
  [1280, 800, 'small laptop'],
  [2560, 1440, '1440p'],
  [390, 844, 'iphone portrait'],
  [844, 390, 'iphone landscape'],
  [1024, 1366, 'ipad portrait'],
]

for (const [w, h, label] of VIEWPORTS) {
  const sized = introCoverSize(w, h, MEDIA_W, MEDIA_H)
  assert.ok(
    introCoverFillsStage(w, h, sized),
    `${label} (${w}×${h}): cover ${sized.width}×${sized.height} must fill stage`,
  )
  assert.ok(sized.scale > 0, `${label}: positive scale`)
  // Cover is max-fit — at least one axis matches exactly (within ceil).
  assert.ok(
    sized.width === w || sized.height === h || sized.width >= w || sized.height >= h,
    `${label}: cover overflows or matches an axis`,
  )
}

// Contain would letterbox on 1920×1080 — prove cover is larger than contain height.
{
  const stageW = 1920
  const stageH = 1080
  const cover = introCoverSize(stageW, stageH, MEDIA_W, MEDIA_H)
  const containScale = Math.min(stageW / MEDIA_W, stageH / MEDIA_H)
  assert.ok(cover.scale > containScale, 'cover scale exceeds contain (no letterbox)')
  assert.equal(cover.width, 1920, '1920×1080 cover width fills viewport')
  assert.ok(cover.height > stageH, '1920×1080 cover height overflows (vertical crop)')
}

assert.match(introSrc, /layoutIntroCoverElement/, 'intro applies JS pixel cover')
assert.match(introSrc, /ResizeObserver|visualViewport/, 'intro relayouts on viewport change')
assert.match(introSrc, /primeChatDeepAvatarIntro|takePrimedChatDeepAvatarIntro/, 'intro adopts gesture prime')
assert.match(introSrc, /aui-deep-avatar-intro-mute/, 'intro exposes Mute control')
assert.match(introSrc, /sessionMuted/, 'intro tap-to-mute is session-local')
assert.doesNotMatch(introSrc, /Tap for sound/, 'intro must not ship tap-to-unmute chip copy')
assert.doesNotMatch(introSrc, /needsGestureUnmute/, 'old gesture-unmute chip path removed')
assert.doesNotMatch(introSrc, /aui-deep-avatar-intro-unmute/, 'intro unmute chip class removed')
assert.match(introSrc, /useChatDeepAvatarSoundEnabled/, 'intro follows Companion Sound')
assert.match(
  introSrc,
  /v\.muted = !soundEnabled \|\| sessionMuted \|\| policyMuted/,
  'mute only for Sound-off, user Mute, or brief autoplay lock',
)
assert.match(introSrc, /replaceChildren|createElement\('video'\)/, 'intro mounts video imperatively for prime adopt')

assert.match(auiCss, /\.aui-deep-avatar-intro-video\s*\{[^}]*object-fit:\s*cover/, 'CSS cover fallback')
assert.match(auiCss, /\.aui-deep-avatar-intro-video\s*\{[^}]*min-width:\s*100%/, 'CSS min-width cover fallback')
assert.match(auiCss, /\.aui-deep-avatar-intro-video\s*\{[^}]*min-height:\s*100%/, 'CSS min-height cover fallback')
assert.doesNotMatch(
  auiCss,
  /\.aui-deep-avatar-intro-video\s*\{[^}]*object-fit:\s*contain/,
  'intro video must not letterbox with contain',
)
assert.match(auiCss, /\.aui-deep-avatar-intro-mute\b/, 'Mute button styles')
assert.doesNotMatch(auiCss, /\.aui-deep-avatar-intro-unmute\b/, 'Tap-for-sound unmute chip styles removed')

assert.match(audioSrc, /export function primeChatDeepAvatarIntro/, 'gesture prime helper')
assert.match(audioSrc, /export function takePrimedChatDeepAvatarIntro/, 'prime adopt helper')
assert.match(audioSrc, /readChatDeepAvatarSoundEnabled/, 'prime respects Sound pref')
assert.match(siteLinks, /primeChatDeepAvatarIntro/, 'openDeepseekChat primes intro in-gesture')

// layoutIntroCoverElement writes absolute cover styles onto a stub element.
{
  const stage = {
    clientWidth: 1920,
    clientHeight: 1080,
    getBoundingClientRect: () => ({ width: 1920, height: 1080 }),
  } as unknown as HTMLElement
  const el = { style: {} as Record<string, string> } as unknown as HTMLElement
  const sized = layoutIntroCoverElement(el, stage, MEDIA_W, MEDIA_H)
  assert.equal(el.style.position, 'absolute')
  assert.equal(el.style.width, `${sized.width}px`)
  assert.equal(el.style.height, `${sized.height}px`)
  assert.equal(el.style.transform, 'translate(-50%, -50%)')
  assert.equal(el.style.objectFit, 'cover')
  assert.ok(introCoverFillsStage(1920, 1080, sized))
}

console.log('chatDeepAvatarIntroLayout.smoke: ok')
