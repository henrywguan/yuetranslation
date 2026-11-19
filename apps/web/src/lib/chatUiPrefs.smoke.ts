import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CHAT_EMPTY_SUGGESTIONS,
  CHAT_LIVE_REASONING_KEEP,
  CHAT_MODE_KEY,
  CHAT_SEARCH_KEY,
  CHAT_THINK_KEY,
  readChatComposerMode,
  readChatFlag,
  writeChatComposerMode,
  writeChatFlag,
} from './chatUiPrefs.js'

assert.equal(CHAT_THINK_KEY, 'yue-deepseek-chat-deepthink-v1')
assert.equal(CHAT_SEARCH_KEY, 'yue-deepseek-chat-search-v1')
assert.equal(CHAT_MODE_KEY, 'yue-deepseek-chat-mode-v1')
assert.ok(CHAT_LIVE_REASONING_KEEP >= 12_000)
assert.ok(CHAT_EMPTY_SUGGESTIONS.length >= 3)

const mem = new Map<string, string>()
;(globalThis as { localStorage?: Storage }).localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k)! : null),
  setItem: (k, v) => {
    mem.set(k, String(v))
  },
  removeItem: (k) => {
    mem.delete(k)
  },
  clear: () => mem.clear(),
  key: () => null,
  length: 0,
}

writeChatFlag(CHAT_THINK_KEY, false)
assert.equal(readChatFlag(CHAT_THINK_KEY, true), false)
writeChatFlag(CHAT_THINK_KEY, true)
assert.equal(readChatFlag(CHAT_THINK_KEY, false), true)
writeChatComposerMode('ask')
assert.equal(readChatComposerMode(), 'ask')
writeChatComposerMode('agent')
assert.equal(readChatComposerMode('plan'), 'agent')

const here = dirname(fileURLToPath(import.meta.url))
const chatPage = readFileSync(join(here, '../pages/ChatPage.tsx'), 'utf8')
const aui = readFileSync(join(here, '../pages/chat/aui/ChatAuiRuntime.tsx'), 'utf8')
assert.match(chatPage, /chatUiPrefs/, 'Classic chat shares prefs module')
assert.match(aui, /chatUiPrefs/, 'AUI chat shares prefs module')
assert.match(
  readFileSync(join(here, '../pages/chat/aui/ChatAuiThread.tsx'), 'utf8'),
  /consumeChatPrefill/,
  'AUI consumes Solo/Conversation prefill',
)

console.log('chatUiPrefs.smoke: ok')
