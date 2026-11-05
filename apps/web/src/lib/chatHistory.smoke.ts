import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  appendChatMessage,
  emptyThread,
  patchAssistantContent,
  apiMessagesFromThread,
  pruneChatThreads,
  CHAT_HYDRATE_MAX_RAW_BYTES,
  MAX_CONTENT_CHARS,
  MAX_REASONING_CHARS,
} from './chatHistory.js'

const t0 = emptyThread()
assert.equal(t0.title, 'New chat')
assert.equal(t0.messages.length, 0)

const { thread: t1 } = appendChatMessage(t0, 'user', 'Hello world from DeepSeek')
assert.match(t1.title, /Hello world/)
assert.equal(t1.messages.length, 1)

const { thread: t2, message } = appendChatMessage(t1, 'assistant', '')
const t3 = patchAssistantContent(t2, message.id, 'Hi there', {
  reasoning: 'consider greeting',
  thoughtMs: 1400,
})
assert.equal(t3.messages.at(-1)?.content, 'Hi there')
assert.equal(t3.messages.at(-1)?.reasoning, 'consider greeting')
assert.equal(t3.messages.at(-1)?.thoughtMs, 1400)

const api = apiMessagesFromThread(t3)
assert.deepEqual(api, [
  { role: 'user', content: 'Hello world from DeepSeek' },
  { role: 'assistant', content: 'Hi there' },
])

const fat = {
  ...emptyThread(),
  messages: Array.from({ length: 10 }, (_, i) => ({
    id: `a${i}`,
    role: 'assistant' as const,
    content: 'x'.repeat(20_000),
    createdAt: i,
    reasoning: `trace-${i}-${'y'.repeat(500)}`,
    thoughtMs: 100,
  })),
}
const { threads: pruned, changed } = pruneChatThreads([fat])
assert.equal(changed, true)
assert.equal(pruned[0]!.messages.length, 10)
assert.ok(pruned[0]!.messages.every((m) => m.content.length <= MAX_CONTENT_CHARS + 10))
assert.equal(pruned[0]!.messages.filter((m) => m.reasoning).length, 4)
assert.ok(
  pruned[0]!.messages
    .filter((m) => m.reasoning)
    .every((m) => (m.reasoning?.length || 0) <= MAX_REASONING_CHARS + 10),
)
assert.ok(CHAT_HYDRATE_MAX_RAW_BYTES >= 100_000)
assert.equal(MAX_REASONING_CHARS, MAX_CONTENT_CHARS)

const hugeReason = {
  ...emptyThread(),
  messages: [
    {
      id: 'r1',
      role: 'assistant' as const,
      content: 'short',
      createdAt: 1,
      reasoning: 'z'.repeat(MAX_REASONING_CHARS + 5_000),
      thoughtMs: 50,
    },
  ],
}
const { threads: prunedReason, changed: reasonChanged } = pruneChatThreads([hugeReason])
assert.equal(reasonChanged, true)
assert.ok((prunedReason[0]!.messages[0]!.reasoning?.length || 0) <= MAX_REASONING_CHARS + 10)

const chatPage = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../pages/ChatPage.tsx'), 'utf8')
assert.match(chatPage, /hydrateChatThreadsAsync/, 'ChatPage uses async hydrate')
assert.match(chatPage, /revealCount/, 'ChatPage reveals history in batches')
assert.match(chatPage, /ds-chat-plain/, 'Streaming answers use plain text')
assert.match(chatPage, /renderChatMarkdown/, 'Just-settled live answers use markdown')
assert.match(chatPage, /sawLiveRef/, 'Historical assistants stay plain; only live-settled promote')
assert.match(chatPage, /clearedHeavy/, 'ChatPage surfaces oversized-history recovery')
assert.match(chatPage, /beginBatchedReveal/, 'selectThread / hydrate share batched reveal')

const historySrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), './chatHistory.ts'), 'utf8')
assert.match(historySrc, /requestIdleCallback/, 'Disk flush is idle-coalesced')

console.log('chatHistory.smoke: ok')
