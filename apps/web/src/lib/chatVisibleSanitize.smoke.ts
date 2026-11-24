import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  appendSanitizedStreamText,
  CHAT_STREAM_FIRST_PROGRESS_MS,
  CHAT_STREAM_IDLE_MS,
  CHAT_STREAM_STALL_ERROR,
  CHAT_STREAM_YIELD_EVERY_EVENTS,
  CHAT_STREAM_YIELD_EVERY_MS,
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

assert.ok(CHAT_STREAM_YIELD_EVERY_MS > 0 && CHAT_STREAM_YIELD_EVERY_EVENTS > 0)

// Clean chunks must not re-scan the whole buffer (O(n²) freeze on long DeepThink).
let live = ''
for (let i = 0; i < 200; i++) live = appendSanitizedStreamText(live, `step-${i} `)
assert.match(live, /step-0/)
assert.match(live, /step-199/)
assert.equal(live, appendSanitizedStreamText('', live), 'clean append is identity for full text')

const leakedAppend = appendSanitizedStreamText(
  'Hello\n',
  'system_reminder>x</system_reminder>\nbye',
)
assert.match(leakedAppend, /Hello/)
assert.match(leakedAppend, /bye/)
assert.ok(!/system_reminder/i.test(leakedAppend), 'append re-sanitizes when leak appears')

// Split junk tag across chunks — must not flash raw tool_call markup mid-stream.
const splitJunk = appendSanitizedStreamText('Answer: <', 'tool_call>secret</tool_call> done')
assert.match(splitJunk, /Answer:/)
assert.match(splitJunk, /done/)
assert.ok(!/tool_call/i.test(splitJunk), 'split tool_call tags are scrubbed on assemble')

const here = path.dirname(fileURLToPath(import.meta.url))
const apiSrc = readFileSync(path.resolve(here, './api.ts'), 'utf8')
assert.match(apiSrc, /CHAT_STREAM_IDLE_MS/, 'streamDeepseekChat has idle watchdog')
assert.match(apiSrc, /CHAT_STREAM_FIRST_PROGRESS_MS/, 'streamDeepseekChat has first-progress watchdog')
assert.match(apiSrc, /chatStreamEventIsMeaningfulProgress/, 'idle only resets on meaningful progress')
assert.match(apiSrc, /cancelStreamReader/, 'Stop/abort cancels the SSE reader (Safari)')
assert.match(apiSrc, /sanitizeDeepseekChatVisibleText/, 'stream sanitizes deltas')
assert.match(apiSrc, /CHAT_STREAM_YIELD_EVERY/, 'SSE yields during long thinks')

const runtime = readFileSync(
  path.resolve(here, '../pages/chat/aui/ChatAuiRuntime.tsx'),
  'utf8',
)
assert.match(runtime, /sanitizeDeepseekChatVisibleText/, 'AUI runtime re-sanitizes assembled')
assert.match(runtime, /appendSanitizedStreamText/, 'AUI appends without per-token full sanitize')
assert.match(runtime, /syncStreamBuffersToThread/, 'AUI coalesces patches to paint cadence')

const thread = readFileSync(
  path.resolve(here, '../pages/chat/aui/ChatAuiThread.tsx'),
  'utf8',
)
assert.match(thread, /Stop working/, 'Stop working label present')
assert.match(thread, /Working…/, 'Agent Working chip when busy without Thinking')

console.log('chatVisibleSanitize.smoke.ts: ok')
