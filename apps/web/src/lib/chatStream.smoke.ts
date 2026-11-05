/**
 * Static guards for DeepSeek Chat stream / freeze hardening (no paid /api/chat).
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const chat = readFileSync(join(root, '../pages/ChatPage.tsx'), 'utf8')
const history = readFileSync(join(root, './chatHistory.ts'), 'utf8')

assert.match(chat, /schedulePaint/, 'Stream tokens coalesce React paints')
assert.match(chat, /paintThread/, 'Live stream skips localStorage per token')
assert.match(chat, /LIVE_REASONING_KEEP/, 'Live reasoning buffer is capped mid-stream')
assert.match(chat, /MAX_CONTENT_CHARS/, 'Live answer buffer respects content cap')
assert.match(chat, /beginBatchedReveal/, 'Thread switch uses batched reveal')
assert.match(chat, /selectThread[\s\S]*beginBatchedReveal/, 'selectThread calls batched reveal')
assert.match(chat, /startTransition/, 'Post-stream markdown settles via startTransition')
assert.match(chat, /sawLiveRef/, 'Historical rows stay plain; only live-settled promote')
assert.match(chat, /requestAnimationFrame\(stickMessagesToBottom\)/, 'Stream paints stick scroll via rAF')
assert.match(chat, /slice\(-8_000\)/, 'Live reasoning panel paints a tail only')

// No persist inside onDelta / onReasoning bodies (disk only at stream end / abort).
const onReasoningBlock = chat.match(/onReasoning:\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\n\s*\},/)
assert.ok(onReasoningBlock, 'onReasoning handler present')
assert.doesNotMatch(onReasoningBlock![0], /\bpersist\s*\(/, 'onReasoning must not persist')
const onDeltaBlock = chat.match(/onDelta:\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\n\s*\},/)
assert.ok(onDeltaBlock, 'onDelta handler present')
assert.doesNotMatch(onDeltaBlock![0], /\bpersist\s*\(/, 'onDelta must not persist')

assert.match(history, /MAX_REASONING_CHARS\s*=\s*12_000/, 'Stored reasoning is capped')
assert.match(history, /requestIdleCallback/, 'writeChatThreads uses idle coalesce')
assert.match(history, /pendingDiskWrite/, 'Disk writes coalesce via pending payload')

console.log('chatStream.smoke: ok')
