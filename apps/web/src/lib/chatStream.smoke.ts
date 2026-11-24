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
assert.match(chat, /LIVE_REASONING_PAINT/, 'Live reasoning panel paints a tail only')
assert.match(chat, /MAX_CONTENT_CHARS/, 'Live answer buffer respects content cap')
assert.match(chat, /beginBatchedReveal/, 'Thread switch uses batched reveal')
assert.match(chat, /selectThread[\s\S]*beginBatchedReveal/, 'selectThread calls batched reveal')
assert.match(chat, /setRich\(true\)/, 'Settled replies promote to markdown')
assert.match(chat, /ds-chat-plain/, 'Live stream stays plain text')
assert.doesNotMatch(chat, /sawLiveRef/, 'No sawLiveRef gate — visible settled rows render markdown')
assert.match(chat, /canUseDeepseekChat/, 'Chat gate shares canUseDeepseekChat helper')
assert.match(chat, /requestAnimationFrame\(stickMessagesToBottom\)/, 'Stream paints stick scroll via rAF')
assert.match(chat, /slice\(-LIVE_REASONING_PAINT\)/, 'Live reasoning panel paints a shared tail only')
assert.match(chat, /dropEmptyAssistant/, 'Empty assistant cleanup is shared on abort/empty reply')
assert.match(chat, /summarizeAgentToolWork|recoverEmptyFromWork/, 'Empty reply recovers when Agent tools landed work')
assert.match(chat, /workspacePathsThisTurn/, 'Classic tracks workspace writes for empty-reply recovery')

// No persist inside onDelta / onReasoning bodies (disk only at stream end / abort).
const onReasoningBlock = chat.match(/onReasoning:\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\n\s*\},/)
assert.ok(onReasoningBlock, 'onReasoning handler present')
assert.doesNotMatch(onReasoningBlock![0], /\bpersist\s*\(/, 'onReasoning must not persist')
const onDeltaBlock = chat.match(/onDelta:\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\n\s*\},/)
assert.ok(onDeltaBlock, 'onDelta handler present')
assert.doesNotMatch(onDeltaBlock![0], /\bpersist\s*\(/, 'onDelta must not persist')

assert.match(history, /MAX_REASONING_CHARS\s*=\s*48_000/, 'Stored reasoning raised for research CoT')
assert.match(history, /LIVE_REASONING_KEEP\s*=\s*96_000/, 'Live reasoning buffer raised for long thinks')
assert.match(history, /LIVE_REASONING_PAINT\s*=\s*8_000/, 'Paint tail capped to keep live UI without freeze')
assert.match(history, /CHAT_HYDRATE_MAX_RAW_BYTES\s*=\s*512_000/, 'Hydrate budget raised with reasoning')
assert.match(history, /requestIdleCallback/, 'writeChatThreads uses idle coalesce')
assert.match(history, /pendingDiskWrite/, 'Disk writes coalesce via pending payload')

const auiThread = readFileSync(join(root, '../pages/chat/aui/ChatAuiThread.tsx'), 'utf8')
assert.match(auiThread, /LIVE_REASONING_PAINT/, 'AUI DeepThink paints a live tail (no full-pre freeze)')
assert.match(auiThread, /Auto · Working|Working…/, 'Agent busy shows Working chip when not Thinking')
assert.match(auiThread, /LIVE_MARKDOWN_STREAM_MAX/, 'Long mid-stream answers fall back to live plain')
assert.match(auiThread, /aui-md-plain-live/, 'Live plain tail keeps tokens visible without MD freeze')

const convert = readFileSync(join(root, '../pages/chat/aui/convertChatMessage.ts'), 'utf8')
assert.match(
  convert,
  /incomplete[\s\S]*cancelled/,
  'Empty settled assistant is incomplete — not running (Ask Stop stuck)',
)
assert.match(
  convert,
  /streaming \? LIVE_REASONING_PAINT : LIVE_REASONING_KEEP/,
  'Streaming convert feeds paint tail only (not 96k parts)',
)

const apiTs = readFileSync(join(root, './api.ts'), 'utf8')
assert.match(apiTs, /chatStreamEventIsMeaningfulProgress/, 'Idle watchdog ignores empty contentReplace')
assert.match(apiTs, /CHAT_STREAM_FIRST_PROGRESS_MS/, 'Faster fail before first Ask progress')
assert.match(apiTs, /CHAT_STREAM_YIELD_EVERY/, 'SSE parse yields so long thinks stay responsive')
assert.match(apiTs, /yieldToUi/, 'SSE loop awaits UI yield during bursts')

const runtime = readFileSync(join(root, '../pages/chat/aui/ChatAuiRuntime.tsx'), 'utf8')
assert.match(runtime, /appendSanitizedStreamText/, 'AUI avoids O(n²) full-buffer sanitize per token')
assert.match(runtime, /syncStreamBuffersToThread/, 'AUI patches React once per paint, not per token')
assert.match(chat, /appendSanitizedStreamText/, 'Classic chat avoids O(n²) full-buffer sanitize per token')
assert.match(chat, /syncStreamBuffersToThread/, 'Classic chat patches React once per paint')

const apiChat = readFileSync(join(root, '../../../../apps/api/src/deepseekChat.ts'), 'utf8')
assert.match(apiChat, /DEEPSEEK_CHAT_MAX_TOKENS\s*=\s*16_384/, 'API max_tokens raised for long DeepThink')

console.log('chatStream.smoke: ok')
