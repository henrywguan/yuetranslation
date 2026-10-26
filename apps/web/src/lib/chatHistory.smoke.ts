import assert from 'node:assert/strict'
import {
  appendChatMessage,
  emptyThread,
  patchAssistantContent,
  apiMessagesFromThread,
} from './chatHistory.js'

const t0 = emptyThread()
assert.equal(t0.title, 'New chat')
assert.equal(t0.messages.length, 0)

const { thread: t1 } = appendChatMessage(t0, 'user', 'Hello world from DeepSeek')
assert.match(t1.title, /Hello world/)
assert.equal(t1.messages.length, 1)

const { thread: t2, message } = appendChatMessage(t1, 'assistant', '')
const t3 = patchAssistantContent(t2, message.id, 'Hi there')
assert.equal(t3.messages.at(-1)?.content, 'Hi there')

const api = apiMessagesFromThread(t3)
assert.deepEqual(api, [
  { role: 'user', content: 'Hello world from DeepSeek' },
  { role: 'assistant', content: 'Hi there' },
])

console.log('chatHistory.smoke: ok')
