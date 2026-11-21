/**
 * Offline smoke: companion intro contain layout fits every common viewport.
 * Run: npx tsx apps/web/src/lib/chatDeepAvatarIntroLayout.smoke.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  introContainFitsStage,
  introContainSize,
  layoutIntroContainElement,
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
  const sized = introContainSize(w, h, MEDIA_W, MEDIA_H)
  assert.ok(
    introContainFitsStage(w, h, sized),
    `${label} (${w}×${h}): contain ${sized.width}×${sized.height} must fit inside stage`,
  )
  assert.ok(sized.scale > 0, `${label}: positive scale`)
  // Contain is min-fit — at least one axis matches (within floor), neither overflows.
  assert.ok(
    sized.width <= w && sized.height <= h,
    `${label}: contain must not overflow stage`,
  )
  assert.ok(
    sized.width === w || sized.height === h || Math.abs(sized.width - w) <= 1 || Math.abs(sized.height - h) <= 1,
    `${label}: contain touches an axis`,
  )
}

// Cover would crop on 1920×1080 — prove contain height stays within stage.
{
  const stageW = 1920
  const stageH = 1080
  const contain = introContainSize(stageW, stageH, MEDIA_W, MEDIA_H)
  const coverScale = Math.max(stageW / MEDIA_W, stageH / MEDIA_H)
  assert.ok(contain.scale < coverScale, 'contain scale is below cover (no crop)')
  assert.ok(contain.height <= stageH, '1920×1080 contain height fits viewport')
  assert.ok(contain.width <= stageW, '1920×1080 contain width fits viewport')
  // Portrait media on landscape → pillarbox (width < stage).
  assert.ok(contain.width < stageW, '1920×1080 letterboxes (pillarbox) portrait media')
}

assert.match(introSrc, /layoutIntroContainElement/, 'intro applies JS pixel contain')
assert.match(introSrc, /ResizeObserver|visualViewport/, 'intro relayouts on viewport change')
assert.match(introSrc, /primeChatDeepAvatarIntro|takePrimedChatDeepAvatarIntro/, 'intro adopts gesture prime')
assert.match(introSrc, /aui-deep-avatar-intro-mute/, 'intro exposes Mute control')
assert.match(introSrc, /sessionMuted/, 'intro tap-to-mute is session-local')
assert.match(introSrc, /policyMuted/, 'intro tracks autoplay policy mute')
assert.match(introSrc, /unlockConsumedClick/, 'first unlock gesture does not dismiss')
assert.match(introSrc, /sessionMuted \|\| policyMuted \? 'Unmute'/, 'Mute label honest while policy-silent')
assert.doesNotMatch(introSrc, /needsGestureUnmute/, 'old gesture-unmute chip path removed')
assert.doesNotMatch(introSrc, /aui-deep-avatar-intro-unmute/, 'intro unmute chip class removed')
assert.match(introSrc, /useChatDeepAvatarSoundEnabled/, 'intro follows Companion Sound')
assert.match(introSrc, /HOLD at frame 0|hold for gesture|never play.*muted/i, 'Sound-on never plays intro muted')
assert.match(introSrc, /policyMuted/, 'intro tracks autoplay policy hold')
assert.match(
  introSrc,
  /if \(!soundEnabled \|\| sessionMuted\) \{\s*v\.muted = true/s,
  'mute only for Sound-off or user Mute (policy hold stays unmuted+paused)',
)
assert.match(introSrc, /replaceChildren|createElement\('video'\)/, 'intro mounts video imperatively for prime adopt')

assert.match(auiCss, /\.aui-deep-avatar-intro-video\s*\{[^}]*object-fit:\s*contain/, 'CSS contain fallback')
assert.doesNotMatch(
  auiCss,
  /\.aui-deep-avatar-intro-video\s*\{[^}]*object-fit:\s*cover/,
  'intro video must not cover-crop',
)
assert.doesNotMatch(
  auiCss,
  /\.aui-deep-avatar-intro-video\s*\{[^}]*min-width:\s*100%/,
  'intro video must not force min-width cover fill',
)
assert.doesNotMatch(
  auiCss,
  /\.aui-deep-avatar-intro-video\s*\{[^}]*min-height:\s*100%/,
  'intro video must not force min-height cover fill',
)
assert.match(auiCss, /\.aui-deep-avatar-intro-mute\b/, 'Mute button styles')
assert.doesNotMatch(auiCss, /\.aui-deep-avatar-intro-unmute\b/, 'Tap-for-sound unmute chip styles removed')

assert.match(audioSrc, /export function primeChatDeepAvatarIntro/, 'gesture prime helper')
assert.match(audioSrc, /export function takePrimedChatDeepAvatarIntro/, 'prime adopt helper')
assert.match(audioSrc, /readChatDeepAvatarSoundEnabled/, 'prime respects Sound pref')
assert.match(siteLinks, /primeChatDeepAvatarIntro/, 'openDeepseekChat primes intro in-gesture')

// layoutIntroContainElement writes absolute contain styles onto a stub element.
{
  const stage = {
    clientWidth: 1920,
    clientHeight: 1080,
    getBoundingClientRect: () => ({ width: 1920, height: 1080 }),
  } as unknown as HTMLElement
  const el = { style: {} as Record<string, string> } as unknown as HTMLElement
  const sized = layoutIntroContainElement(el, stage, MEDIA_W, MEDIA_H)
  assert.equal(el.style.position, 'absolute')
  assert.equal(el.style.width, `${sized.width}px`)
  assert.equal(el.style.height, `${sized.height}px`)
  assert.equal(el.style.transform, 'translate(-50%, -50%)')
  assert.equal(el.style.objectFit, 'contain')
  assert.ok(introContainFitsStage(1920, 1080, sized))
  assert.ok(sized.height <= 1080)
}

console.log('chatDeepAvatarIntroLayout.smoke: ok')
