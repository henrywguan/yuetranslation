import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  canContinueAssistant,
  cycleAssistantAlternate,
  forkThreadAt,
  pushAssistantAlternate,
} from './chatBranching.js'
import { parseAnyChatImport, parseDeepseekSessionJson, parseChatMarkdown } from './chatDeepseekImport.js'
import { emptyThread, type ChatThread } from './chatHistory.js'
import { CHAT_DEFERRED_FEATURES } from './chatDeferred.js'

const thread: ChatThread = {
  ...emptyThread(),
  messages: [
    { id: 'u1', role: 'user', content: 'Hi', createdAt: 1 },
    {
      id: 'a1',
      role: 'assistant',
      content: 'Hello',
      createdAt: 2,
    },
  ],
}

const pushed = pushAssistantAlternate(thread.messages[1]!)
assert.ok(pushed.alternates?.length === 1)
assert.equal(pushed.alternates![0]!.content, 'Hello')

const withTwo = pushAssistantAlternate({
  ...pushed,
  id: 'a2',
  content: 'Hello again',
})
assert.equal(withTwo.alternates!.length, 2)
const cycled = cycleAssistantAlternate(withTwo, -1)
assert.equal(cycled.content, 'Hello')
const cycledBack = cycleAssistantAlternate(cycled, 1)
assert.equal(cycledBack.content, 'Hello again')
assert.equal(cycledBack.activeAlternate, 1)

const forked = forkThreadAt(thread, 'a1')
assert.ok(forked)
assert.equal(forked!.messages.length, 2)
assert.match(forked!.title, /Branch/)
assert.notEqual(forked!.id, thread.id)

assert.equal(canContinueAssistant(thread), true)

const ds = parseDeepseekSessionJson({
  id: 's1',
  title: 'DS import',
  current_message_id: 2,
  messages: [
    {
      id: 1,
      parent_id: null,
      role: 'USER',
      fragments: [{ type: 'REQUEST', content: '你好' }],
    },
    {
      id: 2,
      parent_id: 1,
      role: 'ASSISTANT',
      fragments: [
        { type: 'THINK', content: 'thinking', elapsed_secs: 1.5 },
        { type: 'RESPONSE', content: '你好！' },
      ],
    },
  ],
})
assert.ok(ds)
assert.equal(ds!.messages.length, 2)
assert.equal(ds!.messages[0]!.role, 'user')
assert.equal(ds!.messages[1]!.content, '你好！')
assert.match(ds!.messages[1]!.reasoning || '', /thinking/)

const md = parseChatMarkdown('# Trip\n\n## You\n\nHello\n\n## DeepSeek\n\nWorld\n')
assert.ok(md)
assert.equal(md!.title, 'Trip')
assert.equal(md!.messages.length, 2)

assert.ok(parseAnyChatImport(JSON.stringify(ds)))
assert.ok(parseAnyChatImport('# A\n\n## You\n\nhi\n\n## DeepSeek\n\nhey\n'))

assert.ok(!CHAT_DEFERRED_FEATURES.includes('conversation_branching' as never))

const chat = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../pages/ChatPage.tsx'), 'utf8')
assert.match(chat, /continueReply/, 'Continue wired in ChatPage')
assert.match(chat, /branchFromMessage/, 'Branch fork wired')
assert.match(chat, /cycleAlternate/, 'Alternate cycling wired')
assert.match(chat, /parseAnyChatImport/, 'DeepSeek/markdown import wired')
assert.match(chat, /continueReply:\s*Boolean/, 'Stream sends continue flag')

const harness = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../../api/src/deepseekChatHarness.ts'),
  'utf8',
)
assert.match(harness, /openaiBetaClient/, 'Continue uses /beta client')
assert.match(harness, /prefix:\s*true|row\.prefix = true/, 'Continue sets assistant prefix')

console.log('chatBranching.smoke: ok')
