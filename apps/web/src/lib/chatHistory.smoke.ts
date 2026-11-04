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
assert.ok(pruned[0]!.messages.every((m) => m.content.length <= 12_000 + 10))
assert.equal(pruned[0]!.messages.filter((m) => m.reasoning).length, 4)
assert.ok(CHAT_HYDRATE_MAX_RAW_BYTES >= 100_000)

const chatPage = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../pages/ChatPage.tsx'), 'utf8')
assert.match(chatPage, /hydrateChatThreadsAsync/, 'ChatPage uses async hydrate')
assert.match(chatPage, /revealCount/, 'ChatPage reveals history in batches')
assert.match(chatPage, /ds-chat-plain/, 'Historical answers skip markdown parse')
assert.match(chatPage, /clearedHeavy/, 'ChatPage surfaces oversized-history recovery')

console.log('chatHistory.smoke: ok')
