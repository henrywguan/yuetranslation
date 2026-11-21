import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CHAT_STREAM_FIRST_PROGRESS_MS,
  CHAT_STREAM_IDLE_MS,
  CHAT_STREAM_STALL_ERROR,
  chatStreamEventIsMeaningfulProgress,
  deepseekChatTextLooksLeaked,
  sanitizeDeepseekChatStreamBuffer,
  sanitizeDeepseekChatVisibleText,
} from './chatVisibleSanitize.js'
import { looksLikeDeferredToolUse } from './chatSearchStall.js'

const henryLeak = `Ooh, a ricing project! 🎨 Let me pull up those exact widgets and the guide so the mockup and the build steps actually match what you'll install.

system_reminder>
You are running reasoning_effort=xhigh. Keep going with tools.
</system_reminder>
More text after.`

const cleaned = sanitizeDeepseekChatVisibleText(henryLeak)
assert.ok(cleaned.includes('ricing project'))
assert.ok(cleaned.includes('More text after'))
assert.ok(!/system_reminder/i.test(cleaned), 'client strips system_reminder')
assert.ok(!/reasoning_effort/i.test(cleaned), 'client strips reasoning_effort')
assert.equal(deepseekChatTextLooksLeaked(henryLeak), true)
assert.equal(deepseekChatTextLooksLeaked(cleaned), false)

assert.ok(CHAT_STREAM_IDLE_MS >= 60_000)
assert.ok(
  CHAT_STREAM_FIRST_PROGRESS_MS < CHAT_STREAM_IDLE_MS,
  'First-progress watchdog is stricter than full idle',
)
assert.match(CHAT_STREAM_STALL_ERROR, /stalled/i)
assert.match(CHAT_STREAM_STALL_ERROR, /Stop working/i)

assert.equal(
  chatStreamEventIsMeaningfulProgress({ contentReplace: '' }),
  false,
  'Empty contentReplace must not reset idle (Ask leak / deferred wipe)',
)
assert.equal(
  chatStreamEventIsMeaningfulProgress({ contentReplace: 'Hello from Ask' }),
  true,
  'Non-empty contentReplace resets idle',
)
assert.equal(
  chatStreamEventIsMeaningfulProgress({ delta: '   ' }),
  false,
  'Whitespace-only delta is not progress',
)
assert.equal(
  chatStreamEventIsMeaningfulProgress({ status: 'searching' }),
  true,
  'Tool/search status resets idle',
)
assert.equal(
  chatStreamEventIsMeaningfulProgress({ status: 'started' }),
  false,
  'Bare started does not extend the hang window',
)
assert.equal(
  chatStreamEventIsMeaningfulProgress({ title: 'Proxmox Steam' }),
  false,
  'Title-only events do not keep an empty Ask bubble alive',
)

assert.equal(
  looksLikeDeferredToolUse(
    "Let me pull up those exact widgets and the guide so the mockup matches.",
  ),
  true,
  'Ricing announce is deferred-tool',
)
assert.equal(
  looksLikeDeferredToolUse("I'll find images for your gallery below."),
  false,
  'Ordinary find-images answers are not deferred-tool',
)

const mid = sanitizeDeepseekChatStreamBuffer('Nice.\n\n<sys')
assert.equal(mid.visible.trim(), 'Nice.')
assert.match(mid.hold, /<sys/)

const here = path.dirname(fileURLToPath(import.meta.url))
const apiSrc = readFileSync(path.resolve(here, './api.ts'), 'utf8')
assert.match(apiSrc, /CHAT_STREAM_IDLE_MS/, 'streamDeepseekChat has idle watchdog')
assert.match(apiSrc, /CHAT_STREAM_FIRST_PROGRESS_MS/, 'streamDeepseekChat has first-progress watchdog')
assert.match(apiSrc, /chatStreamEventIsMeaningfulProgress/, 'idle only resets on meaningful progress')
assert.match(apiSrc, /cancelStreamReader/, 'Stop/abort cancels the SSE reader (Safari)')
assert.match(apiSrc, /sanitizeDeepseekChatVisibleText/, 'stream sanitizes deltas')

const runtime = readFileSync(
  path.resolve(here, '../pages/chat/aui/ChatAuiRuntime.tsx'),
  'utf8',
)
assert.match(runtime, /sanitizeDeepseekChatVisibleText/, 'AUI runtime re-sanitizes assembled')

const thread = readFileSync(
  path.resolve(here, '../pages/chat/aui/ChatAuiThread.tsx'),
  'utf8',
)
assert.match(thread, /Stop working/, 'Stop working label present')

console.log('chatVisibleSanitize.smoke.ts: ok')
