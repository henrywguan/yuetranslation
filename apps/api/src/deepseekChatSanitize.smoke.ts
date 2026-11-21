import assert from 'node:assert/strict'
import {
  deepseekChatTextLooksLeaked,
  sanitizeDeepseekChatStreamBuffer,
  sanitizeDeepseekChatVisibleText,
} from './deepseekChatSanitize.js'

const henryLeak = `Ooh, a ricing project! 🎨 Let me pull up those exact widgets and the guide so the mockup and the build steps actually match what you'll install.

system_reminder>
You are running reasoning_effort=xhigh. Keep going with tools.
</system_reminder>
More text after.`

const cleaned = sanitizeDeepseekChatVisibleText(henryLeak)
assert.ok(cleaned.includes('ricing project'), 'Keeps user-facing prose')
assert.ok(cleaned.includes('More text after'), 'Keeps trailing prose')
assert.ok(!/system_reminder/i.test(cleaned), 'Strips bare system_reminder')
assert.ok(!/reasoning_effort/i.test(cleaned), 'Strips reasoning_effort')
assert.equal(deepseekChatTextLooksLeaked(henryLeak), true)
assert.equal(deepseekChatTextLooksLeaked(cleaned), false)

const tagged = 'Hello.\n\n<system_reminder>\nsecret\n</system_reminder>\nWorld.'
assert.equal(
  sanitizeDeepseekChatVisibleText(tagged).replace(/\s+/g, ' ').trim(),
  'Hello. World.',
)

const mid = sanitizeDeepseekChatStreamBuffer('Nice.\n\n<sys')
assert.equal(mid.visible.trim(), 'Nice.')
assert.match(mid.hold, /<sys/)

const done = sanitizeDeepseekChatStreamBuffer(
  'Nice.\n\n<system_reminder>\nYou are running reasoning_effort=high\n</system_reminder>\nDone.',
)
assert.ok(!/system_reminder|reasoning_effort/i.test(done.visible))
assert.ok(done.visible.includes('Done.'))
assert.equal(done.hold, '')

console.log('deepseekChatSanitize.smoke.ts: ok')
